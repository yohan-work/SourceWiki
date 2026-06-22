'use client';

import { useState } from 'react';

import { ApiError } from '@/lib/api/api-client';
import { authApi } from './auth-api';

export function ResendButton({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  return (
    <div className="resend-action">
      <button
        className="secondary-button"
        disabled={status !== 'idle'}
        onClick={async () => {
          setStatus('sending');
          setError('');
          try {
            await authApi.resend({ email });
            setStatus('sent');
          } catch (reason) {
            setStatus('idle');
            setError(reason instanceof ApiError ? reason.message : '재발송하지 못했습니다.');
          }
        }}
        type="button"
      >
        {status === 'sending'
          ? '보내는 중…'
          : status === 'sent'
            ? '메일을 보냈습니다'
            : '인증 메일 다시 보내기'}
      </button>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
