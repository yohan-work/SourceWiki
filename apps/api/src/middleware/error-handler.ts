import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', '요청한 API 경로를 찾을 수 없습니다.'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  const requestId = String(res.locals.requestId ?? 'unknown');

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, requestId },
    });
    return;
  }

  logger.error({ err: error, requestId }, 'Unhandled request error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: '서버에서 요청을 처리하지 못했습니다.',
      requestId,
    },
  });
};
