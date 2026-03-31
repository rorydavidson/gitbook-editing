import { Router } from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { encrypt } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

interface GitHubProfile {
  id: string;
  username: string;
}

passport.use(new GitHubStrategy(
  {
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: config.GITHUB_CALLBACK_URL,
    scope: ['repo'],
  },
  async (
    accessToken: string,
    _refreshToken: string,
    profile: GitHubProfile,
    done: (err: Error | null, user?: { id: number; username: string }) => void,
  ) => {
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.githubId, profile.id))
        .get();

      if (existing) {
        await db.update(users)
          .set({
            githubUsername: profile.username,
            githubAccessToken: encrypt(accessToken),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, existing.id))
          .run();

        done(null, { id: existing.id, username: profile.username });
      } else {
        const result = await db
          .insert(users)
          .values({
            githubId: profile.id,
            githubUsername: profile.username,
            githubAccessToken: encrypt(accessToken),
          })
          .run();

        done(null, { id: Number(result.lastInsertRowid), username: profile.username });
      }
    } catch (err) {
      logger.error(err, 'GitHub OAuth error');
      done(err as Error);
    }
  },
));

passport.serializeUser((user, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).get();
    done(null, user ?? null);
  } catch (err) {
    done(err as Error);
  }
});

export const githubAuthRouter = Router();

githubAuthRouter.get('/github', passport.authenticate('github', { scope: ['repo'] }));

githubAuthRouter.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${config.CLIENT_URL}/login?error=github_failed` }),
  async (req, res) => {
    const user = req.user as { id: number; username: string };
    req.session.userId = user.id;
    req.session.githubUsername = user.username;

    const existing = await db.select().from(users).where(eq(users.id, user.id)).get();
    req.session.googleConnected = !!existing?.googleId;

    res.redirect(config.CLIENT_URL);
  },
);
