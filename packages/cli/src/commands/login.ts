import { Command } from "commander";
import http from "http";
import { exec } from "child_process";
import chalk from "chalk";
import { configStore, getBaseUrl } from "../config.js";

export const loginCommand = new Command("login")
  .description("Log in to shipbox.dev via browser")
  .action(async () => {
    const port = 49152 + Math.floor(Math.random() * 1000); // Random high port
    const baseUrl = getBaseUrl();

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "", `http://localhost:${port}`);
      const supabaseToken = url.searchParams.get("token");

      if (!supabaseToken) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>Login Failed</h1><p>No token found in request.</p>");
        process.exit(1);
        return;
      }

      try {
        // Exchange Supabase token for Shipbox API key
        const response = await fetch(`${baseUrl}/settings/cli-api-key`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to create API key: ${error.error || response.statusText}`
          );
        }

        const { key } = (await response.json()) as { key: string };

        // Store the Shipbox API key
        configStore.set("apiKey", key);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<h1>Login Successful</h1><p>You can close this window and return to the terminal.</p>",
        );
        console.log(chalk.green("\nSuccessfully logged in!"));
        console.log(chalk.dim("API key saved to your local configuration"));
        process.exit(0);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(
          `<h1>Login Failed</h1><p>${(error as Error).message}</p>`
        );
        console.error(chalk.red(`\nLogin failed: ${(error as Error).message}`));
        process.exit(1);
      }
    });

    server.listen(port, () => {
      const loginUrl = `https://shipbox.dev/login?cli_port=${port}`;
      console.log(chalk.cyan("Opening your browser to log in..."));
      console.log(chalk.dim(`URL: ${loginUrl}`));

      const start =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(`${start} ${loginUrl}`, (err) => {
        if (err) {
          console.log(
            chalk.yellow(
              `\nFailed to open browser automatically. Please open this URL manually:\n${loginUrl}`,
            ),
          );
        }
      });
    });

    // Timeout after 5 minutes
    setTimeout(
      () => {
        console.log(chalk.red("\nLogin timed out."));
        process.exit(1);
      },
      5 * 60 * 1000,
    );
  });
