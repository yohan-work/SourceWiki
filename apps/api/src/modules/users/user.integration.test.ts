import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../lib/database.js';
import { signAuthToken } from '../../lib/jwt.js';
import * as sources from '../sources/source.service.js';

const suffix = randomUUID();
const emails = [`profile-owner-${suffix}@example.test`, `profile-reader-${suffix}@example.test`];
const app = createApp();
let ownerId = '';
let readerId = '';
let sourceId = '';

async function authCookie(userId: string) {
  return `access_token=${await signAuthToken(userId, 'access')}`;
}

beforeAll(async () => {
  const [owner, reader] = await Promise.all(
    emails.map((email, index) =>
      prisma.user.create({
        data: {
          email,
          nickname: index ? '프로필독자' : '프로필작성자',
          passwordHash: 'profile-test-only',
          emailVerifiedAt: new Date(),
        },
      }),
    ),
  );
  ownerId = owner.id;
  readerId = reader.id;
  const source = await sources.createSource(ownerId, {
    title: '프로필에 표시될 자료',
    originalUrl: 'https://profile.example.test/source',
    sourceType: 'docs',
    tags: ['Profile'],
  });
  sourceId = source.id;
  await sources.likeSource(sourceId, readerId);
});

afterAll(async () => {
  await prisma.source.deleteMany({ where: { id: sourceId } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});

describe('user profile integration', () => {
  it('returns a public profile with activity stats and user sources', async () => {
    const profile = await request(app).get(`/api/users/${ownerId}`).expect(200);

    expect(profile.body.data).toMatchObject({
      id: ownerId,
      nickname: '프로필작성자',
      bio: null,
      stats: { sourceCount: 1, commentCount: 0, receivedLikeCount: 1 },
    });

    const sourceList = await request(app).get(`/api/users/${ownerId}/sources?limit=5`).expect(200);
    expect(sourceList.body.data.map((source: { id: string }) => source.id)).toContain(sourceId);
    expect(sourceList.body.pagination.totalItems).toBe(1);
  });

  it('updates my profile and rejects unauthenticated updates', async () => {
    await request(app)
      .patch('/api/users/me')
      .set('Origin', 'http://localhost:3000')
      .send({ nickname: '거절' })
      .expect(401);

    const updated = await request(app)
      .patch('/api/users/me')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', await authCookie(ownerId))
      .send({ nickname: '새프로필', bio: '프로필 소개입니다.' })
      .expect(200);

    expect(updated.body.data).toMatchObject({
      id: ownerId,
      nickname: '새프로필',
      bio: '프로필 소개입니다.',
    });

    const profile = await request(app).get(`/api/users/${ownerId}`).expect(200);
    expect(profile.body.data).toMatchObject({
      nickname: '새프로필',
      bio: '프로필 소개입니다.',
    });
  });
});
