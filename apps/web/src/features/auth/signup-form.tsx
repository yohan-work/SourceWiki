'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signupRequestSchema } from '@sourcewiki/shared';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '@/lib/api/api-client';
import { authApi } from './auth-api';

const formSchema = signupRequestSchema
  .extend({ passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다.',
  });
type FormValues = z.infer<typeof formSchema>;

export function SignupForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', nickname: '', password: '', passwordConfirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const input = { email: values.email, nickname: values.nickname, password: values.password };
    try {
      await authApi.signup(input);
      router.push(`/verify-email/pending?email=${encodeURIComponent(input.email)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
          if (field in input) setError(field as keyof FormValues, { message: messages[0] });
        }
        setError('root', { message: error.message });
      } else setError('root', { message: '네트워크 연결을 확인해 주세요.' });
    }
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {errors.root ? (
        <div className="form-alert" role="alert">
          {errors.root.message}
        </div>
      ) : null}
      <FormField label="이메일" error={errors.email?.message}>
        <input
          autoComplete="email"
          inputMode="email"
          {...register('email')}
          onBlur={async () => {
            const email = getValues('email');
            if (!email) return;
            try {
              const result = await authApi.checkEmail(email);
              if (!result.data.available)
                setError('email', { message: '이미 사용 중인 이메일입니다.' });
            } catch {
              /* 가입 API가 최종 검증합니다. */
            }
          }}
        />
      </FormField>
      <FormField label="닉네임" hint="자료와 댓글에 표시됩니다." error={errors.nickname?.message}>
        <input autoComplete="nickname" {...register('nickname')} />
      </FormField>
      <FormField label="비밀번호" hint="8자 이상 72자 이하" error={errors.password?.message}>
        <input autoComplete="new-password" type="password" {...register('password')} />
      </FormField>
      <FormField label="비밀번호 확인" error={errors.passwordConfirm?.message}>
        <input autoComplete="new-password" type="password" {...register('passwordConfirm')} />
      </FormField>
      <button className="auth-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? '계정을 만드는 중…' : '인증 메일 받기'}
      </button>
    </form>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactElement;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}
