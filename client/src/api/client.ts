const BASE_URL = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface User {
  id: number;
  githubUsername: string;
  googleEmail: string | null;
  googleConnected: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  updatedAt: string;
}

export interface SummaryEntry {
  title: string;
  path: string;
  depth: number;
  children: SummaryEntry[];
}

export interface Project {
  id: number;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  syncBranch: string | null;
  status: string;
  createdAt: string;
}

export interface DocumentMapping {
  id: number;
  projectId: number;
  localPath: string;
  title: string;
  googleDocId: string | null;
  googleDocUrl: string | null;
  lastPushedAt: string | null;
  lastPulledAt: string | null;
  status: string;
}

export interface SyncLog {
  id: number;
  direction: string;
  status: string;
  documentsAffected: number | null;
  pullRequestUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export const api = {
  getAuth: () => request<AuthStatus>('/auth/me'),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  listRepos: (page = 1) => request<{ repos: RepoInfo[]; hasMore: boolean }>(`/api/repos?page=${page}`),

  getSummary: (owner: string, repo: string) =>
    request<{ entries: SummaryEntry[] }>(`/api/repos/${owner}/${repo}/summary`),

  createProject: (repoOwner: string, repoName: string) =>
    request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ repoOwner, repoName }),
    }),

  listProjects: () => request<{ projects: Project[] }>('/api/projects'),

  getProject: (id: number) =>
    request<{ project: Project; documents: DocumentMapping[]; syncLogs: SyncLog[] }>(`/api/projects/${id}`),

  selectDocuments: (projectId: number, documents: Array<{ path: string; title: string }>) =>
    request<{ documents: DocumentMapping[] }>(`/api/projects/${projectId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ documents }),
    }),

  push: (projectId: number) =>
    request<{ pushed: number; failed: number; documents: Array<{ path: string; docUrl: string | null; error?: string }> }>(
      `/api/projects/${projectId}/push`, { method: 'POST' },
    ),

  pull: (projectId: number) =>
    request<{ pulled: number; failed: number; pullRequestUrl: string | null; documents: Array<{ path: string; error?: string }> }>(
      `/api/projects/${projectId}/pull`, { method: 'POST' },
    ),
};
