import { Router } from 'express';
import {
  commentRequestSchema,
  paginationQuerySchema,
  sourceCreateRequestSchema,
  sourceUpdateRequestSchema,
} from '@sourcewiki/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuthenticate, requireVerifiedUser } from '../../middleware/authorize.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as comments from '../comments/comment.service.js';
import * as sources from './source.service.js';

export function createSourceRouter() {
  const router = Router();

  router.get('/', validateQuery(paginationQuerySchema), async (_req, res) => {
    const { page, limit } = res.locals.validatedQuery as { page: number; limit: number };
    const result = await sources.listSources(page, limit);
    res.json({ ...result, meta: { requestId: res.locals.requestId } });
  });
  router.get('/:id/comments', optionalAuthenticate, async (req, res) => {
    res.json({
      data: await comments.listComments(String(req.params.id), res.locals.auth?.userId),
      meta: { requestId: res.locals.requestId },
    });
  });
  router.post(
    '/:id/comments',
    authenticate,
    requireVerifiedUser,
    validateBody(commentRequestSchema),
    async (req, res) => {
      const data = await comments.createComment(
        String(req.params.id),
        res.locals.auth.userId,
        req.body.content,
      );
      res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
    },
  );
  router.get('/:id', optionalAuthenticate, async (req, res) => {
    const data = await sources.getSource(String(req.params.id), res.locals.auth?.userId);
    res.json({ data, meta: { requestId: res.locals.requestId } });
  });
  router.post(
    '/',
    authenticate,
    requireVerifiedUser,
    validateBody(sourceCreateRequestSchema),
    async (req, res) => {
      const data = await sources.createSource(res.locals.auth.userId, req.body);
      res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
    },
  );
  router.patch(
    '/:id',
    authenticate,
    requireVerifiedUser,
    validateBody(sourceUpdateRequestSchema),
    async (req, res) => {
      const data = await sources.updateSource(
        String(req.params.id),
        res.locals.auth.userId,
        req.body,
      );
      res.json({ data, meta: { requestId: res.locals.requestId } });
    },
  );
  router.delete('/:id', authenticate, requireVerifiedUser, async (req, res) => {
    await sources.deleteSource(String(req.params.id), res.locals.auth.userId);
    res.status(204).send();
  });
  return router;
}
