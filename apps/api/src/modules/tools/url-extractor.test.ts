import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  httpRequest: vi.fn(),
  httpsRequest: vi.fn(),
  lookup: vi.fn(),
}));

vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('node:http', () => ({ default: { request: mocks.httpRequest } }));
vi.mock('node:https', () => ({ default: { request: mocks.httpsRequest } }));

interface RequestOptions {
  lookup?: (
    hostname: string,
    options: { all?: boolean },
    callback: (
      error: Error | null,
      address: string | { address: string; family: number }[],
      family?: number,
    ) => void,
  ) => void;
}

const { extractUrl } = await import('./url-extractor.js');

function response({
  body,
  contentType = 'text/html; charset=utf-8',
  location,
  statusCode = 200,
}: {
  body: string;
  contentType?: string;
  location?: string;
  statusCode?: number;
}) {
  const stream = Readable.from([body]) as Readable & {
    headers: Record<string, string>;
    resume: () => void;
    statusCode: number;
  };
  stream.statusCode = statusCode;
  stream.headers = { 'content-type': contentType, ...(location ? { location } : {}) };
  stream.resume = vi.fn();
  return stream;
}

function mockRequest(...responses: ReturnType<typeof response>[]) {
  const queue = [...responses];
  const implementation = vi.fn(
    (_url: URL, options: RequestOptions, callback: (value: unknown) => void) => {
      const request = new EventEmitter() as EventEmitter & {
        destroy: (error: Error) => void;
        end: () => void;
        setTimeout?: () => void;
      };
      request.destroy = (error) => request.emit('error', error);
      request.end = () => {
        options.lookup?.('example.com', { all: true }, (error, addresses) => {
          if (error) {
            request.emit('error', error);
            return;
          }
          if (!Array.isArray(addresses)) {
            request.emit('error', new Error('lookup did not return all addresses'));
            return;
          }
          callback(queue.shift());
        });
      };
      return request;
    },
  );
  mocks.httpRequest.mockImplementation(implementation);
  mocks.httpsRequest.mockImplementation(implementation);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
});

describe('url extractor', () => {
  it('extracts readable text from public HTML without storing markup', async () => {
    const text = 'SourceWiki extracts public article text for review. '.repeat(8);
    mockRequest(
      response({
        body: `<html><head><title>Public Article</title></head><body><nav>skip</nav><article><p>${text}</p></article></body></html>`,
      }),
    );

    const result = await extractUrl('https://example.com/article');

    expect(result).toMatchObject({
      domain: 'example.com',
      finalUrl: 'https://example.com/article',
      sourceType: 'article',
      title: 'Public Article',
      truncated: false,
    });
    expect(result.suggestedTags).not.toContain('article');
    expect(result.rawText).toContain('SourceWiki extracts public article text');
    expect(result.rawText).not.toContain('<article>');
  });

  it('suggests known topic tags from extracted title and text', async () => {
    mockRequest(
      response({
        body: `<html><head><title>OpenAI Codex for Samsung</title></head><body><article>${'오픈AI는 삼성전자 임직원에게 챗GPT 엔터프라이즈와 코덱스를 공급한다. '.repeat(8)}</article></body></html>`,
      }),
    );

    const result = await extractUrl('https://www.aitimes.com/news/articleView.html?idxno=1');

    expect(result.suggestedTags).toEqual(
      expect.arrayContaining(['AI', 'OpenAI', 'ChatGPT', 'Codex', '삼성전자']),
    );
    expect(result.suggestedTags).not.toEqual(
      expect.arrayContaining(['엔터프라이즈와', '임직원에게']),
    );
  });

  it('strips URL fragments before fetching and returning the final URL', async () => {
    mockRequest(
      response({ body: 'Fragment URLs still point at the same document body. '.repeat(8) }),
    );

    const result = await extractUrl('https://example.com/article#install');

    expect(result.finalUrl).toBe('https://example.com/article');
  });

  it('revalidates redirects before downloading the target', async () => {
    mockRequest(
      response({ body: '', location: 'https://docs.example.com/docs/page', statusCode: 302 }),
      response({ body: 'Redirected documentation body. '.repeat(12) }),
    );

    const result = await extractUrl('https://example.com/start');

    expect(result.finalUrl).toBe('https://docs.example.com/docs/page');
    expect(result.sourceType).toBe('docs');
    expect(mocks.lookup).toHaveBeenCalledWith('example.com', { all: true, verbatim: true });
    expect(mocks.lookup).toHaveBeenCalledWith('docs.example.com', { all: true, verbatim: true });
  });

  it('tries another resolved address when the first connection fails', async () => {
    mocks.lookup.mockResolvedValue([
      { address: '2001:4860:4860::8888', family: 6 },
      { address: '93.184.216.34', family: 4 },
    ]);
    const implementation = vi
      .fn()
      .mockImplementationOnce(() => {
        const request = new EventEmitter() as EventEmitter & {
          destroy: (error: Error) => void;
          end: () => void;
        };
        request.destroy = (error) => request.emit('error', error);
        request.end = () => request.emit('error', new Error('network unreachable'));
        return request;
      })
      .mockImplementationOnce(
        (_url: URL, options: RequestOptions, callback: (value: unknown) => void) => {
          const request = new EventEmitter() as EventEmitter & {
            destroy: (error: Error) => void;
            end: () => void;
          };
          request.destroy = (error) => request.emit('error', error);
          request.end = () =>
            options.lookup?.('example.com', { all: true }, (error, addresses) => {
              if (error) {
                request.emit('error', error);
                return;
              }
              if (!Array.isArray(addresses)) {
                request.emit('error', new Error('lookup did not return all addresses'));
                return;
              }
              callback(
                response({ body: 'Second resolved address returns article text. '.repeat(8) }),
              );
            });
          return request;
        },
      );
    mocks.httpsRequest.mockImplementation(implementation);

    const result = await extractUrl('https://example.com/article');

    expect(result.rawText).toContain('Second resolved address');
    expect(implementation).toHaveBeenCalledTimes(2);
  });

  it('blocks URLs that resolve to private addresses', async () => {
    mocks.lookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);

    await expect(extractUrl('https://example.com/private')).rejects.toMatchObject({
      code: 'URL_BLOCKED',
      status: 403,
    });
    expect(mocks.httpsRequest).not.toHaveBeenCalled();
  });

  it('rejects unsupported content types and oversized bodies', async () => {
    mockRequest(response({ body: '{}', contentType: 'application/json' }));
    await expect(extractUrl('https://example.com/data')).rejects.toMatchObject({
      code: 'CONTENT_TYPE_UNSUPPORTED',
      status: 415,
    });

    mockRequest(response({ body: 'a'.repeat(2 * 1024 * 1024 + 1), contentType: 'text/plain' }));
    await expect(extractUrl('https://example.com/large.txt')).rejects.toMatchObject({
      code: 'RESPONSE_TOO_LARGE',
      status: 413,
    });
  });
});
