import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.header('origin');
  if (!origin || origin !== new URL(env.APP_URL).origin) {
    return next(new AppError(403, 'ORIGIN_NOT_ALLOWED', '허용되지 않은 요청 출처입니다.'));
  }
  next();
};
