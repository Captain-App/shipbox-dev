/**
 * Shipbox Authentication Module
 *
 * Complete authentication system for protecting API endpoints and managing user sessions.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createAuthMiddleware } from "./auth";
 *
 * const app = new Hono();
 * app.use("*", createAuthMiddleware());
 * ```
 *
 * ## Token Types
 *
 * ### Supabase JWT
 * - Used by: Web application (browser-based)
 * - Created: Automatically by Supabase Auth
 * - Validation: Real-time HTTP call to Supabase
 * - Lifetime: 1 hour (refresh via refresh token)
 *
 * ### Shipbox API Key
 * - Used by: CLI, integrations, scripts
 * - Created: Via `/settings/api-keys` endpoint
 * - Format: `sb_` prefix for identification
 * - Storage: SHA-256 hash in D1 database
 * - Lifetime: Until manually revoked
 *
 * ## Ownership Model
 *
 * ```
 * User (authenticated via JWT or API key)
 *   ├─ Sessions (user_sessions table)
 *   ├─ API Keys (shipbox_api_keys table)
 *   ├─ Box Secrets (box_secrets table)
 *   ├─ GitHub Installation (github_installations table)
 *   └─ Balance & Transactions (stripe_customers, billing_transactions)
 * ```
 *
 * All resources are tagged with `user_id` to ensure proper isolation.
 *
 * ## Route Protection
 *
 * Protected routes require a Bearer token in the Authorization header.
 * Public routes that skip auth:
 * - `/health` - Health check
 * - `/internal/*` - Engine internal API (separate auth)
 * - `/admin/*` - Admin endpoints (admin token required)
 * - `/github/webhook` - GitHub webhook (signature-verified)
 * - `/billing/webhook` - Stripe webhook (signature-verified)
 *
 * ## Error Handling
 *
 * Authentication failures return 401 Unauthorized:
 *
 * ```json
 * {
 *   "error": "Unauthorized",
 *   "details": "Optional debugging information"
 * }
 * ```
 *
 * The `details` field includes the validation error but is not visible to clients
 * (you can see it in logs for debugging).
 *
 * ## Special Cases
 *
 * ### CLI Authentication Flow
 * 1. User runs `shipbox auth login`
 * 2. CLI opens browser to Supabase login
 * 3. Web app exchanges JWT for API key
 * 4. CLI stores API key in `~/.shipbox/config`
 * 5. CLI uses API key for subsequent requests
 *
 * ### Admin Authentication
 * Admin endpoints under `/admin/*` use a separate authentication mechanism
 * via the `ADMIN_TOKEN` environment variable (see admin middleware).
 *
 * @module auth
 */

export { createAuthMiddleware } from "./middleware";
export { validateSupabaseToken, validateShipboxApiKey } from "./validators";
export { shouldSkipAuth, extractBearerToken } from "./utils";
export type { AuthenticatedUser, AuthResult } from "./types";
