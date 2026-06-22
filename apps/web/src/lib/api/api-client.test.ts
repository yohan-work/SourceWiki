import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from './api-client';

afterEach(() => vi.restoreAllMocks());

describe('apiFetch', () => {
  it('maps the common API error contract', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력값 오류',
            requestId: 'req-1',
            fieldErrors: { email: ['invalid'] },
          },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(
      apiFetch('/api/auth/signup', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: 'req-1',
      fieldErrors: { email: ['invalid'] },
    });
  });

  it('uses one refresh for concurrent unauthorized requests and retries each once', async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === '/api/auth/refresh') {
        refreshCalls += 1;
        await Promise.resolve();
        return new Response(null, { status: 204 });
      }
      protectedCalls += 1;
      if (protectedCalls <= 2) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify({ data: { ok: true } }), { status: 200 });
    });

    const results = await Promise.all([apiFetch('/api/sources'), apiFetch('/api/sources')]);
    expect(results).toHaveLength(2);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(4);
  });
});
