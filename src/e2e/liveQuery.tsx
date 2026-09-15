// dexie-react-hooks 자리에 넣는 구독 훅.
//
// 이력 화면은 useLiveQuery로 IndexedDB를 읽는다. E2E는 IndexedDB 대신 메모리
// 저장소(harness.tsx의 dbModule)를 쓰는데, 진짜 useLiveQuery를 그대로 두었더니
// 이 환경(happy-dom, Date를 멈춘 시계)에서 이력 목록이 화면에 나타나지 않았다.
// 원인을 Dexie 안에서 좇기보다 저장소와 같은 경계에서 구독 훅도 바꾼다.
// 화면을 열 때 한 번 읽는 것만 흉내 낸다 — 삭제 후 목록이 다시 읽히는지는 여기서
// 확인되지 않는다.

import { useEffect, useState } from 'react';

function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: readonly unknown[] = [],
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(querier()).then((result) => {
      if (alive) setValue(result);
    });
    return () => {
      alive = false;
    };
    // 진짜 훅과 같은 모양으로 호출자가 준 의존성만 따른다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

/** vi.mock('dexie-react-hooks')에 넣는 모듈 */
export function liveQueryModule() {
  return { useLiveQuery };
}
