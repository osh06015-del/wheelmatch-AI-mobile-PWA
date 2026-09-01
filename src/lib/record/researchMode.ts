'use client';

// 연구·실험 모드 켜짐 여부.
//
// 현장 화면에는 CSV 같은 것이 보이면 안 된다. 작업자가 쓸 화면을 어지럽히지 않으면서
// 실측 데이터를 모으려면 스위치가 하나 필요하다.
//
// sessionStorage가 아니라 localStorage에 둔다. 실험은 여러 날에 걸쳐 하는데
// 매번 다시 켜야 하면 켜는 것을 잊어버린다.
//
// 이 값은 판정에 관여하지 않는다. 무엇을 보여줄지만 정한다.

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'wheelmatch.researchMode';

let enabled = read();
const listeners = new Set<() => void>();

function read(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return enabled;
}

/** 서버 렌더에서는 항상 꺼진 것으로 본다. 브라우저 값과 어긋나지 않게 고정한다. */
function getServerSnapshot(): boolean {
  return false;
}

export function useResearchMode(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback((next: boolean) => {
    enabled = next;
    try {
      window.localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      // 저장에 실패해도 이번 세션 동안은 동작한다.
    }
    for (const listener of listeners) listener();
  }, []);

  return [value, set];
}
