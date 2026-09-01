// 필요 숫돌 조건·규격 등급·여유율 테스트.
//
// 여기서 나오는 조건은 규칙엔진의 판정 기준을 뒤집은 것이다.
// 둘이 어긋나면 "조건은 맞다는데 판정은 부적합"인 상황이 생긴다.
// 그래서 engine과 방향이 같은지 함께 확인한다.

import { describe, expect, it } from 'vitest';

import { matchSpecs } from './engine';
import {
  diameterMarginPercent,
  formatMargin,
  grinderSizeClass,
  grinderSummary,
  margins,
  rpmMarginPercent,
  wheelRequirements,
} from './requirement';
import type { GrinderSpec, WheelSpec } from './types';

function grinder(overrides: Partial<GrinderSpec> = {}): GrinderSpec {
  return {
    model: 'GWS 750-125',
    noLoadRPM: 11000,
    maxWheelDiameter: 125,
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

function wheel(overrides: Partial<WheelSpec> = {}): WheelSpec {
  return {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

describe('grinderSizeClass', () => {
  it('현장에서 부르는 인치 등급을 붙인다', () => {
    expect(grinderSizeClass(100)).toBe('4인치급');
    expect(grinderSizeClass(125)).toBe('5인치급');
    expect(grinderSizeClass(180)).toBe('7인치급');
  });

  it('흔히 쓰지 않는 규격에는 억지로 등급을 붙이지 않는다', () => {
    expect(grinderSizeClass(137)).toBeNull();
  });

  it('값이 없으면 null', () => {
    expect(grinderSizeClass(null)).toBeNull();
  });
});

describe('grinderSummary', () => {
  it('모델·등급·회전속도를 한 줄로 묶는다', () => {
    expect(grinderSummary(grinder())).toBe(
      'GWS 750-125 · 5인치급 (최대 Φ125mm) · 11,000rpm',
    );
  });

  it('값이 없는 항목은 빼고 만든다', () => {
    expect(
      grinderSummary(grinder({ model: null, maxWheelDiameter: null })),
    ).toBe('11,000rpm');
  });

  it('아무 값도 없으면 읽지 못했다고 알린다', () => {
    const empty = grinder({
      model: null,
      noLoadRPM: null,
      maxWheelDiameter: null,
    });
    expect(grinderSummary(empty)).toBe('명판 값을 읽지 못했습니다');
  });
});

describe('wheelRequirements', () => {
  it('명판 값을 뒤집어 조건을 만든다', () => {
    const req = wheelRequirements(grinder(), 'grinding');
    expect(req.map((r) => r.condition)).toEqual([
      '연삭용',
      'Φ125mm 이하',
      '11,000rpm 이상',
    ]);
  });

  it('작업을 고르지 않으면 용도 조건을 세우지 않는다', () => {
    const req = wheelRequirements(grinder(), null);
    const purpose = req.find((r) => r.label === '용도')!;
    expect(purpose.condition).toBeNull();
    expect(purpose.unknownReason).toContain('작업을 고르지 않아');
  });

  it('명판을 읽지 못한 항목은 조건을 지어내지 않는다', () => {
    const req = wheelRequirements(
      grinder({ noLoadRPM: null, maxWheelDiameter: null }),
      'cutting',
    );
    expect(req.filter((r) => r.condition === null)).toHaveLength(2);
  });

  it('조건을 만족하는 숫돌은 규칙엔진에서도 적합이다', () => {
    // 조건과 판정이 어긋나면 "조건은 맞다는데 부적합" 상황이 생긴다.
    const g = grinder();
    const req = wheelRequirements(g, 'cutting');
    expect(req.every((r) => r.condition !== null)).toBe(true);

    // 조건을 딱 맞춘 숫돌 (경계값)
    const exact = wheel({
      maxRPM: g.noLoadRPM!,
      diameter: g.maxWheelDiameter!,
      purpose: 'cutting',
    });
    expect(matchSpecs(g, exact, { declaredPurpose: 'cutting' }).verdict).toBe(
      'COMPATIBLE',
    );
  });
});

describe('여유율', () => {
  it('숫돌이 더 빠르면 양수', () => {
    // (12200 - 11000) / 11000 = 10.9%
    expect(rpmMarginPercent(11000, 12200)).toBeCloseTo(10.909, 2);
  });

  it('숫돌이 더 느리면 음수', () => {
    expect(rpmMarginPercent(11000, 8500)).toBeCloseTo(-22.727, 2);
  });

  it('딱 맞으면 0', () => {
    expect(rpmMarginPercent(12000, 12000)).toBe(0);
  });

  it('값이 없으면 계산하지 않는다', () => {
    expect(rpmMarginPercent(null, 12200)).toBeNull();
    expect(rpmMarginPercent(11000, null)).toBeNull();
    expect(rpmMarginPercent(0, 12200)).toBeNull();
  });

  it('지름은 남은 여유를 본다', () => {
    // (125 - 100) / 125 = 20%
    expect(diameterMarginPercent(125, 100)).toBe(20);
    expect(diameterMarginPercent(100, 125)).toBe(-25);
  });
});

describe('formatMargin', () => {
  it('여유가 있으면 +로 표시한다', () => {
    expect(formatMargin(10.909)).toBe('여유 +10.9%');
  });

  it('모자라면 부족으로 표시한다', () => {
    expect(formatMargin(-22.727)).toBe('부족 -22.7%');
  });

  it('0%는 통과지만 여유가 없다고 알린다', () => {
    // 규칙상 적합이지만 작업자는 이 상태를 알아야 한다.
    expect(formatMargin(0)).toBe('여유 없음 (0%)');
  });

  it('소수점 한 자리까지만 쓴다', () => {
    // OCR로 읽은 값의 정밀도를 넘어서는 자리는 의미가 없다.
    expect(formatMargin(10.98765)).toBe('여유 +11%');
  });
});

describe('margins', () => {
  it('회전속도와 지름 여유를 함께 낸다', () => {
    expect(margins(grinder(), wheel())).toEqual({
      rpm: '여유 +10.9%',
      diameter: '여유 없음 (0%)',
    });
  });

  it('부적합 조합은 부족으로 나온다', () => {
    const m = margins(grinder(), wheel({ maxRPM: 8500 }));
    expect(m.rpm).toBe('부족 -22.7%');
  });
});
