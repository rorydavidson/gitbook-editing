import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  githubId: text('github_id').notNull().unique(),
  githubUsername: text('github_username').notNull(),
  githubAccessToken: text('github_access_token').notNull(),
  googleId: text('google_id'),
  googleEmail: text('google_email'),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  defaultBranch: text('default_branch').notNull().default('main'),
  syncBranch: text('sync_branch'),
  googleDriveFolderId: text('google_drive_folder_id'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const documentMappings = sqliteTable('document_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  localPath: text('local_path').notNull(),
  title: text('title').notNull(),
  googleDocId: text('google_doc_id'),
  googleDocUrl: text('google_doc_url'),
  lastPushedAt: text('last_pushed_at'),
  lastPulledAt: text('last_pulled_at'),
  lastPushedCommitSha: text('last_pushed_commit_sha'),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const imageMappings = sqliteTable('image_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  localPath: text('local_path').notNull(),
  driveFileId: text('drive_file_id').notNull(),
  driveUrl: text('drive_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const syncLogs = sqliteTable('sync_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  direction: text('direction').notNull(),
  status: text('status').notNull(),
  documentsAffected: integer('documents_affected').default(0),
  pullRequestUrl: text('pull_request_url'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
