import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth, requireGoogleAuth } from '../auth/middleware.js';
import { db } from '../db/connection.js';
import { projects, documentMappings, syncLogs } from '../db/schema.js';
import { getRepoDefaultBranch } from '../services/github.service.js';
import { AppError } from '../middleware/error-handler.js';

export const projectsRouter = Router();

const createProjectSchema = z.object({
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
});

const selectDocumentsSchema = z.object({
  documents: z.array(z.object({
    path: z.string().min(1),
    title: z.string().min(1),
  })),
});

projectsRouter.post('/projects', requireAuth, async (req, res, next) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const userId = req.session.userId!;

    const defaultBranch = await getRepoDefaultBranch(userId, body.repoOwner, body.repoName);

    const existing = await db.select().from(projects).where(
      and(
        eq(projects.userId, userId),
        eq(projects.repoOwner, body.repoOwner),
        eq(projects.repoName, body.repoName),
        eq(projects.status, 'active'),
      ),
    ).get();

    if (existing) {
      res.json({ project: existing });
      return;
    }

    const result = await db.insert(projects).values({
      userId,
      repoOwner: body.repoOwner,
      repoName: body.repoName,
      defaultBranch,
    }).run();

    const project = await db.select().from(projects).where(eq(projects.id, Number(result.lastInsertRowid))).get();
    res.status(201).json({ project });
  } catch (err) { next(err); }
});

projectsRouter.get('/projects', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const result = await db.select().from(projects).where(eq(projects.userId, userId)).all();
    res.json({ projects: result });
  } catch (err) { next(err); }
});

projectsRouter.get('/projects/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(String(req.params.id));

    const project = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, userId)),
    ).get();

    if (!project) throw new AppError(404, 'Project not found');

    const docs = await db.select().from(documentMappings).where(
      eq(documentMappings.projectId, projectId),
    ).all();

    const logs = await db.select().from(syncLogs).where(
      eq(syncLogs.projectId, projectId),
    ).all();

    res.json({ project, documents: docs, syncLogs: logs });
  } catch (err) { next(err); }
});

projectsRouter.post('/projects/:id/documents', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.session.userId!;
    const body = selectDocumentsSchema.parse(req.body);

    const project = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, userId)),
    ).get();

    if (!project) throw new AppError(404, 'Project not found');

    // Clear existing pending documents
    const existing = await db.select().from(documentMappings).where(
      and(eq(documentMappings.projectId, projectId), eq(documentMappings.status, 'pending')),
    ).all();

    for (const doc of existing) {
      await db.delete(documentMappings).where(eq(documentMappings.id, doc.id)).run();
    }

    for (const doc of body.documents) {
      await db.insert(documentMappings).values({
        projectId,
        localPath: doc.path,
        title: doc.title,
      }).run();
    }

    const docs = await db.select().from(documentMappings).where(
      eq(documentMappings.projectId, projectId),
    ).all();

    res.json({ documents: docs });
  } catch (err) { next(err); }
});

projectsRouter.get('/projects/:id/sync-logs', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(String(req.params.id));

    const project = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, userId)),
    ).get();

    if (!project) throw new AppError(404, 'Project not found');

    const logs = await db.select().from(syncLogs).where(
      eq(syncLogs.projectId, projectId),
    ).all();

    res.json({ syncLogs: logs });
  } catch (err) { next(err); }
});
