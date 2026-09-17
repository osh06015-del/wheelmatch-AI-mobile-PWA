// 필요 숫돌 조건·규격 등급·여유율 테스트.
//
// 여기서 나오는 조건은 규칙엔진의 판정 기준을 뒤집은 것이다.
// 둘이 어긋나면 "조건은 맞다는데 판정은 부적합"인 상황이 생긴다.
// 그래서 engine과 방향이 같은지 함께 확인한다.
//
// 문장은 src/lib/i18n/format.test.ts가 맡는다. 여기서는 값만 본다.

import { describe, expect, it } from 'vitest';

import { matchSpecs } from './engine';
import {
  diameterMarginPercent,
  grinderSizeClass,
  margins,
  roundMargin,
  rpmMarginPercent,
  wheelRequirements,
} from './requirement';
import type { GrinderSpec, WheelSpec } from './types';
import { BONDED_ABRASIVE_PROFILE } from './profiles';

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
    expiry: { year: 2027, month: 4 },
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

describe('grinderSizeClass', () => {
  it('현장에서 부르는 인치 등급을 붙인다', () => {
    expect(grinderSizeClass(100)).toBe('4');
    expect(grinderSizeClass(115)).toBe('4.5');
    expect(grinderSizeClass(125)).toBe('5');
    expect(grinderSizeClass(180)).toBe('7');
  });

  it('흔히 쓰지 않는 규격에는 억지로 등급을 붙이지 않는다', () => {
    expect(grinderSizeClass(137)).toBeNull();
  });

  it('값이 없으면 null', () => {
    expect(grinderSizeClass(null)).toBeNull();
  });
});

describe('wheelRequirements', () => {
  it('명판 값을 뒤집어 조건을 만든다', () => {
    expect(wheelRequirements(grinder(), 'grinding')).toEqual([
      { kind: 'purpose', value: 'grinding' },
      { kind: 'diameter', value: 125 },
      { kind: 'rpm', value: 11000 },
    ]);
  });

  it('작업을 고르지 않으면 용도 조건을 세우지 않는다', () => {
    const [purpose] = wheelRequirements(grinder(), null);
    expect(purpose).toEqual({ kind: 'purpose', value: null });
  });

  it('명판을 읽지 못한 항목은 조건을 지어내지 않는다', () => {
    const req = wheelRequirements(
      grinder({ noLoadRPM: null, maxWheelDiameter: null }),
      'cutting',
    );
    expect(req.filter((r) => r.value === null)).toHaveLength(2);
  });

  it('조건을 만족하는 숫돌은 규칙엔진에서도 적합이다', () => {
    // 조건과 판정이 어긋나면 "조건은 맞다는데 부적합" 상황이 생긴다.
    const g = grinder();
    const req = wheelRequirements(g, 'cutting');
    expect(req.every((r) => r.value !== null)).toBe(true);

    // 조건을 딱 맞춘 숫돌 (경계값)
    const exact = wheel({
      maxRPM: g.noLoadRPM!,
      diameter: g.maxWheelDiameter!,
      purpose: 'cutting',
    });
    expect(
      matchSpecs(g, exact, {
        profile: BONDED_ABRASIVE_PROFILE,
        declaredPurpose: 'cutting',
        today: '2026-09-08',
      }).verdict,
    ).toBe('COMPATIBLE');
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

  it('지름도 값이 없거나 0이면 계산하지 않는다', () => {
    // 회전속도 쪽과 같은 가드다. 한쪽만 막아두면 Φ0 오독이 -Infinity%가 되어
    // 화면에 그대로 나간다.
    expect(diameterMarginPercent(null, 100)).toBeNull();
    expect(diameterMarginPercent(125, null)).toBeNull();
    expect(diameterMarginPercent(0, 100)).toBeNull();
  });

  it('지름은 남은 여유를 본다', () => {
    // (125 - 100) / 125 = 20%
    expect(diameterMarginPercent(125, 100)).toBe(20);
    expect(diameterMarginPercent(100, 125)).toBe(-25);
  });
});

describe('roundMargin', () => {
  it('소수점 한 자리까지만 쓴다', () => {
    // OCR로 읽은 값의 정밀도를 넘어서는 자리는 의미가 없다.
    expect(roundMargin(10.909)).toBe(10.9);
    expect(roundMargin(10.98765)).toBe(11);
    expect(roundMargin(-22.727)).toBe(-22.7);
  });

  it('반올림해서 0이 되면 부호 없는 0이다', () => {
    // -0이 남으면 부호로 문구를 고르는 화면이 "부족 -0%"를 띄울 수 있다.
    expect(roundMargin(-0.04)).toBe(0);
    expect(roundMargin(0)).toBe(0);
  });

  it('계산할 수 없으면 null을 그대로 둔다', () => {
    // 여기서 0을 내면 재지도 않은 값을 "여유 없음"으로 단정하게 된다.
    expect(roundMargin(null)).toBeNull();
  });
});

describe('margins', () => {
  it('회전속도와 지름 여유를 함께 낸다', () => {
    expect(margins(grinder(), wheel())).toEqual({ rpm: 10.9, diameter: 0 });
  });

  it('부적합 조합은 음수로 나온다', () => {
    expect(margins(grinder(), wheel({ maxRPM: 8500 })).rpm).toBe(-22.7);
  });

  it('값이 없으면 계산하지 않는다', () => {
    expect(margins(grinder({ noLoadRPM: null }), wheel()).rpm).toBeNull();
  });
});
