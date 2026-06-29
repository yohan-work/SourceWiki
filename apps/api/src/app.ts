import express, { type Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { smtpMailer, type Mailer } from './integrations/mail.js';
import { checkDatabase as defaultDatabaseCheck } from './lib/database.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { requestId, requestLogger } from './middleware/request-context.js';
import { verifyOrigin } from './middleware/origin.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createCommentRouter } from './modules/comments/comment.routes.js';
import { createFileRouter } from './modules/files/file.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createSourceRouter } from './modules/sources/source.routes.js';
import { createToolsRouter } from './modules/tools/tools.routes.js';
import { createUserRouter } from './modules/users/user.routes.js';
import { createOpenApiRouter } from './openapi/openapi.routes.js';

interface AppDependencies {
  checkDatabase?: () => Promise<void>;
  mailer?: Mailer;
}

export function createApp({
  checkDatabase = defaultDatabaseCheck,
  mailer = smtpMailer,
}: AppDependencies = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(express.json({ limit: '512kb' }));
  app.use(cookieParser());
  app.use(verifyOrigin);

  app.use('/api/health', createHealthRouter(checkDatabase));
  app.use('/api/auth', createAuthRouter(mailer));
  app.use('/api/tools', createToolsRouter());
  app.use('/api/sources', createSourceRouter());
  app.use('/api/comments', createCommentRouter());
  app.use('/api/files', createFileRouter());
  app.use('/api/users', createUserRouter());
  app.use('/api', createOpenApiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
