import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="SourceLink Wiki 홈">
        <span className="wordmark__mark" aria-hidden="true">
          S/
        </span>
        <span>
          SourceLink
          <small>Wiki</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="주요 메뉴">
        <a href="#foundation">소개</a>
        <a href="#system-status">상태</a>
        <span className="site-nav__edition">FOUNDATION EDITION</span>
      </nav>
    </header>
  );
}
