import { Hono } from "hono";
import { Effect, Exit, Option } from "effect";
import { GitHubService, makeGitHubServiceLayer } from "../services/github";
import { Bindings, Variables } from "../index";
import { LoggerLayer, withRequestContext } from "@shipbox/shared";

async function verifySignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  const sigHex = signature.replace("sha256=", "");
  const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
}

export const githubRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .get("/install", async (c) => {
    const user = c.get("user");
    // Return GitHub App installation page URL with user ID in state
    const appName = c.env.GITHUB_APP_NAME || "shipbox-dev";
    const url = `https://github.com/apps/${appName}/installations/new?state=${user.id}`;
    return c.json({ url });
  })
  .post("/webhook", async (c) => {
    const signature = c.req.header("x-hub-signature-256");
    const payload = await c.req.text();
    const secret = c.env.GITHUB_WEBHOOK_SECRET;

    if (secret && !(await verifySignature(payload, signature || null, secret))) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    const data = JSON.parse(payload) as any;
    const event = c.req.header("x-github-event");

    const requestId = c.get("requestId");
    if (event === "installation" && data.action === "created") {
      const installationId = data.installation.id;
      const accountLogin = data.installation.account.login;
      const accountType = data.installation.account.type;
      
      // If we have state (userId), we can link automatically
      // Note: GitHub passes state back in the setup flow, but for simple install 
      // we might need the frontend to call /link after redirect.
      // However, if the user followed the /install link, we have their userId in state.
      const userId = data.requester?.id || data.sender?.id; // Fallback or use DB lookup
      
      // For now, we rely on the frontend calling /link or we look for a pending link.
      await Effect.runPromise(
        Effect.log(`GitHub installation created: ${installationId} for ${accountLogin}`).pipe(
          withRequestContext(requestId, userId),
          Effect.provide(LoggerLayer)
        )
      );
    }

    return c.json({ success: true });
  })
  .post("/link", async (c) => {
    const user = c.get("user");
    const { installationId } = await c.req.json();

    const layer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

    const requestId = c.get("requestId");
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* GitHubService;
        
        // Verify installation and get metadata
        const metadata = yield* service.fetchInstallationMetadata(parseInt(installationId));
        
        yield* service.storeInstallation({
          userId: user.id,
          installationId: parseInt(installationId),
          accountLogin: metadata.accountLogin,
          accountType: metadata.accountType,
        });
      }).pipe(
        Effect.provide(layer),
        withRequestContext(requestId, user.id),
        Effect.provide(LoggerLayer)
      )
    );

    if (Exit.isFailure(result)) {
      await Effect.runPromise(
        Effect.logError("Link GitHub error", result.cause).pipe(
          withRequestContext(requestId, user.id),
          Effect.provide(LoggerLayer)
        )
      );
      return c.json({ error: "Failed to link GitHub installation" }, 500);
    }

    return c.json({ success: true });
  })
  .get("/status", async (c) => {
    const user = c.get("user");
    const layer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.getInstallation(user.id);
      }).pipe(Effect.provide(layer))
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to fetch GitHub status" }, 500);
    }

    return c.json(Option.getOrNull(result.value));
  })
  .get("/repos", async (c) => {
    const user = c.get("user");
    const layer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

    const requestId = c.get("requestId");
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* GitHubService;
        const token = yield* service.getInstallationToken(user.id);
        
        const res = yield* Effect.tryPromise({
          try: () => fetch("https://api.github.com/installation/repositories", {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "shipbox-api",
            }
          }),
          catch: (e) => new Error(String(e)),
        });

        if (!res.ok) {
          const text = yield* Effect.tryPromise(() => res.text());
          throw new Error(`GitHub API error ${res.status}: ${text}`);
        }
        
        const data = yield* Effect.tryPromise(() => res.json() as Promise<any>);
        return data.repositories.map((r: any) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          html_url: r.html_url,
          clone_url: r.clone_url,
        }));
      }).pipe(
        Effect.provide(layer),
        withRequestContext(requestId, user.id),
        Effect.provide(LoggerLayer)
      )
    );

    if (Exit.isFailure(result)) {
      await Effect.runPromise(
        Effect.logError("Fetch repos error", result.cause).pipe(
          withRequestContext(requestId, user.id),
          Effect.provide(LoggerLayer)
        )
      );
      return c.json({ error: "Failed to fetch repositories" }, 500);
    }

    return c.json(result.value);
  })
  .delete("/installation", async (c) => {
    const user = c.get("user");
    const layer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* GitHubService;
        yield* service.deleteInstallation(user.id);
      }).pipe(Effect.provide(layer))
    );

    if (Exit.isFailure(result)) {
      return c.json({ error: "Failed to disconnect GitHub" }, 500);
    }

    return c.json({ success: true });
  });
