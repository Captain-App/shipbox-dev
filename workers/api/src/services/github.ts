import { Context, Effect, Layer, Option } from "effect";
import * as jose from "jose";
import { GithubError } from "../models/errors";

export interface GitHubInstallation {
  userId: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
}

export interface GitHubServiceInterface {
  readonly getInstallation: (userId: string) => Effect.Effect<Option.Option<GitHubInstallation>, GithubError>;
  readonly storeInstallation: (installation: GitHubInstallation) => Effect.Effect<void, GithubError>;
  readonly deleteInstallation: (userId: string) => Effect.Effect<void, GithubError>;
  readonly getInstallationToken: (userId: string) => Effect.Effect<string, GithubError>;
  readonly fetchInstallationMetadata: (installationId: number) => Effect.Effect<{ accountLogin: string; accountType: string }, GithubError>;
}

export class GitHubService extends Context.Tag("GitHubService")<
  GitHubService,
  GitHubServiceInterface
>() {}

function makeD1GitHubService(
  db: D1Database,
  appId: string,
  privateKey: string
): GitHubServiceInterface {
  const getAppJwt = async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 10 * 60,
      iss: appId,
    };

    const algorithm = "RS256";
    const key = await jose.importPKCS8(privateKey, algorithm);

    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: algorithm })
      .sign(key);
  };

  return {
    getInstallation: (userId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .prepare("SELECT * FROM github_installations WHERE user_id = ?")
            .bind(userId)
            .first();

          if (!result) return Option.none();

          return Option.some({
            userId: result.user_id as string,
            installationId: result.installation_id as number,
            accountLogin: result.account_login as string,
            accountType: result.account_type as string,
          });
        },
        catch: (error) => new GithubError({ cause: String(error) }),
      }),

    storeInstallation: (installation) =>
      Effect.tryPromise({
        try: async () => {
          const now = Math.floor(Date.now() / 1000);
          await db
            .prepare(
              `INSERT INTO github_installations (user_id, installation_id, account_login, account_type, created_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET 
               installation_id = excluded.installation_id,
               account_login = excluded.account_login,
               account_type = excluded.account_type,
               created_at = excluded.created_at`
            )
            .bind(
              installation.userId,
              installation.installationId,
              installation.accountLogin,
              installation.accountType,
              now
            )
            .run();
        },
        catch: (error) => new GithubError({ cause: String(error) }),
      }),

    deleteInstallation: (userId) =>
      Effect.tryPromise({
        try: async () => {
          await db
            .prepare("DELETE FROM github_installations WHERE user_id = ?")
            .bind(userId)
            .run();
        },
        catch: (error) => new GithubError({ cause: String(error) }),
      }),

    getInstallationToken: (userId) =>
      Effect.gen(function* () {
        const service = makeD1GitHubService(db, appId, privateKey);
        const installationOpt = yield* service.getInstallation(userId);

        if (Option.isNone(installationOpt)) {
          return yield* Effect.fail(new GithubError({ cause: "No GitHub installation found for user" }));
        }

        const installation = installationOpt.value;
        const jwt = yield* Effect.tryPromise({
          try: () => getAppJwt(),
          catch: (error) => new GithubError({ cause: `Failed to generate App JWT: ${error}` }),
        });

        const res = yield* Effect.tryPromise({
          try: () =>
            fetch(
              `https://api.github.com/app/installations/${installation.installationId}/access_tokens`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${jwt}`,
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "shipbox-api",
                },
              }
            ),
          catch: (error) => new GithubError({ cause: `GitHub API request failed: ${error}` }),
        });

        if (!res.ok) {
          const errorText = yield* Effect.tryPromise(() => res.text());
          return yield* Effect.fail(new GithubError({ cause: `GitHub API returned ${res.status}: ${errorText}` }));
        }

        const data = (yield* Effect.tryPromise(() => res.json())) as { token: string };
        return data.token;
      }),

    fetchInstallationMetadata: (installationId) =>
      Effect.gen(function* () {
        const jwt = yield* Effect.tryPromise({
          try: () => getAppJwt(),
          catch: (error) => new GithubError({ cause: `Failed to generate App JWT: ${error}` }),
        });

        const res = yield* Effect.tryPromise({
          try: () =>
            fetch(`https://api.github.com/app/installations/${installationId}`, {
              headers: {
                Authorization: `Bearer ${jwt}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "shipbox-api",
              },
            }),
          catch: (error) => new GithubError({ cause: `GitHub API request failed: ${error}` }),
        });

        if (!res.ok) {
          const errorText = yield* Effect.tryPromise(() => res.text());
          return yield* Effect.fail(new GithubError({ cause: `GitHub API returned ${res.status}: ${errorText}` }));
        }

        const data = (yield* Effect.tryPromise(() => res.json())) as any;
        return {
          accountLogin: data.account.login,
          accountType: data.account.type,
        };
      }),
  };
}

export function makeGitHubServiceLayer(
  db: D1Database,
  appId: string,
  privateKey: string
): Layer.Layer<GitHubService> {
  return Layer.succeed(GitHubService, makeD1GitHubService(db, appId, privateKey));
}
