import type { SourceListResponse } from '@sourcewiki/shared';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { SourceList } from '@/features/sources/source-list';
import { sourceKeys } from '@/features/sources/source-api';
import { serverApiFetch } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const data = await serverApiFetch<SourceListResponse>(`/api/sources?page=${page}&limit=12`);
  const queryClient = new QueryClient();
  queryClient.setQueryData(sourceKeys.list(page), data);
  return (
    <div className="sources-page page-shell">
      <header className="page-heading">
        <div>
          <p className="kicker">PUBLIC KNOWLEDGE INDEX</p>
          <h1>
            읽을수록 연결되는
            <br />
            기술 아카이브
          </h1>
          <span>{data.pagination.totalItems}개의 자료가 축적되어 있습니다.</span>
        </div>
        <Link className="button button--primary" href="/sources/new">
          새 자료 기록
        </Link>
      </header>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SourceList page={page} />
      </HydrationBoundary>
    </div>
  );
}
