import type { Request } from 'express';

import { AppError } from '../../errors/app-error.js';

const MAX_MULTIPART_BYTES = 11 * 1024 * 1024;

export interface ParsedUpload {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

function getBoundary(contentType: string | undefined) {
  const match = contentType?.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] ?? match?.[2] ?? null;
}

async function readRequest(req: Request) {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.byteLength;
    if (received > MAX_MULTIPART_BYTES)
      throw new AppError(413, 'FILE_TOO_LARGE', '파일은 10MB 이하로 업로드해 주세요.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function parseContentDisposition(value: string | undefined) {
  const name = value?.match(/(?:^|;)\s*name="([^"]+)"/i)?.[1];
  const filename = value?.match(/(?:^|;)\s*filename="([^"]*)"/i)?.[1];
  return { name, filename };
}

export async function parseMultipartUpload(req: Request): Promise<ParsedUpload> {
  const boundary = getBoundary(req.headers['content-type']);
  if (!boundary) throw new AppError(415, 'MULTIPART_REQUIRED', 'multipart 파일 요청이 필요합니다.');

  const body = await readRequest(req);
  const marker = Buffer.from(`--${boundary}`);
  let offset = 0;

  while (offset < body.length) {
    const partStart = body.indexOf(marker, offset);
    if (partStart === -1) break;
    const nextStart = body.indexOf(marker, partStart + marker.length);
    if (nextStart === -1) break;

    let contentStart = partStart + marker.length;
    if (body.subarray(contentStart, contentStart + 2).toString() === '--') break;
    if (body.subarray(contentStart, contentStart + 2).toString() === '\r\n') contentStart += 2;

    let contentEnd = nextStart;
    if (body.subarray(contentEnd - 2, contentEnd).toString() === '\r\n') contentEnd -= 2;
    const part = body.subarray(contentStart, contentEnd);
    const separator = part.indexOf(Buffer.from('\r\n\r\n'));
    if (separator === -1) {
      offset = nextStart;
      continue;
    }

    const headers = part.subarray(0, separator).toString('utf8').split('\r\n');
    const headerMap = new Map(
      headers.map((line) => {
        const colon = line.indexOf(':');
        return [line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()] as const;
      }),
    );
    const disposition = parseContentDisposition(headerMap.get('content-disposition'));
    if (disposition.name === 'file' && disposition.filename) {
      const buffer = part.subarray(separator + 4);
      if (!buffer.byteLength)
        throw new AppError(422, 'FILE_EMPTY', '빈 파일은 업로드할 수 없습니다.');
      return {
        originalName: disposition.filename,
        mimeType: headerMap.get('content-type') ?? 'application/octet-stream',
        buffer,
      };
    }
    offset = nextStart;
  }

  throw new AppError(422, 'FILE_REQUIRED', '업로드할 파일을 선택해 주세요.');
}
