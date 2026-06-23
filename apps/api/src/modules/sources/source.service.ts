import type { SourceCreateRequest, SourceUpdateRequest } from '@sourcewiki/shared';

import { AppError } from '../../errors/app-error.js';
import { prisma } from '../../lib/database.js';

const sourceInclude = {
  user: { select: { id: true, nickname: true } },
  sourceTags: { include: { tag: { select: { id: true, name: true } } } },
  _count: { select: { comments: true } },
} as const;

function normalizeTags(tags: string[]) {
  const unique = new Map<string, string>();
  for (const name of tags) {
    const display = name.trim().replace(/\s+/g, ' ');
    const normalized = display.toLocaleLowerCase('en-US');
    if (!unique.has(normalized)) unique.set(normalized, display);
  }
  return [...unique].map(([normalizedName, name]) => ({ name, normalizedName }));
}

function preview(value: string | null | undefined, length = 300) {
  if (!value) return null;
  return value.replace(/\s+/g, ' ').slice(0, length);
}

function listDto(source: {
  id: string;
  title: string;
  originalUrl: string;
  sourceDomain: string;
  sourceType: 'article' | 'docs' | 'paper' | 'github' | 'other';
  rawTextPreview: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; nickname: string };
  sourceTags: { tag: { id: string; name: string } }[];
  _count: { comments: number };
}) {
  return {
    id: source.id,
    title: source.title,
    originalUrl: source.originalUrl,
    sourceDomain: source.sourceDomain,
    sourceType: source.sourceType,
    summaryPreview: preview(source.summary),
    rawTextPreview: source.rawTextPreview,
    tags: source.sourceTags.map(({ tag }) => tag),
    author: source.user,
    commentCount: source._count.comments,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

async function relatedSources(source: {
  id: string;
  sourceTags: { tag: { id: string; name: string } }[];
}) {
  const tagIds = source.sourceTags.map(({ tag }) => tag.id);
  if (!tagIds.length) return [];
  const candidates = await prisma.source.findMany({
    where: {
      id: { not: source.id },
      sourceTags: { some: { tagId: { in: tagIds } } },
    },
    take: 20,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    include: sourceInclude,
  });
  const sourceTagIds = new Set(tagIds);
  return candidates
    .map((candidate) => {
      const sharedTags = candidate.sourceTags
        .map(({ tag }) => tag)
        .filter((tag) => sourceTagIds.has(tag.id));
      return { ...listDto(candidate), sharedTags };
    })
    .sort(
      (left, right) =>
        right.sharedTags.length - left.sharedTags.length ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, 5);
}

export async function listSources(page: number, limit: number) {
  const [sources, totalItems] = await prisma.$transaction([
    prisma.source.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: sourceInclude,
    }),
    prisma.source.count(),
  ]);
  return {
    data: sources.map(listDto),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
}

export async function getSource(id: string, viewerId?: string) {
  const source = await prisma.source.findUnique({ where: { id }, include: sourceInclude });
  if (!source) throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
  return {
    ...listDto(source),
    rawText: source.rawText,
    summary: source.summary,
    keyPoints: Array.isArray(source.keyPoints) ? source.keyPoints.map(String) : [],
    keywords: Array.isArray(source.keywords) ? source.keywords.map(String) : [],
    personalNote: source.personalNote,
    extractionStatus: source.extractionStatus,
    summaryStatus: source.summaryStatus,
    isOwner: source.userId === viewerId,
    relatedSources: await relatedSources(source),
  };
}

async function tagConnections(tags: string[]) {
  const normalized = normalizeTags(tags);
  return Promise.all(
    normalized.map((tag) =>
      prisma.tag.upsert({
        where: { normalizedName: tag.normalizedName },
        update: {},
        create: tag,
        select: { id: true },
      }),
    ),
  );
}

export async function createSource(userId: string, input: SourceCreateRequest) {
  const tags = await tagConnections(input.tags);
  const url = new URL(input.originalUrl);
  const source = await prisma.source.create({
    data: {
      userId,
      title: input.title,
      originalUrl: url.toString(),
      sourceDomain: url.hostname,
      sourceType: input.sourceType,
      rawText: input.rawText || null,
      rawTextPreview: preview(input.rawText),
      personalNote: input.personalNote || null,
      extractionStatus: input.rawText ? 'succeeded' : 'not_requested',
      sourceTags: { create: tags.map(({ id }) => ({ tagId: id })) },
    },
    include: sourceInclude,
  });
  return getSource(source.id, userId);
}

async function assertOwner(id: string, userId: string) {
  const source = await prisma.source.findUnique({ where: { id }, select: { userId: true } });
  if (!source) throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
  if (source.userId !== userId)
    throw new AppError(403, 'FORBIDDEN', '이 자료를 변경할 권한이 없습니다.');
}

export async function updateSource(id: string, userId: string, input: SourceUpdateRequest) {
  await assertOwner(id, userId);
  const tags = input.tags ? await tagConnections(input.tags) : null;
  const url = input.originalUrl ? new URL(input.originalUrl) : null;
  await prisma.$transaction(async (tx) => {
    if (tags) {
      await tx.sourceTag.deleteMany({ where: { sourceId: id } });
      await tx.sourceTag.createMany({
        data: tags.map(({ id: tagId }) => ({ sourceId: id, tagId })),
      });
    }
    await tx.source.update({
      where: { id, userId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(url ? { originalUrl: url.toString(), sourceDomain: url.hostname } : {}),
        ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
        ...(input.rawText !== undefined
          ? {
              rawText: input.rawText || null,
              rawTextPreview: preview(input.rawText),
              extractionStatus: input.rawText ? ('succeeded' as const) : ('not_requested' as const),
            }
          : {}),
        ...(input.summary !== undefined ? { summary: input.summary || null } : {}),
        ...(input.keyPoints !== undefined ? { keyPoints: input.keyPoints } : {}),
        ...(input.keywords !== undefined ? { keywords: input.keywords } : {}),
        ...(input.personalNote !== undefined ? { personalNote: input.personalNote || null } : {}),
      },
    });
  });
  return getSource(id, userId);
}

export async function deleteSource(id: string, userId: string) {
  await assertOwner(id, userId);
  await prisma.$transaction(async (tx) => {
    await tx.source.delete({ where: { id, userId } });
  });
}
