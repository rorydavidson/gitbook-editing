import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { githubAuthRouter } from '../auth/github-oauth.js';
import { googleAuthRouter } from '../auth/google-oauth.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';

export const authRouter = Router();

authRouter.use(githubAuthRouter);
authRouter.use(googleAuthRouter);

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', async (req, res) => {
  if (!req.session.userId) {
    res.json({ authenticated: false });
    return;
  }

  const user = await db.select({
    id: users.id,
    githubUsername: users.githubUsername,
    googleEmail: users.googleEmail,
    googleConnected: users.googleId,
  }).from(users).where(eq(users.id, req.session.userId)).get();

  if (!user) {
    res.json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      githubUsername: user.githubUsername,
      googleEmail: user.googleEmail,
      googleConnected: !!user.googleConnected,
    },
  });
});
