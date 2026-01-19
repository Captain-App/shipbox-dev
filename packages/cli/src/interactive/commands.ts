import chalk from 'chalk';
import type { SlashCommand, InteractiveContext, ParsedCommand } from '../types/interactive.js';
import { formatStatus, formatSessionInfo } from './events.js';
import Table from 'cli-table3';

async function handleTaskCommand(args: string[], context: InteractiveContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: /task <description>'));
    return;
  }

  const task = args.join(' ');
  console.log(chalk.dim('Submitting task...'));

  try {
    const result = await context.api.sendTask(context.sessionId, task);
    console.log(chalk.green(`✓ Task submitted`));
    console.log(chalk.dim(`Run ID: ${result.runId}`));
  } catch (error) {
    console.log(chalk.red(`✗ Failed to submit task: ${(error as Error).message}`));
  }
}

async function handleStatusCommand(args: string[], context: InteractiveContext): Promise<void> {
  try {
    const session = await context.api.getSession(context.sessionId);

    console.log('');
    console.log(formatSessionInfo(session));
    console.log('');
  } catch (error) {
    console.log(chalk.red(`✗ Failed to get session status: ${(error as Error).message}`));
  }
}

async function handleHelpCommand(args: string[], context: InteractiveContext): Promise<void> {
  if (args.length > 0) {
    const cmdName = args[0].replace(/^\//, '');
    const cmd = slashCommands.find(c => c.name === cmdName || c.aliases.includes(cmdName));

    if (!cmd) {
      console.log(chalk.yellow(`Unknown command: ${cmdName}`));
      return;
    }

    console.log('');
    console.log(chalk.bold(`Command: /${cmd.name}`));
    console.log(`Description: ${cmd.description}`);
    console.log(`Usage: ${cmd.usage}`);
    if (cmd.aliases.length > 0) {
      console.log(`Aliases: ${cmd.aliases.map(a => `/${a}`).join(', ')}`);
    }
    console.log('');
    return;
  }

  console.log('');
  console.log(chalk.bold('Available Commands'));
  console.log(chalk.gray('─'.repeat(50)));

  const table = new Table({
    head: [chalk.cyan('Command'), chalk.cyan('Aliases'), chalk.cyan('Description')],
    style: { head: [], border: ['grey'] },
    wordWrap: true,
    colWidths: [12, 20, 30]
  });

  slashCommands.forEach(cmd => {
    table.push([
      chalk.yellow(`/${cmd.name}`),
      cmd.aliases.map(a => `/${a}`).join(', ') || '-',
      cmd.description
    ]);
  });

  console.log(table.toString());
  console.log(chalk.gray('Use /help <command> for detailed help'));
  console.log('');
}

async function handleLogsCommand(args: string[], context: InteractiveContext): Promise<void> {
  const lines = args.length > 0 ? parseInt(args[0], 10) : 20;

  if (isNaN(lines)) {
    console.log(chalk.yellow('Usage: /logs [lines]'));
    return;
  }

  const events = context.events.slice(-lines);

  if (events.length === 0) {
    console.log(chalk.dim('No events recorded yet'));
    return;
  }

  console.log('');
  console.log(chalk.bold(`Recent Events (last ${events.length})`));
  console.log(chalk.gray('─'.repeat(50)));

  events.forEach(event => {
    console.log(`[${event.type}] ${JSON.stringify(event.data)}`);
  });

  console.log('');
}

async function handleDeployCommand(args: string[], context: InteractiveContext): Promise<void> {
  console.log(chalk.cyan('Deploy functionality coming in phase 2'));
  console.log(chalk.dim('This command will support deployment to Cloudflare Pages and Workers'));
}

async function handleExitCommand(args: string[], context: InteractiveContext): Promise<void> {
  console.log(chalk.dim('Disconnecting from session...'));
  context.ws.close();
  if (context.repl) {
    context.repl.close();
  }
  process.exit(0);
}

export const slashCommands: SlashCommand[] = [
  {
    name: 'task',
    aliases: ['t'],
    description: 'Submit a new task to the session',
    usage: '/task <description>',
    handler: handleTaskCommand
  },
  {
    name: 'status',
    aliases: ['s'],
    description: 'Show current session status',
    usage: '/status',
    handler: handleStatusCommand
  },
  {
    name: 'help',
    aliases: ['h', '?'],
    description: 'Show available commands',
    usage: '/help [command]',
    handler: handleHelpCommand
  },
  {
    name: 'logs',
    aliases: ['l'],
    description: 'View recent events',
    usage: '/logs [lines]',
    handler: handleLogsCommand
  },
  {
    name: 'deploy',
    aliases: ['d'],
    description: 'Deploy pages or worker',
    usage: '/deploy [--worker|--pages] [options]',
    handler: handleDeployCommand
  },
  {
    name: 'exit',
    aliases: ['quit', 'q', 'disconnect'],
    description: 'Exit interactive mode',
    usage: '/exit',
    handler: handleExitCommand
  }
];

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { command: '', args: [] };
  }

  const parts = trimmed.slice(1).split(/\s+/);
  return { command: parts[0], args: parts.slice(1) };
}

export async function executeCommand(
  input: string,
  context: InteractiveContext
): Promise<void> {
  const { command, args } = parseCommand(input);

  if (!command) {
    return;
  }

  const cmd = slashCommands.find(c => c.name === command || c.aliases.includes(command));

  if (!cmd) {
    console.log(chalk.yellow(`Unknown command: /${command}. Type /help for available commands.`));
    return;
  }

  await cmd.handler(args, context);
}

export function getCommandCompletions(line: string): string[] {
  if (!line.startsWith('/')) {
    return [];
  }

  const commands: string[] = [];
  slashCommands.forEach(cmd => {
    commands.push(`/${cmd.name}`);
    cmd.aliases.forEach(alias => {
      commands.push(`/${alias}`);
    });
  });

  return commands.filter(cmd => cmd.startsWith(line));
}
