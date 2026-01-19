#!/usr/bin/env node
import { Command } from "commander";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";
import { configCommand } from "./commands/config.js";
import { loginCommand } from "./commands/login.js";
import { connectCommand } from "./commands/connect.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"),
);

const program = new Command();

program
  .name("shipbox")
  .description("CLI for shipbox.dev - Delegate coding tasks to AI sandboxes")
  .version(packageJson.version);

program.addCommand(loginCommand);
program.addCommand(runCommand);
program.addCommand(listCommand);
program.addCommand(getCommand);
program.addCommand(configCommand);
program.addCommand(connectCommand);

program.parse();
