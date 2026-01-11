import { Hono } from "hono";
import { cors } from "hono/cors";
import { Effect } from "effect";
import { withSentry } from "@sentry/cloudflare";
import { sessionsRoutes } from "./routes/sessions";
import { makeBillingServiceLayer, BillingService } from "./services/billing";

export type Bindings = {
  DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SANDBOX_MCP: Fetcher;
  SENTRY_DSN?: string;
};

export type Variables = {
  user: { id: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Health check - no auth needed
app.get("/health", (c) => c.text("OK"));

// Wrap app with Sentry
const handler = withSentry(
  (env: Bindings) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  app.fetch
);

// CORS
app.use("*", cors());

// Internal API for usage reporting (called by engine)
app.post("/internal/report-usage", async (c) => {
  const body = await c.req.json();
  const { userId, sessionId, durationMs } = body;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const service = yield* BillingService;
      return yield* service.reportUsage(userId, sessionId, durationMs);
    }).pipe(Effect.provide(makeBillingServiceLayer(c.env.DB)))
  );

  if (Effect.Exit.isFailure(result)) {
    return c.json({ error: "Failed to report usage" }, 500);
  }

  return c.json({ success: true });
});

// Minimal auth middleware - verify JWT with Supabase GoTrue API directly
app.use("/sessions/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  // Call Supabase GoTrue API directly instead of using SDK
  // In tests, we'll need to mock this global fetch
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": c.env.SUPABASE_ANON_KEY,
    }
  });

  if (!res.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await res.json() as { id: string };
  c.set("user", { id: user.id });
  await next();
});

// Mount modular routes
app.route("/sessions", sessionsRoutes);

// Billing routes
app.get("/billing/balance", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": c.env.SUPABASE_ANON_KEY,
    }
  });

  if (!res.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await res.json() as { id: string };
  
  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const service = yield* BillingService;
      return yield* service.getBalance(user.id);
    }).pipe(Effect.provide(makeBillingServiceLayer(c.env.DB)))
  );

  if (Effect.Exit.isFailure(result)) {
    return c.json({ error: "Failed to get balance" }, 500);
  }

  return c.json(result.value);
});

// Proxy to sandbox-mcp web UI
app.all("/session/:sessionId/*", async (c) => {
  // Auth check for proxy
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": c.env.SUPABASE_ANON_KEY,
    }
  });

  if (!res.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await res.json() as { id: string };
  const sessionId = c.req.param("sessionId");

  // Check ownership
  const ownership = await c.env.DB.prepare(
    "SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?"
  ).bind(user.id, sessionId).first();

  if (!ownership) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Proxy to sandbox-mcp
  return c.env.SANDBOX_MCP.fetch(c.req.raw);
});

// Proxy to sandbox-mcp web UI
app.all("/session/:sessionId/*", async (c) => {
  // Auth check for proxy
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": c.env.SUPABASE_ANON_KEY,
    }
  });

  if (!res.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await res.json() as { id: string };
  const sessionId = c.req.param("sessionId");

  // Check ownership
  const ownership = await c.env.DB.prepare(
    "SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?"
  ).bind(user.id, sessionId).first();

  if (!ownership) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Proxy to sandbox-mcp
  return c.env.SANDBOX_MCP.fetch(c.req.raw);
});

export default {
  fetch: handler,
};
