/**
 * Authentication Middleware
 *
 * Core middleware that handles authentication for all protected API endpoints.
 * Supports two token types: Supabase JWT and Shipbox API keys.
 *
 * ## Token Types
 *
 * ### Supabase JWT
 * - Used by: Web application users
 * - Format: Standard JWT from Supabase Auth
 * - Validation: HTTP call to Supabase Auth API
 * - Lifetime: 1 hour (with refresh tokens)
 * - When to use: Browser-based web app
 *
 * ### Shipbox API Key
 * - Used by: CLI and programmatic API access
 * - Format: `sb_<base64-encoded-key>`
 * - Validation: SHA-256 hash lookup in D1 database
 * - Lifetime: Until manually revoked
 * - When to use: CLI, scripts, integrations
 *
 * ## Route Protection Strategy
 *
 * Public routes (no auth required):
 * - `/health` - Health check
 * - `/internal/*` - Engine-to-API communication (uses separate auth)
 * - `/admin/*` - Admin endpoints (uses separate admin auth)
 * - `/github/webhook` - GitHub webhooks (signature-verified)
 * - `/billing/webhook` - Stripe webhooks (signature-verified)
 *
 * All other routes require a valid Bearer token.
 *
 * ## Context Population
 *
 * After successful authentication, the user object is set in the request context:
 *
 * ```typescript
 * const user = c.get("user"); // { id: string, email: string }
 * ```
 *
 * Downstream middleware and route handlers can access the authenticated user.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "../index";
import { shouldSkipAuth, extractBearerToken } from "./utils";
import { validateSupabaseToken, validateShipboxApiKey } from "./validators";

/**
 * Creates the authentication middleware.
 *
 * This middleware:
 * 1. Checks if route should skip auth
 * 2. Extracts Bearer token from Authorization header
 * 3. Routes token to appropriate validator (API key or JWT)
 * 4. Sets user in context on success
 * 5. Returns 401 Unauthorized on failure
 *
 * @returns Middleware handler function
 *
 * @example
 * const app = new Hono();
 * app.use("*", createAuthMiddleware());
 * app.get("/protected", (c) => {
 *   const user = c.get("user");
 *   return c.json({ userId: user.id });
 * });
 */
export function createAuthMiddleware(): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> {
  return async (c, next) => {
    // Step 1: Skip auth for public routes
    if (shouldSkipAuth(c.req.path)) {
      await next();
      return;
    }

    // Step 2: Extract Bearer token
    const authHeader = c.req.header("Authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Step 3: Route to appropriate validator
    let authResult;
    if (token.startsWith("sb_")) {
      // Shipbox API key validation
      authResult = await validateShipboxApiKey(token, c.env.DB);
    } else {
      // Supabase JWT validation
      authResult = await validateSupabaseToken(
        token,
        c.env.SUPABASE_URL,
        c.env.SUPABASE_ANON_KEY,
      );
    }

    // Step 4: Handle validation result
    if (!authResult.success) {
      return c.json(
        {
          error: "Unauthorized",
          details: authResult.details,
        },
        401,
      );
    }

    // Step 5: Set user in context and continue
    c.set("user", authResult.user);
    await next();
  };
}
