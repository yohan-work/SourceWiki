'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CommentsPanel } from '@/features/comments/comments-panel';
import { ApiError } from '@/lib/api/api-client';
import { sourceApi, sourceKeys } from './source-api';

type SummaryDraft = {
  summary: string;
  keyPointsText: string;
  keywordsText: string;
  tagsText: string;
  applicationIdea: string;
  mode: 'ollama' | 'demo';
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

function mergeTags(current: string[], recommended: string[]) {
  const unique = new Map<string, string>();
  for (const tag of [...current, ...recommended]) {
    const display = tag.trim().replace(/\s+/g, ' ');
    if (display) unique.set(display.toLocaleLowerCase('en-US'), display);
  }
  return [...unique.values()].slice(0, 10);
}

export function SourceDetailView({ id, canComment }: { id: string; canComment: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SummaryDraft | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: sourceKeys.detail(id),
    queryFn: () => sourceApi.detail(id),
    staleTime: 60_000,
  });
  const source = data?.data;
  const remove = useMutation({
    mutationFn: () => sourceApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.lists });
      router.push('/sources');
    },
  });
  const summarize = useMutation({
    mutationFn: () => sourceApi.summarize(id),
    onSuccess: (response) => {
      const result = response.data;
      const currentTags = source?.tags.map((tag) => tag.name) ?? [];
      setDraft({
        summary: result.summary,
        keyPointsText: result.keyPoints.join('\n'),
        keywordsText: result.keywords.join('\n'),
        tagsText: mergeTags(currentTags, result.recommendedTags).join(', '),
        applicationIdea: result.applicationIdea ?? '',
        mode: result.mode,
      });
      setAiError(null);
    },
    onError: (error) => {
      setDraft(null);
      setAiError(error instanceof ApiError ? error.message : 'AI 요약을 생성하지 못했습니다.');
    },
  });
  const applySummary = useMutation({
    mutationFn: (values: SummaryDraft) =>
      sourceApi.update(id, {
        summary: values.summary,
        summaryStatus: values.mode === 'demo' ? 'demo' : 'succeeded',
        keyPoints: lines(values.keyPointsText).slice(0, 10),
        keywords: lines(values.keywordsText).slice(0, 20),
        tags: tags(values.tagsText).slice(0, 10),
      }),
    onSuccess: async (response) => {
      queryClient.setQueryData(sourceKeys.detail(id), response);
      await queryClient.invalidateQueries({ queryKey: sourceKeys.lists });
      setDraft(null);
      setAiError(null);
    },
    onError: (error) => {
      setAiError(error instanceof ApiError ? error.message : '요약을 적용하지 못했습니다.');
    },
  });
  if (!source) return null;
  const owner = source.isOwner;
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
            <div className="section-heading-row">
              <h2>핵심 요약</h2>
              {source.summaryStatus === 'demo' ? <span className="status-badge">DEMO</span> : null}
            </div>
            <p className="prose">{source.summary ?? '아직 작성된 요약이 없습니다.'}</p>
          </section>
          {owner ? (
            <section className="ai-summary-panel">
              <div className="section-heading-row">
                <div>
                  <p className="kicker">AI SUMMARY</p>
                  <h2>요약 초안</h2>
                </div>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => summarize.mutate()}
                  disabled={summarize.isPending || applySummary.isPending || !source.rawText}
                >
                  {summarize.isPending ? '요약 생성 중…' : draft ? '다시 생성' : 'AI 요약 요청'}
                </button>
              </div>
              {!source.rawText ? (
                <p className="ai-helper">정제 본문이 있는 자료만 AI 요약을 요청할 수 있습니다.</p>
              ) : null}
              {aiError ? (
                <div className="form-alert" role="alert">
                  {aiError}
                </div>
              ) : null}
              {draft ? (
                <div className="ai-review-form" aria-live="polite">
                  {draft.mode === 'demo' ? <span className="status-badge">데모 결과</span> : null}
                  <label>
                    <span>요약</span>
                    <textarea
                      value={draft.summary}
                      onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                    />
                  </label>
                  <div className="form-split">
                    <label>
                      <span>핵심 포인트</span>
                      <textarea
                        value={draft.keyPointsText}
                        onChange={(event) =>
                          setDraft({ ...draft, keyPointsText: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>키워드</span>
                      <textarea
                        value={draft.keywordsText}
                        onChange={(event) =>
                          setDraft({ ...draft, keywordsText: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    <span>태그</span>
                    <input
                      value={draft.tagsText}
                      onChange={(event) => setDraft({ ...draft, tagsText: event.target.value })}
                    />
                  </label>
                  {draft.applicationIdea ? (
                    <div className="application-idea">
                      <strong>적용 아이디어</strong>
                      <p>{draft.applicationIdea}</p>
                    </div>
                  ) : null}
                  <div className="form-footer">
                    <button
                      className="button button--text"
                      type="button"
                      onClick={() => setDraft(null)}
                      disabled={applySummary.isPending}
                    >
                      취소
                    </button>
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => applySummary.mutate(draft)}
                      disabled={applySummary.isPending}
                    >
                      {applySummary.isPending ? '적용 중…' : '요약 적용'}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
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
          {source.relatedSources.length ? (
            <section className="related-sources" aria-labelledby="related-sources-heading">
              <span id="related-sources-heading">RELATED</span>
              <div>
                {source.relatedSources.map((related) => (
                  <Link key={related.id} href={`/sources/${related.id}`}>
                    <strong>{related.title}</strong>
                    <small>{related.sharedTags.map((tag) => tag.name).join(', ')}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
      <CommentsPanel sourceId={id} canComment={canComment} />
    </article>
  );
}
