import type { Metadata } from 'next';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { QueryProvider } from '@/lib/query/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'SourceLink Wiki — 연결해서 기억하는 기술 아카이브',
  description: 'AI 기술 자료의 출처와 맥락을 함께 쌓는 공개 지식 아카이브',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </QueryProvider>
      </body>
    </html>
  );
}
