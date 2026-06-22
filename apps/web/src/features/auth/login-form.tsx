'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@sourcewiki/shared';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { ApiError } from '@/lib/api/api-client';
import { authApi } from './auth-api';

function safeReturnTo(value?: string): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = handleSubmit(async (input) => {
    try {
      const response = await authApi.login(input);
      queryClient.setQueryData(['auth', 'me'], response.data);
      router.push(safeReturnTo(returnTo));
      router.refresh();
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : '네트워크 연결을 확인해 주세요.',
      });
    }
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {errors.root ? (
        <div className="form-alert" role="alert">
          {errors.root.message}
          {errors.root.message?.includes('인증') && getValues('email') ? (
            <Link href={`/verify-email/pending?email=${encodeURIComponent(getValues('email'))}`}>
              인증 메일 다시 받기
            </Link>
          ) : null}
        </div>
      ) : null}
      <label className="form-field">
        <span>이메일</span>
        <input autoComplete="email" inputMode="email" {...register('email')} />
        {errors.email ? <small className="field-error">{errors.email.message}</small> : null}
      </label>
      <label className="form-field">
        <span>비밀번호</span>
        <input autoComplete="current-password" type="password" {...register('password')} />
        {errors.password ? <small className="field-error">{errors.password.message}</small> : null}
      </label>
      <button className="auth-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
