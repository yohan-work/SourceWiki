import { Router } from 'express';
import type { SourceListQuery } from '@sourcewiki/shared';
import { sourceListQuerySchema, updateProfileRequestSchema } from '@sourcewiki/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuthenticate, requireVerifiedUser } from '../../middleware/authorize.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as sources from '../sources/source.service.js';
import * as users from './user.service.js';

export function createUserRouter() {
  const router = Router();

  router.patch(
    '/me',
    authenticate,
    requireVerifiedUser,
    validateBody(updateProfileRequestSchema),
    async (req, res) => {
      const data = await users.updateMe(res.locals.auth.userId, req.body);
      res.json({ data, meta: { requestId: res.locals.requestId } });
    },
  );

  router.get('/:id', async (req, res) => {
    const data = await users.getUserProfile(String(req.params.id));
    res.json({ data, meta: { requestId: res.locals.requestId } });
  });

  router.get(
    '/:id/sources',
    optionalAuthenticate,
    validateQuery(sourceListQuerySchema),
    async (req, res) => {
      const query = res.locals.validatedQuery as SourceListQuery;
      const result = await sources.listUserSources(
        String(req.params.id),
        query,
        res.locals.auth?.userId,
      );
      res.json({ ...result, meta: { requestId: res.locals.requestId } });
    },
  );

  return router;
}
