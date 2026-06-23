import { AppError } from '../../errors/app-error.js';
import { prisma } from '../../lib/database.js';

const include = { user: { select: { id: true, nickname: true } } } as const;

function dto(
  comment: {
    id: string;
    sourceId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; nickname: string };
  },
  viewerId?: string,
) {
  return {
    id: comment.id,
    sourceId: comment.sourceId,
    content: comment.content,
    author: comment.user,
    isOwner: comment.userId === viewerId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export async function listComments(sourceId: string, viewerId?: string) {
  if (!(await prisma.source.count({ where: { id: sourceId } })))
    throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
  const comments = await prisma.comment.findMany({
    where: { sourceId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include,
  });
  return comments.map((comment) => dto(comment, viewerId));
}

export async function createComment(sourceId: string, userId: string, content: string) {
  try {
    const comment = await prisma.comment.create({
      data: { sourceId, userId, content },
      include,
    });
    return dto(comment, userId);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003')
      throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
    throw error;
  }
}

async function assertOwner(id: string, userId: string) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: { userId: true } });
  if (!comment) throw new AppError(404, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.');
  if (comment.userId !== userId)
    throw new AppError(403, 'FORBIDDEN', '이 댓글을 변경할 권한이 없습니다.');
}

export async function updateComment(id: string, userId: string, content: string) {
  await assertOwner(id, userId);
  return dto(
    await prisma.comment.update({ where: { id, userId }, data: { content }, include }),
    userId,
  );
}

export async function deleteComment(id: string, userId: string) {
  await assertOwner(id, userId);
  await prisma.comment.delete({ where: { id, userId } });
}
