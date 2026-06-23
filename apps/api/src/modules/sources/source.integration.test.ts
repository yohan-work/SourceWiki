import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppError } from '../../errors/app-error.js';
import { prisma } from '../../lib/database.js';
import * as comments from '../comments/comment.service.js';
import * as sources from './source.service.js';

const suffix = randomUUID();
const emails = [`owner-${suffix}@example.test`, `other-${suffix}@example.test`];
let ownerId = '';
let otherId = '';
const sourceIds: string[] = [];

beforeAll(async () => {
  const [owner, other] = await Promise.all(
    emails.map((email, index) =>
      prisma.user.create({
        data: {
          email,
          nickname: index ? '다른사용자' : '작성자',
          passwordHash: 'integration-test-only',
          emailVerifiedAt: new Date(),
        },
      }),
    ),
  );
  ownerId = owner.id;
  otherId = other.id;
});

afterAll(async () => {
  await prisma.source.deleteMany({ where: { id: { in: sourceIds } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});

describe('source and comment integration', () => {
  it('creates enough sources for stable server pagination', async () => {
    for (let index = 0; index < 13; index += 1) {
      const source = await sources.createSource(ownerId, {
        title: `통합 자료 ${index + 1}`,
        originalUrl: `https://example.test/source/${index + 1}`,
        sourceType: 'docs',
        tags: [' RAG ', 'rag', 'Agent'],
      });
      sourceIds.push(source.id);
    }
    const first = await sources.listSources(1, 12);
    const second = await sources.listSources(2, 12);
    expect(first.data).toHaveLength(12);
    expect(second.data.length).toBeGreaterThanOrEqual(1);
    expect(new Set(first.data.map(({ id }) => id)).has(second.data[0]!.id)).toBe(false);
  });

  it('enforces ownership and cascades comments on delete', async () => {
    const id = sourceIds[0]!;
    await expect(sources.updateSource(id, otherId, { title: '권한 없음' })).rejects.toMatchObject({
      status: 403,
    });
    const comment = await comments.createComment(id, otherId, '공개 자료에 남긴 댓글');
    await expect(comments.updateComment(comment.id, ownerId, '권한 없음')).rejects.toBeInstanceOf(
      AppError,
    );
    await sources.deleteSource(id, ownerId);
    sourceIds.splice(0, 1);
    expect(await prisma.comment.count({ where: { id: comment.id } })).toBe(0);
  });
});
