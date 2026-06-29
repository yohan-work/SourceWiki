import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { prisma } from '../../lib/database.js';
import type { ParsedUpload } from './multipart.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILES = new Map<string, Set<string>>([
  ['.pdf', new Set(['application/pdf'])],
  ['.txt', new Set(['text/plain'])],
  ['.md', new Set(['text/markdown', 'text/plain'])],
  ['.png', new Set(['image/png'])],
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.webp', new Set(['image/webp'])],
]);

type UploadedFileRecord = {
  id: string;
  sourceId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

function dto(file: UploadedFileRecord) {
  return {
    id: file.id,
    sourceId: file.sourceId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt.toISOString(),
  };
}

function safeOriginalName(value: string) {
  return (
    path
      .basename(value)
      .replace(/[\u0000-\u001f]/g, '')
      .trim()
      .slice(0, 255) || 'upload'
  );
}

function validateUpload(file: ParsedUpload) {
  const originalName = safeOriginalName(file.originalName);
  const extension = path.extname(originalName).toLowerCase();
  const allowedMimeTypes = ALLOWED_FILES.get(extension);
  if (!allowedMimeTypes || !allowedMimeTypes.has(file.mimeType.toLowerCase())) {
    throw new AppError(
      415,
      'FILE_TYPE_UNSUPPORTED',
      'pdf, txt, md, png, jpg, webp 파일만 업로드할 수 있습니다.',
    );
  }
  if (file.buffer.byteLength > MAX_FILE_BYTES) {
    throw new AppError(413, 'FILE_TOO_LARGE', '파일은 10MB 이하로 업로드해 주세요.');
  }
  return { originalName, extension };
}

function filePath(storedName: string) {
  return path.join(env.UPLOAD_DIR, storedName);
}

async function assertSourceOwner(sourceId: string, userId: string) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { userId: true },
  });
  if (!source) throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
  if (source.userId !== userId)
    throw new AppError(403, 'FORBIDDEN', '이 자료의 파일을 변경할 권한이 없습니다.');
}

export async function listFiles(sourceId: string) {
  const exists = await prisma.source.count({ where: { id: sourceId } });
  if (!exists) throw new AppError(404, 'SOURCE_NOT_FOUND', '자료를 찾을 수 없습니다.');
  const files = await prisma.uploadedFile.findMany({
    where: { sourceId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return files.map(dto);
}

export async function createFile(sourceId: string, userId: string, upload: ParsedUpload) {
  await assertSourceOwner(sourceId, userId);
  const { originalName, extension } = validateUpload(upload);
  const storedName = `${randomUUID()}${extension}`;
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  await writeFile(filePath(storedName), upload.buffer, { flag: 'wx' });
  try {
    const file = await prisma.uploadedFile.create({
      data: {
        sourceId,
        userId,
        originalName,
        storedName,
        mimeType: upload.mimeType.toLowerCase(),
        sizeBytes: upload.buffer.byteLength,
      },
    });
    return dto(file);
  } catch (error) {
    await unlink(filePath(storedName)).catch(() => undefined);
    throw error;
  }
}

export async function getDownload(id: string) {
  const file = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!file) throw new AppError(404, 'FILE_NOT_FOUND', '파일을 찾을 수 없습니다.');
  const diskPath = filePath(file.storedName);
  try {
    const [buffer, stats] = await Promise.all([readFile(diskPath), stat(diskPath)]);
    return { file: dto(file), buffer, sizeBytes: stats.size };
  } catch {
    throw new AppError(404, 'FILE_NOT_FOUND', '파일을 찾을 수 없습니다.');
  }
}

export async function deleteFile(id: string, userId: string) {
  const file = await prisma.uploadedFile.findUnique({
    where: { id },
    select: { id: true, sourceId: true, storedName: true },
  });
  if (!file) throw new AppError(404, 'FILE_NOT_FOUND', '파일을 찾을 수 없습니다.');
  await assertSourceOwner(file.sourceId, userId);
  await prisma.uploadedFile.delete({ where: { id } });
  await unlink(filePath(file.storedName)).catch(() => undefined);
}

export async function removeStoredFiles(storedNames: string[]) {
  await Promise.all(
    storedNames.map((storedName) => unlink(filePath(storedName)).catch(() => undefined)),
  );
}
