import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { ShipboxApi } from '../api.js';
import { formatStatus } from './events.js';

export interface PickerSession {
  sessionId: string;
  status: string;
  task?: string;
  createdAt: number;
}

function formatSessionChoice(session: PickerSession): string {
  const status = session.status;
  const statusStr = formatStatus(status);
  const taskStr = session.task ? `- ${session.task.substring(0, 30)}` : '- No task';
  const createdStr = new Date(session.createdAt).toLocaleString();

  return `${statusStr} ${chalk.cyan(session.sessionId)} ${taskStr} ${chalk.dim(`(${createdStr})`)}`;
}

export async function pickSession(api: ShipboxApi): Promise<string> {
  try {
    const sessions = await api.listSessions();

    if (sessions.length === 0) {
      console.log(chalk.yellow('No active sessions found.'));
      console.log(chalk.gray('Run "shipbox run <task>" to create a new session.'));
      process.exit(1);
    }

    const sessionId = await select({
      message: 'Select a session to connect:',
      choices: sessions.map(session => ({
        name: formatSessionChoice(session),
        value: session.sessionId,
        description: ''
      }))
    });

    return sessionId;
  } catch (error) {
    if ((error as any).isTtyError) {
      throw new Error('Prompt could not be rendered in the current environment');
    }
    throw error;
  }
}
