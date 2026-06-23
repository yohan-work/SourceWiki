import type { CommentListResponse, SourceDetailResponse } from '@sourcewiki/shared';
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
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    throw error;
  }
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [source, comments] = await loadSource(id);
  const queryClient = new QueryClient();
  queryClient.setQueryData(sourceKeys.detail(id), source);
  queryClient.setQueryData(sourceKeys.comments(id), comments);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SourceDetailView id={id} />
    </HydrationBoundary>
  );
}
