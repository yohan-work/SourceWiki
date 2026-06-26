import { Router } from 'express';
import { extractUrlRequestSchema } from '@sourcewiki/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { requireVerifiedUser } from '../../middleware/authorize.js';
import { createRateLimit } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import { extractUrl } from './url-extractor.js';

const extractUrlLimit = createRateLimit(20);

export function createToolsRouter() {
  const router = Router();

  router.post(
    '/extract-url',
    extractUrlLimit,
    authenticate,
    requireVerifiedUser,
    validateBody(extractUrlRequestSchema),
    async (req, res) => {
      const data = await extractUrl(req.body.url);
      res.json({ data, meta: { requestId: res.locals.requestId } });
    },
  );

  return router;
}
