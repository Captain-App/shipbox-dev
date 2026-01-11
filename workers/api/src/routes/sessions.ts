import { Hono } from "hono";
import { Effect, Schema } from "effect";
import { SessionService, makeSessionServiceLayer } from "../services/session";
import { CreateSessionInput } from "../models/session";
import { QuotaService, makeQuotaServiceLayer } from "../services/quota";

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
    const sessions = await Promise.all(
      sessionIds.map(async (id) => {
        const res = await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}`);
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
    if (Effect.Exit.isFailure(decodeResult)) {
      return c.json({ error: "Invalid input" }, 400);
    }
    const input = decodeResult.value;

    const quotaService = Effect.runSync(
      Effect.map(QuotaService, (s) => s).pipe(
        Effect.provide(makeQuotaServiceLayer(c.env.DB))
      )
    );

    // Check quota first
    const quotaResult = await Effect.runPromiseExit(quotaService.checkSandboxQuota(user.id));
    if (Effect.Exit.isFailure(quotaResult)) {
      return c.json({ error: (quotaResult.cause as any).defect?.message || "Quota exceeded" }, 403);
    }

    const service = Effect.runSync(
      Effect.map(SessionService, (s) => s).pipe(
        Effect.provide(makeSessionServiceLayer(c.env.DB))
      )
    );

    // 1. Create session in sandbox-mcp
    const res = await c.env.SANDBOX_MCP.fetch("http://sandbox/internal/sessions", {
      method: "POST",
      body: JSON.stringify({ ...input, userId: user.id }),
      headers: { "Content-Type": "application/json" }
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

    // Proxy to sandbox-mcp
    const res = await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}`);
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

    // Delete in sandbox-mcp
    await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}`, { method: "DELETE" });

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

    // Start in sandbox-mcp
    const res = await c.env.SANDBOX_MCP.fetch(`http://sandbox/internal/sessions/${id}/start`, { method: "POST" });
    return c.json(await res.json());
  });
