import { Router } from 'express';
import { commentRequestSchema } from '@sourcewiki/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { requireVerifiedUser } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import * as comments from './comment.service.js';

export function createCommentRouter() {
  const router = Router();
  router.patch(
    '/:id',
    authenticate,
    requireVerifiedUser,
    validateBody(commentRequestSchema),
    async (req, res) => {
      const data = await comments.updateComment(
        String(req.params.id),
        res.locals.auth.userId,
        req.body.content,
      );
      res.json({ data, meta: { requestId: res.locals.requestId } });
    },
  );
  router.delete('/:id', authenticate, requireVerifiedUser, async (req, res) => {
    await comments.deleteComment(String(req.params.id), res.locals.auth.userId);
    res.status(204).send();
  });
  return router;
}
