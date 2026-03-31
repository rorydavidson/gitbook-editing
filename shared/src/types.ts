export interface SummaryEntry {
  title: string;
  path: string;
  depth: number;
  children: SummaryEntry[];
}

export type SyncDirection = 'push' | 'pull';
export type SyncStatus = 'started' | 'completed' | 'failed';
export type ProjectStatus = 'active' | 'archived';
export type DocumentStatus = 'pending' | 'pushed' | 'synced' | 'error';
