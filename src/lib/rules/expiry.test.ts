// 유효기한 검사 테스트.
//
// 이 규칙은 시계를 읽지 않는다. 기준일을 주입받아 date-only로만 비교한다.
// 같은 입력과 같은 기준일이면 언제 어디서 돌려도 같은 결과가 나와야 한다 —
// 나중에 사고 기록을 되짚을 때 판정이 달라지면 근거가 되지 못한다.
//
// 근거와 한계는 docs/regulatory-sources.md §7에 있다.

import { describe, expect, it } from 'vitest';
import {
  RULE,
  checkExpiry,
  expiryLastValidDate,
  formatExpiry,
  isValidDateOnly,
  matchSpecs,
  toDateOnly,
} from './engine';
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

/** 유효기한 외의 모든 검사를 통과하는 숫돌. 이 파일은 기한만 움직인다. */
function wheel(overrides: Partial<WheelSpec> = {}): WheelSpec {
  return {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    expiry: { year: 2023, month: 4 },
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

function expiryCheck(w: WheelSpec, today: string | null) {
  return matchSpecs(grinder(), w, { today }).checks.find(
    (c) => c.rule === RULE.EXPIRY,
  );
}

// ─────────────────────────────────────────────────────────────
// 날짜 계산
// ─────────────────────────────────────────────────────────────

describe('표시 월 → 마지막 유효일', () => {
  it('표시된 달의 말일까지 유효하다', () => {
    // 확인된 원문(oSa 2020-04)은 월/연 표기까지만 정한다. 그 달의 언제
    // 만료되는지는 정하지 않으므로 이 앱이 정의했다. 규정이 아니다.
    expect(expiryLastValidDate({ year: 2023, month: 4 })).toBe('2023-04-30');
    expect(expiryLastValidDate({ year: 2023, month: 1 })).toBe('2023-01-31');
    expect(expiryLastValidDate({ year: 2023, month: 12 })).toBe('2023-12-31');
  });

  it('윤년 2월을 정확히 계산한다', () => {
    expect(expiryLastValidDate({ year: 2023, month: 2 })).toBe('2023-02-28');
    expect(expiryLastValidDate({ year: 2024, month: 2 })).toBe('2024-02-29');
    // 100으로 나뉘지만 400으로는 안 나뉘는 해는 평년이다.
    expect(expiryLastValidDate({ year: 1900, month: 2 })).toBe('1900-02-28');
    expect(expiryLastValidDate({ year: 2000, month: 2 })).toBe('2000-02-29');
  });

  it('라벨과 같은 MM/YYYY로 되돌린다', () => {
    expect(formatExpiry({ year: 2023, month: 4 })).toBe('04/2023');
    expect(formatExpiry({ year: 2023, month: 12 })).toBe('12/2023');
  });
});

describe('기준일 형식 검사', () => {
  it('YYYY-MM-DD 형식이면서 실재하는 날짜만 받는다', () => {
    expect(isValidDateOnly('2026-09-08')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true);
  });

  it('존재하지 않는 날짜를 거른다', () => {
    // 형식만 보고 넘기면 이런 값이 그대로 비교에 들어간다.
    expect(isValidDateOnly('2023-02-30')).toBe(false);
    expect(isValidDateOnly('2023-13-01')).toBe(false);
    expect(isValidDateOnly('2023-00-10')).toBe(false);
    expect(isValidDateOnly('2023-04-31')).toBe(false);
    expect(isValidDateOnly('2023-04-00')).toBe(false);
  });

  it('형식이 다르면 거른다', () => {
    expect(isValidDateOnly(null)).toBe(false);
    expect(isValidDateOnly('')).toBe(false);
    expect(isValidDateOnly('2026-9-8')).toBe(false);
    expect(isValidDateOnly('08/09/2026')).toBe(false);
    expect(isValidDateOnly('2026-09-08T00:00:00Z')).toBe(false);
  });

  it('Date를 로컬 날짜로 바꾼다 — UTC로 옮기지 않는다', () => {
    // toISOString()을 쓰면 한국 시간 오전 9시 이전에 하루가 밀린다.
    // 하루가 밀리면 만료 경계가 통째로 어긋난다.
    const localMidnight = new Date(2026, 8, 8, 0, 30);
    expect(toDateOnly(localMidnight)).toBe('2026-09-08');

    const lateNight = new Date(2026, 0, 1, 23, 59);
    expect(toDateOnly(lateNight)).toBe('2026-01-01');
  });
});

// ─────────────────────────────────────────────────────────────
// 만료 경계 — 필수 시나리오
// ─────────────────────────────────────────────────────────────

describe('만료 경계', () => {
  const w = wheel(); // 표시 04/2023 → 2023-04-30까지 유효

  it('만료일 전이면 통과한다', () => {
    const check = expiryCheck(w, '2023-04-29');
    expect(check?.passed).toBe(true);
    expect(matchSpecs(grinder(), w, { today: '2023-04-29' }).verdict).toBe(
      'COMPATIBLE',
    );
  });

  it('만료일 당일은 아직 유효하다', () => {
    // 라벨은 월까지만 찍힌다. 그 달 전체를 유효로 본다 — 이 앱의 해석이다.
    const check = expiryCheck(w, '2023-04-30');
    expect(check?.passed).toBe(true);
    expect(matchSpecs(grinder(), w, { today: '2023-04-30' }).verdict).toBe(
      'COMPATIBLE',
    );
  });

  it('만료일 다음 날은 부적합이다', () => {
    const check = expiryCheck(w, '2023-05-01');
    expect(check?.passed).toBe(false);
    expect(matchSpecs(grinder(), w, { today: '2023-05-01' }).verdict).toBe(
      'INCOMPATIBLE',
    );
  });

  it('한참 지난 뒤에도 부적합이다', () => {
    expect(expiryCheck(w, '2026-09-08')?.passed).toBe(false);
  });

  it('만료 사유에 표시와 기준일이 함께 나온다', () => {
    // 화면에서 "무엇을 보고 언제 기준으로 판단했는지"가 보여야 한다.
    const check = expiryCheck(w, '2023-05-01');
    expect(check?.reason).toContain('04/2023');
    expect(check?.reason).toContain('2023-04-30');
    expect(check?.reason).toContain('2023-05-01');
    expect(check?.wheelValue).toBe('04/2023');
  });
});

// ─────────────────────────────────────────────────────────────
// 값이 없거나 믿을 수 없을 때
// ─────────────────────────────────────────────────────────────

describe('읽지 못했거나 모호한 경우', () => {
  it('표시가 없으면 부적합이 아니라 판정불가다', () => {
    // 표시 의무는 수공구용 B/BF 본드 제품에만 있다(oSa 2020-04).
    // 표시가 없는 숫돌이 정상일 수 있으므로 부적합으로 단정하지 않는다.
    const check = expiryCheck(wheel({ expiry: null }), '2026-09-08');
    expect(check?.passed).toBeNull();
  });

  it('표시가 없으면 적합으로도 통과시키지 않는다', () => {
    // 확인하지 못한 것을 확인한 것처럼 넘기지 않는다.
    // 그래서 advisory(경고)로 두지 않는다 — 전체 판정을 끌어내린다.
    const check = expiryCheck(wheel({ expiry: null }), '2026-09-08');
    expect(check?.advisory).toBeUndefined();
    expect(
      matchSpecs(grinder(), wheel({ expiry: null }), { today: '2026-09-08' })
        .verdict,
    ).toBe('UNDETERMINED');
  });

  it('기능 도입 전 기록(expiry 없음)도 같은 경로로 간다', () => {
    const old = wheel();
    delete old.expiry;
    expect(expiryCheck(old, '2026-09-08')?.passed).toBeNull();
    expect(matchSpecs(grinder(), old, { today: '2026-09-08' }).verdict).toBe(
      'UNDETERMINED',
    );
  });

  it('기준일을 넣지 않으면 비교하지 않고 판정불가로 남는다', () => {
    // 엔진이 시계를 읽지 않는다는 뜻이다. 항목 자체는 사라지지 않는다 —
    // 조건부로 만들면 호출자가 빠뜨렸을 때 화면에 흔적이 남지 않는다.
    const check = expiryCheck(wheel(), null);
    expect(check).toBeDefined();
    expect(check?.passed).toBeNull();
    expect(matchSpecs(grinder(), wheel()).verdict).toBe('UNDETERMINED');
  });

  it('기준일 형식이 잘못되면 판정불가로 남는다', () => {
    expect(expiryCheck(wheel(), '2023-02-30')?.passed).toBeNull();
    expect(expiryCheck(wheel(), '2023/05/01')?.passed).toBeNull();
  });

  it('OCR 신뢰도가 낮으면 기한이 남아 있어도 적합이 아니다', () => {
    // 신뢰도가 낮다는 것은 그 숫자를 믿을 수 없다는 뜻이다.
    // 기한 검사 자체는 통과해도 전체는 판정불가로 간다.
    const w = wheel({ confidence: 'low' });
    expect(expiryCheck(w, '2023-04-01')?.passed).toBe(true);
    expect(matchSpecs(grinder(), w, { today: '2023-04-01' }).verdict).toBe(
      'UNDETERMINED',
    );
  });
});

// ─────────────────────────────────────────────────────────────
// 다른 규칙과의 관계
// ─────────────────────────────────────────────────────────────

describe('다른 규칙과 섞였을 때', () => {
  it('기한이 남아 있어도 회전속도 부적합을 덮지 않는다', () => {
    // 만료 정보가 다른 규칙의 부적합을 약화시키면 안 된다.
    const w = wheel({ maxRPM: 8500 });
    const result = matchSpecs(grinder(), w, { today: '2023-04-01' });

    expect(result.checks.find((c) => c.rule === RULE.EXPIRY)?.passed).toBe(
      true,
    );
    expect(result.checks.find((c) => c.rule === RULE.RPM_SAFETY)?.passed).toBe(
      false,
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('기한 만료와 회전속도 부적합이 함께면 둘 다 남는다', () => {
    const w = wheel({ maxRPM: 8500 });
    const result = matchSpecs(grinder(), w, { today: '2026-09-08' });
    const failed = result.checks
      .filter((c) => c.passed === false)
      .map((c) => c.rule);

    expect(failed).toContain(RULE.EXPIRY);
    expect(failed).toContain(RULE.RPM_SAFETY);
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('기한이 지나면 다른 항목이 모두 통과해도 적합이 아니다', () => {
    const result = matchSpecs(grinder(), wheel(), { today: '2026-09-08' });
    expect(result.checks.find((c) => c.rule === RULE.RPM_SAFETY)?.passed).toBe(
      true,
    );
    expect(
      result.checks.find((c) => c.rule === RULE.DIAMETER_FIT)?.passed,
    ).toBe(true);
    expect(result.verdict).not.toBe('COMPATIBLE');
  });
});

// ─────────────────────────────────────────────────────────────
// 재현성
// ─────────────────────────────────────────────────────────────

describe('같은 입력과 같은 기준일이면 같은 결과', () => {
  it('여러 번 돌려도 판정과 사유가 똑같다', () => {
    // 엔진이 시계를 읽으면 여기서 깨진다.
    const w = wheel();
    const runs = Array.from({ length: 5 }, () =>
      matchSpecs(grinder(), w, { today: '2023-05-01' }),
    );

    for (const run of runs) {
      expect(run.verdict).toBe(runs[0].verdict);
      expect(run.checks.map((c) => [c.rule, c.passed, c.reason])).toEqual(
        runs[0].checks.map((c) => [c.rule, c.passed, c.reason]),
      );
    }
  });

  it('기준일만 하루 넘기면 판정이 뒤집힌다', () => {
    const w = wheel();
    expect(matchSpecs(grinder(), w, { today: '2023-04-30' }).verdict).toBe(
      'COMPATIBLE',
    );
    expect(matchSpecs(grinder(), w, { today: '2023-05-01' }).verdict).toBe(
      'INCOMPATIBLE',
    );
  });

  it('시각(now)을 바꿔도 만료 판정은 흔들리지 않는다', () => {
    // 시간대·시각은 만료 계산에 들어가지 않는다. date-only 비교다.
    const w = wheel();
    const morning = matchSpecs(grinder(), w, {
      today: '2023-04-30',
      now: new Date('2023-04-30T00:00:00Z'),
    });
    const night = matchSpecs(grinder(), w, {
      today: '2023-04-30',
      now: new Date('2023-04-30T23:59:59Z'),
    });

    expect(morning.verdict).toBe(night.verdict);
    expect(morning.checks.find((c) => c.rule === RULE.EXPIRY)?.reason).toBe(
      night.checks.find((c) => c.rule === RULE.EXPIRY)?.reason,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// 함수를 직접 부르는 경로
// ─────────────────────────────────────────────────────────────

describe('checkExpiry 직접 호출', () => {
  it('항목 이름과 값 칸이 고정돼 있다', () => {
    const check = checkExpiry(wheel(), '2023-04-01');
    expect(check.rule).toBe(RULE.EXPIRY);
    expect(check.grinderValue).toBeNull();
    expect(check.wheelValue).toBe('04/2023');
  });

  it('표시가 없으면 값 칸도 비어 있다', () => {
    const check = checkExpiry(wheel({ expiry: null }), '2023-04-01');
    expect(check.wheelValue).toBeNull();
    expect(check.reason).toContain('2023-04-01');
  });
});
