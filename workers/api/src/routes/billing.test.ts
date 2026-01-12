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

// Mock Stripe SDK
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
    constructEventAsync: vi.fn(),
  },
};

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => mockStripe),
}));

describe("Billing Routes", () => {
  let mockD1: ReturnType<typeof createMockD1>;
  let env: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = createMockD1();
    env = {
      DB: mockD1,
      STRIPE_API_KEY: "sk_test",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
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

  it("GET /billing/balance should return user balance", async () => {
    const res = await app.fetch(
      new Request("http://localhost/billing/balance", {
        headers: authHeaders,
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.balanceCredits).toBe(1000);
  });

  it("POST /billing/checkout should create stripe session", async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: "https://pay.stripe.com/123" });

    const res = await app.fetch(
      new Request("http://localhost/billing/checkout", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ amountCredits: 1000 }),
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.url).toBe("https://pay.stripe.com/123");
  });

  it("POST /billing/checkout should reject low amounts", async () => {
    const res = await app.fetch(
      new Request("http://localhost/billing/checkout", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ amountCredits: 100 }),
      }),
      env
    );

    expect(res.status).toBe(400);
  });

  it("POST /billing/webhook should handle completed checkout", async () => {
    mockStripe.webhooks.constructEventAsync.mockResolvedValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {
            userId: "user-123",
            amountCredits: "5000",
          },
        },
      },
    });

    const res = await app.fetch(
      new Request("http://localhost/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "valid-sig" },
        body: "payload",
      }),
      env
    );

    expect(res.status).toBe(200);
    
    // Verify balance increased
    const balanceRes = await app.fetch(
      new Request("http://localhost/billing/balance", {
        headers: authHeaders,
      }),
      env
    );
    const balance = await balanceRes.json() as any;
    expect(balance.balanceCredits).toBe(6000);
  });
});
