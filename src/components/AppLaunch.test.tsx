import { StrictMode, type ComponentType, type ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const environment = vi.hoisted(() => ({
  pathname: '/',
  load: vi.fn<() => Promise<{ status: 'none' | 'found' | 'error' }>>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => environment.pathname,
}));
vi.mock('@/lib/draft/draftStore', () => ({
  draftStore: { load: environment.load },
}));

describe('앱 시작 모션과 기존 화면 접근', () => {
  let AppLaunch: ComponentType<{ children: ReactNode }>;
  let reduced = false;
  let preferenceChanged: (() => void) | undefined;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    window.sessionStorage.clear();
    environment.pathname = '/';
    environment.load.mockReset().mockResolvedValue({ status: 'none' });
    reduced = false;
    preferenceChanged = undefined;
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_event: string, listener: () => void) => {
        preferenceChanged = listener;
      },
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
    ({ AppLaunch } = await import('./AppLaunch'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function settle() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  function content() {
    return (
      <AppLaunch>
        <button>작업 선택</button>
      </AppLaunch>
    );
  }

  it('첫 진입은 Strict Mode에서도 1.8초 재생하고 기존 화면의 입력 잠금을 푼다', async () => {
    const { container } = render(<StrictMode>{content()}</StrictMode>);
    await settle();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업 선택' })).toBeNull();
    expect(container.querySelector('[inert]')).not.toBeNull();
    expect(environment.load).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1799));
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
    expect(
      screen.getByRole('button', { name: '작업 선택' }),
    ).toBeInTheDocument();
  });

  it('이력으로 이동하고 뒤로 돌아와도 시작 모션을 다시 재생하지 않는다', async () => {
    const { rerender } = render(content());
    await settle();
    environment.pathname = '/history';
    rerender(content());
    await settle();
    environment.pathname = '/';
    rerender(content());
    await settle();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it.each(['/scan/grinder', '/scan/wheel', '/result', '/history'])(
    '%s 직접 진입은 모션이나 추가 draft 조회 없이 바로 열린다',
    async (pathname) => {
      environment.pathname = pathname;
      render(content());
      await settle();
      expect(screen.queryByRole('status')).toBeNull();
      expect(environment.load).not.toHaveBeenCalled();
      expect(screen.getByRole('button')).toBeInTheDocument();
    },
  );

  it('저장된 점검이 있으면 복구창을 가리지 않고 기존 화면을 바로 연다', async () => {
    environment.load.mockResolvedValue({ status: 'found' });
    render(content());
    await settle();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('draft 조회가 끝나지 않아도 400ms 후 기존 화면을 열고 늦은 응답으로 재생하지 않는다', async () => {
    let finish: ((result: { status: 'none' }) => void) | undefined;
    environment.load.mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    render(content());
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button')).toBeInTheDocument();
    await act(async () => finish?.({ status: 'none' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('draft 조회 실패는 앱 진입을 막지 않는다', async () => {
    environment.load.mockRejectedValue(new Error('DB unavailable'));
    render(content());
    await settle();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('모션 감소 설정에서는 재생하지 않고, 재생 중 설정을 바꾸면 즉시 끝낸다', async () => {
    reduced = true;
    const { unmount } = render(content());
    await settle();
    expect(screen.queryByRole('status')).toBeNull();
    expect(environment.load).not.toHaveBeenCalled();
    unmount();

    vi.resetModules();
    ({ AppLaunch } = await import('./AppLaunch'));
    reduced = false;
    render(content());
    await settle();
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      reduced = true;
      preferenceChanged?.();
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['navigate', 'reload'] as const)(
    '%s로 문서를 새로 열면 이전 세션 표시가 있어도 시작 모션을 재생한다',
    async (type) => {
      window.sessionStorage.setItem('wheelmatch.launch.seen', '1');
      vi.mocked(performance.getEntriesByType).mockReturnValue([
        { type } as PerformanceNavigationTiming,
      ]);
      render(content());
      await settle();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(environment.load).toHaveBeenCalledTimes(1);
    },
  );

  it('브라우저 뒤로가기로 문서를 복원하면 시작 모션을 재생하지 않는다', async () => {
    vi.mocked(performance.getEntriesByType).mockReturnValue([
      { type: 'back_forward' } as PerformanceNavigationTiming,
    ]);
    render(content());
    await settle();
    expect(screen.queryByRole('status')).toBeNull();
    expect(environment.load).not.toHaveBeenCalled();
  });

  it('문서를 다시 시작하면 재생하되 같은 문서의 재마운트에서는 반복하지 않는다', async () => {
    const first = render(content());
    await settle();
    await act(() => vi.advanceTimersByTimeAsync(1800));
    first.unmount();
    const second = render(content());
    await settle();
    expect(screen.queryByRole('status')).toBeNull();
    second.unmount();

    vi.resetModules();
    ({ AppLaunch } = await import('./AppLaunch'));
    render(content());
    await settle();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
