import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';
import { Readability } from '@mozilla/readability';
import ipaddr from 'ipaddr.js';
import { JSDOM } from 'jsdom';

import { AppError } from '../../errors/app-error.js';

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 100_000;
const MIN_TEXT_CHARS = 200;
const ALLOWED_PORTS = new Set(['', '80', '443']);

type SourceType = 'article' | 'docs' | 'paper' | 'github' | 'other';

interface DownloadedBody {
  finalUrl: URL;
  contentType: string;
  body: string;
}

function invalidUrl(): never {
  throw new AppError(422, 'URL_INVALID', '공개 HTTP(S) URL을 입력해 주세요.');
}

function blockedUrl(): never {
  throw new AppError(403, 'URL_BLOCKED', '보안상 접근할 수 없는 URL입니다.');
}

function timeoutError(): never {
  throw new AppError(504, 'EXTRACTION_TIMEOUT', '본문 가져오기가 제한 시간을 초과했습니다.');
}

function validateUrl(rawUrl: string, base?: URL) {
  let url: URL;
  try {
    url = base ? new URL(rawUrl, base) : new URL(rawUrl);
  } catch {
    invalidUrl();
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') invalidUrl();
  if (url.username || url.password || url.hash) invalidUrl();
  if (!ALLOWED_PORTS.has(url.port)) invalidUrl();
  return url;
}

function assertPublicAddress(address: string) {
  const parsed = ipaddr.process(address);
  const range = parsed.range();
  if (range !== 'unicast') blockedUrl();

  if (parsed.kind() === 'ipv4') {
    const bytes = parsed.toByteArray();
    const [first = 0, second = 0] = bytes;
    if (first === 100 && second >= 64 && second <= 127) blockedUrl();
  }
}

async function resolvePublicAddresses(hostname: string) {
  let records: { address: string; family: number }[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    blockedUrl();
  }
  if (records.length === 0) blockedUrl();
  for (const record of records) assertPublicAddress(record.address);
  return records;
}

function requestBody(url: URL, address: string, signal: AbortSignal) {
  return new Promise<http.IncomingMessage>((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      url,
      {
        agent: false,
        headers: {
          Accept: 'text/html,text/plain;q=0.9',
          'User-Agent': 'SourceWikiBot/0.1 (+https://sourcewiki.local)',
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, address, ipaddr.parse(address).kind() === 'ipv6' ? 6 : 4),
        timeout: TIMEOUT_MS,
      },
      resolve,
    );
    const abort = () => {
      request.destroy(
        new AppError(504, 'EXTRACTION_TIMEOUT', '본문 가져오기가 제한 시간을 초과했습니다.'),
      );
    };
    signal.addEventListener('abort', abort, { once: true });
    request.on('timeout', abort);
    request.on('error', reject);
    request.end();
  });
}

async function readLimitedBody(response: http.IncomingMessage, signal: AbortSignal) {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of Readable.from(response)) {
    if (signal.aborted) timeoutError();
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.byteLength;
    if (received > MAX_BODY_BYTES)
      throw new AppError(413, 'RESPONSE_TOO_LARGE', '응답 본문이 너무 큽니다.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function download(url: URL, signal: AbortSignal, redirects = 0): Promise<DownloadedBody> {
  const records = await resolvePublicAddresses(url.hostname);
  const firstRecord = records[0];
  if (!firstRecord) blockedUrl();
  const response = await requestBody(url, firstRecord.address, signal);

  if (
    response.statusCode &&
    response.statusCode >= 300 &&
    response.statusCode < 400 &&
    response.headers.location
  ) {
    response.resume();
    if (redirects >= MAX_REDIRECTS)
      throw new AppError(422, 'EXTRACTION_FAILED', '리디렉션이 너무 많습니다.');
    return download(validateUrl(response.headers.location, url), signal, redirects + 1);
  }

  const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    response.resume();
    throw new AppError(
      415,
      'CONTENT_TYPE_UNSUPPORTED',
      'HTML 또는 일반 텍스트 문서만 가져올 수 있습니다.',
    );
  }

  if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
    response.resume();
    throw new AppError(422, 'EXTRACTION_FAILED', '본문을 가져오지 못했습니다.');
  }

  return { finalUrl: url, contentType, body: await readLimitedBody(response, signal) };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function inferSourceType(url: URL): SourceType {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (host === 'github.com' || host.endsWith('.github.com')) return 'github';
  if (path.endsWith('.pdf') || path.includes('/paper') || host.includes('arxiv.org'))
    return 'paper';
  if (host.includes('docs.') || path.includes('/docs') || path.includes('/documentation'))
    return 'docs';
  if (path.includes('/blog') || path.includes('/article') || path.includes('/news'))
    return 'article';
  return 'other';
}

function extractText(downloaded: DownloadedBody) {
  if (downloaded.contentType.includes('text/plain')) {
    return { title: null, text: normalizeText(downloaded.body) };
  }

  const dom = new JSDOM(downloaded.body, { url: downloaded.finalUrl.toString() });
  const document = dom.window.document;
  document
    .querySelectorAll('script,style,noscript,nav,form,template,[hidden],[aria-hidden="true"]')
    .forEach((element) => element.remove());
  const parsed = new Readability(document).parse();
  const text = normalizeText(parsed?.textContent ?? document.body?.textContent ?? '');
  const title = normalizeText(parsed?.title ?? document.title);
  return { title: title || null, text };
}

export async function extractUrl(rawUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const downloaded = await download(validateUrl(rawUrl), controller.signal);
    const extracted = extractText(downloaded);
    if (extracted.text.length < MIN_TEXT_CHARS)
      throw new AppError(422, 'EXTRACTION_FAILED', '본문을 충분히 추출하지 못했습니다.');
    const truncated = extracted.text.length > MAX_TEXT_CHARS;
    const rawText = truncated ? extracted.text.slice(0, MAX_TEXT_CHARS) : extracted.text;
    return {
      finalUrl: downloaded.finalUrl.toString(),
      title: extracted.title,
      domain: downloaded.finalUrl.hostname,
      sourceType: inferSourceType(downloaded.finalUrl),
      rawText,
      preview: rawText.slice(0, 300),
      truncated,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (controller.signal.aborted) timeoutError();
    throw new AppError(422, 'EXTRACTION_FAILED', '본문을 가져오지 못했습니다.');
  } finally {
    clearTimeout(timeout);
  }
}
