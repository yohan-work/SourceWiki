'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type KeyboardEvent, useState } from 'react';

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

type EditingSection = 'summary' | 'keyPoints' | 'keywords' | 'tags';
type AssistantTab = 'summary' | 'chat';
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
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
  return Array.from(unique.values()).slice(0, 10);
}

function articleParagraphs(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  return normalized
    .split(/(?<=[.!?。！？]|다\.|요\.)\s+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function DetailVisual({
  source,
}: {
  source: { sourceDomain: string; sourceType: 'article' | 'docs' | 'paper' | 'github' | 'other' };
}) {
  const label = source.sourceType === 'github' ? 'GH' : source.sourceType.slice(0, 2).toUpperCase();
  return (
    <div className={`detail-visual source-visual--${source.sourceType}`} aria-hidden="true">
      <div className="detail-visual__orb" />
      <div className="detail-visual__stack">
        <span>{label}</span>
      </div>
      <small>{source.sourceDomain}</small>
    </div>
  );
}

export function SourceDetailView({ id, canComment }: { id: string; canComment: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SummaryDraft | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSection | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState<AssistantTab>('summary');
  const [aiError, setAiError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
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
      setEditingSection(null);
      setIsAiPanelOpen(true);
      setActiveAiTab('summary');
      setAiError(null);
    },
    onError: (error) => {
      setDraft(null);
      setEditingSection(null);
      setIsAiPanelOpen(true);
      setActiveAiTab('summary');
      setAiError(error instanceof ApiError ? error.message : 'AI 요약을 생성하지 못했습니다.');
    },
  });
  const chat = useMutation({
    mutationFn: (input: { message: string; history: ChatMessage[] }) => sourceApi.chat(id, input),
    onSuccess: (response) => {
      setChatMessages((current) => [
        ...current,
        { role: 'assistant', content: response.data.answer },
      ]);
      setChatError(null);
    },
    onError: (error) => {
      setChatError(error instanceof ApiError ? error.message : 'AI 답변을 생성하지 못했습니다.');
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
      setEditingSection(null);
      setIsAiPanelOpen(false);
      setAiError(null);
    },
    onError: (error) => {
      setAiError(error instanceof ApiError ? error.message : '요약을 적용하지 못했습니다.');
    },
  });
  if (!source) return null;
  const owner = source.isOwner;
  const rawParagraphs = source.rawText ? articleParagraphs(source.rawText) : [];
  const savedSummary = source.summary
    ? {
        summary: source.summary,
        keyPoints: source.keyPoints,
        keywords: source.keywords,
        tags: source.tags.map((tag) => tag.name),
        mode: source.summaryStatus === 'demo' ? ('demo' as const) : ('ollama' as const),
      }
    : null;
  const visibleSummary = draft
    ? {
        summary: draft.summary,
        keyPoints: lines(draft.keyPointsText),
        keywords: lines(draft.keywordsText),
        tags: tags(draft.tagsText),
        mode: draft.mode,
      }
    : savedSummary;
  const isDraftSummary = Boolean(draft);
  const requestSummary = () => {
    setIsAiPanelOpen(true);
    setActiveAiTab('summary');
    summarize.mutate();
  };
  const openAiAssistant = (tab: AssistantTab = 'summary') => {
    setActiveAiTab(tab);
    setIsAiPanelOpen(true);
  };
  const submitChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chat.isPending || !source.rawText) return;
    const history = chatMessages.slice(-8);
    setChatMessages((current) => [...current, { role: 'user', content: message }]);
    setChatInput('');
    setChatError(null);
    chat.mutate({ message, history });
  };
  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };
  return (
    <article className="source-detail page-shell">
      <header className="detail-hero">
        <DetailVisual source={source} />
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
        {source.tags.length ? (
          <div className="tag-row">
            {source.tags.map((tag) => (
              <span key={tag.id}>{tag.name}</span>
            ))}
          </div>
        ) : null}
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
          {rawParagraphs.length ? (
            <section className="article-body" aria-labelledby="article-body-heading">
              <div>
                <p className="kicker">SOURCE TEXT</p>
                <h2 id="article-body-heading">원문</h2>
              </div>
              <div>
                {rawParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </div>
            </section>
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
          {owner ? (
            <div className="ai-sidebar-action">
              <button
                className="ai-fab-button"
                type="button"
                onClick={() => openAiAssistant('summary')}
                disabled={
                  summarize.isPending || applySummary.isPending || chat.isPending || !source.rawText
                }
              >
                {summarize.isPending ? '생성 중' : 'AI 어시스턴트'}
              </button>
              {!source.rawText ? <small>정제 본문이 필요합니다.</small> : null}
            </div>
          ) : null}
        </aside>
      </div>
      {owner && isAiPanelOpen ? (
        <div className="ai-assistant-layer">
          <button
            className="ai-assistant-backdrop"
            type="button"
            aria-label="AI 요약 패널 닫기"
            onClick={() => setIsAiPanelOpen(false)}
          />
          <aside
            className="ai-assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assistant-title"
          >
            <header className="ai-assistant-header">
              <div>
                <p className="kicker">SOURCEWIKI AI</p>
                <h2 id="ai-assistant-title">{activeAiTab === 'summary' ? '요약' : '대화'}</h2>
              </div>
              <div className="ai-assistant-actions">
                {activeAiTab === 'summary' && (visibleSummary || aiError) ? (
                  <button
                    className="ai-section-action"
                    type="button"
                    onClick={requestSummary}
                    disabled={summarize.isPending || applySummary.isPending || !source.rawText}
                  >
                    다시 생성
                  </button>
                ) : null}
                <button
                  className="ai-close-button"
                  type="button"
                  aria-label="닫기"
                  onClick={() => setIsAiPanelOpen(false)}
                >
                  ×
                </button>
              </div>
            </header>
            <div className="ai-assistant-tabs" role="tablist" aria-label="AI 어시스턴트 보기">
              <button
                type="button"
                role="tab"
                aria-selected={activeAiTab === 'summary'}
                className={activeAiTab === 'summary' ? 'is-active' : ''}
                onClick={() => setActiveAiTab('summary')}
              >
                요약
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeAiTab === 'chat'}
                className={activeAiTab === 'chat' ? 'is-active' : ''}
                onClick={() => setActiveAiTab('chat')}
              >
                대화
              </button>
            </div>
            <div className="ai-assistant-body">
              {activeAiTab === 'summary' ? (
                <>
                  <div className="ai-chat-message ai-chat-message--assistant">
                    <span>AI</span>
                    <p>
                      {summarize.isPending
                        ? '원문을 읽고 요약 초안을 생성하고 있습니다.'
                        : visibleSummary
                          ? isDraftSummary
                            ? '초안을 만들었습니다. 적용 전 내용을 확인해 주세요.'
                            : '저장된 AI 요약입니다. 원문은 그대로 두고 이곳에서 확인합니다.'
                          : 'AI 요약을 요청하면 이곳에서 초안을 검토할 수 있습니다.'}
                    </p>
                  </div>
                  {aiError ? (
                    <div className="form-alert" role="alert">
                      {aiError}
                    </div>
                  ) : null}
                  {!visibleSummary && !summarize.isPending ? (
                    <div className="ai-empty-state">
                      <strong>아직 생성된 요약이 없습니다.</strong>
                      <p>원문을 기반으로 요약, 핵심 포인트, 키워드, 태그 초안을 만듭니다.</p>
                      <button
                        className="button button--primary"
                        type="button"
                        onClick={requestSummary}
                        disabled={applySummary.isPending || !source.rawText}
                      >
                        AI 요약 요청
                      </button>
                    </div>
                  ) : null}
                  {visibleSummary ? (
                    <div className="ai-draft-review" aria-live="polite">
                      <div className="ai-draft-meta">
                        <span className="status-badge">
                          {visibleSummary.mode === 'demo'
                            ? '데모 결과'
                            : isDraftSummary
                              ? '생성된 초안'
                              : '저장된 요약'}
                        </span>
                        <span>
                          {isDraftSummary
                            ? '원문은 그대로 두고 초안만 검토합니다.'
                            : '요약은 이 패널에서만 표시됩니다.'}
                        </span>
                      </div>
                      <section className="ai-draft-card ai-draft-card--summary">
                        <div className="ai-draft-card__header">
                          <h3>요약</h3>
                          {isDraftSummary ? (
                            <button
                              className="ai-section-action"
                              type="button"
                              onClick={() =>
                                setEditingSection(editingSection === 'summary' ? null : 'summary')
                              }
                            >
                              {editingSection === 'summary' ? '닫기' : '수정'}
                            </button>
                          ) : null}
                        </div>
                        {isDraftSummary && editingSection === 'summary' && draft ? (
                          <label className="ai-edit-field">
                            <span>요약 수정</span>
                            <textarea
                              value={draft.summary}
                              onChange={(event) =>
                                setDraft({ ...draft, summary: event.target.value })
                              }
                            />
                          </label>
                        ) : (
                          <p>{visibleSummary.summary}</p>
                        )}
                      </section>
                      <section className="ai-draft-card">
                        <div className="ai-draft-card__header">
                          <h3>핵심 포인트</h3>
                          {isDraftSummary ? (
                            <button
                              className="ai-section-action"
                              type="button"
                              onClick={() =>
                                setEditingSection(
                                  editingSection === 'keyPoints' ? null : 'keyPoints',
                                )
                              }
                            >
                              {editingSection === 'keyPoints' ? '닫기' : '수정'}
                            </button>
                          ) : null}
                        </div>
                        {isDraftSummary && editingSection === 'keyPoints' && draft ? (
                          <label className="ai-edit-field">
                            <span>한 줄에 하나씩 입력</span>
                            <textarea
                              value={draft.keyPointsText}
                              onChange={(event) =>
                                setDraft({ ...draft, keyPointsText: event.target.value })
                              }
                            />
                          </label>
                        ) : (
                          <ol className="ai-draft-list">
                            {visibleSummary.keyPoints.length ? (
                              visibleSummary.keyPoints.map((point) => <li key={point}>{point}</li>)
                            ) : (
                              <li>핵심 포인트가 없습니다.</li>
                            )}
                          </ol>
                        )}
                      </section>
                      <div className="ai-draft-grid">
                        <section className="ai-draft-card">
                          <div className="ai-draft-card__header">
                            <h3>키워드</h3>
                            {isDraftSummary ? (
                              <button
                                className="ai-section-action"
                                type="button"
                                onClick={() =>
                                  setEditingSection(
                                    editingSection === 'keywords' ? null : 'keywords',
                                  )
                                }
                              >
                                {editingSection === 'keywords' ? '닫기' : '수정'}
                              </button>
                            ) : null}
                          </div>
                          {isDraftSummary && editingSection === 'keywords' && draft ? (
                            <label className="ai-edit-field">
                              <span>한 줄에 하나씩 입력</span>
                              <textarea
                                value={draft.keywordsText}
                                onChange={(event) =>
                                  setDraft({ ...draft, keywordsText: event.target.value })
                                }
                              />
                            </label>
                          ) : (
                            <div className="ai-chip-list">
                              {visibleSummary.keywords.length ? (
                                visibleSummary.keywords.map((keyword) => (
                                  <span key={keyword}>{keyword}</span>
                                ))
                              ) : (
                                <small>추천 키워드가 없습니다.</small>
                              )}
                            </div>
                          )}
                        </section>
                        <section className="ai-draft-card">
                          <div className="ai-draft-card__header">
                            <h3>태그</h3>
                            {isDraftSummary ? (
                              <button
                                className="ai-section-action"
                                type="button"
                                onClick={() =>
                                  setEditingSection(editingSection === 'tags' ? null : 'tags')
                                }
                              >
                                {editingSection === 'tags' ? '닫기' : '수정'}
                              </button>
                            ) : null}
                          </div>
                          {isDraftSummary && editingSection === 'tags' && draft ? (
                            <label className="ai-edit-field">
                              <span>쉼표로 구분</span>
                              <input
                                value={draft.tagsText}
                                onChange={(event) =>
                                  setDraft({ ...draft, tagsText: event.target.value })
                                }
                              />
                            </label>
                          ) : (
                            <div className="ai-chip-list ai-chip-list--tags">
                              {visibleSummary.tags.length ? (
                                visibleSummary.tags.map((tag) => <span key={tag}>{tag}</span>)
                              ) : (
                                <small>적용할 태그가 없습니다.</small>
                              )}
                            </div>
                          )}
                        </section>
                      </div>
                      {draft?.applicationIdea ? (
                        <div className="application-idea">
                          <strong>적용 아이디어</strong>
                          <p>{draft.applicationIdea}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="ai-chat-thread" aria-live="polite">
                  <div className="ai-chat-message ai-chat-message--assistant">
                    <span>AI</span>
                    <p>
                      이 글에 대해 궁금한 점을 물어보세요. 답변은 현재 원문 안에서 확인할 수 있는
                      내용만 바탕으로 제공합니다.
                    </p>
                  </div>
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
                      className={`ai-chat-message ai-chat-message--${message.role}`}
                    >
                      <span>{message.role === 'user' ? '나' : 'AI'}</span>
                      <p>{message.content}</p>
                    </div>
                  ))}
                  {chat.isPending ? (
                    <div className="ai-thinking" role="status" aria-label="AI가 답변 중입니다.">
                      <div className="ai-thinking-mark" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="ai-thinking-dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  ) : null}
                  {chatError ? (
                    <div className="form-alert" role="alert">
                      {chatError}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {draft && activeAiTab === 'summary' ? (
              <footer className="ai-assistant-footer">
                <button
                  className="button button--text"
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setEditingSection(null);
                    setIsAiPanelOpen(false);
                  }}
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
              </footer>
            ) : null}
            {activeAiTab === 'chat' ? (
              <form className="ai-chat-composer" onSubmit={submitChat}>
                <label>
                  <span>AI에게 질문</span>
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="이 글에 대해 질문해 주세요."
                    rows={1}
                    disabled={chat.isPending || !source.rawText}
                  />
                </label>
                <button
                  type="submit"
                  aria-label="질문 보내기"
                  disabled={chat.isPending || !chatInput.trim() || !source.rawText}
                >
                  ↑
                </button>
              </form>
            ) : null}
          </aside>
        </div>
      ) : null}
      <CommentsPanel sourceId={id} canComment={canComment} />
    </article>
  );
}
