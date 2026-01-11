import { Hono } from "hono";
import { Effect, Exit } from "effect";
import { GitHubService, makeGitHubServiceLayer } from "../services/github";
import { Bindings, Variables } from "../index";

export const githubRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .get("/install", async (c) => {
    // Redirect to GitHub App installation page
    const appName = c.env.GITHUB_APP_NAME || "shipbox-dev";
    return c.redirect(`https://github.com/apps/${appName}/installations/new`);
  })
  .post("/webhook", async (c) => {
    // Basic webhook handler - in production we should verify the signature
    const event = c.req.header("x-github-event");
    // const payload = await c.req.json() as any;

    if (event === "installation") {
      // Handle installation events if needed
    }

    return c.json({ success: true });
  })
  .post("/link", async (c) => {
    const user = c.get("user");
    const { installationId } = await c.req.json();

    const layer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

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
      }).pipe(Effect.provide(layer))
    );

    if (Exit.isFailure(result)) {
      console.error("Link GitHub error:", Exit.cause(result));
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

    return c.json(result.value);
  })
  .get("/repos", async (c) => {
    const user = c.get("user");
    const layer = makeGitHubServiceLayer(c.env.DB, c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

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
          const text = await res.text();
          throw new Error(`GitHub API error ${res.status}: ${text}`);
        }
        
        const data = await res.json() as any;
        return data.repositories.map((r: any) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          html_url: r.html_url,
          clone_url: r.clone_url,
        }));
      }).pipe(Effect.provide(layer))
    );

    if (Exit.isFailure(result)) {
      console.error("Fetch repos error:", Exit.cause(result));
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
