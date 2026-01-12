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

// Mock jose for GitHubService
vi.mock("jose", () => ({
  importPKCS8: vi.fn().mockResolvedValue({}),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt"),
  })),
}));

describe("GitHub Routes", () => {
  let mockD1: ReturnType<typeof createMockD1>;
  let env: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = createMockD1();
    env = {
      DB: mockD1,
      GITHUB_APP_ID: "123",
      GITHUB_APP_PRIVATE_KEY: "key",
      GITHUB_APP_NAME: "shipbox",
      GH_WEBHOOK_SECRET: "whsec_github",
      SUPABASE_URL: "https://supabase",
      SUPABASE_ANON_KEY: "anon-key",
    };
    
    // Mock global fetch
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
      }
      if (url.includes("api.github.com/app/installations/")) {
        return new Response(JSON.stringify({ 
          account: { login: "crew", type: "User" } 
        }), { status: 200 });
      }
      if (url.includes("/access_tokens")) {
        return new Response(JSON.stringify({ token: "gh-token" }), { status: 200 });
      }
      if (url.includes("/installation/repositories")) {
        return new Response(JSON.stringify({ 
          repositories: [{ id: 1, name: "repo1", full_name: "crew/repo1", html_url: "https://github.com/crew/repo1" }] 
        }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });
  });

  const authHeaders = {
    "Authorization": "Bearer valid-token",
  };

  it("GET /github/install should redirect to github", async () => {
    const res = await app.fetch(
      new Request("http://localhost/github/install", {
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("github.com/apps/shipbox/installations/new");
  });

  it("POST /github/link should link installation to user", async () => {
    const res = await app.fetch(
      new Request("http://localhost/github/link", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ installationId: "12345" }),
      }),
      env
    );

    expect(res.status).toBe(200);
    
    // Verify status
    const statusRes = await app.fetch(
      new Request("http://localhost/github/status", {
        headers: authHeaders,
      }),
      env
    );
    const status = await statusRes.json() as any;
    expect(status.accountLogin).toBe("crew");
  });

  it("GET /github/repos should return accessible repos", async () => {
    // Link first
    await app.fetch(
      new Request("http://localhost/github/link", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ installationId: "12345" }),
      }),
      env
    );

    const res = await app.fetch(
      new Request("http://localhost/github/repos", {
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(200);
    const repos = await res.json() as any[];
    expect(repos.length).toBe(1);
    expect(repos[0].name).toBe("repo1");
  });

  it("DELETE /github/installation should disconnect", async () => {
    // Link first
    await app.fetch(
      new Request("http://localhost/github/link", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ installationId: "12345" }),
      }),
      env
    );

    const res = await app.fetch(
      new Request("http://localhost/github/installation", {
        method: "DELETE",
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(200);
    
    // Verify disconnected
    const statusRes = await app.fetch(
      new Request("http://localhost/github/status", {
        headers: authHeaders,
      }),
      env
    );
    const status = await statusRes.json() as any;
    expect(status).toBeNull();
  });
});
