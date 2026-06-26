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
    const first = await sources.listSources({ page: 1, limit: 12 });
    const second = await sources.listSources({ page: 2, limit: 12 });
    expect(first.data).toHaveLength(12);
    expect(second.data.length).toBeGreaterThanOrEqual(1);
    expect(new Set(first.data.map(({ id }) => id)).has(second.data[0]!.id)).toBe(false);
  });

  it('filters source lists by query, tag, and type', async () => {
    const matching = await sources.createSource(ownerId, {
      title: '벡터 검색 운영 기록',
      originalUrl: 'https://search.example.test/vector-ops',
      sourceType: 'paper',
      rawText: '하이브리드 랭킹과 검색 품질 평가에 대한 실험 본문입니다.',
      tags: ['Search', 'RAG'],
    });
    const tagOnly = await sources.createSource(ownerId, {
      title: '검색과 무관한 타입 문서',
      originalUrl: 'https://search.example.test/tag-only',
      sourceType: 'docs',
      rawText: '검색 키워드는 포함하지만 타입이 다릅니다.',
      tags: ['Search'],
    });
    const typeOnly = await sources.createSource(ownerId, {
      title: '벡터 인덱싱 메모',
      originalUrl: 'https://search.example.test/type-only',
      sourceType: 'paper',
      rawText: '본문에는 다른 주제만 있습니다.',
      tags: ['Database'],
    });
    sourceIds.push(matching.id, tagOnly.id, typeOnly.id);

    const byQuery = await sources.listSources({ page: 1, limit: 10, q: '하이브리드 랭킹' });
    const byTag = await sources.listSources({ page: 1, limit: 10, tag: ' search ' });
    const byCombined = await sources.listSources({
      page: 1,
      limit: 10,
      q: '검색',
      tag: 'search',
      type: 'paper',
    });

    expect(byQuery.data.map(({ id }) => id)).toContain(matching.id);
    expect(byTag.data.map(({ id }) => id)).toEqual(
      expect.arrayContaining([matching.id, tagOnly.id]),
    );
    expect(byCombined.data.map(({ id }) => id)).toContain(matching.id);
    expect(byCombined.data.map(({ id }) => id)).not.toContain(tagOnly.id);
    expect(byCombined.data.map(({ id }) => id)).not.toContain(typeOnly.id);
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

  it('returns related sources by shared tags', async () => {
    const target = await sources.createSource(ownerId, {
      title: 'OpenAI Codex 도입 기록',
      originalUrl: 'https://example.test/openai-codex',
      sourceType: 'article',
      tags: ['OpenAI', 'Codex', 'Enterprise'],
    });
    const related = await sources.createSource(otherId, {
      title: '삼성전자 Codex 활용',
      originalUrl: 'https://example.test/samsung-codex',
      sourceType: 'article',
      tags: ['Codex', 'OpenAI'],
    });
    const unrelated = await sources.createSource(otherId, {
      title: '무관한 문서',
      originalUrl: 'https://example.test/other',
      sourceType: 'docs',
      tags: ['Database'],
    });
    sourceIds.push(target.id, related.id, unrelated.id);

    const detail = await sources.getSource(target.id, ownerId);

    expect(detail.relatedSources.map((source) => source.id)).toContain(related.id);
    expect(detail.relatedSources.map((source) => source.id)).not.toContain(target.id);
    expect(detail.relatedSources.map((source) => source.id)).not.toContain(unrelated.id);
    expect(detail.relatedSources[0]?.sharedTags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining(['OpenAI', 'Codex']),
    );
  });

  it('returns a tag-based source graph', async () => {
    const graphLeft = await sources.createSource(ownerId, {
      title: '그래프 왼쪽 자료',
      originalUrl: 'https://example.test/graph-left',
      sourceType: 'docs',
      tags: ['Graph', 'Knowledge'],
    });
    const graphRight = await sources.createSource(otherId, {
      title: '그래프 오른쪽 자료',
      originalUrl: 'https://example.test/graph-right',
      sourceType: 'article',
      tags: ['Graph', 'AI'],
    });
    sourceIds.push(graphLeft.id, graphRight.id);

    const graph = await sources.getSourceGraph();
    const edge = graph.edges.find(
      (candidate) =>
        [candidate.sourceId, candidate.targetId].includes(graphLeft.id) &&
        [candidate.sourceId, candidate.targetId].includes(graphRight.id),
    );

    const graphLeftNode = graph.nodes.find((node) => node.id === graphLeft.id);

    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([graphLeft.id]));
    expect(graphLeftNode?.tags).toContain('Graph');
    expect(edge?.sharedTags).toContain('Graph');
  });

  it('requires source text before summarizing', async () => {
    const source = await sources.createSource(ownerId, {
      title: '본문 없는 자료',
      originalUrl: 'https://example.test/no-text',
      sourceType: 'article',
      tags: [],
    });
    sourceIds.push(source.id);

    await expect(sources.summarizeSource(source.id, ownerId)).rejects.toMatchObject({
      code: 'SOURCE_TEXT_REQUIRED',
      status: 409,
    });
  });

  it('requires source text before chatting', async () => {
    const source = await sources.createSource(ownerId, {
      title: '대화 본문 없는 자료',
      originalUrl: 'https://example.test/no-chat-text',
      sourceType: 'article',
      tags: [],
    });
    sourceIds.push(source.id);

    await expect(
      sources.chatWithSource(source.id, ownerId, { message: '질문', history: [] }),
    ).rejects.toMatchObject({
      code: 'SOURCE_TEXT_REQUIRED',
      status: 409,
    });
  });

  it('requires source text before suggesting questions', async () => {
    const source = await sources.createSource(ownerId, {
      title: '추천 질문 본문 없는 자료',
      originalUrl: 'https://example.test/no-suggestion-text',
      sourceType: 'article',
      tags: [],
    });
    sourceIds.push(source.id);

    await expect(sources.suggestQuestionsForSource(source.id, ownerId)).rejects.toMatchObject({
      code: 'SOURCE_TEXT_REQUIRED',
      status: 409,
    });
  });

  it('enforces ownership before summarizing', async () => {
    const source = await sources.createSource(ownerId, {
      title: '요약 권한 자료',
      originalUrl: 'https://example.test/summary-owner',
      sourceType: 'article',
      rawText: '요약 가능한 본문입니다. '.repeat(20),
      tags: [],
    });
    sourceIds.push(source.id);

    await expect(sources.summarizeSource(source.id, otherId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('enforces ownership before chatting', async () => {
    const source = await sources.createSource(ownerId, {
      title: '대화 권한 자료',
      originalUrl: 'https://example.test/chat-owner',
      sourceType: 'article',
      rawText: '대화 가능한 본문입니다. '.repeat(20),
      tags: [],
    });
    sourceIds.push(source.id);

    await expect(
      sources.chatWithSource(source.id, otherId, { message: '질문', history: [] }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('enforces ownership before suggesting questions', async () => {
    const source = await sources.createSource(ownerId, {
      title: '추천 질문 권한 자료',
      originalUrl: 'https://example.test/suggestion-owner',
      sourceType: 'article',
      rawText: '추천 질문을 만들 수 있는 본문입니다. '.repeat(20),
      tags: [],
    });
    sourceIds.push(source.id);

    await expect(sources.suggestQuestionsForSource(source.id, otherId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });
});
