// 검사 결과 분류 테스트.
//
// 여기서 잘못 나누면 "읽지 못한 값"이 "확인된 값"처럼 화면에 뜬다.

import { describe, expect, it } from 'vitest';

import { matchSpecs } from './engine';
import { groupChecks } from './grouping';
import type { CheckItem, GrinderSpec, WheelSpec } from './types';
import { BONDED_ABRASIVE_PROFILE } from './profiles';

/** 기준일을 고정한다. 엔진은 시계를 읽지 않는다. */
const TODAY = '2026-09-08';

function check(overrides: Partial<CheckItem> = {}): CheckItem {
  return {
    rule: '검사',
    passed: true,
    reason: '',
    grinderValue: null,
    wheelValue: null,
    ...overrides,
  };
}

describe('groupChecks', () => {
  it('통과한 항목은 확인됨으로 간다', () => {
    const g = groupChecks([check({ passed: true })]);
    expect(g.confirmed).toHaveLength(1);
  });

  it('어긋난 항목은 불일치로 간다', () => {
    const g = groupChecks([check({ passed: false })]);
    expect(g.conflicting).toHaveLength(1);
  });

  it('판정불가는 판독불가로 간다', () => {
    const g = groupChecks([check({ passed: null })]);
    expect(g.unreadable).toHaveLength(1);
  });

  it('경고 수준 판정불가는 사용자 확인으로 간다', () => {
    // "확인하지 못했다"와 "애초에 확인할 수 없다"는 사용자가 할 일이 다르다.
    // 앞은 재촬영, 뒤는 직접 점검이다.
    const g = groupChecks([check({ passed: null, advisory: true })]);
    expect(g.manual).toHaveLength(1);
    expect(g.unreadable).toHaveLength(0);
  });

  it('통과한 항목은 advisory여도 확인됨이다', () => {
    // advisory는 판정불가일 때만 뜻이 있다. 통과했으면 확인된 것이다.
    const g = groupChecks([check({ passed: true, advisory: true })]);
    expect(g.confirmed).toHaveLength(1);
    expect(g.manual).toHaveLength(0);
  });

  it('항목을 하나도 잃지 않는다', () => {
    // 어느 칸에도 안 들어가면 화면에서 조용히 사라진다.
    const checks = [
      check({ rule: 'a', passed: true }),
      check({ rule: 'b', passed: false }),
      check({ rule: 'c', passed: null }),
      check({ rule: 'd', passed: null, advisory: true }),
    ];
    const g = groupChecks(checks);
    const total =
      g.confirmed.length +
      g.conflicting.length +
      g.unreadable.length +
      g.manual.length;
    expect(total).toBe(checks.length);
  });

  it('빈 목록도 다룬다', () => {
    const g = groupChecks([]);
    expect(g).toEqual({
      confirmed: [],
      conflicting: [],
      unreadable: [],
      manual: [],
    });
  });
});

describe('실제 판정 결과를 나눈다', () => {
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
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: null,
        boreDiameter: 22.23,
        expiryRaw: '04/2027',
      },
      rpmSource: 'label',
      expiry: { year: 2027, month: 4 },
      rawText: '',
      confidence: 'high',
      ...overrides,
    };
  }

  it('적합 판정에도 사용자 확인 항목이 남는다', () => {
    // 전부 통과했다고 해서 사람이 볼 것이 없어지지 않는다.
    const result = matchSpecs(grinder(), wheel(), {
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });
    const g = groupChecks(result.checks);

    expect(result.verdict).toBe('COMPATIBLE');
    expect(g.conflicting).toHaveLength(0);
    expect(g.manual.length).toBeGreaterThan(0); // 외관 손상·장착 규격
  });

  it('부적합 판정은 불일치 칸에 이유가 담긴다', () => {
    const result = matchSpecs(grinder(), wheel({ maxRPM: 8500 }), {
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });
    const g = groupChecks(result.checks);

    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(g.conflicting.map((c) => c.rule)).toContain('RPM 안전');
  });

  it('판정불가는 판독불가 칸으로 간다', () => {
    const result = matchSpecs(grinder(), wheel({ maxRPM: null }), {
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });
    const g = groupChecks(result.checks);

    expect(result.verdict).toBe('UNDETERMINED');
    expect(g.unreadable.length).toBeGreaterThan(0);
  });

  it('덮개 충돌도 실제 OCR 미판독과 같은 칸(판독불가)에 함께 들어간다', () => {
    // 성격이 다른 두 원인 — 값을 못 읽음(maxRPM null)과 입력끼리 충돌(덮개 없음)
    // — 이 같은 칸에 모여야 화면 라벨이 "판정할 수 없는 정보"로 둘 다 아우른다.
    const result = matchSpecs(
      grinder({ noLoadRPM: null, guardType: 'none' }),
      wheel(),
      { profile: BONDED_ABRASIVE_PROFILE, today: TODAY },
    );
    const g = groupChecks(result.checks);

    const rules = g.unreadable.map((c) => c.rule);
    expect(rules).toContain('필수값 존재'); // 실제 OCR 미판독
    expect(rules).toContain('덮개 조건'); // 입력 충돌
    // 덮개 항목이 사용자 확인(advisory) 칸으로 새지 않는다.
    expect(g.manual.map((c) => c.rule)).not.toContain('덮개 조건');
  });
});
