import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { resolveSiteUrl } from '@/lib/siteUrl';

const TITLE = 'WheelMatch AI — 그라인더·숫돌 규격 대조';
const DESCRIPTION =
  '그라인더 명판과 숫돌 라벨을 촬영하면 장착 가능 여부를 적합·부적합·판정불가로 알려줍니다.';

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  // 카카오톡 등 메신저 카드는 절대 URL이 필요하다.
  // 이 값이 없으면 og:image가 상대 경로로 나가서 카드가 깨진다.
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
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
    ...(siteUrl ? { url: siteUrl.toString() } : {}),
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
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
