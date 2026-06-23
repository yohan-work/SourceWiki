'use client';

import { commentRequestSchema, type SourceComment } from '@sourcewiki/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useMeQuery } from '@/features/auth/use-me-query';
import { ApiError } from '@/lib/api/api-client';
import { sourceApi, sourceKeys } from '@/features/sources/source-api';

function CommentItem({ comment, sourceId }: { comment: SourceComment; sourceId: string }) {
  const queryClient = useQueryClient();
  const { data: me } = useMeQuery();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const owner = me?.id === comment.author.id;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sourceKeys.comments(sourceId) }),
      queryClient.invalidateQueries({ queryKey: sourceKeys.detail(sourceId) }),
      queryClient.invalidateQueries({ queryKey: sourceKeys.lists }),
    ]);
  };
  const update = useMutation({
    mutationFn: () => sourceApi.updateComment(comment.id, { content }),
    onSuccess: async () => {
      setEditing(false);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => sourceApi.removeComment(comment.id),
    onSuccess: refresh,
  });
  return (
    <article className="comment-item">
      <header>
        <strong>{comment.author.nickname}</strong>
        <span>
          {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(comment.createdAt),
          )}
          {comment.createdAt !== comment.updatedAt ? ' · 수정됨' : ''}
        </span>
      </header>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (commentRequestSchema.safeParse({ content }).success) update.mutate();
          }}
        >
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
          />
          <div className="inline-actions">
            <button type="button" onClick={() => setEditing(false)}>
              취소
            </button>
            <button disabled={update.isPending}>저장</button>
          </div>
        </form>
      ) : (
        <p>{comment.content}</p>
      )}
      {owner && !editing ? (
        <div className="comment-actions">
          <button onClick={() => setEditing(true)}>수정</button>
          <button
            onClick={() => {
              if (window.confirm('이 댓글을 삭제할까요?')) remove.mutate();
            }}
          >
            삭제
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function CommentsPanel({ sourceId }: { sourceId: string }) {
  const queryClient = useQueryClient();
  const { data: me } = useMeQuery();
  const { data } = useQuery({
    queryKey: sourceKeys.comments(sourceId),
    queryFn: () => sourceApi.comments(sourceId),
    staleTime: 15_000,
  });
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const create = useMutation({
    mutationFn: () => sourceApi.createComment(sourceId, { content }),
    onSuccess: async () => {
      setContent('');
      setError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceKeys.comments(sourceId) }),
        queryClient.invalidateQueries({ queryKey: sourceKeys.detail(sourceId) }),
        queryClient.invalidateQueries({ queryKey: sourceKeys.lists }),
      ]);
    },
    onError: (value) =>
      setError(value instanceof ApiError ? value.message : '댓글을 저장하지 못했습니다.'),
  });
  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <div className="section-title">
        <p className="kicker">DISCUSSION</p>
        <h2 id="comments-title">댓글 {data?.data.length ?? 0}</h2>
      </div>
      {me ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = commentRequestSchema.safeParse({ content });
            if (!parsed.success)
              setError(parsed.error.issues[0]?.message ?? '댓글을 확인해 주세요.');
            else create.mutate();
          }}
        >
          <label htmlFor="new-comment">생각을 덧붙여 주세요</label>
          <textarea
            id="new-comment"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            placeholder="자료에서 발견한 맥락이나 질문을 남겨보세요."
          />
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button--primary" disabled={create.isPending}>
            {create.isPending ? '등록 중…' : '댓글 등록'}
          </button>
        </form>
      ) : (
        <p className="signin-note">댓글을 남기려면 로그인해 주세요.</p>
      )}
      <div className="comment-list">
        {data?.data.map((comment) => (
          <CommentItem key={comment.id} comment={comment} sourceId={sourceId} />
        ))}
      </div>
    </section>
  );
}
