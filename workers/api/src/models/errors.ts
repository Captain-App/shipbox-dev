import { Schema } from "effect";

export class SessionNotFoundError extends Schema.TaggedError<SessionNotFoundError>()(
  "SessionNotFoundError",
  { sessionId: Schema.String }
) {
  override get message(): string {
    return `Session not found: ${this.sessionId}`;
  }
}

export class SessionStorageError extends Schema.TaggedError<SessionStorageError>()(
  "SessionStorageError",
  { cause: Schema.String }
) {
  override get message(): string {
    return `Session storage error: ${this.cause}`;
  }
}

export class GithubError extends Schema.TaggedError<GithubError>()(
  "GithubError",
  { cause: Schema.String }
) {
  override get message(): string {
    return `GitHub API error: ${this.cause}`;
  }
}
