import { Hono } from "hono";
import { Effect, Exit, Option } from "effect";
import { ApiKeyService, makeApiKeyServiceLayer } from "../services/api-keys";
import {
  ShipboxApiKeyService,
  makeShipboxApiKeyServiceLayer,
} from "../services/shipbox-api-keys";
import { Bindings, Variables } from "../index";

export const settingsRoutes = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>()
  // Exchange Supabase token for Shipbox API key (for CLI login)
  .post("/cli-api-key", async (c) => {
    // Get authenticated user from middleware context
    const user = c.get("user");

    // Create a Shipbox API key for this user
    const shipboxLayer = makeShipboxApiKeyServiceLayer(c.env.DB);
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ShipboxApiKeyService;
        const keyName = `CLI Key - ${new Date().toISOString().slice(0, 10)}`;
        return yield* service.createKey(user.id, keyName);
      }).pipe(Effect.provide(shipboxLayer)),
    );

    if (Exit.isFailure(result)) {
      console.error(`Failed to create CLI API key for ${user.email || user.id}`);
      return c.json({ error: "Failed to create API key" }, 500);
    }

    return c.json(result.value);
  })
  .get("/api-keys", async (c) => {
    const user = c.get("user");
    const layer = makeApiKeyServiceLayer(c.env.DB, c.env.PROXY_JWT_SECRET);
    const shipboxLayer = makeShipboxApiKeyServiceLayer(c.env.DB);

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ApiKeyService;
        const shipboxService = yield* ShipboxApiKeyService;

        const anthropicHint = yield* service.getKeyHint(user.id);
        const shipboxKeys = yield* shipboxService.listKeys(user.id);

        return {
          anthropicHint: Option.getOrNull(anthropicHint),
          shipboxKeys,
        };
      }).pipe(Effect.provide(layer), Effect.provide(shipboxLayer)),
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to fetch API keys" }, 500);
    }

    return c.json(result.value);
  })
  .post("/api-keys/shipbox", async (c) => {
    const user = c.get("user");
    const { name } = await c.req.json();

    if (!name) return c.json({ error: "Name is required" }, 400);

    const layer = makeShipboxApiKeyServiceLayer(c.env.DB);
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ShipboxApiKeyService;
        return yield* service.createKey(user.id, name);
      }).pipe(Effect.provide(layer)),
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to create API key" }, 500);
    }

    return c.json(result.value);
  })
  .delete("/api-keys/shipbox/:hint", async (c) => {
    const user = c.get("user");
    const hint = c.req.param("hint");

    const layer = makeShipboxApiKeyServiceLayer(c.env.DB);
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ShipboxApiKeyService;
        yield* service.deleteKey(user.id, hint);
      }).pipe(Effect.provide(layer)),
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to delete API key" }, 500);
    }

    return c.json({ success: true });
  })
  .post("/api-keys/anthropic", async (c) => {
    const user = c.get("user");
    const { apiKey } = await c.req.json();

    if (!apiKey || !apiKey.startsWith("sk-ant-")) {
      return c.json({ error: "Invalid Anthropic API key" }, 400);
    }

    const layer = makeApiKeyServiceLayer(c.env.DB, c.env.PROXY_JWT_SECRET);

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ApiKeyService;
        yield* service.storeApiKey(user.id, apiKey);
      }).pipe(Effect.provide(layer)),
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to store API key" }, 500);
    }

    return c.json({ success: true });
  })
  .delete("/api-keys/anthropic", async (c) => {
    const user = c.get("user");
    const layer = makeApiKeyServiceLayer(c.env.DB, c.env.PROXY_JWT_SECRET);

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ApiKeyService;
        yield* service.deleteApiKey(user.id);
      }).pipe(Effect.provide(layer)),
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to delete API key" }, 500);
    }

    return c.json({ success: true });
  });
