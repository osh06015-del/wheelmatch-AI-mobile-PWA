'use client';

// 서비스 워커 업데이트 감지·적용.
//
// sw.js는 install에서 self.skipWaiting()을 부르지 않는다(public/sw.js 참고).
// 그래서 새 버전이 설치돼도 곧바로 화면을 가로채지 않고 "대기(waiting)" 상태로
// 멈춰 있는다. 이 모듈이 그 대기 상태를 감지해 저장소에 알리고, 사용자가
// 실제로 업데이트를 누른 순간에만 대기 중인 워커에 skipWaiting을 지시한다.
//
// 왜 자동으로 넘기지 않는가: 점검 중에 서비스 워커가 조용히 갈아끼워지면
// 다음 네트워크 요청부터 다른 버전의 코드가 응답한다. 시험운전처럼 실제로
// 기계가 도는 순간에 화면이 예고 없이 바뀌는 것은 안전 문제로 이어진다.
// 그래서 "감지"와 "적용"을 분리하고, 적용은 항상 사용자의 명시적 클릭으로만 한다.

import { useCallback, useSyncExternalStore } from 'react';

interface UpdateState {
  /** 대기 중인 새 버전이 있는가 */
  available: boolean;
  /** 사용자가 업데이트를 눌러 재적재를 기다리는 중인가 */
  applying: boolean;
}

/**
 * 서버 렌더용 고정 스냅샷. 항상 같은 참조를 돌려줘야 한다.
 *
 * 매번 새 객체를 만들어 돌려주면 useSyncExternalStore가 "매 렌더마다 스냅샷이
 * 달라진다"고 보고 무한 루프로 여긴다 — 실제로 콘솔에 그 경고가 떴다.
 */
const SERVER_SNAPSHOT: UpdateState = { available: false, applying: false };

let state: UpdateState = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let waitingWorker: ServiceWorker | null = null;
let registered = false;

function setState(next: Partial<UpdateState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): UpdateState {
  return state;
}

function getServerSnapshot(): UpdateState {
  return SERVER_SNAPSHOT;
}

/**
 * 대기 중인 워커를 기록하고 감지 상태를 켠다.
 *
 * 처음 설치(이전 컨트롤러가 없음)는 업데이트가 아니라 최초 설치이므로
 * 알리지 않는다 — 방금 연 앱을 두고 "업데이트가 있습니다"라고 하면 혼란만 준다.
 */
function markWaiting(worker: ServiceWorker): void {
  waitingWorker = worker;
  setState({ available: true });
}

/**
 * 서비스 워커를 등록하고 업데이트를 지켜본다.
 *
 * ServiceWorkerRegister가 마운트 시 한 번만 부른다. 등록 자체는 여기서 하고,
 * 화면에 무엇을 보여줄지는 이 모듈을 구독하는 컴포넌트(AppUpdateNotice)가 정한다.
 */
export function registerAndWatch(): void {
  if (registered) return;
  registered = true;

  const handleRegistration = (registration: ServiceWorkerRegistration) => {
    // 등록 직후 이미 대기 중인 워커가 있는 경우(이 탭을 열기 전에 새 버전이
    // 설치돼 있었던 경우)도 놓치지 않는다.
    if (registration.waiting && navigator.serviceWorker.controller) {
      markWaiting(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // 컨트롤러가 이미 있다는 것은 이번이 최초 설치가 아니라는 뜻이다.
        if (
          installing.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          markWaiting(installing);
        }
      });
    });
  };

  navigator.serviceWorker
    .register('/sw.js')
    .then(handleRegistration)
    .catch(() => {
      // 등록 실패해도 앱은 온라인에서 정상 동작한다.
    });

  // 새 워커가 활성화되면(사용자가 업데이트를 눌러 skipWaiting을 보낸 뒤)
  // 컨트롤러가 바뀐다. 그 시점에만 새로고침한다 — 사용자의 클릭이 이미
  // 원인이므로 여기서 다시 사용자에게 묻지 않는다.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

/**
 * 대기 중인 워커에 적용을 지시한다.
 *
 * 호출자(AppUpdateNotice)가 점검·시험운전 중이 아닌지 먼저 확인한 뒤에만 불러야
 * 한다. 이 함수 자체는 그 판단을 하지 않는다 — 판단은 화면 쪽 상태(useInspection)를
 * 알아야 하는데, 이 모듈은 서비스 워커만 다루는 순수한 경계로 남기기 위해서다.
 */
function applyUpdate(): void {
  if (!waitingWorker) return;
  setState({ applying: true });
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function useServiceWorkerUpdate(): UpdateState & {
  applyUpdate: () => void;
} {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const apply = useCallback(() => applyUpdate(), []);
  return { ...snapshot, applyUpdate: apply };
}
