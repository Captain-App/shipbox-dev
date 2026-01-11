import { Hono } from "hono";
import { cors } from "hono/cors";
import { Effect, Exit } from "effect";
import { withSentry } from "@sentry/cloudflare";
import { sessionsRoutes } from "./routes/sessions";
import { githubRoutes } from "./routes/github";
import { settingsRoutes } from "./routes/settings";
import { billingRoutes } from "./routes/billing";
import { GitHubService, makeGitHubServiceLayer } from "./services/github";
import { ApiKeyService, makeApiKeyServiceLayer } from "./services/api-keys";
import { makeBillingServiceLayer, BillingService } from "./services/billing";
import { Option } from "effect";

export type Bindings = {
  DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SANDBOX_MCP: Fetcher;
  SENTRY_DSN?: string;
  PROXY_JWT_SECRET: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_NAME: string;
  GITHUB_WEBHOOK_SECRET: string;
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  APP_URL?: string;
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

  if (Exit.isFailure(result)) {
    return c.json({ error: "Failed to report usage" }, 500);
  }

  return c.json({ success: true });
});

app.post("/internal/report-token-usage", async (c) => {
  const body = await c.req.json();
  const { userId, sessionId, service, inputTokens, outputTokens, model } = body;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const billing = yield* BillingService;
      return yield* billing.reportTokenUsage(userId, sessionId, service, inputTokens, outputTokens, model);
    }).pipe(Effect.provide(makeBillingServiceLayer(c.env.DB)))
  );

  if (Exit.isFailure(result)) {
    return c.json({ error: "Failed to report token usage" }, 500);
  }

  return c.json({ success: true });
});

app.use("/sessions/*", async (c, next) => {
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
  c.set("user", { id: user.id });
  await next();
});

app.use("/github/*", async (c, next) => {
  // Skip auth for webhooks
  if (c.req.path === "/github/webhook") {
    await next();
    return;
  }
  
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
  c.set("user", { id: user.id });
  await next();
});

app.use("/settings/*", async (c, next) => {
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
  c.set("user", { id: user.id });
  await next();
});

// Internal API for engine to resolve keys/tokens
app.get("/internal/user-config/:userId", async (c) => {
  const userId = c.req.param("userId");
  
  const githubLayer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);
  const apiKeyLayer = makeApiKeyServiceLayer(c.env.DB, c.env.PROXY_JWT_SECRET);

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const githubService = yield* GitHubService;
      const apiKeyService = yield* ApiKeyService;
      
      const githubToken = yield* Effect.catchAll(githubService.getInstallationToken(userId), () => Effect.succeed(null));
      const anthropicKey = yield* Effect.catchAll(apiKeyService.getApiKey(userId), () => Effect.succeed(Option.none()));
      
      return {
        githubToken,
        anthropicKey: Option.getOrNull(anthropicKey),
      };
    }).pipe(
      Effect.provide(githubLayer),
      Effect.provide(apiKeyLayer)
    )
  );

  if (Exit.isFailure(result)) {
    return c.json({ error: "Internal server error" }, 500);
  }

  return c.json(result.value);
});

// Mount modular routes
app.route("/sessions", sessionsRoutes);
app.route("/github", githubRoutes);
app.route("/settings", settingsRoutes);
app.route("/billing", billingRoutes);

// Internal API for engine to check balance
app.get("/internal/check-balance/:userId", async (c) => {
  const userId = c.req.param("userId");
  const quotaLayer = makeQuotaServiceLayer(c.env.DB);

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const quota = yield* QuotaService;
      return yield* quota.checkBalance(userId);
    }).pipe(Effect.provide(quotaLayer))
  );

  if (Exit.isFailure(result)) {
    const error = Cause.failureOrCause(result.cause);
    const message = error._tag === "Left" ? error.left.message : "Balance check failed";
    return c.json({ error: message, ok: false }, 402); // Payment Required
  }

  return c.json({ ok: true });
});

// Proxy to sandbox-mcp MCP endpoint
app.all("/mcp", async (c) => {
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
  
  // Create a new request with the user ID injected in headers
  const newRequest = new Request(c.req.raw);
  newRequest.headers.set("X-User-Id", user.id);
  
  return c.env.SANDBOX_MCP.fetch(newRequest);
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
