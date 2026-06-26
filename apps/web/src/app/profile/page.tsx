import { ProfileForm } from '@/features/users/profile-form';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return (
    <main className="profile-edit-page page-shell">
      <header className="page-heading">
        <div>
          <p className="kicker">MY PROFILE</p>
          <h1>프로필 편집</h1>
          <span>공개 프로필에 표시될 닉네임과 소개를 관리합니다.</span>
        </div>
      </header>
      <ProfileForm />
    </main>
  );
}
