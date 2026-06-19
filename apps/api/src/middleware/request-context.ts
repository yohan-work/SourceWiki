import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '../lib/logger.js';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (_req, res) => String(res.getHeader('x-request-id') ?? randomUUID()),
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});
