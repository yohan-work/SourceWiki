import type {
  SourceChatRequest,
  SourceCreateRequest,
  SourceListQuery,
  SourceUpdateRequest,
} from '@sourcewiki/shared';

import { AppError } from '../../errors/app-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/database.js';
import { chatWithText, summarizeText, suggestQuestionsForText } from './source-summarizer.js';

const GRAPH_NODE_LIMIT = 80;
const GRAPH_EDGES_PER_NODE_LIMIT = 6;
const EMPTY_VIEWER_ID = '00000000-0000-0000-0000-000000000000';

function sourceInclude(viewerId?: string) {
  return {
    user: { select: { id: true, nickname: true } },
    sourceTags: { include: { tag: { select: { id: true, name: true } } } },
    sourceLikes: {
      where: { userId: viewerId ?? EMPTY_VIEWER_ID },
      select: { userId: true },
      take: 1,
    },
    _count: { select: { comments: true, sourceLikes: true } },
  } as const;
}

function normalizeTags(tags: string[]) {
  const unique = new Map<string, string>();
  for (const name of tags) {
    const display = name.trim().replace(/\s+/g, ' ');
    const normalized = display.toLocaleLowerCase('en-US');
    if (!unique.has(normalized)) unique.set(normalized, display);
  }
  return [...unique].map(([normalizedName, name]) => ({ name, normalizedName }));
}

function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
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
  sourceLikes: { userId: string }[];
  _count: { comments: number; sourceLikes: number };
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
    likeCount: source._count.sourceLikes,
    likedByMe: source.sourceLikes.length > 0,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

async function relatedSources(
  source: {
    id: string;
    sourceTags: { tag: { id: string; name: string } }[];
  },
  viewerId?: string,
) {
  const tagIds = source.sourceTags.map(({ tag }) => tag.id);
  if (!tagIds.length) return [];
  const candidates = await prisma.source.findMany({
    where: {
      id: { not: source.id },
      sourceTags: { some: { tagId: { in: tagIds } } },
    },
    take: 20,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    include: sourceInclude(viewerId),
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

function sourceListWhere(
  input: Pick<SourceListQuery, 'q' | 'tag' | 'type'>,
): Prisma.SourceWhereInput {
  const filters: Prisma.SourceWhereInput[] = [];
  if (input.type) filters.push({ sourceType: input.type });
  if (input.tag) {
    filters.push({
      sourceTags: {
        some: { tag: { normalizedName: normalizeTagName(input.tag) } },
      },
    });
  }
  if (input.q) {
    const query = input.q;
    filters.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { rawTextPreview: { contains: query, mode: 'insensitive' } },
        { sourceDomain: { contains: query, mode: 'insensitive' } },
        { sourceTags: { some: { tag: { name: { contains: query, mode: 'insensitive' } } } } },
      ],
    });
  }
  return filters.length ? { AND: filters } : {};
}

export async function listSources(input: SourceListQuery, viewerId?: string) {
  const { page, limit } = input;
  const where = sourceListWhere(input);
  const [sources, totalItems] = await prisma.$transaction([
    prisma.source.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: sourceInclude(viewerId),
    }),
    prisma.source.count({ where }),
  ]);
  return {
    data: sources.map(listDto),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
}

