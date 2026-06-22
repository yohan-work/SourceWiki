import Link from 'next/link';
import { ResendButton } from '@/features/auth/resend-button';

export default async function PendingVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = '' } = await searchParams;
  return (
    <section className="result-page">
      <div className="verify-result">
        <span className="mail-symbol" aria-hidden="true">
          @
        </span>
        <p className="auth-eyebrow">CHECK YOUR INBOX</p>
        <h1>메일함을 확인해 주세요.</h1>
        <p>
          <strong>{email || '가입한 이메일'}</strong>로 30분 동안 유효한 인증 링크를 보냈습니다.
        </p>
        {email ? <ResendButton email={email} /> : null}
        <Link className="text-link" href="/signup">
          이메일 주소 다시 입력하기
        </Link>
      </div>
    </section>
  );
}
