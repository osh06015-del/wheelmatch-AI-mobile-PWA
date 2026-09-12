// 결과 화면 우회 차단 테스트.
//
// Wheel Condition Gate는 화면 이동으로 건너뛸 수 있으면 의미가 없다.
// /result로 직접 들어오거나 새로고침해도, 작업자가 다섯 항목을 모두 직접
// 확인하지 않았다면 규격 대조 결과가 보이면 안 된다.
//
// 여기서만 잡을 수 있는 회귀다 — 순수 함수 테스트는 "화면이 그 함수를
// 실제로 부르는지"를 증명하지 못한다.

import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, push } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
}));

// Link는 App Router 컨텍스트를 요구한다. 이 테스트가 보는 것은 라우팅이
// 아니라 가드이므로 평범한 <a>로 바꿔 둔다.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// IndexedDB는 이 테스트의 관심사가 아니다. 저장은 부르지 않는다.
vi.mock('@/lib/db', () => ({ saveInspection: vi.fn() }));

import ResultPage from './page';
import { useInspection } from '@/lib/state/inspection';
import type { GrinderSpec, WheelCondition, WheelSpec } from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  expiry: { year: 2099, month: 12 },
  rawText: '',
  confidence: 'high',
};

const CONFIRMED: WheelCondition = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

const LOADING = '결과를 불러오는 중입니다...';

function store() {
  return renderHook(() => useInspection()).result;
}

describe('결과 화면 — Wheel Condition Gate 우회 차단', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    const result = store();
    act(() => result.current.reset());
  });

  it('값이 하나도 없이 직접 들어오면 결과를 보여주지 않고 처음으로 돌린다', () => {
    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('규격은 다 있는데 상태 확인을 하지 않았으면 결과를 보여주지 않는다', () => {
    // 가장 위험한 경로다. 판정은 계산할 수 있지만 작업자는 숫돌을 보지 않았다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setWheel(WHEEL);
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('한 항목이라도 미확인이면 여전히 막는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition({ ...CONFIRMED, expiryValid: null });
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('문제 있음이 하나라도 있으면 결과로 넘어가지 않는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition({ ...CONFIRMED, damageFree: false });
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('다섯 항목을 모두 확인했을 때만 결과가 열린다', () => {
    // 위 네 개만으로는 "항상 막는" 버그를 잡지 못한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    expect(screen.getByText('규격 대조 결과')).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('새 숫돌을 잡으면 상태 확인이 사라져 다시 막힌다', () => {
    // setWheel이 이전 숫돌의 확인을 지운다. 화면도 그에 따라 닫혀야 한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });
    act(() => result.current.setWheel({ ...WHEEL, diameter: 180 }));

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });
});
