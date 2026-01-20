import { Command } from "commander";
import { ShipboxApi } from "../api.js";
import chalk from "chalk";

export const runCommand = new Command("run")
  .description("Start a new coding task in a sandbox")
  .argument("<task>", "Description of the task to perform")
  .option("-r, --repo <url>", "Git repository URL to clone")
  .option("-b, --branch <name>", "Branch to checkout")
  .option("-s, --session <id>", "Continue an existing session")
  .option("-n, --name <name>", "Name for the sandbox")
  .option("--region <region>", "Region for the sandbox", "us-east")
  .action(async (task, options) => {
    try {
      const api = new ShipboxApi();
      let sessionId = options.session;

      // If no session provided, create a new one
      if (!sessionId) {
        console.log(chalk.blue("Creating sandbox..."));
        const name =
          options.name || `CLI Task ${new Date().toISOString().slice(0, 16)}`;
        const session = await api.createSession({
          name,
          region: options.region,
          repository: options.repo,
        });
        sessionId = session.id;
        console.log(
          chalk.green(`Sandbox created: ${chalk.bold(session.id)}`),
        );
      }

      // Send the task to the session
      console.log(chalk.blue("Starting task..."));
      const result = await api.sendTask(
        sessionId,
        task,
        task.slice(0, 50) + (task.length > 50 ? "..." : ""),
      );

      console.log(chalk.green("Task started successfully!"));
      console.log(`${chalk.bold("Session ID:")} ${sessionId}`);
      console.log(`${chalk.bold("Run ID:")} ${result.runId}`);
      console.log(`${chalk.bold("Status:")} ${result.status}`);
      console.log(
        `\nView progress: ${chalk.cyan(`https://shipbox.dev/boxes/${sessionId}`)}`,
      );
      console.log(
        `Check status: ${chalk.cyan(`shipbox get ${result.runId}`)}`,
      );
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });
