import { Router } from 'express';
import { requireGoogleAuth } from '../auth/middleware.js';
import { pushDocuments, pullDocuments } from '../services/sync-orchestrator.js';

export const syncRouter = Router();

syncRouter.post('/projects/:id/push', requireGoogleAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.session.userId!;
    const result = await pushDocuments(userId, projectId);
    res.json(result);
  } catch (err) { next(err); }
});

syncRouter.post('/projects/:id/pull', requireGoogleAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.session.userId!;
    const result = await pullDocuments(userId, projectId);
    res.json(result);
  } catch (err) { next(err); }
});
