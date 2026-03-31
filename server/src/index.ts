import express from 'express';
import passport from 'passport';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { sessionMiddleware } from './auth/session.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { reposRouter } from './routes/repos.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { syncRouter } from './routes/sync.routes.js';

// Trigger passport strategy registration
import './auth/github-oauth.js';
import './auth/google-oauth.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const origin = config.CLIENT_URL;
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', healthRouter);
app.use('/auth', authRouter);
app.use('/api', reposRouter);
app.use('/api', projectsRouter);
app.use('/api', syncRouter);

app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
});
