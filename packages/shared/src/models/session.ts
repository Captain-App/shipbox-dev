import { Schema } from "effect";

/**
 * Default AI model for OpenCode sessions
 */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

/**
 * Validation constants for session IDs
 */
const SESSION_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SESSION_ID_MAX_LENGTH = 64;
export const GITHUB_URL_PREFIX = "https://github.com/";

/**
 * Valid session status values
 */
export const SessionStatus = Schema.Literal("creating", "active", "idle", "stopped", "error");
export type SessionStatus = typeof SessionStatus.Type;

/**
 * Session ID must be lowercase alphanumeric with hyphens, max 64 chars
 */
export const SessionId = Schema.String.pipe(
  Schema.pattern(SESSION_ID_PATTERN),
  Schema.maxLength(SESSION_ID_MAX_LENGTH),
  Schema.brand("SessionId"),
);
export type SessionId = typeof SessionId.Type;

/**
 * Repository information for cloned repos
 */
export const RepositoryInfo = Schema.Struct({
  url: Schema.String.pipe(Schema.startsWith(GITHUB_URL_PREFIX)),
  branch: Schema.String,
});
export type RepositoryInfo = typeof RepositoryInfo.Type;

/**
 * Session configuration
 */
export const SessionConfig = Schema.Struct({
  defaultModel: Schema.String,
  region: Schema.optional(Schema.String),
});
export type SessionConfig = typeof SessionConfig.Type;

/**
 * Complete session metadata (Source of truth)
 */
export const SessionMetadata = Schema.Struct({
  sessionId: SessionId,
  sandboxId: Schema.String,
  createdAt: Schema.Number,
  lastActivity: Schema.Number,
  status: SessionStatus,
  workspacePath: Schema.String,
  webUiUrl: Schema.String,
  userId: Schema.optional(Schema.String),
  repository: Schema.optional(RepositoryInfo),
  title: Schema.optional(Schema.String),
  config: SessionConfig,
  opencodeSessionId: Schema.optional(Schema.String),
  clonedRepos: Schema.optional(Schema.Array(Schema.String)),
});
export type SessionMetadata = typeof SessionMetadata.Type;

/**
 * Frontend-specific view of a Sandbox
 * Maps sessionId to id for consistency with typical frontend patterns
 */
export interface Sandbox extends Omit<SessionMetadata, 'sessionId'> {
  id: string; // maps to sessionId
  sessionId: string;
  // Frontend display fields
  name?: string; // Display name (alias for title)
  region?: string; // Display region
  tasksCompleted?: number;
  memoryUsage?: string;
}

// Input for creating a session
export const CreateSessionInput = Schema.Struct({
  name: Schema.String,
  region: Schema.String,
  repository: Schema.optional(Schema.String),
});
export type CreateSessionInput = typeof CreateSessionInput.Type;

/**
 * GitHub Installation metadata
 */
export interface GitHubInstallation {
  userId: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
}
