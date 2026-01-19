import WebSocket from 'ws';
import type { RealtimeEvent } from '../types/interactive.js';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private token: string = '';
  private eventHandlers: Map<string, (event: RealtimeEvent) => void> = new Map();
  private messageBuffer: RealtimeEvent[] = [];

  async connect(sessionId: string, token: string, options: { timeout?: number } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;
      this.token = token;

      const wsUrl = `wss://engine.shipbox.dev/realtime?sessionId=${sessionId}&token=${token}`;
      this.ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, options.timeout || 10000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.processBuffer();
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        this.handleClose();
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = data.toString();
      const event: RealtimeEvent = JSON.parse(message);

      const handler = this.eventHandlers.get(event.type);
      if (handler) {
        handler(event);
      }

      const generalHandler = this.eventHandlers.get('*');
      if (generalHandler) {
        generalHandler(event);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(): void {
    // Connection closed
  }

  private processBuffer(): void {
    const buffer = this.messageBuffer;
    this.messageBuffer = [];
    buffer.forEach((event) => this.handleMessage(JSON.stringify(event)));
  }

  on(event: string, handler: (data: RealtimeEvent) => void): void {
    this.eventHandlers.set(event, handler);
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
