// 화면 간 값 전달 저장소 테스트.
//
// 여기서 값이 새면 결과 화면이 빈 값으로 판정하게 된다.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useInspection } from './inspection';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

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

  it('reset은 OCR 원본과 시작 시각까지 모두 지운다', () => {
    // 지난 점검 값이 남아 다음 점검에 섞이면 엉뚱한 기록이 저장된다.
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setPurpose('grinding');
      result.current.setGrinder(GRINDER, null, GRINDER);
      result.current.setWheel(WHEEL, null, WHEEL);
    });
    act(() => result.current.reset());

    expect(result.current.grinderOcr).toBeNull();
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.startedAt).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelOcr')).toBeNull();
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