export async function getSourceGraph() {
  const sources = await prisma.source.findMany({
    take: GRAPH_NODE_LIMIT,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      title: true,
      sourceDomain: true,
      sourceType: true,
      sourceTags: { include: { tag: { select: { name: true } } } },
    },
  });
  const edgeMap = new Map<
    string,
    { sourceId: string; targetId: string; sharedTags: Set<string> }
  >();
  const tagCounts = new Map<string, number>();

  for (const source of sources) {
    for (const { tag } of source.sourceTags) {
      tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1);
    }
  }

  for (let leftIndex = 0; leftIndex < sources.length; leftIndex += 1) {
    const left = sources[leftIndex]!;
    const leftTags = new Set(left.sourceTags.map(({ tag }) => tag.name));
    if (!leftTags.size) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < sources.length; rightIndex += 1) {
      const right = sources[rightIndex]!;
      const sharedTags = right.sourceTags
        .map(({ tag }) => tag.name)
        .filter((name) => leftTags.has(name));
      if (!sharedTags.length) continue;
      const sourceId = left.id < right.id ? left.id : right.id;
      const targetId = left.id < right.id ? right.id : left.id;
      edgeMap.set(`${sourceId}:${targetId}`, {
        sourceId,
        targetId,
        sharedTags: new Set(sharedTags),
      });
    }
  }

  const degree = new Map<string, number>();
  const edges = [...edgeMap.values()]
    .map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      sharedTags: [...edge.sharedTags],
      weight: edge.sharedTags.size,
    }))
    .sort(
      (left, right) => right.weight - left.weight || left.sourceId.localeCompare(right.sourceId),
    )
    .filter((edge) => {
      const sourceDegree = degree.get(edge.sourceId) ?? 0;
      const targetDegree = degree.get(edge.targetId) ?? 0;
      if (sourceDegree >= GRAPH_EDGES_PER_NODE_LIMIT || targetDegree >= GRAPH_EDGES_PER_NODE_LIMIT)
        return false;
      degree.set(edge.sourceId, sourceDegree + 1);
      degree.set(edge.targetId, targetDegree + 1);
      return true;
    });

  return {
    nodes: sources.map((source) => {
      const tags = source.sourceTags.map(({ tag }) => tag.name);
      return {
        id: source.id,
        title: source.title,
        sourceDomain: source.sourceDomain,
        sourceType: source.sourceType,
        tags,
        weight: Math.max(1, degree.get(source.id) ?? tags.length),
      };
    }),
    edges,
    tags: [...tagCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 12),
  };
}

export async function getSource(id: string, viewerId?: string) {
  const source = await prisma.source.findUnique({
    where: { id },
    include: sourceInclude(viewerId),
  });
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
    relatedSources: await relatedSources(source, viewerId),
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
    include: sourceInclude(userId),
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
        ...(input.summaryStatus !== undefined ? { summaryStatus: input.summaryStatus } : {}),
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

async function getSourceLikeState(sourceId: string, userId: string) {
  const [likeCount, likedByMe] = await prisma.$transaction([
    prisma.sourceLike.count({ where: { sourceId } }),
    prisma.sourceLike.count({ where: { sourceId, userId } }),
  ]);
  return { sourceId, likeCount, likedByMe: likedByMe > 0 };
}

async function assertSourceExists(id: string) {
  const source = await prisma.source.findUnique({ where: { id }, select: { id: true } });
  if (!source) throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
}

export async function likeSource(id: string, userId: string) {
  await assertSourceExists(id);
  await prisma.sourceLike.upsert({
    where: { userId_sourceId: { userId, sourceId: id } },
    update: {},
    create: { userId, sourceId: id },
  });
  return getSourceLikeState(id, userId);
}

export async function unlikeSource(id: string, userId: string) {
  await assertSourceExists(id);
  await prisma.sourceLike.deleteMany({ where: { sourceId: id, userId } });
  return getSourceLikeState(id, userId);
}

export async function summarizeSource(id: string, userId: string) {
  await assertOwner(id, userId);
  const source = await prisma.source.findUnique({
    where: { id },
    select: { rawText: true },
  });
  if (!source?.rawText?.trim())
    throw new AppError(409, 'SOURCE_TEXT_REQUIRED', '요약할 본문이 필요합니다.');
  return summarizeText(source.rawText);
}

export async function chatWithSource(id: string, userId: string, input: SourceChatRequest) {
  await assertOwner(id, userId);
  const source = await prisma.source.findUnique({
    where: { id },
    select: { rawText: true },
  });
  if (!source?.rawText?.trim())
    throw new AppError(409, 'SOURCE_TEXT_REQUIRED', '질문할 본문이 필요합니다.');
  return chatWithText(source.rawText, input.message, input.history);
}

export async function suggestQuestionsForSource(id: string, userId: string) {
  await assertOwner(id, userId);
  const source = await prisma.source.findUnique({
    where: { id },
    select: { rawText: true },
  });
  if (!source?.rawText?.trim())
    throw new AppError(409, 'SOURCE_TEXT_REQUIRED', '질문할 본문이 필요합니다.');
  return suggestQuestionsForText(source.rawText);
}
