'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/api-client';
import { authApi } from './auth-api';

export function useMeQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return (await authApi.me()).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1_000,
  });
}
