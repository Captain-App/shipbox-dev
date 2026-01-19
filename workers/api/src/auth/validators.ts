/**
 * Authentication Validators
 *
 * Token validation logic for both Supabase JWT and Shipbox API keys.
 * Each validator is isolated and can be tested independently.
 */

import { Effect, Exit } from "effect";
import {
  ShipboxApiKeyService,
  makeShipboxApiKeyServiceLayer,
} from "../services/shipbox-api-keys";
import type { AuthResult } from "./types";

/**
 * Validates a Supabase JWT token by calling the Supabase auth API.
 *
 * This performs real-time validation to ensure:
 * - Token is not expired
 * - Token signature is valid
 * - User still exists and is active in Supabase
 *
 * Advantages of real-time validation:
 * - Detects revoked tokens immediately
 * - Works across multiple API instances
 * - No local token caching issues
 *
 * @param token - JWT token to validate
 * @param supabaseUrl - Supabase project URL
 * @param supabaseAnonKey - Supabase anonymous/public key
 * @returns Auth result with user info or error details
 *
 * @example
 * const result = await validateSupabaseToken(jwt, url, key);
 * if (result.success) {
 *   console.log("Authenticated as", result.user.email);
 * } else {
 *   console.error("Auth failed:", result.error);
 * }
 */
export async function validateSupabaseToken(
  token: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<AuthResult> {
  const url = `${supabaseUrl}/auth/v1/user`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error(
        `[Auth] Supabase validation failed: ${res.status} - ${JSON.stringify(errorData)}`,
      );
      return {
        success: false,
        error: "Invalid Supabase token",
        details: JSON.stringify(errorData),
      };
    }

    const user = (await res.json()) as { id: string; email: string };
    return {
      success: true,
      user: { id: user.id, email: user.email },
    };
  } catch (error) {
    console.error("[Auth] Supabase validation error:", error);
    return {
      success: false,
      error: "Failed to validate Supabase token",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validates a Shipbox API key by checking the hash in the database.
 *
 * Shipbox API keys:
 * - Start with `sb_` prefix to distinguish from JWTs
 * - Are hashed with SHA-256 before storage (never stored in plaintext)
 * - Update `last_used` timestamp on each successful validation
 * - Can be revoked by deleting the record
 *
 * Process:
 * 1. Extract the key using the provided database connection
 * 2. Hash the provided token
 * 3. Compare hash against stored value
 * 4. Update last_used timestamp
 * 5. Return user ID
 *
 * @param token - API key to validate (starts with sb_)
 * @param db - D1 database connection
 * @returns Auth result with user info or error details
 *
 * @example
 * const result = await validateShipboxApiKey(apiKey, db);
 * if (result.success) {
 *   console.log("Authenticated with API key");
 * }
 */
export async function validateShipboxApiKey(
  token: string,
  db: D1Database,
): Promise<AuthResult> {
  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const service = yield* ShipboxApiKeyService;
      return yield* service.validateKey(token);
    }).pipe(Effect.provide(makeShipboxApiKeyServiceLayer(db))),
  );

  if (Exit.isSuccess(result)) {
    const userId = result.value;
    return {
      success: true,
      user: {
        id: userId,
        email: `user-${userId}`, // Synthetic email for API keys
      },
    };
  }

  return {
    success: false,
    error: "Invalid Shipbox API key",
  };
}
