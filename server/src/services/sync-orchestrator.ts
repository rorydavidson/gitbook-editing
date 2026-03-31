import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { projects, documentMappings, syncLogs } from '../db/schema.js';
import { getFileContent, getLatestCommitSha, createBranch, commitFiles, createPullRequest } from './github.service.js';
import { createDriveFolder } from './google-docs.service.js';
import { pushMarkdownToGoogleDoc } from './markdown-to-gdoc.js';
import { pullGoogleDocToMarkdown } from './gdoc-to-markdown.js';
import { AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

export interface PushSummary {
  pushed: number;
  failed: number;
  documents: Array<{ path: string; docUrl: string | null; error?: string }>;
}

export async function pushDocuments(userId: number, projectId: number): Promise<PushSummary> {
  const project = await db.select().from(projects).where(
    and(eq(projects.id, projectId), eq(projects.userId, userId)),
  ).get();

  if (!project) throw new AppError(404, 'Project not found');

  const docs = await db.select().from(documentMappings).where(
    eq(documentMappings.projectId, projectId),
  ).all();

  if (docs.length === 0) throw new AppError(400, 'No documents selected');

  const logResult = await db.insert(syncLogs).values({
    projectId,
    direction: 'push',
    status: 'started',
    documentsAffected: docs.length,
  }).run();
  const logId = Number(logResult.lastInsertRowid);

  let folderId = project.googleDriveFolderId;
  if (!folderId) {
    folderId = await createDriveFolder(userId, `GitBook: ${project.repoOwner}/${project.repoName}`);
    await db.update(projects)
      .set({ googleDriveFolderId: folderId, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, projectId))
      .run();
  }

  const summary: PushSummary = { pushed: 0, failed: 0, documents: [] };

  const commitSha = await getLatestCommitSha(userId, project.repoOwner, project.repoName, project.defaultBranch);

  for (const doc of docs) {
    try {
      const markdown = await getFileContent(userId, project.repoOwner, project.repoName, doc.localPath, project.defaultBranch);

      const result = await pushMarkdownToGoogleDoc(userId, doc.title, markdown, folderId);

      await db.update(documentMappings)
        .set({
          googleDocId: result.docId,
          googleDocUrl: result.docUrl,
          lastPushedAt: new Date().toISOString(),
          lastPushedCommitSha: commitSha,
          status: 'pushed',
        })
        .where(eq(documentMappings.id, doc.id))
        .run();

      summary.pushed++;
      summary.documents.push({ path: doc.localPath, docUrl: result.docUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err, path: doc.localPath }, 'Failed to push document');

      await db.update(documentMappings)
        .set({ status: 'error' })
        .where(eq(documentMappings.id, doc.id))
        .run();

      summary.failed++;
      summary.documents.push({ path: doc.localPath, docUrl: null, error: message });
    }
  }

  await db.update(syncLogs)
    .set({
      status: summary.failed === docs.length ? 'failed' : 'completed',
      documentsAffected: summary.pushed,
    })
    .where(eq(syncLogs.id, logId))
    .run();

  return summary;
}

export interface PullSummary {
  pulled: number;
  failed: number;
  pullRequestUrl: string | null;
  documents: Array<{ path: string; error?: string }>;
}

export async function pullDocuments(userId: number, projectId: number): Promise<PullSummary> {
  const project = await db.select().from(projects).where(
    and(eq(projects.id, projectId), eq(projects.userId, userId)),
  ).get();

  if (!project) throw new AppError(404, 'Project not found');

  const allDocs = await db.select().from(documentMappings).where(
    and(eq(documentMappings.projectId, projectId), eq(documentMappings.status, 'pushed')),
  ).all();

  const docs = allDocs.filter((d) => d.googleDocId);

  if (docs.length === 0) throw new AppError(400, 'No pushed documents to pull');

  const logResult = await db.insert(syncLogs).values({
    projectId,
    direction: 'pull',
    status: 'started',
    documentsAffected: docs.length,
  }).run();
  const logId = Number(logResult.lastInsertRowid);

  const summary: PullSummary = { pulled: 0, failed: 0, pullRequestUrl: null, documents: [] };
  const fileChanges: Array<{ path: string; content: string }> = [];

  for (const doc of docs) {
    try {
      const result = await pullGoogleDocToMarkdown(userId, doc.googleDocId!);

      fileChanges.push({ path: doc.localPath, content: result.markdown });

      await db.update(documentMappings)
        .set({
          lastPulledAt: new Date().toISOString(),
          status: 'synced',
        })
        .where(eq(documentMappings.id, doc.id))
        .run();

      summary.pulled++;
      summary.documents.push({ path: doc.localPath });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err, path: doc.localPath }, 'Failed to pull document');
      summary.failed++;
      summary.documents.push({ path: doc.localPath, error: message });
    }
  }

  if (fileChanges.length > 0) {
    try {
      const baseSha = await getLatestCommitSha(userId, project.repoOwner, project.repoName, project.defaultBranch);
      const branchName = `gitbook-sync/${Date.now()}`;

      await createBranch(userId, project.repoOwner, project.repoName, branchName, baseSha);

      await commitFiles(
        userId,
        project.repoOwner,
        project.repoName,
        branchName,
        `Sync changes from Google Docs\n\nUpdated ${fileChanges.length} document(s) from collaborative editing in Google Docs.`,
        fileChanges,
      );

      const pr = await createPullRequest(
        userId,
        project.repoOwner,
        project.repoName,
        branchName,
        project.defaultBranch,
        'Sync changes from Google Docs',
        `This PR contains changes made during collaborative editing in Google Docs.\n\n**Documents updated:**\n${fileChanges.map((f) => `- \`${f.path}\``).join('\n')}`,
      );

      summary.pullRequestUrl = pr.url;

      await db.update(projects)
        .set({ syncBranch: branchName, updatedAt: new Date().toISOString() })
        .where(eq(projects.id, projectId))
        .run();
    } catch (err) {
      logger.error({ err }, 'Failed to create PR');
      throw new AppError(500, 'Failed to create pull request');
    }
  }

  await db.update(syncLogs)
    .set({
      status: summary.failed === docs.length ? 'failed' : 'completed',
      documentsAffected: summary.pulled,
      pullRequestUrl: summary.pullRequestUrl,
    })
    .where(eq(syncLogs.id, logId))
    .run();

  return summary;
}
