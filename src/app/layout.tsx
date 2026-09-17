import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppUpdateNotice } from '@/components/AppUpdateNotice';
import { DocumentLocale } from '@/components/DocumentLocale';
import { DraftRecovery } from '@/components/DraftRecovery';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ValidationBuildBanner } from '@/components/ValidationBuildBanner';
import { resolveSiteUrl } from '@/lib/siteUrl';

const TITLE = 'WheelMatch AI — 그라인더·숫돌 규격 대조';
const DESCRIPTION =
  '그라인더 명판과 숫돌 라벨을 촬영하면 장착 가능 여부를 적합·부적합·판정불가로 알려줍니다.';

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  // 카카오톡 등 메신저 카드는 절대 URL이 필요하다.
  // resolveSiteUrl()은 항상 값을 돌려준다(로컬·CI 빌드도 안전한 기본값으로 채운다) —
  // 이 값이 없으면 og:image가 상대 경로로 나가서 카드가 깨진다.
  metadataBase: siteUrl,
  title: TITLE,
  description: DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WheelMatch',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'WheelMatch AI',
    title: TITLE,
    description: DESCRIPTION,
    url: siteUrl.toString(),
    // 이미지는 app/opengraph-image.tsx가 빌드 시점에 만든다.
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-900 text-slate-100">
        {/* 검증 빌드에서만 그린다. 모든 화면 맨 위에 고정으로 둔다 — 어느 화면을
            보고 있어도 현장 배포판이 아니라는 것을 놓치지 않게 한다. */}
        <ValidationBuildBanner />
        {/* 현장판·검증판 모두에서 그린다. 새 버전이 없으면 아무것도 렌더하지 않는다. */}
        <AppUpdateNotice />
        {/* 새로 불러온 페이지에서 진행 중이던 점검을 찾으면 이어하기·삭제를 묻는다.
            묻기 전에는 자동으로 이어가거나 지우지 않는다. */}
        <DraftRecovery />
        {children}
        {/* 서버는 한국어로 그린다. 고른 언어로 문서 언어와 탭 제목을 바꾼다. */}
        <DocumentLocale />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
