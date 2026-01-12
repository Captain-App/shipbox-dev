import { Hono } from "hono";
import { cors } from "hono/cors";
import { Effect, Exit, Cause } from "effect";
import { withSentry } from "@sentry/cloudflare";
import { sessionsRoutes } from "./routes/sessions";
import { githubRoutes } from "./routes/github";
import { settingsRoutes } from "./routes/settings";
import { billingRoutes } from "./routes/billing";
import { boxSecretsRoutes } from "./routes/box-secrets";
import { GitHubService, makeGitHubServiceLayer } from "./services/github";
import { ApiKeyService, makeApiKeyServiceLayer } from "./services/api-keys";
import { makeBillingServiceLayer, BillingService } from "./services/billing";
import { makeQuotaServiceLayer, QuotaService } from "./services/quota";
import { Option } from "effect";
import { loggingMiddleware } from "./middleware/logging";
import { LoggerLayer, withRequestContext } from "@shipbox/shared";
import { instrumentation } from "@microlabs/otel-cf-workers";

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
  HONEYCOMB_API_KEY?: string;
  HONEYCOMB_DATASET?: string;
};

export type Variables = {
  user: { id: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Health check - no auth needed
app.get("/health", (c) => c.text("OK"));

// Logging & Request ID
app.use("*", loggingMiddleware());

// CORS
app.use("*", cors());

// Authentication Middleware
const authMiddleware = async (c: any, next: any) => {
  // Skip auth for internal and webhooks
  if (
    c.req.path.startsWith("/internal/") ||
    c.req.path === "/github/webhook" ||
    c.req.path === "/billing/webhook"
  ) {
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
};

app.use("*", authMiddleware);

// Internal API for usage reporting (called by engine)
app.post("/internal/report-usage", async (c) => {
  const body = await c.req.json();
  const { userId, sessionId, durationMs } = body;
  const requestId = c.get("requestId");

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const service = yield* BillingService;
      return yield* service.reportUsage(userId, sessionId, durationMs);
    }).pipe(
      Effect.provide(makeBillingServiceLayer(c.env.DB)),
      withRequestContext(requestId, userId, sessionId),
      Effect.provide(LoggerLayer)
    )
  );

  if (Exit.isFailure(result)) {
    return c.json({ error: "Failed to report usage" }, 500);
  }

  return c.json({ success: true });
});

app.post("/internal/report-token-usage", async (c) => {
  const body = await c.req.json();
  const { userId, sessionId, service, inputTokens, outputTokens, model } = body;
  const requestId = c.get("requestId");

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const billing = yield* BillingService;
      return yield* billing.reportTokenUsage(userId, sessionId, service, inputTokens, outputTokens, model);
    }).pipe(
      Effect.provide(makeBillingServiceLayer(c.env.DB)),
      withRequestContext(requestId, userId, sessionId),
      Effect.provide(LoggerLayer)
    )
  );

  if (Exit.isFailure(result)) {
    return c.json({ error: "Failed to report token usage" }, 500);
  }

  return c.json({ success: true });
});

// Internal API for engine to resolve keys/tokens
app.get("/internal/user-config/:userId", async (c) => {
  const userId = c.req.param("userId");
  const requestId = c.get("requestId");
  
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
      Effect.provide(apiKeyLayer),
      withRequestContext(requestId, userId),
      Effect.provide(LoggerLayer)
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
app.route("/box-secrets", boxSecretsRoutes);

// Internal API for engine to check balance
app.get("/internal/check-balance/:userId", async (c) => {
  const userId = c.req.param("userId");
  const requestId = c.get("requestId");
  const quotaLayer = makeQuotaServiceLayer(c.env.DB);

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const quota = yield* QuotaService;
      return yield* quota.checkBalance(userId);
    }).pipe(
      Effect.provide(quotaLayer),
      withRequestContext(requestId, userId),
      Effect.provide(LoggerLayer)
    )
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
  const user = c.get("user");
  const requestId = c.get("requestId");
  
  // Create a new request with the user ID injected in headers
  const newRequest = new Request(c.req.raw);
  newRequest.headers.set("X-User-Id", user.id);
  newRequest.headers.set("X-Request-Id", requestId);
  
  return c.env.SANDBOX_MCP.fetch(newRequest);
});

// Proxy to sandbox-mcp web UI
app.all("/session/:sessionId/*", async (c) => {
  const user = c.get("user");
  const requestId = c.get("requestId");
  const sessionId = c.req.param("sessionId");

  // Check ownership
  const ownership = await c.env.DB.prepare(
    "SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?"
  ).bind(user.id, sessionId).first();

  if (!ownership) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Create a new request with the Request ID injected in headers
  const newRequest = new Request(c.req.raw);
  newRequest.headers.set("X-Request-Id", requestId);

  // Proxy to sandbox-mcp
  return c.env.SANDBOX_MCP.fetch(newRequest);
});

// Export unwrapped app for testing
export { app };

// Export app type for Hono RPC
export type AppType = typeof app;

// Wrap app with Sentry and OTel
export default instrumentation(
  (env: Bindings) => ({
    exporter: {
      url: "https://api.honeycomb.io/v1/traces",
      headers: {
        "x-honeycomb-team": env.HONEYCOMB_API_KEY || "",
        "x-honeycomb-dataset": env.HONEYCOMB_DATASET || "shipbox-api",
      },
    },
    service: { name: "shipbox-api" },
  }),
  {
    fetch: (request: Request, env: Bindings, ctx: ExecutionContext) => {
      const handler = withSentry(
        (env: Bindings) => ({
          dsn: env.SENTRY_DSN,
          tracesSampleRate: 1.0,
        }),
        app.fetch
      );
      return handler(request, env, ctx);
    }
  }
);
