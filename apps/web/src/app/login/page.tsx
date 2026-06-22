import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <section className="auth-page auth-page--login">
      <div className="auth-card">
        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>
          다시,
          <br />
          정리하던 곳으로.
        </h1>
        <p className="auth-intro">저장한 자료와 생각을 이어서 정리하세요.</p>
        <LoginForm returnTo={returnTo} />
        <p className="auth-switch">
          아직 계정이 없나요? <Link href="/signup">가입하기</Link>
        </p>
      </div>
      <aside className="auth-quote">
        <blockquote>
          “좋은 아카이브는 더 많이 모으는 곳이 아니라, 다시 이해할 수 있게 남기는 곳입니다.”
        </blockquote>
        <span>SourceLink Wiki</span>
      </aside>
    </section>
  );
}
