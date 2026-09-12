// 화면 간 값 전달 저장소 테스트.
//
// 여기서 값이 새면 결과 화면이 빈 값으로 판정하게 된다.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useInspection } from './inspection';
import type { TrialRunProgress } from '@/lib/safety/trialRun';
import type {
  GrinderCondition,
  GrinderSpec,
  WheelCondition,
  WheelSpec,
} from '@/lib/rules/types';

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
  rawText: '',
  confidence: 'high',
};

const GRINDER_CONDITION: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

const PROGRESS: TrialRunProgress = {
  wheelReplaced: true,
  requiredSeconds: 180,
  startedAt: '2026-09-12T09:00:00.000Z',
  endsAt: '2026-09-12T09:03:00.000Z',
};

const WHEEL_CONDITION: WheelCondition = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

describe('useInspection', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.reset());
  });

  it('작업을 고르면 시작 시각을 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    const before = Date.now();
    act(() => result.current.setPurpose('cutting'));

    expect(result.current.declaredPurpose).toBe('cutting');
    expect(result.current.startedAt).toBeGreaterThanOrEqual(before);
  });

  it('OCR 원본과 사용자가 고친 최종값을 함께 보관한다', () => {
    // 최종값만 남기면 인식률을 잴 수 없다.
    const { result } = renderHook(() => useInspection());
    const corrected = { ...WHEEL, maxRPM: 12200 };
    const raw = { ...WHEEL, maxRPM: 1220 };

    act(() => result.current.setWheel(corrected, null, raw));

    expect(result.current.wheel?.maxRPM).toBe(12200);
    expect(result.current.wheelOcr?.maxRPM).toBe(1220);
  });

  it('새로고침에 대비해 sessionStorage에도 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER, null, GRINDER));

    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.grinderOcr') ?? 'null'),
    ).toMatchObject({ noLoadRPM: 11000 });
  });

  it('저장·복원 후에도 라벨 원문과 정규화된 유효기한이 함께 남는다', () => {
    // sessionStorage를 거치면 JSON 직렬화를 한 번 통과한다. 여기서 선택
    // 필드가 조용히 떨어지면 화면을 새로고침한 순간 유효기한 검사가 사라진다.
    const { result } = renderHook(() => useInspection());
    const ocr: WheelSpec = {
      ...WHEEL,
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: null,
        boreDiameter: 22.23,
        expiryRaw: '04/2023',
      },
      rpmSource: 'label',
      expiry: { year: 2023, month: 4 },
    };
    // 사용자가 라벨을 다시 보고 2027년으로 고친 경우.
    const confirmed: WheelSpec = { ...ocr, expiry: { year: 2027, month: 4 } };

    act(() => result.current.setWheel(confirmed, null, ocr));

    const storedWheel = JSON.parse(
      sessionStorage.getItem('wheelmatch.wheel') ?? 'null',
    ) as WheelSpec;
    const storedOcr = JSON.parse(
      sessionStorage.getItem('wheelmatch.wheelOcr') ?? 'null',
    ) as WheelSpec;

    // 라벨 원문은 양쪽 모두 그대로다. 사용자 수정이 덮지 않는다.
    expect(storedWheel.markings?.expiryRaw).toBe('04/2023');
    expect(storedOcr.markings?.expiryRaw).toBe('04/2023');
    // 정규화 값만 갈린다 — 무엇을 사람이 고쳤는지 되짚을 수 있다.
    expect(storedWheel.expiry).toEqual({ year: 2027, month: 4 });
    expect(storedOcr.expiry).toEqual({ year: 2023, month: 4 });
  });

  it('작업자가 직접 답한 숫돌 상태를 별도로 저장한다', () => {
    const { result } = renderHook(() => useInspection());

    act(() => result.current.setWheelCondition(WHEEL_CONDITION));

    expect(result.current.wheelCondition).toEqual(WHEEL_CONDITION);
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.wheelCondition') ?? 'null'),
    ).toEqual(WHEEL_CONDITION);
  });

  it('새 숫돌 값이 들어오면 이전 숫돌의 상태 확인을 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setWheelCondition(WHEEL_CONDITION));

    act(() => result.current.setWheel(WHEEL));

    expect(result.current.wheelCondition).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelCondition')).toBeNull();
  });

  it('작업자가 직접 답한 그라인더 장비 상태를 별도로 저장한다', () => {
    const { result } = renderHook(() => useInspection());

    act(() => result.current.setGrinder(GRINDER));
    act(() => result.current.setGrinderCondition(GRINDER_CONDITION));

    expect(result.current.grinderCondition).toEqual(GRINDER_CONDITION);
    expect(
      JSON.parse(
        sessionStorage.getItem('wheelmatch.grinderCondition') ?? 'null',
      ),
    ).toEqual(GRINDER_CONDITION);
    // 숫돌 쪽 확인과 섞이지 않는다.
    expect(result.current.wheelCondition).toBeNull();
  });

  it('새 그라인더가 들어오면 장비 상태와 그 뒤의 숫돌 값까지 전부 버린다', () => {
    // 기계가 달라지면 그 기계로 본 장비 상태도, 그 기계 기준의 규격 대조도
    // 근거를 잃는다. 남겨두면 다른 기계의 확인이 그대로 통과한다.
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() => {
      result.current.setGrinderCondition(GRINDER_CONDITION);
      result.current.setWheel(WHEEL, null, WHEEL);
      result.current.setWheelCondition(WHEEL_CONDITION);
    });

    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    expect(result.current.grinderCondition).toBeNull();
    expect(result.current.wheel).toBeNull();
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.wheelCondition).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.grinderCondition')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheel')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelCondition')).toBeNull();
    // 새 그라인더 값 자체는 남는다.
    expect(result.current.grinder?.noLoadRPM).toBe(8500);
  });

  it('새 숫돌이 들어오면 진행 중인 시험운전을 버린다', () => {
    // 제122조 ②의 시간은 그 숫돌을 달고 돌린 시간이다. 숫돌이 바뀌었는데
    // 타이머가 이어지면 새 숫돌은 한 번도 돌려보지 않고 통과한다.
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setWheel(WHEEL));
    act(() => result.current.setTrialRun(PROGRESS));

    act(() => result.current.setWheel({ ...WHEEL, maxRPM: 8500 }));

    expect(result.current.trialRun).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.trialRun')).toBeNull();
  });

  it('새 그라인더가 들어오면 진행 중인 시험운전을 버린다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() => result.current.setTrialRun(PROGRESS));

    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    expect(result.current.trialRun).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.trialRun')).toBeNull();
  });

  it('시험운전은 종료시각째로 저장돼 새로고침에도 이어진다', () => {
    // 남은 시간을 저장하면 화면이 꺼져 있던 만큼이 공짜가 된다.
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setTrialRun(PROGRESS));

    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.trialRun') ?? 'null'),
    ).toEqual(PROGRESS);
    expect(result.current.trialRun?.endsAt).toBe(PROGRESS.endsAt);
  });

  it('숫돌만 바뀔 때는 그라인더 장비 상태를 건드리지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() => result.current.setGrinderCondition(GRINDER_CONDITION));

    act(() => result.current.setWheel(WHEEL));

    expect(result.current.grinderCondition).toEqual(GRINDER_CONDITION);
  });

  it('reset은 OCR 원본과 시작 시각까지 모두 지운다', () => {
    // 지난 점검 값이 남아 다음 점검에 섞이면 엉뚱한 기록이 저장된다.
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setPurpose('grinding');
      result.current.setGrinder(GRINDER, null, GRINDER);
      result.current.setGrinderCondition(GRINDER_CONDITION);
      result.current.setWheel(WHEEL, null, WHEEL);
      result.current.setWheelCondition(WHEEL_CONDITION);
    });
    act(() => result.current.reset());

    expect(result.current.grinderOcr).toBeNull();
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.grinderCondition).toBeNull();
    expect(result.current.wheelCondition).toBeNull();
    expect(result.current.startedAt).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelOcr')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.grinderCondition')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelCondition')).toBeNull();
  });

  it('사진 없이 값만 갱신해도 이전 사진을 지우지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    const photo = new Blob(['x']);
    act(() => result.current.setWheel(WHEEL, photo));
    act(() => result.current.setWheel({ ...WHEEL, diameter: 100 }));

    expect(result.current.wheelImage).toBe(photo);
    expect(result.current.wheel?.diameter).toBe(100);
  });
});
