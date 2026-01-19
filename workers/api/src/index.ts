import { Hono } from "hono";
import { cors } from "hono/cors";
import { Effect, Exit, Cause, pipe } from "effect";
import { withSentry as sentryWrapper } from "@sentry/cloudflare";
import * as Sentry from "@sentry/cloudflare";
import { sessionsRoutes } from "./routes/sessions";
import { githubRoutes } from "./routes/github";
import { settingsRoutes } from "./routes/settings";
import { billingRoutes } from "./routes/billing";
import { boxSecretsRoutes } from "./routes/box-secrets";
import { adminRoutes } from "./routes/admin";
import { GitHubService, makeGitHubServiceLayer } from "./services/github";
import { ApiKeyService, makeApiKeyServiceLayer } from "./services/api-keys";
import { makeBillingServiceLayer, BillingService } from "./services/billing";
import { makeQuotaServiceLayer, QuotaService } from "./services/quota";
import { Option } from "effect";
import { loggingMiddleware } from "./middleware/logging";
import {
  LoggerLayer,
  withRequestContext,
  withSentry,
  captureEffectError,
} from "@shipbox/shared";
import { instrument } from "@microlabs/otel-cf-workers";
import { createAuthMiddleware } from "./auth";

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
  ADMIN_TOKEN?: string;
  HONEYCOMB_API_KEY?: string;
  HONEYCOMB_DATASET?: string;
  RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
};

