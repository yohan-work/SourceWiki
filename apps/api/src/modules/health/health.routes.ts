import { Router } from 'express';

type DatabaseCheck = () => Promise<void>;

function timestamp(): string {
  return new Date().toISOString();
}

export function createHealthRouter(checkDatabase: DatabaseCheck): Router {
  const router = Router();

  router.get('/live', (_req, res) => {
    res.status(200).json({
      data: { status: 'ok', service: 'api', timestamp: timestamp() },
      meta: { requestId: String(res.locals.requestId) },
    });
  });

  router.get('/ready', async (_req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({
        data: {
          status: 'ok',
          service: 'database',
          timestamp: timestamp(),
          checks: { database: 'up' },
        },
        meta: { requestId: String(res.locals.requestId) },
      });
    } catch {
      res.status(503).json({
        data: {
          status: 'unavailable',
          service: 'database',
          timestamp: timestamp(),
          checks: { database: 'down' },
        },
        meta: { requestId: String(res.locals.requestId) },
      });
    }
  });

  return router;
}
