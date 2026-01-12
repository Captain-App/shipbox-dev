import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cloudflare-specific imports before importing index
vi.mock("@microlabs/otel-cf-workers", () => ({
  instrumentation: (handler: any) => ({
    fetch: (request: Request, env: any, ctx: any) => handler.fetch(request, env, ctx)
  }),
}));

vi.mock("@sentry/cloudflare", () => ({
  withSentry: (config: any, handler: any) => handler,
  setTag: vi.fn(),
  setContext: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

import { app } from "../index";
import { createMockD1 } from "../test-utils/d1-mock";

// Mock crypto
if (typeof global.crypto === "undefined") {
  const { crypto } = require("node:crypto");
  global.crypto = crypto;
}

describe("Settings Routes", () => {
  let mockD1: ReturnType<typeof createMockD1>;
  let env: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = createMockD1();
    env = {
      DB: mockD1,
      PROXY_JWT_SECRET: "test-secret",
      SUPABASE_URL: "https://supabase",
      SUPABASE_ANON_KEY: "anon-key",
    };
    
    // Mock global fetch
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

  it("GET /settings/api-keys should return null hint for new user", async () => {
    const res = await app.fetch(
      new Request("http://localhost/settings/api-keys", {
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.anthropicHint).toBeNull();
  });

  it("POST /settings/api-keys/anthropic should store key and return 200", async () => {
    const res = await app.fetch(
      new Request("http://localhost/settings/api-keys/anthropic", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "sk-ant-12345" }),
      }),
      env
    );

    expect(res.status).toBe(200);
    
    // Verify hint returned
    const statusRes = await app.fetch(
      new Request("http://localhost/settings/api-keys", {
        headers: authHeaders,
      }),
      env
    );
    const body = await statusRes.json() as any;
    expect(body.anthropicHint).toBe("***2345");
  });

  it("POST /settings/api-keys/anthropic should validate key format", async () => {
    const res = await app.fetch(
      new Request("http://localhost/settings/api-keys/anthropic", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "invalid-key" }),
      }),
      env
    );

    expect(res.status).toBe(400);
  });

  it("DELETE /settings/api-keys/anthropic should remove key", async () => {
    // Store first
    await app.fetch(
      new Request("http://localhost/settings/api-keys/anthropic", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "sk-ant-12345" }),
      }),
      env
    );

    const res = await app.fetch(
      new Request("http://localhost/settings/api-keys/anthropic", {
        method: "DELETE",
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(200);
    
    // Verify hint is gone
    const statusRes = await app.fetch(
      new Request("http://localhost/settings/api-keys", {
        headers: authHeaders,
      }),
      env
    );
    const body = await statusRes.json() as any;
    expect(body.anthropicHint).toBeNull();
  });
});
