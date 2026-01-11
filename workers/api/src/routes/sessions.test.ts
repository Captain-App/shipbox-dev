import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../index";
import { createMockD1 } from "../test-utils/d1-mock";
import { createMockSandboxMcp } from "../test-utils/fetcher-mock";

describe("Sessions Routes", () => {
  let mockD1: ReturnType<typeof createMockD1>;
  let mockSandboxMcp: ReturnType<typeof createMockSandboxMcp>;
  let env: any;

  beforeEach(() => {
    mockD1 = createMockD1();
    mockSandboxMcp = createMockSandboxMcp();
    env = {
      DB: mockD1,
      SANDBOX_MCP: mockSandboxMcp,
      SUPABASE_URL: "https://supabase",
      SUPABASE_ANON_KEY: "anon-key",
    };
    
    // Mock global fetch for Supabase auth
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });
  });

  const authHeaders = {
    "Authorization": "Bearer valid-token",
  };

  it("POST /sessions should create a session and register ownership", async () => {
    const res = await app.fetch(
      new Request("http://localhost/sessions", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Box", region: "lhr" }),
      }),
      env
    );

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.sessionId).toBeDefined();
    expect(body.id).toBe(body.sessionId);

    // Verify ownership registered in D1
    const ownership = await mockD1.prepare("SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?")
      .bind("user-123", body.sessionId).first();
    expect(ownership).toBeDefined();
  });

  it("GET /sessions should return owned sessions with metadata", async () => {
    // 1. Create a session first
    const createRes = await app.fetch(
      new Request("http://localhost/sessions", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Box 1" }),
      }),
      env
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;

    // 2. List sessions
    const res = await app.fetch(
      new Request("http://localhost/sessions", {
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any[];
    expect(body.length).toBe(1);
    expect(body[0].sessionId).toBe(created.sessionId);
    expect(body[0].title).toBe("Box 1");
  });

  it("GET /sessions/:id should verify ownership", async () => {
    // Create for user-123
    const createRes = await app.fetch(
      new Request("http://localhost/sessions", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Box 1" }),
      }),
      env
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;

    // Try to access as user-123 (success)
    const res = await app.fetch(
      new Request(`http://localhost/sessions/${created.sessionId}`, {
        headers: authHeaders,
      }),
      env
    );
    expect(res.status).toBe(200);

    // Mock different user
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: "other-user" }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    // Try to access as other-user (forbidden)
    const resOther = await app.fetch(
      new Request(`http://localhost/sessions/${created.sessionId}`, {
        headers: authHeaders,
      }),
      env
    );
    expect(resOther.status).toBe(403);
  });

  it("DELETE /sessions/:id should delete from engine and D1", async () => {
    const createRes = await app.fetch(
      new Request("http://localhost/sessions", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "To Delete" }),
      }),
      env
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;

    const res = await app.fetch(
      new Request(`http://localhost/sessions/${created.sessionId}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
      env
    );
    expect(res.status).toBe(200);

    // Verify deleted from D1
    const ownership = await mockD1.prepare("SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?")
      .bind("user-123", created.sessionId).first();
    expect(ownership).toBeNull();

    // Verify deleted from engine
    expect(mockSandboxMcp._sessions.has(created.sessionId)).toBe(false);
  });
});
