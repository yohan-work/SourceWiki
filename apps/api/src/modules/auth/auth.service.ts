import { randomUUID } from 'node:crypto';

import { compare, hash } from 'bcryptjs';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import type { Mailer } from '../../integrations/mail.js';
import { createOpaqueToken, hashToken, tokenHashMatches } from '../../lib/auth-crypto.js';
import { prisma } from '../../lib/database.js';
import { signAuthToken, verifyAuthToken } from '../../lib/jwt.js';

const VERIFICATION_TTL_MS = 30 * 60 * 1_000;
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1_000;

type AuthUserRecord = {
  id: string;
  email: string;
  nickname: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

export function toAuthUser(user: AuthUserRecord) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueVerification(
  user: { id: string; email: string; nickname: string },
  mailer: Mailer,
) {
  const token = createOpaqueToken();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
      },
    });
  });

  const verificationUrl = new URL('/verify-email', env.APP_URL);
  verificationUrl.searchParams.set('token', token);
  try {
    await mailer.sendVerification({ ...user, verificationUrl: verificationUrl.toString() });
  } catch {
    throw new AppError(
      503,
      'EMAIL_DELIVERY_FAILED',
      '인증 메일을 보내지 못했습니다. 잠시 후 재발송해 주세요.',
    );
  }
}

export async function checkEmail(email: string): Promise<boolean> {
  return (await prisma.user.count({ where: { email } })) === 0;
}

export async function signup(
  input: { email: string; nickname: string; password: string },
  mailer: Mailer,
) {
  const passwordHash = await hash(input.password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: input.email, nickname: input.nickname, passwordHash },
      select: { id: true, email: true, nickname: true, emailVerifiedAt: true, createdAt: true },
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', '이미 사용 중인 이메일입니다.', {
        email: ['이미 사용 중인 이메일입니다.'],
      });
    }
    throw error;
  }
  await issueVerification(user, mailer);
  return toAuthUser(user);
}

export async function resendVerification(email: string, mailer: Mailer): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, nickname: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return;
  await issueVerification(user, mailer);
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record) throw new AppError(400, 'TOKEN_INVALID', '유효하지 않은 인증 링크입니다.');
  if (record.usedAt) throw new AppError(400, 'TOKEN_USED', '이미 사용된 인증 링크입니다.');
  if (record.expiresAt <= new Date())
    throw new AppError(400, 'TOKEN_EXPIRED', '인증 링크가 만료되었습니다.');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (result.count === 1) {
      await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
    }
    return result.count;
  });
  if (updated !== 1) throw new AppError(400, 'TOKEN_USED', '이미 사용된 인증 링크입니다.');
}

async function createSession(userId: string, familyId = randomUUID()) {
  const sessionId = randomUUID();
  const refreshToken = await signAuthToken(userId, 'refresh', sessionId);
  await prisma.refreshSession.create({
    data: {
      id: sessionId,
      userId,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return { accessToken: await signAuthToken(userId, 'access'), refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', '이메일 인증을 먼저 완료해 주세요.');
  }
  return { user: toAuthUser(user), ...(await createSession(user.id)) };
}

export async function refresh(rawToken: string) {
  const payload = await verifyAuthToken(rawToken, 'refresh');
  const current = await prisma.refreshSession.findUnique({ where: { id: payload.jti } });
  if (
    !current ||
    current.userId !== payload.sub ||
    !tokenHashMatches(rawToken, current.tokenHash)
  ) {
    throw new AppError(401, 'SESSION_EXPIRED', '세션이 만료되었습니다.');
  }
  if (current.expiresAt <= new Date())
    throw new AppError(401, 'SESSION_EXPIRED', '세션이 만료되었습니다.');

  if (current.revokedAt) {
    if (current.replacedById) {
      await prisma.refreshSession.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError(401, 'SESSION_REUSED', '세션 재사용이 감지되어 다시 로그인해야 합니다.');
    }
    throw new AppError(401, 'SESSION_EXPIRED', '세션이 만료되었습니다.');
  }

  const nextId = randomUUID();
  const nextToken = await signAuthToken(current.userId, 'refresh', nextId);
  const rotated = await prisma.$transaction(async (tx) => {
    await tx.refreshSession.create({
      data: {
        id: nextId,
        userId: current.userId,
        familyId: current.familyId,
        tokenHash: hashToken(nextToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return tx.refreshSession.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: nextId },
    });
  });
  if (rotated.count !== 1) {
    await prisma.refreshSession.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, 'SESSION_REUSED', '세션 재사용이 감지되어 다시 로그인해야 합니다.');
  }
  return { accessToken: await signAuthToken(current.userId, 'access'), refreshToken: nextToken };
}

export async function logout(rawToken?: string): Promise<void> {
  if (!rawToken) return;
  let payload;
  try {
    payload = await verifyAuthToken(rawToken, 'refresh');
  } catch {
    // Logout is intentionally idempotent, including malformed or expired cookies.
    return;
  }
  await prisma.refreshSession.updateMany({
    where: { id: payload.jti, userId: payload.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, nickname: true, emailVerifiedAt: true, createdAt: true },
  });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.');
  return toAuthUser(user);
}
