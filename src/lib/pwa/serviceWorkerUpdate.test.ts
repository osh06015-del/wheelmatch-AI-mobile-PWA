// 서비스 워커 업데이트 감지·적용 테스트.
//
// 실제 서비스 워커는 이 환경(happy-dom)에서 돌지 않는다. navigator.serviceWorker를
// 최소한만 흉내 내 "감지→적용→새로고침"의 순서와, 최초 설치를 업데이트로
// 착각하지 않는지를 확인한다.

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** updatefound 이벤트를 흉내 내는 최소 EventTarget. */
class FakeTarget {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  addEventListener(type: string, listener: (...args: unknown[]) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (...args: unknown[]) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(type) ?? []) listener(...args);
  }
}

class FakeWorker extends FakeTarget {
  state: string;
  postMessage = vi.fn();
  constructor(state = 'installing') {
    super();
    this.state = state;
  }
  setState(state: string) {
    this.state = state;
    this.emit('statechange');
  }
}

class FakeRegistration extends FakeTarget {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
}

function installFakeServiceWorker() {
  const registration = new FakeRegistration();
  const container = new FakeTarget() as unknown as ServiceWorkerContainer & {
    controller: unknown;
  };
  Object.assign(container, {
    register: vi.fn().mockResolvedValue(registration),
    controller: null,
  });
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: container });
  return { registration, container };
}

describe('registerAndWatch / useServiceWorkerUpdate', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('최초 설치는 업데이트로 알리지 않는다 — 컨트롤러가 아직 없다', async () => {
    const { registration, container } = installFakeServiceWorker();
    const { registerAndWatch, useServiceWorkerUpdate } =
      await import('./serviceWorkerUpdate');

    registerAndWatch();
    await Promise.resolve();
    await Promise.resolve();

    const worker = new FakeWorker('installing');
    registration.installing = worker;
    registration.emit('updatefound');
    // 최초 설치이므로 컨트롤러가 없다.
    (container as unknown as { controller: unknown }).controller = null;
    worker.setState('installed');

    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.available).toBe(false);
  });

  it('컨트롤러가 있는 상태에서 새 워커가 installed가 되면 업데이트로 알린다', async () => {
    const { registration, container } = installFakeServiceWorker();
    const { registerAndWatch, useServiceWorkerUpdate } =
      await import('./serviceWorkerUpdate');

    registerAndWatch();
    await Promise.resolve();
    await Promise.resolve();

    // 이미 이 페이지를 이전 버전이 컨트롤하고 있다 — 지금 감지되는 것은
    // 최초 설치가 아니라 진짜 업데이트다.
    (container as unknown as { controller: unknown }).controller = {};
    const worker = new FakeWorker('installing');
    registration.installing = worker;
    registration.emit('updatefound');
    worker.setState('installed');

    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.available).toBe(true);
  });

  it('이미 대기 중인 워커가 있으면 등록 직후에도 감지한다', async () => {
    const { registration, container } = installFakeServiceWorker();
    registration.waiting = new FakeWorker('installed');
    (container as unknown as { controller: unknown }).controller = {};

    const { registerAndWatch, useServiceWorkerUpdate } =
      await import('./serviceWorkerUpdate');
    registerAndWatch();
    await Promise.resolve();
    await Promise.resolve();

    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.available).toBe(true);
  });

  it('applyUpdate는 대기 중인 워커에 SKIP_WAITING을 보낸다 — 그 전까지는 아무 메시지도 보내지 않는다', async () => {
    const { registration, container } = installFakeServiceWorker();
    (container as unknown as { controller: unknown }).controller = {};
    const { registerAndWatch, useServiceWorkerUpdate } =
      await import('./serviceWorkerUpdate');
    registerAndWatch();
    await Promise.resolve();
    await Promise.resolve();

    const worker = new FakeWorker('installing');
    registration.installing = worker;
    registration.emit('updatefound');
    worker.setState('installed');

    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(worker.postMessage).not.toHaveBeenCalled();

    result.current.applyUpdate();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('controllerchange가 오면 새로고침한다 — applyUpdate를 부르지 않고는 오지 않는다', async () => {
    const { container } = installFakeServiceWorker();
    (container as unknown as { controller: unknown }).controller = {};
    const { registerAndWatch } = await import('./serviceWorkerUpdate');
    registerAndWatch();
    await Promise.resolve();
    await Promise.resolve();

    expect(reload).not.toHaveBeenCalled();
    (container as unknown as FakeTarget).emit('controllerchange');
    expect(reload).toHaveBeenCalledTimes(1);

    // 두 번째 controllerchange에도 다시 새로고침하지 않는다 — 무한 루프 방지.
    (container as unknown as FakeTarget).emit('controllerchange');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
