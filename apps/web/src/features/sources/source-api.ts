import type {
  CommentListResponse,
  CommentRequest,
  CommentResponse,
  ExtractUrlRequest,
  ExtractUrlResponse,
  SourceCreateRequest,
  SourceChatRequest,
  SourceChatResponse,
  SourceDetailResponse,
  SourceFileListResponse,
  SourceFileResponse,
  SourceGraphResponse,
  SourceLikeResponse,
  SourceListQuery,
  SourceListResponse,
  SourceQuestionSuggestionsResponse,
  SourceUpdateRequest,
  SummarizeSourceResponse,
} from '@sourcewiki/shared';

import { apiFetch } from '@/lib/api/api-client';

const SUMMARY_TIMEOUT_MS = 390_000;
export type SourceListOptions = Pick<SourceListQuery, 'page' | 'limit' | 'q' | 'tag' | 'type'>;

export function sourceListPath(input: SourceListOptions) {
  const params = new URLSearchParams({
    page: String(input.page),
    limit: String(input.limit),
  });
  if (input.q) params.set('q', input.q);
  if (input.tag) params.set('tag', input.tag);
  if (input.type) params.set('type', input.type);
  return `/api/sources?${params.toString()}`;
}

export const sourceKeys = {
  lists: ['sources'] as const,
  list: (input: SourceListOptions) => ['sources', input] as const,
  detail: (id: string) => ['source', id] as const,
  comments: (id: string) => ['comments', id] as const,
  files: (id: string) => ['source', id, 'files'] as const,
};

export const sourceApi = {
  list: (input: SourceListOptions) => apiFetch<SourceListResponse>(sourceListPath(input)),
  graph: () => apiFetch<SourceGraphResponse>('/api/sources/graph'),
  detail: (id: string) => apiFetch<SourceDetailResponse>(`/api/sources/${id}`),
  create: (input: SourceCreateRequest) =>
    apiFetch<SourceDetailResponse>('/api/sources', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: SourceUpdateRequest) =>
    apiFetch<SourceDetailResponse>(`/api/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) => apiFetch<void>(`/api/sources/${id}`, { method: 'DELETE' }),
  like: (id: string) => apiFetch<SourceLikeResponse>(`/api/sources/${id}/like`, { method: 'POST' }),
  unlike: (id: string) =>
    apiFetch<SourceLikeResponse>(`/api/sources/${id}/like`, { method: 'DELETE' }),
  summarize: (id: string) =>
    apiFetch<SummarizeSourceResponse>(
      `/ai-proxy/sources/${id}/summarize`,
      { method: 'POST' },
      { timeoutMs: SUMMARY_TIMEOUT_MS },
    ),
  chat: (id: string, input: SourceChatRequest) =>
    apiFetch<SourceChatResponse>(
      `/ai-proxy/sources/${id}/chat`,
      { method: 'POST', body: JSON.stringify(input) },
      { timeoutMs: SUMMARY_TIMEOUT_MS },
    ),
  suggestQuestions: (id: string) =>
    apiFetch<SourceQuestionSuggestionsResponse>(
      `/ai-proxy/sources/${id}/suggestions`,
      { method: 'POST' },
      { timeoutMs: SUMMARY_TIMEOUT_MS },
    ),
  extractUrl: (input: ExtractUrlRequest) =>
    apiFetch<ExtractUrlResponse>(
      '/api/tools/extract-url',
      { method: 'POST', body: JSON.stringify(input) },
      { timeoutMs: 15_000 },
    ),
  comments: (id: string) => apiFetch<CommentListResponse>(`/api/sources/${id}/comments`),
  createComment: (id: string, input: CommentRequest) =>
    apiFetch<CommentResponse>(`/api/sources/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateComment: (id: string, input: CommentRequest) =>
    apiFetch<CommentResponse>(`/api/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removeComment: (id: string) => apiFetch<void>(`/api/comments/${id}`, { method: 'DELETE' }),
  files: (id: string) => apiFetch<SourceFileListResponse>(`/api/sources/${id}/files`),
  uploadFile: (id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiFetch<SourceFileResponse>(`/api/sources/${id}/files`, { method: 'POST', body });
  },
  removeFile: (id: string) => apiFetch<void>(`/api/files/${id}`, { method: 'DELETE' }),
  fileDownloadUrl: (id: string) => `/api/files/${id}/download`,
};
