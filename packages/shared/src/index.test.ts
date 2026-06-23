import { describe, expect, it } from 'vitest';

import {
  apiErrorResponseSchema,
  extractUrlRequestSchema,
  healthResponseSchema,
  paginationQuerySchema,
  publicHttpUrlSchema,
  signupRequestSchema,
  sourceUpdateRequestSchema,
} from './index.js';

describe('shared API schemas', () => {
  it('accepts a readiness response', () => {
    const result = healthResponseSchema.safeParse({
      data: {
        status: 'ok',
        service: 'database',
        timestamp: '2026-06-19T12:00:00.000Z',
        checks: { database: 'up' },
      },
      meta: { requestId: 'request-1' },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an error without a request id', () => {
    const result = apiErrorResponseSchema.safeParse({
      error: { code: 'INTERNAL_ERROR', message: 'failed' },
    });

    expect(result.success).toBe(false);
  });

  it('normalizes signup email and validates account fields', () => {
    const result = signupRequestSchema.parse({
      email: '  USER@Example.COM ',
      nickname: '기록자',
      password: 'password123',
    });
    expect(result.email).toBe('user@example.com');
  });

  it('validates public source URLs and pagination boundaries', () => {
    expect(publicHttpUrlSchema.safeParse('https://docs.example.com/path').success).toBe(true);
    expect(publicHttpUrlSchema.safeParse('http://127.0.0.1/private').success).toBe(false);
    expect(publicHttpUrlSchema.safeParse('https://user:pass@example.com').success).toBe(false);
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 12 });
    expect(paginationQuerySchema.safeParse({ page: 0, limit: 51 }).success).toBe(false);
  });

  it('rejects an empty source patch', () => {
    expect(sourceUpdateRequestSchema.safeParse({}).success).toBe(false);
  });

  it('normalizes fragment-only client URL parts for extraction previews', () => {
    expect(extractUrlRequestSchema.parse({ url: 'https://docs.example.com/page#section' })).toEqual(
      { url: 'https://docs.example.com/page' },
    );
  });
});
