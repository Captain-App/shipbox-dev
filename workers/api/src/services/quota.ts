import { Context, Effect, Layer } from "effect";
import { SessionStorageError } from "../models/errors";

export interface QuotaServiceInterface {
  readonly checkSandboxQuota: (userId: string) => Effect.Effect<void, Error | SessionStorageError>;
  readonly checkBalance: (userId: string) => Effect.Effect<void, Error | SessionStorageError>;
}

export class QuotaService extends Context.Tag("QuotaService")<
  QuotaService,
  QuotaServiceInterface
>() {}

function makeD1QuotaService(db: D1Database): QuotaServiceInterface {
  const MAX_ACTIVE_SANDBOXES = 3;
  const MIN_BALANCE_FOR_NEW = 100; // 100 credits = £1.00

  return {
    checkSandboxQuota: (userId) =>
      Effect.gen(function* () {
        const { results } = yield* Effect.tryPromise({
          try: () => db.prepare(
            "SELECT count(*) as count FROM user_sessions WHERE user_id = ?"
          ).bind(userId).all(),
          catch: (error) => new SessionStorageError({ 
            cause: error instanceof Error ? error.message : String(error) 
          }),
        });

        const count = (results[0] as { count: number }).count;
        if (count >= MAX_ACTIVE_SANDBOXES) {
          return yield* Effect.fail(new Error(`Quota exceeded: Maximum of ${MAX_ACTIVE_SANDBOXES} active sandboxes allowed.`));
        }
      }),

    checkBalance: (userId) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () => db.prepare(
            "SELECT balance_credits FROM user_balances WHERE user_id = ?"
          ).bind(userId).first(),
          catch: (error) => new SessionStorageError({ 
            cause: error instanceof Error ? error.message : String(error) 
          }),
        });

        const balance = result ? (result.balance_credits as number) : 0;
        if (balance <= 0) {
          return yield* Effect.fail(new Error("Insufficient balance. Please top up your account."));
        }
      }),
  };
}

export function makeQuotaServiceLayer(db: D1Database): Layer.Layer<QuotaService> {
  return Layer.succeed(QuotaService, makeD1QuotaService(db));
}
