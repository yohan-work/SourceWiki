'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authApi } from './auth-api';
import { useMeQuery } from './use-me-query';

export function AuthActions() {
  const { data: user, isPending } = useMeQuery();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (isPending) return <span className="auth-skeleton" aria-label="로그인 상태 확인 중" />;
  if (!user) {
    return (
      <div className="auth-actions">
        <Link href="/login">로그인</Link>
        <Link className="nav-button" href="/signup">
          가입하기
        </Link>
      </div>
    );
  }
  return (
    <div className="auth-actions">
      <span className="auth-nickname">{user.nickname}</span>
      <button
        className="nav-link-button"
        disabled={loggingOut}
        onClick={async () => {
          setLoggingOut(true);
          try {
            await authApi.logout();
            queryClient.setQueryData(['auth', 'me'], null);
            router.push('/');
            router.refresh();
          } finally {
            setLoggingOut(false);
          }
        }}
        type="button"
      >
        {loggingOut ? '종료 중' : '로그아웃'}
      </button>
    </div>
  );
}
