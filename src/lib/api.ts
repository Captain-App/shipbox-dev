import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface Sandbox {
  id: string; // Used by frontend (maps to sessionId)
  sessionId: string;
  sandboxId: string;
  status: 'creating' | 'active' | 'idle' | 'stopped' | 'error';
  createdAt: number;
  lastActivity: number;
  workspacePath: string;
  webUiUrl: string;
  repository?: {
    url: string;
    branch: string;
  };
  title?: string;
  config?: {
    defaultModel: string;
  };
  opencodeSessionId?: string;
  clonedRepos?: string[];
  // Frontend display fields
  name?: string; // Display name (alias for title)
  region?: string; // Display region
  tasksCompleted?: number;
  memoryUsage?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}

export const api = {
  async getSessions(): Promise<Sandbox[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions`, { headers });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async createSession(name: string, region: string, repository?: string): Promise<Sandbox> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, region, repository })
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSession(id: string): Promise<Sandbox> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${id}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async deleteSession(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  async startSession(id: string): Promise<{ success: boolean; status: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${id}/start`, {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Failed to start session');
    return res.json();
  },

  async getBalance(): Promise<{ userId: string; balanceCredits: number; updatedAt: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/billing/balance`, { headers });
    if (!res.ok) throw new Error('Failed to fetch balance');
    return res.json();
  }
};
