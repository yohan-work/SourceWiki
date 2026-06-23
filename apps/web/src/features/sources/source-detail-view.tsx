'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CommentsPanel } from '@/features/comments/comments-panel';
import { useMeQuery } from '@/features/auth/use-me-query';
import { sourceApi, sourceKeys } from './source-api';

export function SourceDetailView({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMeQuery();
  const { data } = useQuery({
    queryKey: sourceKeys.detail(id),
    queryFn: () => sourceApi.detail(id),
    staleTime: 60_000,
  });
  const remove = useMutation({
    mutationFn: () => sourceApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.lists });
      router.push('/sources');
    },
  });
  if (!data) return null;
  const source = data.data;
  const owner = me?.id === source.author.id;
  return (
    <article className="source-detail page-shell">
      <header className="detail-hero">
        <div className="detail-hero__meta">
          <span>{source.sourceDomain}</span>
          <span>{source.sourceType}</span>
        </div>
        <h1>{source.title}</h1>
        <p>
          {source.author.nickname} ·{' '}
          {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(
            new Date(source.createdAt),
          )}
        </p>
        <div className="tag-row">
          {source.tags.map((tag) => (
            <span key={tag.id}>{tag.name}</span>
          ))}
        </div>
        <div className="detail-actions">
          <a
            className="button button--primary"
            href={source.originalUrl}
            target="_blank"
            rel="noreferrer"
          >
            원문 방문 ↗
          </a>
          {owner ? (
            <>
              <Link className="button button--text" href={`/sources/${id}/edit`}>
                수정
              </Link>
              <button
                className="button danger-button"
                onClick={() => {
                  if (window.confirm(`“${source.title}” 자료와 댓글을 모두 삭제할까요?`))
                    remove.mutate();
                }}
              >
                삭제
              </button>
            </>
          ) : null}
        </div>
      </header>
      <div className="detail-layout">
        <main className="detail-content">
          <section>
            <p className="kicker">SUMMARY</p>
            <h2>핵심 요약</h2>
            <p className="prose">{source.summary ?? '아직 작성된 요약이 없습니다.'}</p>
          </section>
          {source.keyPoints.length ? (
            <section>
              <p className="kicker">KEY POINTS</p>
              <h2>기억할 지점</h2>
              <ol className="key-points">
                {source.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
            </section>
          ) : null}
          {source.rawText ? (
            <details className="raw-text">
              <summary>정제 본문 펼쳐보기</summary>
              <p>{source.rawText}</p>
            </details>
          ) : null}
        </main>
        <aside className="detail-note">
          <span>PERSONAL NOTE</span>
          <p>{source.personalNote ?? '작성자가 남긴 메모가 없습니다.'}</p>
        </aside>
      </div>
      <CommentsPanel sourceId={id} />
    </article>
  );
}
