'use client';

// 서비스 워커 등록. 프로덕션 빌드에서만 등록해 개발 중 캐시 혼선을 막는다.
//
// 등록과 업데이트 감지 자체는 lib/pwa/serviceWorkerUpdate.ts가 한다. 이 컴포넌트는
// 그 등록을 언제 시작할지(마운트 시 한 번)만 맡고 화면은 그리지 않는다. 업데이트
// 안내 UI는 AppUpdateNotice가 별도로 그린다 — 등록/감지와 "언제 보여줄지·언제
// 적용해도 되는지"를 섞지 않기 위해서다.

import { useEffect } from 'react';

import { registerAndWatch } from '@/lib/pwa/serviceWorkerUpdate';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const start = () => registerAndWatch();

    if (document.readyState === 'complete') {
      start();
    } else {
      window.addEventListener('load', start, { once: true });
      return () => window.removeEventListener('load', start);
    }
  }, []);

  return null;
}
