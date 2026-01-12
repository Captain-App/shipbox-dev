import { Hono } from "hono";
import { Effect, Schema, Exit, Cause } from "effect";
import { SessionService, makeSessionServiceLayer } from "../services/session";
import { CreateSessionInput } from "@shipbox/shared";
import { QuotaService, makeQuotaServiceLayer } from "../services/quota";
import { BillingService, makeBillingServiceLayer } from "../services/billing";
import { EmailService, makeEmailServiceLayer } from "../services/email";

type Bindings = {
  DB: D1Database;
  SANDBOX_MCP: Fetcher;
};

type Variables = {
  user: { id: string };
};

export const sessionsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .get("/", async (c) => {
    const user = c.get("user");
    const service = Effect.runSync(
      Effect.map(SessionService, (s) => s).pipe(
        Effect.provide(makeSessionServiceLayer(c.env.DB))
      )
    );

    const sessionIds = await Effect.runPromise(service.listOwned(user.id));
    
    // Fetch metadata for each owned session
    // In a production app, we might want a bulk fetch endpoint in sandbox-mcp
    const traceparent = c.req.header("traceparent");
    const baggage = c.req.header("baggage");
    const forwardHeaders: Record<string, string> = {};
    if (traceparent) forwardHeaders["traceparent"] = traceparent;
    if (baggage) forwardHeaders["baggage"] = baggage;

    const sessions = await Promise.all(
      sessionIds.map(async (id) => {
        const res = await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}`, {
          headers: forwardHeaders,
        });
        if (res.ok) {
          const s = await res.json() as any;
          return { ...s, id: s.sessionId };
        }
        return null;
      })
    );

    return c.json(sessions.filter(s => s !== null));
  })
  .post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    
    // Validate input
    const decodeResult = Effect.runSyncExit(Schema.decodeUnknown(CreateSessionInput)(body));
    if (Exit.isFailure(decodeResult)) {
      return c.json({ error: "Invalid input" }, 400);
    }
    const input = decodeResult.value;

    const quotaServiceLayer = makeQuotaServiceLayer(c.env.DB);
    const billingServiceLayer = makeBillingServiceLayer(c.env.DB);
    const emailServiceLayer = makeEmailServiceLayer();

    // Grant starter credits if it's the first time
    await Effect.runPromise(
      Effect.gen(function* () {
        const billing = yield* BillingService;
        const emailService = yield* EmailService;
        const granted = yield* billing.grantStarterCredits(user.id);
        if (granted) {
          yield* emailService.sendWelcomeEmail(user.email);
        }
      }).pipe(
        Effect.provide(billingServiceLayer),
        Effect.provide(emailServiceLayer)
      )
    );

    // Check quota and balance first
    const quotaResult = await Effect.runPromiseExit(
      Effect.all([
        Effect.flatMap(QuotaService, (s) => s.checkSandboxQuota(user.id)),
        Effect.flatMap(QuotaService, (s) => s.checkBalance(user.id))
      ]).pipe(Effect.provide(quotaServiceLayer))
    );
    
    if (Exit.isFailure(quotaResult)) {
      const error = Cause.failureOrCause(quotaResult.cause);
      const message = error._tag === "Left" ? error.left.message : "Quota or balance check failed";
      return c.json({ error: message }, 403);
    }

    const service = Effect.runSync(
      Effect.map(SessionService, (s) => s).pipe(
        Effect.provide(makeSessionServiceLayer(c.env.DB))
      )
    );

    const traceparent = c.req.header("traceparent");
    const baggage = c.req.header("baggage");
    const forwardHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (traceparent) forwardHeaders["traceparent"] = traceparent;
    if (baggage) forwardHeaders["baggage"] = baggage;

    // 1. Create session in sandbox-mcp
    const res = await c.env.SANDBOX_MCP.fetch("http://sandbox/internal/sessions", {
      method: "POST",
      body: JSON.stringify({ ...input, userId: user.id }),
      headers: forwardHeaders
    });

    if (!res.ok) {
      return c.json({ error: "Failed to create session in engine" }, 500);
    }

    const session = await res.json() as any;

    // 2. Register ownership in D1
    await Effect.runPromise(service.register(user.id, session.sessionId));

    // Return the session with an 'id' field to match frontend expectations
    return c.json({ ...session, id: session.sessionId }, 201);
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const service = Effect.runSync(
      Effect.map(SessionService, (s) => s).pipe(
        Effect.provide(makeSessionServiceLayer(c.env.DB))
      )
    );

    // Check ownership
    const isOwned = await Effect.runPromise(service.checkOwnership(user.id, id));
    if (!isOwned) return c.json({ error: "Forbidden" }, 403);

    const traceparent = c.req.header("traceparent");
    const baggage = c.req.header("baggage");
    const forwardHeaders: Record<string, string> = {};
    if (traceparent) forwardHeaders["traceparent"] = traceparent;
    if (baggage) forwardHeaders["baggage"] = baggage;

    // Proxy to sandbox-mcp
    const res = await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}`, {
      headers: forwardHeaders
    });
    if (!res.ok) return c.json({ error: "Session not found in engine" }, 404);
    
    const session = await res.json() as any;
    return c.json({ ...session, id: session.sessionId });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const service = Effect.runSync(
      Effect.map(SessionService, (s) => s).pipe(
        Effect.provide(makeSessionServiceLayer(c.env.DB))
      )
    );

    // Check ownership
    const isOwned = await Effect.runPromise(service.checkOwnership(user.id, id));
    if (!isOwned) return c.json({ error: "Forbidden" }, 403);

    const traceparent = c.req.header("traceparent");
    const baggage = c.req.header("baggage");
    const forwardHeaders: Record<string, string> = {};
    if (traceparent) forwardHeaders["traceparent"] = traceparent;
    if (baggage) forwardHeaders["baggage"] = baggage;

    // Delete in sandbox-mcp
    await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}`, { 
      method: "DELETE",
      headers: forwardHeaders
    });

    // Unregister in D1
    await Effect.runPromise(service.unregister(user.id, id));

    return c.json({ success: true });
  })
  .post("/:id/start", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const service = Effect.runSync(
      Effect.map(SessionService, (s) => s).pipe(
        Effect.provide(makeSessionServiceLayer(c.env.DB))
      )
    );

    // Check ownership
    const isOwned = await Effect.runPromise(service.checkOwnership(user.id, id));
    if (!isOwned) return c.json({ error: "Forbidden" }, 403);

    const traceparent = c.req.header("traceparent");
    const baggage = c.req.header("baggage");
    const forwardHeaders: Record<string, string> = {};
    if (traceparent) forwardHeaders["traceparent"] = traceparent;
    if (baggage) forwardHeaders["baggage"] = baggage;

    // Start in sandbox-mcp
    const res = await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}/start`, { 
      method: "POST",
      headers: forwardHeaders
    });
    return c.json(await res.json());
  });
