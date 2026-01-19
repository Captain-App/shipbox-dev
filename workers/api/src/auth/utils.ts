/**
 * Authentication Utilities
 *
 * Helper functions for route matching, token extraction, and common auth tasks.
 */

/**
 * Routes that bypass authentication.
 *
 * These routes are publicly accessible without a Bearer token:
 * - `/health` - Health check endpoint
 * - `/internal/*` - Engine-to-API communication (separate auth)
 * - `/admin/*` - Admin endpoints (separate admin token auth)
 * - `/github/webhook` - GitHub webhook with signature verification
 * - `/billing/webhook` - Stripe webhook with signature verification
 */
const SKIP_AUTH_ROUTES = [
  "/internal/",
  "/admin/",
  "/github/webhook",
  "/billing/webhook",
  "/health",
] as const;

/**
 * Determines if a route should bypass authentication.
 *
 * Used by the auth middleware to skip validation for public endpoints.
 *
 * @param path - Request path to check
 * @returns true if this route should skip authentication
 *
 * @example
 * shouldSkipAuth("/health") // => true
 * shouldSkipAuth("/internal/engine-health") // => true
 * shouldSkipAuth("/sessions") // => false
 */
export function shouldSkipAuth(path: string): boolean {
  return SKIP_AUTH_ROUTES.some((route) => {
    if (route.endsWith("/")) {
      return path.startsWith(route);
    }
    return path === route;
  });
}

/**
 * Extracts Bearer token from Authorization header.
 *
 * Expected format: "Bearer {token}"
 * This extracts the token part after "Bearer ".
 *
 * @param authHeader - Value of Authorization header
 * @returns Token string or null if invalid/missing
 *
 * @example
 * extractBearerToken("Bearer eyJhbGc...") // => "eyJhbGc..."
 * extractBearerToken("Bearer") // => null
 * extractBearerToken(undefined) // => null
 * extractBearerToken("Basic xyz") // => null
 */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}
