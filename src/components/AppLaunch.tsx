'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { draftStore } from '@/lib/draft/draftStore';
import { useLocale } from '@/lib/i18n';
import { LaunchArtwork } from './LaunchArtwork';
import styles from './AppLaunch.module.css';

export const LAUNCH_DURATION_MS = 1800;
const DRAFT_CHECK_LIMIT_MS = 400;

// 같은 문서의 화면 이동만 재생을 막는다. 새 접속·새로고침은 새 문서라 다시 재생한다.
let consumedInDocument = false;

async function shouldPlay(pathname: string | null): Promise<boolean> {
  if (consumedInDocument || pathname !== '/') return false;
  consumedInDocument = true;

  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'back_forward') {
    return false;
  }

  // 복구 창을 시작 연출로 가리지 않는다. DB가 응답하지 않아도 화면은 열어 준다.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const noDraft = await Promise.race([
      draftStore.load().then((result) => result.status === 'none'),
      new Promise<false>((resolve) => {
        timeout = setTimeout(() => resolve(false), DRAFT_CHECK_LIMIT_MS);
      }),
    ]);
    if (!noDraft) return false;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function AppLaunch({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [phase, setPhase] = useState<'checking' | 'playing' | 'done'>(
    'checking',
  );
  const decision = useRef<Promise<boolean> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Strict Mode의 effect 재실행에서도 같은 시작 판단을 이어 받는다.
    decision.current ??= shouldPlay(pathname);
    void decision.current.then((play) => {
      if (cancelled) return;
      if (play && pathname === '/' && !started.current) {
        started.current = true;
        setPhase('playing');
      } else {
        setPhase('done');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (phase !== 'playing') return;
    // 요청한 V3 원본 연출을 유지하되 완료 이벤트가 없어도 반드시 홈을 연다.
    const timer = window.setTimeout(() => setPhase('done'), LAUNCH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const visible = pathname === '/' && phase !== 'done';

  return (
    <>
      <div
        className={styles.content}
        inert={visible}
        aria-hidden={visible ? true : undefined}
      >
        {children}
      </div>
      {visible && (
        <div
          className={styles.overlay}
          data-phase={phase}
          data-motion="animated"
          role="status"
          aria-label={t('home.title')}
        >
          <LaunchArtwork
            title={t('home.title')}
            subtitle={t('splash.subtitle')}
          />
        </div>
      )}
    </>
  );
}
