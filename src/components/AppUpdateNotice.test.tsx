// 업데이트 안내 배너 테스트.
//
// 핵심은 "언제 잠그는가"다. 점검이 진행 중이거나 시험운전이 돌고 있으면
// 적용 버튼을 절대 누를 수 없어야 한다 — 실제로 기계가 도는 중에 화면이
// 예고 없이 바뀌면 안전 문제로 이어진다.

import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useServiceWorkerUpdate, applyUpdate } = vi.hoisted(() => ({
  useServiceWorkerUpdate: vi.fn(),
  applyUpdate: vi.fn(),
}));

vi.mock('@/lib/pwa/serviceWorkerUpdate', () => ({ useServiceWorkerUpdate }));

import { AppUpdateNotice } from './AppUpdateNotice';
import { useInspection } from '@/lib/state/inspection';
import type { GrinderSpec } from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

function store() {
  return renderHook(() => useInspection()).result;
}

describe('AppUpdateNotice', () => {
  beforeEach(() => {
    applyUpdate.mockClear();
    const result = store();
    act(() => result.current.reset());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('업데이트가 없으면 아무것도 그리지 않는다', () => {
    useServiceWorkerUpdate.mockReturnValue({
      available: false,
      applying: false,
      applyUpdate,
    });
    const { container } = render(<AppUpdateNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('점검 중이 아니면 적용 버튼을 누를 수 있다', () => {
    useServiceWorkerUpdate.mockReturnValue({
      available: true,
      applying: false,
      applyUpdate,
    });
    render(<AppUpdateNotice />);

    const button = screen.getByRole('button', { name: /지금 업데이트/ });
    expect(button).toBeEnabled();
    button.click();
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('점검이 진행 중이면(작업을 골랐지만 아직 안 끝남) 버튼 대신 안내만 보인다', () => {
    useServiceWorkerUpdate.mockReturnValue({
      available: true,
      applying: false,
      applyUpdate,
    });
    const result = store();
    act(() => result.current.setPurpose('cutting'));

    render(<AppUpdateNotice />);

    expect(
      screen.queryByRole('button', { name: /지금 업데이트/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('점검을 마치면 업데이트할 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('시험운전이 도는 중이면 작업 선택 여부와 무관하게 잠근다', () => {
    useServiceWorkerUpdate.mockReturnValue({
      available: true,
      applying: false,
      applyUpdate,
    });
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setTrialRun({
        wheelReplaced: false,
        requiredSeconds: 60,
        startedAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
      });
    });

    render(<AppUpdateNotice />);

    expect(
      screen.queryByRole('button', { name: /지금 업데이트/ }),
    ).not.toBeInTheDocument();
  });

  it('저장을 마쳐 상태가 초기화되면 다시 버튼이 열린다', () => {
    useServiceWorkerUpdate.mockReturnValue({
      available: true,
      applying: false,
      applyUpdate,
    });
    const result = store();
    act(() => result.current.setPurpose('cutting'));
    const { rerender } = render(<AppUpdateNotice />);
    expect(
      screen.queryByRole('button', { name: /지금 업데이트/ }),
    ).not.toBeInTheDocument();

    act(() => result.current.reset());
    rerender(<AppUpdateNotice />);

    expect(screen.getByRole('button', { name: /지금 업데이트/ })).toBeEnabled();
  });

  it('적용 중에는 버튼을 다시 누르지 못하게 막는다', () => {
    useServiceWorkerUpdate.mockReturnValue({
      available: true,
      applying: true,
      applyUpdate,
    });
    render(<AppUpdateNotice />);

    expect(
      screen.getByRole('button', { name: /업데이트 적용 중/ }),
    ).toBeDisabled();
  });
});
