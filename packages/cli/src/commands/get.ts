import { Command } from "commander";
import { ShipboxApi } from "../api.js";
import chalk from "chalk";

export const getCommand = new Command("get")
  .description("Get status and results of a task run")
  .argument("<sessionId>", "The session ID (e.g., cd4f36e9)")
  .argument("[runId]", "The run ID (if checking a specific run)")
  .option("--json", "Output in JSON format")
  .action(async (sessionId, runId, options) => {
    try {
      const api = new ShipboxApi();

      if (runId) {
        // Get specific run status
        const run = await api.getRun(sessionId, runId);

        if (options.json) {
          console.log(JSON.stringify(run, null, 2));
          return;
        }

        console.log(`${chalk.bold("Run ID:")} ${run.runId}`);
        console.log(`${chalk.bold("Session ID:")} ${run.sessionId}`);
        console.log(
          `${chalk.bold("Status:")} ${run.status === "completed" ? chalk.green(run.status) : run.status === "failed" ? chalk.red(run.status) : chalk.yellow(run.status)}`,
        );
        if (run.task) {
          console.log(`${chalk.bold("Task:")} ${run.task}`);
        }
        if (run.startedAt) {
          console.log(
            `${chalk.bold("Started:")} ${new Date(run.startedAt).toLocaleString()}`,
          );
        }
        if (run.completedAt) {
          console.log(
            `${chalk.bold("Completed:")} ${new Date(run.completedAt).toLocaleString()}`,
          );
        }
        if (run.output) {
          console.log(`\n${chalk.bold("Output:")}`);
          console.log(run.output);
        }
        if (run.error) {
          console.log(`\n${chalk.bold("Error:")} ${chalk.red(run.error)}`);
        }
      } else {
        // Get session info
        const session = await api.getSession(sessionId);

        if (options.json) {
          console.log(JSON.stringify(session, null, 2));
          return;
        }

        console.log(`${chalk.bold("Session ID:")} ${session.id}`);
        console.log(
          `${chalk.bold("Status:")} ${session.status === "completed" ? chalk.green(session.status) : session.status === "failed" ? chalk.red(session.status) : chalk.yellow(session.status)}`,
        );
        console.log(`${chalk.bold("Task:")} ${session.task || "N/A"}`);
        console.log(
          `${chalk.bold("Created:")} ${new Date(session.createdAt * 1000).toLocaleString()}`,
        );

        if (session.repository) {
          console.log(`${chalk.bold("Repository:")} ${session.repository}`);
          if (session.branch) {
            console.log(`${chalk.bold("Branch:")} ${session.branch}`);
          }
        }
      }

      console.log(
        `\nView full details: ${chalk.cyan(`https://shipbox.dev/boxes/${sessionId}`)}`,
      );
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });
