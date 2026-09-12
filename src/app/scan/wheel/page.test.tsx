// 숫돌 촬영 화면 우회 차단 테스트.
//
// Grinder Condition Gate를 통과하지 않은 채 /scan/wheel로 들어오면
// 촬영 화면이 열려서는 안 된다. 열리면 장비 상태를 보지 않은 점검이
// 그대로 규격 대조까지 흘러간다.

import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, push } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
}));

// 카메라와 OCR은 이 테스트의 관심사가 아니다. 가드만 본다.
vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({
    extractGrinder: vi.fn(),
    extractWheel: vi.fn(),
  }),
}));

import WheelScanPage from './page';
import { useInspection } from '@/lib/state/inspection';
import type { GrinderCondition, GrinderSpec } from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const CONFIRMED: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

const BLOCKED = '그라인더 상태 확인이 먼저입니다.';

function store() {
  return renderHook(() => useInspection()).result;
}

describe('숫돌 촬영 화면 — Grinder Condition Gate 우회 차단', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    const result = store();
    act(() => result.current.reset());
  });

  it('그라인더 값이 없으면 촬영 화면을 열지 않는다', () => {
    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('그라인더는 있는데 장비 상태를 확인하지 않았으면 막는다', () => {
    const result = store();
    act(() => result.current.setGrinder(GRINDER));

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('한 항목이라도 미확인이면 막는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition({ ...CONFIRMED, guardSecure: null });
    });

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('한 항목이라도 문제 있음이면 막는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition({
        ...CONFIRMED,
        cordAndPlugUndamaged: false,
      });
    });

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('다섯 항목을 모두 확인했을 때만 촬영 화면이 열린다', () => {
    // 위 네 개만으로는 "항상 막는" 버그를 잡지 못한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });

    render(<WheelScanPage />);

    expect(screen.queryByText(BLOCKED)).not.toBeInTheDocument();
    expect(screen.getByText('숫돌 라벨 촬영')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('새 그라인더를 잡으면 다시 막힌다', () => {
    // setGrinder가 이전 장비 상태를 지운다. 화면도 그에 따라 닫혀야 한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });
    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });
});
