import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import { prisma } from '../lib/database.js';
import { verifyAuthToken } from '../lib/jwt.js';

export const optionalAuthenticate: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) return next();
  try {
    const payload = await verifyAuthToken(token, 'access');
    res.locals.auth = { userId: payload.sub };
  } catch {
    // Public reads remain available when a stale cookie is present.
  }
  next();
};

export const requireVerifiedUser: RequestHandler = async (_req, res, next) => {
  try {
    const userId = res.locals.auth?.userId as string | undefined;
    if (!userId) throw new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.');
    if (!user.emailVerifiedAt)
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', '이메일 인증을 먼저 완료해 주세요.');
    next();
  } catch (error) {
    next(error);
  }
};
