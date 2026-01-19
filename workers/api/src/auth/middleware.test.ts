/**
 * Tests for Authentication Middleware
 *
 * Integration tests for the complete auth middleware including route skipping,
 * token validation, and context population.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "../test-utils/d1-mock";
import { createAuthMiddleware } from "./middleware";
import type { Bindings, Variables } from "../index";

describe("Auth Middleware", () => {
  let mockDb: ReturnType<typeof createMockD1>;
  let env: Bindings;
  let app: Hono<{ Bindings: Bindings; Variables: Variables }>;

  beforeEach(() => {
    mockDb = createMockD1();
    env = {
      DB: mockDb,
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
      SANDBOX_MCP: {
        fetch: vi.fn(),
      } as any,
      PROXY_JWT_SECRET: "secret",
      GITHUB_APP_ID: "123",
      GITHUB_APP_PRIVATE_KEY: "key",
      GITHUB_APP_NAME: "app",
      GITHUB_WEBHOOK_SECRET: "secret",
      STRIPE_API_KEY: "sk_test",
      STRIPE_WEBHOOK_SECRET: "secret",
      RATE_LIMITER: {
        limit: async () => ({ success: true }),
      },
    };

    // Set up test app with auth middleware
    app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
    app.use("*", createAuthMiddleware());

    // Public endpoint for testing
    app.get("/health", (c) => c.json({ status: "ok" }));

    // Internal endpoint for testing
    app.get("/internal/test", (c) => c.json({ internal: true }));

    // Protected endpoint
    app.get("/protected", (c) => {
      const user = c.get("user");
      return c.json({ userId: user.id, email: user.email });
    });

    // Mock global fetch for Supabase
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/auth/v1/user")) {
        return new Response(
          JSON.stringify({ id: "user-123", email: "test@example.com" }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });
  });

  describe("Public Routes", () => {
    it("should allow /health without Authorization header", async () => {
      const res = await app.fetch(
        new Request("http://localhost/health"),
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe("ok");
    });

    it("should allow /internal/* without Authorization header", async () => {
      const res = await app.fetch(
        new Request("http://localhost/internal/test"),
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.internal).toBe(true);
    });

    it("should allow /admin/* without Authorization header", async () => {
      // Add admin endpoint
      app.get("/admin/test", (c) => c.json({ admin: true }));

      const res = await app.fetch(
        new Request("http://localhost/admin/test"),
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.admin).toBe(true);
    });

    it("should allow /github/webhook without Authorization header", async () => {
      app.post("/github/webhook", (c) => c.json({ webhook: true }));

      const res = await app.fetch(
        new Request("http://localhost/github/webhook", { method: "POST" }),
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.webhook).toBe(true);
    });

    it("should allow /billing/webhook without Authorization header", async () => {
      app.post("/billing/webhook", (c) => c.json({ webhook: true }));

      const res = await app.fetch(
        new Request("http://localhost/billing/webhook", { method: "POST" }),
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.webhook).toBe(true);
    });
  });

  describe("Protected Routes", () => {
    it("should return 401 without Authorization header", async () => {
      const res = await app.fetch(
        new Request("http://localhost/protected"),
        env,
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 with invalid Authorization format", async () => {
      const res = await app.fetch(
        new Request("http://localhost/protected", {
          headers: { Authorization: "InvalidFormat" },
        }),
        env,
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 with Bearer but no token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/protected", {
          headers: { Authorization: "Bearer " },
        }),
        env,
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.error).toBe("Unauthorized");
    });

    it("should validate Supabase JWT and set user context", async () => {
      const res = await app.fetch(
        new Request("http://localhost/protected", {
          headers: { Authorization: "Bearer valid-jwt-token" },
        }),
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.userId).toBe("user-123");
      expect(body.email).toBe("test@example.com");
    });

    it("should return error details on validation failure", async () => {
      // Mock fetch to return error
      vi.stubGlobal("fetch", async () => {
        return new Response(
          JSON.stringify({
            error: "invalid_token",
            error_description: "Token has expired",
          }),
          { status: 401 },
        );
      });

      const res = await app.fetch(
        new Request("http://localhost/protected", {
          headers: { Authorization: "Bearer expired-token" },
        }),
        env,
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.error).toBe("Unauthorized");
      expect(body.details).toBeDefined();
    });
  });

  describe("API Key Authentication", () => {
    it("should recognize API keys by sb_ prefix", async () => {
      // API keys starting with sb_ should use different validator
      // This test documents the expected routing behavior

      const res = await app.fetch(
        new Request("http://localhost/protected", {
          headers: { Authorization: "Bearer sb_testkey123" },
        }),
        env,
      );

      // Should fail because key is not in database
      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("Context Population", () => {
    it("should set user in context for protected routes", async () => {
      let capturedUser: any;

      app.get("/capture-user", (c) => {
        capturedUser = c.get("user");
        return c.json({ ok: true });
      });

      await app.fetch(
        new Request("http://localhost/capture-user", {
          headers: { Authorization: "Bearer valid-jwt-token" },
        }),
        env,
      );

      expect(capturedUser).toBeDefined();
      expect(capturedUser.id).toBe("user-123");
      expect(capturedUser.email).toBe("test@example.com");
    });

    it("should not set user for public routes", async () => {
      let capturedUser: any;

      app.get("/health-capture", (c) => {
        capturedUser = c.get("user");
        return c.json({ ok: true });
      });

      await app.fetch(
        new Request("http://localhost/health-capture"),
        env,
      );

      // User should not be set for public routes
      expect(capturedUser).toBeUndefined();
    });
  });
});
