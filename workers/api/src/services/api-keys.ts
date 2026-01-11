import { Context, Effect, Layer, Option } from "effect";

export interface ApiKeyServiceInterface {
  readonly getApiKey: (userId: string) => Effect.Effect<Option.Option<string>, Error>;
  readonly storeApiKey: (userId: string, apiKey: string) => Effect.Effect<void, Error>;
  readonly deleteApiKey: (userId: string) => Effect.Effect<void, Error>;
  readonly getKeyHint: (userId: string) => Effect.Effect<Option.Option<string>, Error>;
}

export class ApiKeyService extends Context.Tag("ApiKeyService")<
  ApiKeyService,
  ApiKeyServiceInterface
>() {}

function makeD1ApiKeyService(db: D1Database, masterKey: string): ApiKeyServiceInterface {
  const getMasterKey = async () => {
    const encoder = new TextEncoder();
    return await crypto.subtle.importKey(
      "raw",
      encoder.encode(masterKey.padEnd(32, "0").slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const encrypt = async (text: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = await getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  };

  const decrypt = async (base64: string) => {
    const combined = new Uint8Array(atob(base64).split("").map((c) => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getMasterKey();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  };

  return {
    getApiKey: (userId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .prepare("SELECT anthropic_key_encrypted FROM user_api_keys WHERE user_id = ?")
            .bind(userId)
            .first();

          if (!result || !result.anthropic_key_encrypted) return Option.none();

          const decrypted = await decrypt(result.anthropic_key_encrypted as string);
          return Option.some(decrypted);
        },
        catch: (error) => new Error(`Failed to get API key: ${error}`),
      }),

    storeApiKey: (userId, apiKey) =>
      Effect.tryPromise({
        try: async () => {
          const encrypted = await encrypt(apiKey);
          const hint = `***${apiKey.slice(-4)}`;
          const now = Math.floor(Date.now() / 1000);

          await db
            .prepare(
              `INSERT INTO user_api_keys (user_id, anthropic_key_encrypted, key_hint, created_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET
               anthropic_key_encrypted = excluded.anthropic_key_encrypted,
               key_hint = excluded.key_hint,
               created_at = excluded.created_at`
            )
            .bind(userId, encrypted, hint, now)
            .run();
        },
        catch: (error) => new Error(`Failed to store API key: ${error}`),
      }),

    deleteApiKey: (userId) =>
      Effect.tryPromise({
        try: async () => {
          await db.prepare("DELETE FROM user_api_keys WHERE user_id = ?").bind(userId).run();
        },
        catch: (error) => new Error(`Failed to delete API key: ${error}`),
      }),

    getKeyHint: (userId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .prepare("SELECT key_hint FROM user_api_keys WHERE user_id = ?")
            .bind(userId)
            .first();

          if (!result || !result.key_hint) return Option.none();
          return Option.some(result.key_hint as string);
        },
        catch: (error) => new Error(`Failed to get key hint: ${error}`),
      }),
  };
}

export function makeApiKeyServiceLayer(db: D1Database, masterKey: string): Layer.Layer<ApiKeyService> {
  return Layer.succeed(ApiKeyService, makeD1ApiKeyService(db, masterKey));
}
