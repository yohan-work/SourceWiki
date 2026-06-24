'use client';

import type { SourceListItem } from '@sourcewiki/shared';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { sourceApi, sourceKeys } from './source-api';

function SourceVisual({ source }: { source: Pick<SourceListItem, 'sourceDomain' | 'sourceType'> }) {
  const label = source.sourceType === 'github' ? 'GH' : source.sourceType.slice(0, 2).toUpperCase();
  return (
    <div className={`source-visual source-visual--${source.sourceType}`} aria-hidden="true">
      <div className="source-visual__orb" />
      <div className="source-visual__stack">
        <span>{label}</span>
      </div>
      <small>{source.sourceDomain}</small>
    </div>
  );
}

function SourceCard({ source }: { source: SourceListItem }) {
  const excerpt = source.summaryPreview ?? source.rawTextPreview ?? '아직 작성된 요약이 없습니다.';
  return (
    <article className="source-card">
      <div className="source-card__body">
        <div className="source-card__meta">
          <span>{source.sourceType}</span>
          <span>{source.author.nickname}</span>
        </div>
        <h2>
          <Link href={`/sources/${source.id}`}>{source.title}</Link>
        </h2>
        <p>{excerpt}</p>
        <footer>
          <div className="tag-row">
            {source.tags.slice(0, 3).map((tag) => (
              <span key={tag.id}>{tag.name}</span>
            ))}
          </div>
          <time dateTime={source.createdAt}>
            {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
              new Date(source.createdAt),
            )}
          </time>
        </footer>
      </div>
      <Link className="source-card__visual-link" href={`/sources/${source.id}`} tabIndex={-1}>
        <SourceVisual source={source} />
      </Link>
    </article>
  );
}

export function SourceList({ page }: { page: number }) {
  const { data } = useQuery({
    queryKey: sourceKeys.list(page),
    queryFn: () => sourceApi.list(page),
    staleTime: 30_000,
  });
  if (!data?.data.length)
    return (
      <div className="empty-state">
        <strong>아직 저장된 자료가 없습니다.</strong>
        <p>첫 번째 기술 자료를 아카이브해 보세요.</p>
        <Link className="button button--primary" href="/sources/new">
          자료 등록
        </Link>
      </div>
    );
  return (
    <>
      <div className="source-grid">
        {data.data.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
      <nav className="pagination" aria-label="자료 페이지">
        {page > 1 ? <Link href={`/sources?page=${page - 1}`}>← 이전</Link> : <span />}
        <span>
          {page} / {Math.max(data.pagination.totalPages, 1)}
        </span>
        {page < data.pagination.totalPages ? (
          <Link href={`/sources?page=${page + 1}`}>다음 →</Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
