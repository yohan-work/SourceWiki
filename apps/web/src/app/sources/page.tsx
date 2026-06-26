import type { AuthUserResponse, SourceListResponse, SourceType } from '@sourcewiki/shared';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { SourceList } from '@/features/sources/source-list';
import { sourceKeys, sourceListPath } from '@/features/sources/source-api';
import { serverApiFetch } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';

const SOURCE_TYPES = ['article', 'docs', 'paper', 'github', 'other'] as const;

function parseOptionalParam(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseSourceType(value: string | undefined): SourceType | undefined {
  return SOURCE_TYPES.find((type) => type === value);
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tag?: string; type?: string }>;
}) {
  const params = await searchParams;
  const listQuery = {
    page: Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1),
    limit: 12,
    q: parseOptionalParam(params.q),
    tag: parseOptionalParam(params.tag),
    type: parseSourceType(params.type),
  };
  const [data, me] = await Promise.all([
    serverApiFetch<SourceListResponse>(sourceListPath(listQuery)),
    serverApiFetch<AuthUserResponse>('/api/auth/me').catch((error) => {
      if ((error as { status?: number }).status === 401) return null;
      throw error;
    }),
  ]);
  const queryClient = new QueryClient();
  queryClient.setQueryData(sourceKeys.list(listQuery), data);
  queryClient.setQueryData(['auth', 'me'], me?.data ?? null);
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
        <SourceList filters={listQuery} />
      </HydrationBoundary>
    </div>
  );
}
