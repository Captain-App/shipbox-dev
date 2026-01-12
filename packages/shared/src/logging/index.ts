import { Context, Effect, Layer, Logger, FiberRef, FiberRefs } from "effect";

/**
 * Request context carrying identifiers for correlation
 */
export interface RequestContext {
  readonly requestId: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

export const RequestContext = Context.GenericTag<RequestContext>("@shipbox/shared/RequestContext");

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: unknown;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Effect Logger implementation that outputs structured JSON
 */
export const structuredLogger = Logger.make<unknown, void>((options) => {
  // Get the current context from FiberRefs
  const context = FiberRefs.getOrDefault(options.context, FiberRef.currentContext);
  const requestContext = Context.getOption(context, RequestContext);

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: options.logLevel.label,
    message: options.message,
  };

  if (requestContext._tag === "Some") {
    const ctx = requestContext.value as RequestContext;
    logEntry.requestId = ctx.requestId;
    logEntry.userId = ctx.userId;
    logEntry.sessionId = ctx.sessionId;
  }

  // Use console directly (globalThis.console doesn't work in all envs)
  console.log(JSON.stringify(logEntry));
});

/**
 * Layer to provide the structured logger
 */
export const LoggerLayer = Logger.replace(Logger.defaultLogger, structuredLogger);

/**
 * Utility to run an effect with RequestContext
 */
export const withRequestContext = (
  requestId: string,
  userId?: string,
  sessionId?: string
) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.provideService(effect, RequestContext, { requestId, userId, sessionId });
