import { Hono } from "hono";
import { Effect, Exit, Option } from "effect";
import { ApiKeyService, makeApiKeyServiceLayer } from "../services/api-keys";
import { Bindings, Variables } from "../index";

export const settingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .get("/api-keys", async (c) => {
    const user = c.get("user");
    const layer = makeApiKeyServiceLayer(c.env.DB, c.env.PROXY_JWT_SECRET);

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* ApiKeyService;
        const hint = yield* service.getKeyHint(user.id);
        return { anthropicHint: Option.getOrNull(hint) };
      }).pipe(Effect.provide(layer))
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to fetch API keys" }, 500);
    }

    return c.json(result.value);
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
      }).pipe(Effect.provide(layer))
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
      }).pipe(Effect.provide(layer))
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to delete API key" }, 500);
    }

    return c.json({ success: true });
  });
