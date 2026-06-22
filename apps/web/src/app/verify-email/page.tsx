import { VerifyEmailResult } from '@/features/auth/verify-email-result';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <section className="result-page">
      <VerifyEmailResult token={token} />
    </section>
  );
}
