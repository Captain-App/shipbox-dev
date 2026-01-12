import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";
import { StripeService, makeStripeServiceLayer } from "./stripe";

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

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => mockStripe),
  };
});

describe("StripeService", () => {
  const API_KEY = "sk_test_123";
  const WEBHOOK_SECRET = "whsec_123";
  const APP_URL = "https://app.test";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a checkout session", async () => {
    const layer = makeStripeServiceLayer(API_KEY, WEBHOOK_SECRET, APP_URL);
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: "https://stripe.com/pay" });
    
    const program = Effect.gen(function* () {
      const service = yield* StripeService;
      return yield* service.createCheckoutSession("user-123", 1000);
    });
    
    const result = await Effect.runPromise(Effect.provide(program, layer));
    
    expect(result.url).toBe("https://stripe.com/pay");
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          userId: "user-123",
          amountCredits: "1000",
        },
      })
    );
  });

  it("should handle valid webhook event", async () => {
    const layer = makeStripeServiceLayer(API_KEY, WEBHOOK_SECRET, APP_URL);
    mockStripe.webhooks.constructEventAsync.mockResolvedValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          customer_details: {
            email: "test@example.com",
          },
          metadata: {
            userId: "user-123",
            amountCredits: "5000",
          },
        },
      },
    });
    
    const program = Effect.gen(function* () {
      const service = yield* StripeService;
      return yield* service.handleWebhook("payload", "sig");
    });
    
    const result = await Effect.runPromise(Effect.provide(program, layer));
    
    expect(result.userId).toBe("user-123");
    expect(result.amountCredits).toBe(5000);
    expect(result.customerId).toBe("cus_123");
    expect(result.email).toBe("test@example.com");
  });

  it("should handle unhandled webhook event type gracefully", async () => {
    const layer = makeStripeServiceLayer(API_KEY, WEBHOOK_SECRET, APP_URL);
    mockStripe.webhooks.constructEventAsync.mockResolvedValue({
      type: "payment_intent.succeeded",
    });
    
    const program = Effect.gen(function* () {
      const service = yield* StripeService;
      return yield* service.handleWebhook("payload", "sig");
    });
    
    const result = await Effect.runPromise(Effect.provide(program, layer));
    expect(result.userId).toBe("");
    expect(result.amountCredits).toBe(0);
    expect(result.customerId).toBe("");
    expect(result.email).toBe("");
  });
});
