import type {
  AuthUserResponse,
  CommentListResponse,
  SourceDetailResponse,
  SourceFileListResponse,
} from '@sourcewiki/shared';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { SourceDetailView } from '@/features/sources/source-detail-view';
import { sourceKeys } from '@/features/sources/source-api';
import { serverApiFetch } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';

async function loadSource(id: string) {
  try {
    return await Promise.all([
      serverApiFetch<SourceDetailResponse>(`/api/sources/${id}`),
      serverApiFetch<CommentListResponse>(`/api/sources/${id}/comments`),
      serverApiFetch<SourceFileListResponse>(`/api/sources/${id}/files`),
      serverApiFetch<AuthUserResponse>('/api/auth/me').catch((error) => {
        if ((error as { status?: number }).status === 401) return null;
        throw error;
      }),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    throw error;
  }
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [source, comments, files, me] = await loadSource(id);
  const queryClient = new QueryClient();
  queryClient.setQueryData(sourceKeys.detail(id), source);
  queryClient.setQueryData(sourceKeys.comments(id), comments);
  queryClient.setQueryData(sourceKeys.files(id), files);
  queryClient.setQueryData(['auth', 'me'], me?.data ?? null);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SourceDetailView id={id} canComment={Boolean(me)} />
    </HydrationBoundary>
  );
}
