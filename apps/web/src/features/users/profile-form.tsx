'use client';

import { updateProfileRequestSchema, type AuthUser } from '@sourcewiki/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useMeQuery } from '@/features/auth/use-me-query';
import { ApiError } from '@/lib/api/api-client';
import { userApi } from './user-api';

function ProfileEditor({ me }: { me: AuthUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState(me.nickname);
  const [bio, setBio] = useState(me.bio ?? '');
  const [error, setError] = useState('');

  const update = useMutation({
    mutationFn: () => {
      const parsed = updateProfileRequestSchema.safeParse({
        nickname,
        bio: bio.trim() || null,
      });
      if (!parsed.success) {
        throw new ApiError(
          422,
          'VALIDATION_ERROR',
          parsed.error.issues[0]?.message ?? '프로필 입력을 확인해 주세요.',
        );
      }
      return userApi.updateMe(parsed.data);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], response.data);
      setError('');
      router.refresh();
    },
    onError: (value) => {
      setError(value instanceof ApiError ? value.message : '프로필을 저장하지 못했습니다.');
    },
  });

  return (
    <form
      className="profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate();
      }}
    >
      <label>
        <span>닉네임</span>
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          minLength={2}
          maxLength={30}
        />
      </label>
      <label>
        <span>소개</span>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={500}
          placeholder="관심 분야나 정리하는 기술 주제를 남겨보세요."
        />
      </label>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button button--primary" disabled={update.isPending}>
        {update.isPending ? '저장 중...' : '프로필 저장'}
      </button>
    </form>
  );
}

export function ProfileForm() {
  const router = useRouter();
  const { data: me, isPending } = useMeQuery();

  useEffect(() => {
    if (!isPending && !me) router.replace('/login?returnTo=/profile');
  }, [isPending, me, router]);

  if (isPending || !me) return null;
  return <ProfileEditor key={me.id} me={me} />;
}
