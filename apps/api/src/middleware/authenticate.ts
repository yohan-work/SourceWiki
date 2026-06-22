import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import { verifyAuthToken } from '../lib/jwt.js';

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token as string | undefined;
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.');
    const payload = await verifyAuthToken(token, 'access');
    res.locals.auth = { userId: payload.sub };
    next();
  } catch (error) {
    next(error);
  }
};
