'use client';

// 연구·실험 모드 켜짐 여부.
//
// 현장 화면에는 CSV 같은 것이 보이면 안 된다. 작업자가 쓸 화면을 어지럽히지 않으면서
// 실측 데이터를 모으려면 스위치가 하나 필요하다.
//
// 스위치는 두 겹이다. 빌드 설정(researchToolsEnabled)이 켜진 검증 빌드에서만
// 패널이 생기고, 그 안의 스위치(useResearchMode)가 CSV·지표를 펼칠지 정한다.
// 기기에 남은 스위치 값은 빌드 설정을 이기지 못한다.
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

/**
 * 이 빌드에 연구 도구(CSV 내보내기·정답 파일·평가 지표)를 넣었는가.
 *
 * 현장 배포판에서는 꺼져 있어야 한다. 값이 정확히 'true'일 때만 켠다 —
 * 설정이 없거나, 오타이거나, '1'·'TRUE' 같은 다른 표기면 꺼진다. 켜려던
 * 빌드에서 안 나오는 실수는 바로 보이고 해가 없지만, 끄려던 빌드에서 나오는
 * 실수는 그대로 현장에 나간다.
 *
 * NEXT_PUBLIC_ 값은 `next build` 때 번들에 박힌다. 배포한 뒤 환경변수만
 * 바꿔서는 켜지지도 꺼지지도 않는다. 같은 이유로 process.env[이름]처럼
 * 동적으로 읽으면 박히지 않으니 아래처럼 이름을 그대로 적는다.
 */
export function researchToolsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS === 'true';
}
