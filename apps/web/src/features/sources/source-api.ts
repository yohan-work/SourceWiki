import type {
  CommentListResponse,
  CommentRequest,
  CommentResponse,
  ExtractUrlRequest,
  ExtractUrlResponse,
  SourceCreateRequest,
  SourceDetailResponse,
  SourceGraphResponse,
  SourceListResponse,
  SourceUpdateRequest,
  SummarizeSourceResponse,
} from '@sourcewiki/shared';

import { apiFetch } from '@/lib/api/api-client';

export const sourceKeys = {
  lists: ['sources'] as const,
  list: (page: number, limit = 12) => ['sources', { page, limit }] as const,
  detail: (id: string) => ['source', id] as const,
  comments: (id: string) => ['comments', id] as const,
};

export const sourceApi = {
  list: (page: number, limit = 12) =>
    apiFetch<SourceListResponse>(`/api/sources?page=${page}&limit=${limit}`),
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
  summarize: (id: string) =>
    apiFetch<SummarizeSourceResponse>(
      `/api/sources/${id}/summarize`,
      { method: 'POST' },
      { timeoutMs: 190_000 },
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
};
