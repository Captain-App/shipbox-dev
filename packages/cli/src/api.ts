import { getApiKey, getBaseUrl } from "./config.js";

export interface Session {
  id: string;
  sessionId: string;
  status: "started" | "running" | "completed" | "failed";
  task?: string;
  repository?: string;
  branch?: string;
  createdAt: number;
  realtimeToken?: string;
}

export interface CreateSessionParams {
  name: string;
  region: string;
  repository?: string;
}

export class ShipboxApi {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const key = getApiKey();
    if (!key) {
      throw new Error(
        "API key not found. Please run `shipbox config set api-key <key>` or set SHIPBOX_API_KEY environment variable.",
      );
    }
    this.apiKey = key;
    this.baseUrl = getBaseUrl();
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        `API Error (${response.status}): ${error.error || response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async listSessions(): Promise<Session[]> {
    return this.request<Session[]>("/sessions");
  }

  async getSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}`);
  }

  async createSession(params: CreateSessionParams): Promise<Session> {
    return this.request<Session>("/sessions", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async deleteSession(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/sessions/${id}`, {
      method: "DELETE",
    });
  }

  async startSession(id: string): Promise<any> {
    return this.request(`/sessions/${id}/start`, {
      method: "POST",
    });
  }

  async sendTask(
    sessionId: string,
    task: string,
    title?: string,
  ): Promise<{ runId: string; status: string }> {
    return this.request(`/sessions/${sessionId}/task`, {
      method: "POST",
      body: JSON.stringify({ task, title }),
    });
  }

  async getRun(
    sessionId: string,
    runId: string,
  ): Promise<{
    runId: string;
    sessionId: string;
    status: string;
    output?: string;
    error?: string;
    task?: string;
    startedAt?: number;
    completedAt?: number;
  }> {
    return this.request(`/sessions/${sessionId}/runs/${runId}`);
  }
}
