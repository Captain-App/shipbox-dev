import chalk from 'chalk';
import type { RealtimeEvent } from '../types/interactive.js';

const ICONS = {
  success: '✓',
  error: '✗',
  progress: '◐',
  started: '▶',
  completed: '✓',
  failed: '✗',
  info: 'ℹ',
  warning: '⚠'
};

function getEventIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'task.started': ICONS.started,
    'task.completed': ICONS.completed,
    'task.failed': ICONS.failed,
    'run.completed': ICONS.completed,
    'run.failed': ICONS.failed,
    'deployment.started': ICONS.started,
    'deployment.completed': ICONS.completed,
    'deployment.failed': ICONS.failed,
    'log': ICONS.info
  };

  return iconMap[type] || ICONS.info;
}

function getEventColor(type: string): (text: string) => string {
  const colorMap: Record<string, (text: string) => string> = {
    'task.started': chalk.blue,
    'task.completed': chalk.green,
    'task.failed': chalk.red,
    'run.completed': chalk.green,
    'run.failed': chalk.red,
    'deployment.started': chalk.cyan,
    'deployment.completed': chalk.green,
    'deployment.failed': chalk.red,
    'error': chalk.red,
    'warning': chalk.yellow,
    'log': chalk.gray
  };

  return colorMap[type] || chalk.white;
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) {
    return 'now';
  } else if (diff < 60000) {
    return `${Math.floor(diff / 1000)}s ago`;
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  } else {
    return `${Math.floor(diff / 3600000)}h ago`;
  }
}

function truncateOutput(text: string, maxWidth: number = 100): string {
  if (text.length <= maxWidth) {
    return text;
  }
  return text.substring(0, maxWidth - 3) + '...';
}

export function formatEvent(event: RealtimeEvent): string {
  const icon = getEventIcon(event.type);
  const colorFn = getEventColor(event.type);
  const timestamp = chalk.dim(formatTimestamp(event.timestamp));

  let output = `${colorFn(icon)} [${timestamp}]`;

  // Format based on event type
  if (event.type.startsWith('task.')) {
    const taskData = event.data;
    output += ` Task: ${chalk.bold(taskData.id || 'unknown')}`;
    if (event.type === 'task.completed') {
      output += ' ' + chalk.green('completed');
      if (taskData.runId) {
        output += ` (run: ${taskData.runId})`;
      }
    } else if (event.type === 'task.failed') {
      output += ' ' + chalk.red('failed');
      if (taskData.error) {
        output += ` - ${truncateOutput(taskData.error)}`;
      }
    }
  } else if (event.type.startsWith('run.')) {
    const runData = event.data;
    output += ` Run: ${chalk.bold(runData.runId || 'unknown')}`;
    if (event.type === 'run.completed') {
      output += ' ' + chalk.green('completed');
      if (runData.tokenCount) {
        output += ` (${runData.tokenCount} tokens)`;
      }
    } else if (event.type === 'run.failed') {
      output += ' ' + chalk.red('failed');
      if (runData.error) {
        output += ` - ${truncateOutput(runData.error)}`;
      }
    }
  } else if (event.type.startsWith('deployment.')) {
    const deployData = event.data;
    output += ` Deployment`;
    if (event.type === 'deployment.completed') {
      output += ' ' + chalk.green('completed');
      if (deployData.url) {
        output += ` - ${chalk.cyan(deployData.url)}`;
      }
    } else if (event.type === 'deployment.failed') {
      output += ' ' + chalk.red('failed');
      if (deployData.error) {
        output += ` - ${truncateOutput(deployData.error)}`;
      }
    }
  } else if (event.type === 'log') {
    const logData = event.data;
    output += ` Log: ${truncateOutput(logData.message || logData.text || '')}`;
  } else {
    // Generic event formatting
    output += ` ${event.type}`;
    if (event.data && typeof event.data === 'object') {
      const dataStr = JSON.stringify(event.data);
      output += `: ${truncateOutput(dataStr)}`;
    }
  }

  return output;
}

export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': chalk.green('● active'),
    'running': chalk.green('● running'),
    'idle': chalk.yellow('● idle'),
    'stopped': chalk.red('● stopped'),
    'error': chalk.red('● error'),
    'completed': chalk.green('● completed')
  };

  return statusMap[status] || chalk.gray(`● ${status}`);
}

export function formatSessionInfo(session: any): string {
  const lines = [
    chalk.bold('Session Information'),
    chalk.gray('─'.repeat(40)),
    `Session ID: ${chalk.cyan(session.sessionId)}`,
    `Status: ${formatStatus(session.status)}`,
    `Created: ${new Date(session.createdAt).toLocaleString()}`
  ];

  if (session.task) {
    lines.push(`Task: ${chalk.dim(session.task)}`);
  }
  if (session.repository) {
    lines.push(`Repository: ${chalk.dim(session.repository)}`);
  }
  if (session.branch) {
    lines.push(`Branch: ${chalk.dim(session.branch)}`);
  }

  return lines.join('\n');
}
