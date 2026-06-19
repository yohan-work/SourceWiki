import { describe, expect, it } from 'vitest';

import { apiErrorResponseSchema, healthResponseSchema } from './index.js';

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
});
