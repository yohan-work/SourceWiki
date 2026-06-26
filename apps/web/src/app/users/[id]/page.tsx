import type { SourceListResponse, UserProfileResponse } from '@sourcewiki/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { serverApiFetch } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';

async function loadProfile(id: string) {
  try {
    return await Promise.all([
      serverApiFetch<UserProfileResponse>(`/api/users/${id}`),
      serverApiFetch<SourceListResponse>(`/api/users/${id}/sources?page=1&limit=6`),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    throw error;
  }
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profileResponse, sourcesResponse] = await loadProfile(id);
  const profile = profileResponse.data;
  const sources = sourcesResponse.data;

  return (
    <main className="user-profile-page page-shell">
      <header className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {profile.nickname.slice(0, 1)}
        </div>
        <div>
          <p className="kicker">PUBLIC PROFILE</p>
          <h1>{profile.nickname}</h1>
          <p>{profile.bio ?? '아직 소개가 없습니다.'}</p>
          <span>
            {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(
              new Date(profile.createdAt),
            )}
            부터 기록 중
          </span>
        </div>
      </header>

      <section className="profile-stats" aria-label="사용자 활동 통계">
        <div>
          <strong>{profile.stats.sourceCount}</strong>
          <span>작성 자료</span>
        </div>
        <div>
          <strong>{profile.stats.commentCount}</strong>
          <span>댓글</span>
        </div>
        <div>
          <strong>{profile.stats.receivedLikeCount}</strong>
          <span>받은 좋아요</span>
        </div>
      </section>

      <section className="profile-sources" aria-labelledby="profile-sources-title">
        <div className="section-heading-row">
          <div>
            <p className="kicker">RECENT SOURCES</p>
            <h2 id="profile-sources-title">최근 작성 자료</h2>
          </div>
          <span>{sourcesResponse.pagination.totalItems}개</span>
        </div>
        {sources.length ? (
          <div className="profile-source-list">
            {sources.map((source) => (
              <Link key={source.id} href={`/sources/${source.id}`}>
                <span>{source.sourceDomain}</span>
                <strong>{source.title}</strong>
                <small>
                  댓글 {source.commentCount} · 좋아요 {source.likeCount}
                </small>
              </Link>
            ))}
          </div>
        ) : (
          <p className="signin-note">아직 작성한 자료가 없습니다.</p>
        )}
      </section>
    </main>
  );
}
