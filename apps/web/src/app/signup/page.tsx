import Link from 'next/link';
import { SignupForm } from '@/features/auth/signup-form';

export default function SignupPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">JOIN THE ARCHIVE</p>
        <h1>
          읽은 것을
          <br />내 지식으로 남기세요.
        </h1>
        <p className="auth-intro">
          가입 후 이메일 인증을 완료하면 기술 자료와 메모를 안전하게 쌓을 수 있습니다.
        </p>
        <SignupForm />
        <p className="auth-switch">
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </p>
      </div>
      <aside className="auth-note">
        <span>01</span>
        <p>링크를 저장하고</p>
        <span>02</span>
        <p>직접 맥락을 더하고</p>
        <span>03</span>
        <p>다시 찾을 지식으로 만드세요.</p>
      </aside>
    </section>
  );
}
