/**
 * Authentication Types
 *
 * Core interfaces for the authentication system supporting both
 * Supabase JWT tokens and Shipbox API keys.
 */

/**
 * Represents an authenticated user in the Shipbox system.
 *
 * All authenticated requests must include a user in the context.
 */
export interface AuthenticatedUser {
  /** Unique user identifier - consistent across both token types */
  id: string;
  /**
   * User's email address
   * - For Supabase JWT: actual email from auth service
   * - For Shipbox API keys: synthetic format "user-{id}"
   */
  email: string;
}

/**
 * Result of token validation attempt.
 *
 * Uses discriminated union to ensure proper type narrowing:
 * - Success path: full user object available
 * - Failure path: error details for debugging
 */
export type AuthResult =
  | {
      success: true;
      user: AuthenticatedUser;
    }
  | {
      success: false;
      error: string;
      /** Additional context for debugging - not sent to clients */
      details?: string;
    };