export type Variables = {
  user: { id: string; email: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Health check - no auth needed
app.get("/health", (c) => c.text("OK"));

// Health check for engine
app.get("/internal/engine-health", async (c) => {
  try {
    const res = await c.env.SANDBOX_MCP.fetch("http://engine/health");
    if (res.ok) return c.text("OK");
    return c.text("Engine unhealthy", 503);
  } catch (e) {
    return c.text("Engine unreachable", 503);
  }
});

// Logging & Request ID
app.use("*", loggingMiddleware());

// CORS
app.use("*", cors());

// Authentication Middleware
app.use("*", createAuthMiddleware());

// Rate Limiting Middleware
app.use("*", async (c, next) => {
  // Skip for internal, admin, and health
  if (
    c.req.path.startsWith("/internal/") ||
    c.req.path.startsWith("/admin/") ||
    c.req.path === "/health"
  ) {
    await next();
    return;
  }

  const user = c.get("user");
  const key = user ? user.id : c.req.header("cf-connecting-ip") || "anonymous";

  if (c.env.RATE_LIMITER) {
    const { success } = await c.env.RATE_LIMITER.limit({ key });
    if (!success) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
  }

  await next();
});

// Internal API for usage reporting (called by engine)
app.post("/internal/report-usage", async (c) => {
  const body = await c.req.json();
  const { userId, sessionId, durationMs } = body;
  const requestId = c.get("requestId");

  const result = await Effect.runPromiseExit(
    pipe(
      Effect.gen(function* () {
        const service = yield* BillingService;
        return yield* service.reportUsage(userId, sessionId, durationMs);
      }),
      Effect.provide(makeBillingServiceLayer(c.env.DB)),
      withRequestContext(requestId, userId, sessionId),
      withSentry(Sentry as any),
      Effect.provide(LoggerLayer),
    ),
  );

  if (Exit.isFailure(result)) {
    captureEffectError(result.cause, Sentry as any, {
      userId,
      sessionId,
      durationMs,
      route: "/internal/report-usage",
    });
    return c.json({ error: "Failed to report usage" }, 500);
  }

  return c.json({ success: true });
});

app.post("/internal/report-token-usage", async (c) => {
  const body = await c.req.json();
  const { userId, sessionId, service, inputTokens, outputTokens, model } = body;
  const requestId = c.get("requestId");

  const result = await Effect.runPromiseExit(
    pipe(
      Effect.gen(function* () {
        const billing = yield* BillingService;
        return yield* billing.reportTokenUsage(
          userId,
          sessionId,
          service,
          inputTokens,
          outputTokens,
          model,
        );
      }),
      Effect.provide(makeBillingServiceLayer(c.env.DB)),
      withRequestContext(requestId, userId, sessionId),
      withSentry(Sentry as any),
      Effect.provide(LoggerLayer),
    ),
  );

  if (Exit.isFailure(result)) {
    captureEffectError(result.cause, Sentry as any, {
      userId,
      sessionId,
      service,
      model,
      route: "/internal/report-token-usage",
    });
    return c.json({ error: "Failed to report token usage" }, 500);
  }

  return c.json({ success: true });
});

// Internal API for engine to resolve keys/tokens
app.get("/internal/user-config/:userId", async (c) => {
  const userId = c.req.param("userId");
  const requestId = c.get("requestId");

  const githubLayer = makeGitHubServiceLayer(
    c.env.DB,
    c.env.GITHUB_APP_ID,
    c.env.GITHUB_APP_PRIVATE_KEY,
  );
  const apiKeyLayer = makeApiKeyServiceLayer(c.env.DB, c.env.PROXY_JWT_SECRET);

  const result = await Effect.runPromiseExit(
    pipe(
      Effect.gen(function* () {
        const githubService = yield* GitHubService;
        const apiKeyService = yield* ApiKeyService;

        const githubToken = yield* Effect.catchAll(
          githubService.getInstallationToken(userId),
          () => Effect.succeed(null),
        );
        const anthropicKey = yield* Effect.catchAll(
          apiKeyService.getApiKey(userId),
          () => Effect.succeed(Option.none()),
        );

        return {
          githubToken,
          anthropicKey: Option.getOrNull(anthropicKey),
        };
      }),
      Effect.provide(githubLayer),
      Effect.provide(apiKeyLayer),
      withRequestContext(requestId, userId),
      withSentry(Sentry as any),
      Effect.provide(LoggerLayer),
    ),
  );

  if (Exit.isFailure(result)) {
    captureEffectError(result.cause, Sentry as any, {
      userId,
      route: "/internal/user-config",
    });
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
app.route("/admin", adminRoutes);

// Internal API for engine to check balance
app.get("/internal/check-balance/:userId", async (c) => {
  const userId = c.req.param("userId");
  const requestId = c.get("requestId");

  // Allow admin user to bypass balance check
  if (userId === "admin") {
    return c.json({ ok: true });
  }

  const quotaLayer = makeQuotaServiceLayer(c.env.DB);

  const result = await Effect.runPromiseExit(
    pipe(
      Effect.gen(function* () {
        const quota = yield* QuotaService;
        return yield* quota.checkBalance(userId);
      }),
      Effect.provide(quotaLayer),
      withRequestContext(requestId, userId),
      withSentry(Sentry as any),
      Effect.provide(LoggerLayer),
    ),
  );

  if (Exit.isFailure(result)) {
    const error = Cause.failureOrCause(result.cause);
    const message =
      error._tag === "Left" ? error.left.message : "Balance check failed";

    // Only capture unexpected causes, not simple insufficient balance (402)
    if (error._tag === "Right") {
      captureEffectError(result.cause, Sentry as any, {
        userId,
        route: "/internal/check-balance",
      });
    }

    return c.json({ error: message, ok: false }, 402); // Payment Required
  }

  return c.json({ ok: true });
});

/**
 * Get headers to forward from incoming request to internal services.
 * Specifically propagates OTel trace headers for observability.
 */
function getForwardedHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const traceparent = request.headers.get("traceparent");
  const baggage = request.headers.get("baggage");

  if (traceparent) headers["traceparent"] = traceparent;
  if (baggage) headers["baggage"] = baggage;

  return headers;
}

// Proxy to sandbox-mcp MCP endpoint
app.all("/mcp", async (c) => {
  const user = c.get("user");
  const requestId = c.get("requestId");

  // Create a new request with the user ID injected in headers
  const newRequest = new Request(c.req.raw);
  newRequest.headers.set("X-User-Id", user.id);
  newRequest.headers.set("X-Request-Id", requestId);

  // Propagate trace headers
  const forwardHeaders = getForwardedHeaders(c.req.raw);
  for (const [key, value] of Object.entries(forwardHeaders)) {
    newRequest.headers.set(key, value);
  }

  return c.env.SANDBOX_MCP.fetch(newRequest);
});

// Proxy to sandbox-mcp web UI
app.all("/session/:sessionId/*", async (c) => {
  const user = c.get("user");
  const requestId = c.get("requestId");
  const sessionId = c.req.param("sessionId");

  // Check ownership
  const ownership = await c.env.DB.prepare(
    "SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?",
  )
    .bind(user.id, sessionId)
    .first();

  if (!ownership) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Create a new request with the Request ID injected in headers
  const newRequest = new Request(c.req.raw);
  newRequest.headers.set("X-Request-Id", requestId);

  // Propagate trace headers
  const forwardHeaders = getForwardedHeaders(c.req.raw);
  for (const [key, value] of Object.entries(forwardHeaders)) {
    newRequest.headers.set(key, value);
  }

  // Proxy to sandbox-mcp
  return c.env.SANDBOX_MCP.fetch(newRequest);
});

// Export unwrapped app for testing
export { app };

// Export app type for Hono RPC
export type AppType = typeof app;

// Wrap app with Sentry and OTel
export default instrument(
  sentryWrapper(
    (env: Bindings) => ({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    }),
    {
      fetch: app.fetch,
    },
  ),
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
);
