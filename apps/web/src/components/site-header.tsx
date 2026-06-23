import Link from 'next/link';
import { AuthActions } from '@/features/auth/auth-actions';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="SourceLink Wiki 홈">
        <span className="wordmark__mark" aria-hidden="true">
          S
        </span>
        <span>SourceLink Wiki</span>
      </Link>

      <nav className="site-nav" aria-label="주요 메뉴">
        <Link href="/sources">자료 목록</Link>
        <Link href="/sources/new">자료 등록</Link>
        <AuthActions />
      </nav>
    </header>
  );
}
