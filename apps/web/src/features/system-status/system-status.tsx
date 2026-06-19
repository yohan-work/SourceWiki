'use client';

import type { HealthResponse } from '@sourcewiki/shared';
import { useEffect, useState } from 'react';

type Status = 'checking' | 'ready' | 'unavailable';

interface StatusState {
  status: Status;
  checkedAt?: string;
  requestId?: string;
}

const statusCopy: Record<Status, { label: string; detail: string }> = {
  checking: { label: '연결 확인 중', detail: 'API와 데이터베이스의 응답을 기다리고 있습니다.' },
  ready: { label: '모든 시스템 정상', detail: 'Web → API → PostgreSQL 연결이 준비되었습니다.' },
  unavailable: {
    label: '일부 연결 확인 필요',
    detail: 'API 또는 데이터베이스가 아직 준비되지 않았습니다.',
  },
};

export function SystemStatus() {
  const [state, setState] = useState<StatusState>({ status: 'checking' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const response = await fetch('/api/health/ready', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await response.json()) as HealthResponse;

        setState({
          status: response.ok && payload.data.status === 'ok' ? 'ready' : 'unavailable',
          checkedAt: payload.data.timestamp,
          requestId: payload.meta.requestId,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'unavailable' });
      }
    }

    void loadStatus();
    return () => controller.abort();
  }, []);

  const copy = statusCopy[state.status];

  return (
    <div className={`status-panel status-panel--${state.status}`} aria-live="polite">
      <div className="status-panel__signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="status-panel__copy">
        <span className="status-panel__overline">LIVE CONNECTION</span>
        <strong>{copy.label}</strong>
        <p>{copy.detail}</p>
      </div>
      <dl className="status-panel__meta">
        <div>
          <dt>API</dt>
          <dd>{state.status === 'ready' ? 'UP' : state.status === 'checking' ? '—' : 'CHECK'}</dd>
        </div>
        <div>
          <dt>DATABASE</dt>
          <dd>{state.status === 'ready' ? 'UP' : state.status === 'checking' ? '—' : 'CHECK'}</dd>
        </div>
        <div>
          <dt>LAST CHECK</dt>
          <dd>
            {state.checkedAt ? new Date(state.checkedAt).toLocaleTimeString('ko-KR') : 'PENDING'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
