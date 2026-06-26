import type {
  AuthUserResponse,
  SourceListResponse,
  UpdateProfileRequest,
  UserProfileResponse,
} from '@sourcewiki/shared';

import { apiFetch } from '@/lib/api/api-client';

export const userKeys = {
  profile: (id: string) => ['user', id] as const,
  sources: (id: string, page = 1, limit = 6) => ['user', id, 'sources', { page, limit }] as const,
};

export const userApi = {
  profile: (id: string) => apiFetch<UserProfileResponse>(`/api/users/${id}`),
  sources: (id: string, page = 1, limit = 6) =>
    apiFetch<SourceListResponse>(`/api/users/${id}/sources?page=${page}&limit=${limit}`),
  updateMe: (input: UpdateProfileRequest) =>
    apiFetch<AuthUserResponse>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};
