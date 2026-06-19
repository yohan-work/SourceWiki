import express, { type Express } from 'express';
import helmet from 'helmet';

import { checkDatabase as defaultDatabaseCheck } from './lib/database.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { requestId, requestLogger } from './middleware/request-context.js';
import { createHealthRouter } from './modules/health/health.routes.js';

interface AppDependencies {
  checkDatabase?: () => Promise<void>;
}

export function createApp({ checkDatabase = defaultDatabaseCheck }: AppDependencies = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(express.json({ limit: '256kb' }));

  app.use('/api/health', createHealthRouter(checkDatabase));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
