import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, type StrategyOptions } from 'passport-google-oauth20';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { encrypt } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { requireAuth } from './middleware.js';

passport.use(new GoogleStrategy(
  {
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL,
  } satisfies StrategyOptions,
  async (
    accessToken: string,
    refreshToken: string,
    profile: { id: string; emails?: Array<{ value: string }> },
    done: (err: Error | null, info?: { googleId: string; email: string; accessToken: string; refreshToken: string }) => void,
  ) => {
    try {
      const email = profile.emails?.[0]?.value ?? '';
      done(null, {
        googleId: profile.id,
        email,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      logger.error(err, 'Google OAuth error');
      done(err as Error);
    }
  },
));

export const googleAuthRouter = Router();

googleAuthRouter.get('/google', requireAuth, passport.authenticate('google', {
  accessType: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ],
}));

googleAuthRouter.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.CLIENT_URL}/login?error=google_failed` }),
  async (req, res) => {
    const googleInfo = req.user as { googleId: string; email: string; accessToken: string; refreshToken: string };
    const userId = req.session.userId;

    if (!userId) {
      res.redirect(`${config.CLIENT_URL}/login?error=session_expired`);
      return;
    }

    await db.update(users)
      .set({
        googleId: googleInfo.googleId,
        googleEmail: googleInfo.email,
        googleAccessToken: encrypt(googleInfo.accessToken),
        googleRefreshToken: googleInfo.refreshToken ? encrypt(googleInfo.refreshToken) : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .run();

    req.session.googleConnected = true;
    res.redirect(config.CLIENT_URL);
  },
);
