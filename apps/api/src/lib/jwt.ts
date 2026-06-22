import { randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export type TokenType = 'access' | 'refresh';

export interface AuthTokenPayload extends JWTPayload {
  sub: string;
  type: TokenType;
  jti: string;
}

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export async function signAuthToken(
  userId: string,
  type: TokenType,
  jti = randomUUID(),
): Promise<string> {
  return new SignJWT({ type })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(type === 'access' ? '15m' : '14d')
    .sign(type === 'access' ? accessSecret : refreshSecret);
}

export async function verifyAuthToken(token: string, type: TokenType): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, type === 'access' ? accessSecret : refreshSecret, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (payload.type !== type || !payload.sub || !payload.jti) throw new Error('Invalid claims');
    return payload as AuthTokenPayload;
  } catch {
    throw new AppError(
      401,
      type === 'access' ? 'UNAUTHENTICATED' : 'SESSION_EXPIRED',
      '인증 세션이 유효하지 않습니다.',
    );
  }
}
