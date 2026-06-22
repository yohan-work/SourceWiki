'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/api-client';
import { authApi } from './auth-api';

export function VerifyEmailResult({ token }: { token?: string }) {
  const started = useRef(false);
  const [result, setResult] = useState<{ state: 'loading' | 'success' | 'error'; message: string }>(
    token
      ? { state: 'loading', message: '인증 링크를 확인하고 있습니다.' }
      : { state: 'error', message: '인증 토큰이 없습니다.' },
  );
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState({}, '', '/verify-email');
    if (!token) return;
    void authApi
      .verifyEmail(token)
      .then(() => setResult({ state: 'success', message: '이메일 인증이 완료되었습니다.' }))
      .catch((error) =>
        setResult({
          state: 'error',
          message: error instanceof ApiError ? error.message : '인증 링크를 확인하지 못했습니다.',
        }),
      );
  }, [token]);

  return (
    <div className={`verify-result verify-result--${result.state}`} aria-live="polite">
      <span className="verify-result__mark" aria-hidden="true">
        {result.state === 'loading' ? '…' : result.state === 'success' ? '✓' : '!'}
      </span>
      <h1>
        {result.state === 'loading'
          ? '잠시만 기다려 주세요'
          : result.state === 'success'
            ? '인증을 마쳤습니다'
            : '링크를 확인해 주세요'}
      </h1>
      <p>{result.message}</p>
      {result.state === 'success' ? (
        <Link className="auth-submit" href="/login">
          로그인하기
        </Link>
      ) : result.state === 'error' ? (
        <Link className="secondary-button" href="/signup">
          가입 화면으로
        </Link>
      ) : null}
    </div>
  );
}
