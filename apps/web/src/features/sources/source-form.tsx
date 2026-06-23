'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { sourceCreateRequestSchema } from '@sourcewiki/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useMeQuery } from '@/features/auth/use-me-query';
import { ApiError } from '@/lib/api/api-client';
import { sourceApi, sourceKeys } from './source-api';

const formSchema = z.object({
  title: sourceCreateRequestSchema.shape.title,
  originalUrl: sourceCreateRequestSchema.shape.originalUrl,
  sourceType: z.enum(['article', 'docs', 'paper', 'github', 'other']),
  rawText: z.string().max(100_000),
  summary: z.string().max(10_000),
  keyPointsText: z.string(),
  keywordsText: z.string(),
  personalNote: z.string().max(10_000),
  tagsText: z.string(),
});
type FormValues = z.input<typeof formSchema>;

const defaults: FormValues = {
  title: '',
  originalUrl: '',
  sourceType: 'other',
  rawText: '',
  summary: '',
  keyPointsText: '',
  keywordsText: '',
  personalNote: '',
  tagsText: '',
};
const lines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
const tags = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function SourceForm({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [extractPreview, setExtractPreview] = useState<{
    domain: string;
    preview: string;
    truncated: boolean;
  } | null>(null);
  const { data: me, isPending: authPending } = useMeQuery();
  const { data: detail, isPending: detailPending } = useQuery({
    queryKey: sourceKeys.detail(id ?? ''),
    queryFn: () => sourceApi.detail(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
  const {
    register,
    handleSubmit,
    clearErrors,
    getValues,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  useEffect(() => {
    if (!authPending && !me)
      router.replace(
        `/login?returnTo=${encodeURIComponent(id ? `/sources/${id}/edit` : '/sources/new')}`,
      );
  }, [authPending, id, me, router]);
  useEffect(() => {
    if (!detail) return;
    const source = detail.data;
    reset({
      title: source.title,
      originalUrl: source.originalUrl,
      sourceType: source.sourceType,
      rawText: source.rawText ?? '',
      summary: source.summary ?? '',
      keyPointsText: source.keyPoints.join('\n'),
      keywordsText: source.keywords.join('\n'),
      personalNote: source.personalNote ?? '',
      tagsText: source.tags.map((tag) => tag.name).join(', '),
    });
  }, [detail, reset]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) =>
      id
        ? sourceApi.update(id, {
            title: values.title,
            originalUrl: values.originalUrl,
            sourceType: values.sourceType,
            rawText: values.rawText || null,
            summary: values.summary || null,
            keyPoints: lines(values.keyPointsText).slice(0, 10),
            keywords: lines(values.keywordsText).slice(0, 20),
            personalNote: values.personalNote || null,
            tags: tags(values.tagsText).slice(0, 10),
          })
        : sourceApi.create({
            title: values.title,
            originalUrl: values.originalUrl,
            sourceType: values.sourceType,
            rawText: values.rawText || undefined,
            personalNote: values.personalNote || undefined,
            tags: tags(values.tagsText).slice(0, 10),
          }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.lists });
      router.push(`/sources/${response.data.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fieldErrors ?? {}))
          setError(field as keyof FormValues, { message: messages[0] });
        setError('root', { message: error.message });
      } else setError('root', { message: '네트워크 연결을 확인해 주세요.' });
    },
  });

  const extractMutation = useMutation({
    mutationFn: () => sourceApi.extractUrl({ url: getValues('originalUrl') }),
    onSuccess: (response) => {
      const extracted = response.data;
      setValue('originalUrl', extracted.finalUrl, { shouldDirty: true, shouldValidate: true });
      if (extracted.title)
        setValue('title', extracted.title, { shouldDirty: true, shouldValidate: true });
      setValue('sourceType', extracted.sourceType, { shouldDirty: true, shouldValidate: true });
      setValue('rawText', extracted.rawText, { shouldDirty: true, shouldValidate: true });
      setExtractPreview({
        domain: extracted.domain,
        preview: extracted.preview,
        truncated: extracted.truncated,
      });
      clearErrors('root');
    },
    onError: (error) => {
      setExtractPreview(null);
      if (error instanceof ApiError) {
        setError('root', { message: error.message });
        if (error.code === 'URL_INVALID' || error.fieldErrors?.url)
          setError('originalUrl', { message: error.fieldErrors?.url?.[0] ?? error.message });
      } else setError('root', { message: '본문을 가져오지 못했습니다.' });
    },
  });

  const handleExtract = () => {
    clearErrors('root');
    if (!getValues('originalUrl').trim()) {
      setExtractPreview(null);
      setError('originalUrl', { message: 'URL을 입력해 주세요.' });
      return;
    }
    extractMutation.mutate();
  };

  if (authPending || (id && detailPending))
    return <div className="form-loading" aria-label="편집 권한 확인 중" />;
  if (!me) return null;
  if (id && detail && detail.data.author.id !== me.id)
    return (
      <div className="empty-state">
        <strong>수정 권한이 없습니다.</strong>
        <p>작성자만 이 자료를 수정할 수 있습니다.</p>
        <Link href={`/sources/${id}`}>상세로 돌아가기</Link>
      </div>
    );
  return (
    <form
      className="source-form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      {errors.root ? (
        <div className="form-alert" role="alert">
          {errors.root.message}
        </div>
      ) : null}
      <label>
        <span>자료 제목 *</span>
        <input {...register('title')} aria-invalid={Boolean(errors.title)} />
        {errors.title ? <small>{errors.title.message}</small> : null}
      </label>
      <div className="form-split">
        <label>
          <span>원본 URL *</span>
          <input {...register('originalUrl')} inputMode="url" placeholder="https://" />
          {errors.originalUrl ? <small>{errors.originalUrl.message}</small> : null}
        </label>
        <label>
          <span>자료 유형</span>
          <select {...register('sourceType')}>
            <option value="article">Article</option>
            <option value="docs">Docs</option>
            <option value="paper">Paper</option>
            <option value="github">GitHub</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      {!id ? (
        <div className="extract-panel">
          <button
            className="button button--secondary"
            type="button"
            onClick={handleExtract}
            disabled={extractMutation.isPending}
          >
            {extractMutation.isPending ? '본문 가져오는 중…' : '본문 가져오기'}
          </button>
          <p>
            공개 HTML과 일반 텍스트 문서에서 제목과 본문을 미리 채웁니다. 실패해도 수동으로 저장할
            수 있습니다.
          </p>
          {extractPreview ? (
            <div className="extract-preview" aria-live="polite">
              <strong>{extractPreview.domain}</strong>
              <p>{extractPreview.preview}</p>
              {extractPreview.truncated ? <small>긴 본문은 100,000자에서 잘렸습니다.</small> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <label>
        <span>정제 본문</span>
        <textarea
          className="textarea-large"
          {...register('rawText')}
          placeholder="본문 가져오기를 실행하거나 필요한 부분을 직접 붙여넣을 수 있습니다."
        />
      </label>
      {id ? (
        <>
          <label>
            <span>요약</span>
            <textarea {...register('summary')} />
          </label>
          <div className="form-split">
            <label>
              <span>핵심 포인트</span>
              <textarea {...register('keyPointsText')} placeholder="한 줄에 하나씩" />
            </label>
            <label>
              <span>키워드</span>
              <textarea {...register('keywordsText')} placeholder="한 줄에 하나씩" />
            </label>
          </div>
        </>
      ) : null}
      <label>
        <span>태그</span>
        <input {...register('tagsText')} placeholder="React, Architecture, API" />
        <small>쉼표로 구분해 최대 10개까지 입력하세요.</small>
      </label>
      <label>
        <span>개인 메모</span>
        <textarea {...register('personalNote')} />
      </label>
      <div className="form-footer">
        <Link className="button button--text" href={id ? `/sources/${id}` : '/sources'}>
          취소
        </Link>
        <button className="button button--primary" disabled={mutation.isPending}>
          {mutation.isPending ? '저장 중…' : id ? '변경사항 저장' : '자료 저장'}
        </button>
      </div>
    </form>
  );
}
