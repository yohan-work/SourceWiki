import type {
  CommentListResponse,
  CommentRequest,
  CommentResponse,
  SourceCreateRequest,
  SourceDetailResponse,
  SourceListResponse,
  SourceUpdateRequest,
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
  detail: (id: string) => apiFetch<SourceDetailResponse>(`/api/sources/${id}`),
  create: (input: SourceCreateRequest) =>
    apiFetch<SourceDetailResponse>('/api/sources', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: SourceUpdateRequest) =>
    apiFetch<SourceDetailResponse>(`/api/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) => apiFetch<void>(`/api/sources/${id}`, { method: 'DELETE' }),
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
