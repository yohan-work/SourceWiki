import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { requireVerifiedUser } from '../../middleware/authorize.js';
import * as files from './file.service.js';

function attachmentName(value: string) {
  return encodeURIComponent(value).replace(/['()]/g, escape);
}

export function createFileRouter() {
  const router = Router();

  router.get('/:id/download', async (req, res) => {
    const download = await files.getDownload(String(req.params.id));
    res.setHeader('Content-Type', download.file.mimeType);
    res.setHeader('Content-Length', String(download.sizeBytes));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${attachmentName(download.file.originalName)}`,
    );
    res.send(download.buffer);
  });

  router.delete('/:id', authenticate, requireVerifiedUser, async (req, res) => {
    await files.deleteFile(String(req.params.id), res.locals.auth.userId);
    res.status(204).send();
  });

  return router;
}
