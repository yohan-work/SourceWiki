'use client';

import type { SourceListItem, SourceType } from '@sourcewiki/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { useMeQuery } from '@/features/auth/use-me-query';
import { sourceApi, sourceKeys, type SourceListOptions } from './source-api';

const SOURCE_TYPE_OPTIONS: { value: '' | SourceType; label: string }[] = [
  { value: '', label: '전체 유형' },
  { value: 'article', label: 'Article' },
  { value: 'docs', label: 'Docs' },
  { value: 'paper', label: 'Paper' },
  { value: 'github', label: 'GitHub' },
  { value: 'other', label: 'Other' },
];

function buildSourcesHref(filters: SourceListOptions, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.q) params.set('q', filters.q);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.type) params.set('type', filters.type);
  return `/sources?${params.toString()}`;
}

function SourceSearchForm({
  filters,
  totalItems,
}: {
  filters: SourceListOptions;
  totalItems: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q ?? '');
  const [tag, setTag] = useState(filters.tag ?? '');
  const [type, setType] = useState<'' | SourceType>(filters.type ?? '');

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters: SourceListOptions = {
      page: 1,
      limit: filters.limit,
      q: query.trim() || undefined,
      tag: tag.trim() || undefined,
      type: type || undefined,
    };
    router.push(buildSourcesHref(nextFilters, 1));
  }

  return (
    <form className="source-search" onSubmit={submitSearch}>
      <div className="source-search__fields">
        <label>
          <span>검색어</span>
          <input
            type="search"
            name="q"
            value={query}
            maxLength={100}
            placeholder="제목, 요약, 본문, 도메인"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>태그</span>
          <input
            type="search"
            name="tag"
            value={tag}
            maxLength={30}
            placeholder="예: RAG"
            onChange={(event) => setTag(event.target.value)}
          />
        </label>
        <label>
          <span>유형</span>
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as '' | SourceType)}
          >
            {SOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="source-search__actions">
        <span>{totalItems}개 결과</span>
        <Link href="/sources">초기화</Link>
        <button type="submit">검색</button>
      </div>
    </form>
  );
}

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

function SourceLikeControl({ source, canLike }: { source: SourceListItem; canLike: boolean }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => (source.likedByMe ? sourceApi.unlike(source.id) : sourceApi.like(source.id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.lists });
      await queryClient.invalidateQueries({ queryKey: sourceKeys.detail(source.id) });
    },
  });

  if (!canLike)
    return (
      <span className="like-count" aria-label={`좋아요 ${source.likeCount}개`}>
        ♥ {source.likeCount}
      </span>
    );

  return (
    <button
      className={`like-button${source.likedByMe ? ' is-active' : ''}`}
      type="button"
      aria-pressed={source.likedByMe}
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
    >
      <span aria-hidden="true">♥</span>
      {source.likeCount}
    </button>
  );
}

function SourceCard({ source, canLike }: { source: SourceListItem; canLike: boolean }) {
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
          <SourceLikeControl source={source} canLike={canLike} />
        </footer>
      </div>
      <Link className="source-card__visual-link" href={`/sources/${source.id}`} tabIndex={-1}>
        <SourceVisual source={source} />
      </Link>
    </article>
  );
}

export function SourceList({ filters }: { filters: SourceListOptions }) {
  const { data: me } = useMeQuery();
  const { data } = useQuery({
    queryKey: sourceKeys.list(filters),
    queryFn: () => sourceApi.list(filters),
    staleTime: 30_000,
  });
  const hasFilters = Boolean(filters.q || filters.tag || filters.type);
  const page = filters.page;
  const totalItems = data?.pagination.totalItems ?? 0;
  const filterKey = `${filters.q ?? ''}:${filters.tag ?? ''}:${filters.type ?? ''}`;

  if (!data?.data.length)
    return (
      <>
        <SourceSearchForm key={filterKey} filters={filters} totalItems={totalItems} />
        <div className="empty-state">
          <strong>
            {hasFilters ? '조건에 맞는 자료가 없습니다.' : '아직 저장된 자료가 없습니다.'}
          </strong>
          <p>
            {hasFilters
              ? '검색어나 필터를 조정해 보세요.'
              : '첫 번째 기술 자료를 아카이브해 보세요.'}
          </p>
          {hasFilters ? (
            <Link className="button button--secondary" href="/sources">
              전체 보기
            </Link>
          ) : (
            <Link className="button button--primary" href="/sources/new">
              자료 등록
            </Link>
          )}
        </div>
      </>
    );
  return (
    <>
      <SourceSearchForm key={filterKey} filters={filters} totalItems={totalItems} />
      <div className="source-grid">
        {data.data.map((source) => (
          <SourceCard key={source.id} source={source} canLike={Boolean(me)} />
        ))}
      </div>
      <nav className="pagination" aria-label="자료 페이지">
        {page > 1 ? <Link href={buildSourcesHref(filters, page - 1)}>← 이전</Link> : <span />}
        <span>
          {page} / {Math.max(data.pagination.totalPages, 1)}
        </span>
        {page < data.pagination.totalPages ? (
          <Link href={buildSourcesHref(filters, page + 1)}>다음 →</Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
