'use client';

// 브라우저가 네트워크에 연결돼 있다고 보는가.
//
// navigator.onLine은 "연결이 없다"만 믿을 수 있다 — true여도 서버에 닿는다는
// 보장은 없다. 그래서 이 값은 재분석 버튼을 **보여줄지**만 정하고, 실제 성공
// 여부는 요청 결과로 판단한다.

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // 서버 렌더에서는 알 수 없다. 모르면 재분석을 권하지 않는다.
    () => false,
  );
}
