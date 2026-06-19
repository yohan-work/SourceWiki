import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemStatus } from './system-status';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SystemStatus', () => {
  it('shows the ready state after a successful health response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            status: 'ok',
            service: 'database',
            timestamp: '2026-06-19T12:00:00.000Z',
            checks: { database: 'up' },
          },
          meta: { requestId: 'request-1' },
        }),
      }),
    );

    render(<SystemStatus />);
    expect(screen.getByText('연결 확인 중')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('모든 시스템 정상')).toBeInTheDocument());
  });

  it('keeps a visible failure state when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    render(<SystemStatus />);

    await waitFor(() => expect(screen.getByText('일부 연결 확인 필요')).toBeInTheDocument());
  });
});
