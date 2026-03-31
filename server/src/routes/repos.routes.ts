import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { listRepos, getFileContent } from '../services/github.service.js';
import { parseSummary } from '../services/summary-parser.js';
import { AppError } from '../middleware/error-handler.js';

export const reposRouter = Router();

reposRouter.get('/repos', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await listRepos(req.session.userId!, page);
    res.json(result);
  } catch (err) { next(err); }
});

reposRouter.get('/repos/:owner/:repo/summary', requireAuth, async (req, res, next) => {
  try {
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    let content: string;
    try {
      content = await getFileContent(req.session.userId!, owner, repo, 'SUMMARY.md');
    } catch {
      throw new AppError(404, 'SUMMARY.md not found in this repository. Is this a GitBook repository?');
    }
    const entries = parseSummary(content);
    res.json({ entries });
  } catch (err) { next(err); }
});
