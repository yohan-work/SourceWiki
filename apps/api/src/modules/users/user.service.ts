import type { UpdateProfileRequest } from '@sourcewiki/shared';

import { AppError } from '../../errors/app-error.js';
import { prisma } from '../../lib/database.js';
import { toAuthUser } from '../auth/auth.service.js';

function profileDto(user: {
  id: string;
  nickname: string;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { sources: number; comments: number };
  sources: { _count: { sourceLikes: number } }[];
}) {
  return {
    id: user.id,
    nickname: user.nickname,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    stats: {
      sourceCount: user._count.sources,
      commentCount: user._count.comments,
      receivedLikeCount: user.sources.reduce(
        (total, source) => total + source._count.sourceLikes,
        0,
      ),
    },
  };
}

export async function getUserProfile(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nickname: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { sources: true, comments: true } },
      sources: { select: { _count: { select: { sourceLikes: true } } } },
    },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
  return profileDto(user);
}

export async function updateMe(userId: string, input: UpdateProfileRequest) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.bio !== undefined ? { bio: input.bio?.trim() || null } : {}),
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      bio: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  return toAuthUser(updated);
}
