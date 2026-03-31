export const SyncDirections = {
  PUSH: 'push',
  PULL: 'pull',
} as const;

export const SyncStatuses = {
  STARTED: 'started',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const ProjectStatuses = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export const DocumentStatuses = {
  PENDING: 'pending',
  PUSHED: 'pushed',
  SYNCED: 'synced',
  ERROR: 'error',
} as const;

export const API_LIMITS = {
  MAX_REPOS_PER_PAGE: 30,
  MAX_DOCUMENTS_PER_PUSH: 50,
  GOOGLE_DOCS_COMMENT_MAX_LENGTH: 5000,
} as const;
