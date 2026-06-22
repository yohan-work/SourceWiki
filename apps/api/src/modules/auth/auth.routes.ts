import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  checkEmailRequestSchema,
  loginRequestSchema,
  resendVerificationRequestSchema,
  signupRequestSchema,
  verifyEmailRequestSchema,
} from '@sourcewiki/shared';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { smtpMailer, type Mailer } from '../../integrations/mail.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import * as authService from './auth.service.js';

const authLimit = (limit: number, windowMs = 15 * 60 * 1_000) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false });

const cookieBase = { httpOnly: true, secure: env.COOKIE_SECURE } as const;

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('access_token', tokens.accessToken, {
    ...cookieBase,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1_000,
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    ...cookieBase,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 14 * 24 * 60 * 60 * 1_000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { ...cookieBase, sameSite: 'lax', path: '/' });
  res.clearCookie('refresh_token', { ...cookieBase, sameSite: 'strict', path: '/api/auth' });
}

export function createAuthRouter(mailer: Mailer = smtpMailer): Router {
  const router = Router();

  router.post(
    '/check-email',
    authLimit(10),
    validateBody(checkEmailRequestSchema),
    async (req, res) => {
      res.json({
        data: { available: await authService.checkEmail(req.body.email) },
        meta: { requestId: res.locals.requestId },
      });
    },
  );
  router.post(
    '/signup',
    authLimit(5, 60 * 60 * 1_000),
    validateBody(signupRequestSchema),
    async (req, res) => {
      const user = await authService.signup(req.body, mailer);
      res.status(201).json({ data: user, meta: { requestId: res.locals.requestId } });
    },
  );
  router.post(
    '/verify-email',
    authLimit(10),
    validateBody(verifyEmailRequestSchema),
    async (req, res) => {
      await authService.verifyEmail(req.body.token);
      res.json({
        data: { message: '이메일 인증이 완료되었습니다.' },
        meta: { requestId: res.locals.requestId },
      });
    },
  );
  router.post(
    '/resend-verification',
    authLimit(3, 60 * 60 * 1_000),
    validateBody(resendVerificationRequestSchema),
    async (req, res) => {
      await authService.resendVerification(req.body.email, mailer);
      res.json({
        data: { message: '인증이 필요한 계정이라면 이메일을 다시 보냈습니다.' },
        meta: { requestId: res.locals.requestId },
      });
    },
  );
  router.post('/login', authLimit(10), validateBody(loginRequestSchema), async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    setAuthCookies(res, result);
    res.json({ data: result.user, meta: { requestId: res.locals.requestId } });
  });
  router.post('/refresh', authLimit(30), async (req, res) => {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) throw new AppError(401, 'SESSION_EXPIRED', '세션이 만료되었습니다.');
    try {
      setAuthCookies(res, await authService.refresh(token));
      res.status(204).send();
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  });
  router.post('/logout', authLimit(30), async (req, res) => {
    await authService.logout(req.cookies?.refresh_token as string | undefined);
    clearAuthCookies(res);
    res.status(204).send();
  });
  router.get('/me', authenticate, async (_req, res) => {
    const user = await authService.getMe(res.locals.auth.userId as string);
    res.json({ data: user, meta: { requestId: res.locals.requestId } });
  });

  return router;
}
