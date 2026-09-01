// 규칙엔진 단위 테스트 — 프로젝트에서 가장 중요한 테스트다.
// 판정 로직을 바꿀 때는 반드시 이 20개 시나리오를 먼저 확인한다.

import { describe, expect, it } from 'vitest';
import { RULE, failureReasons, matchSpecs, withParticle } from './engine';
import type { CheckItem, GrinderSpec, MatchResult, WheelSpec } from './types';

/** 적합 조합을 기본값으로 두고, 각 시나리오는 필요한 필드만 덮어쓴다. */
function grinder(overrides: Partial<GrinderSpec> = {}): GrinderSpec {
  return {
    model: 'GWS 750-125',
    noLoadRPM: 11000,
    maxWheelDiameter: 125,
    rawText: 'BOSCH GWS 750-125 11000 r/min max 125mm',
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
    rawText: '최고사용회전속도 12200RPM 125x1.6mm 절단용',
    confidence: 'high',
    ...overrides,
  };
}

function checkOf(result: MatchResult, rule: string): CheckItem {
  const found = result.checks.find((check) => check.rule === rule);
  if (!found) throw new Error(`검사 항목을 찾을 수 없습니다: ${rule}`);
  return found;
}

describe('규칙엔진 — 적합 케이스', () => {
  it('1. 그라인더 11000rpm/125mm + 숫돌 12200rpm/125mm 절단 → COMPATIBLE', () => {
    const result = matchSpecs(grinder(), wheel());
    expect(result.verdict).toBe('COMPATIBLE');
    expect(failureReasons(result)).toEqual([]);
  });

  it('2. 그라인더 11000rpm/125mm + 숫돌 13300rpm/100mm 연삭 → COMPATIBLE', () => {
    const result = matchSpecs(
      grinder(),
      wheel({
        maxRPM: 13300,
        diameter: 100,
        thickness: 6.0,
        purpose: 'grinding',
      }),
    );
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('3. 그라인더 10000rpm/100mm + 숫돌 15300rpm/100mm 절단 → COMPATIBLE', () => {
    const result = matchSpecs(
      grinder({
        model: 'GWS 750-100',
        noLoadRPM: 10000,
        maxWheelDiameter: 100,
      }),
      wheel({ maxRPM: 15300, diameter: 100 }),
    );
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('4. 경계값 — 그라인더 12000rpm/125mm + 숫돌 12000rpm/125mm 연삭 → COMPATIBLE', () => {
    const result = matchSpecs(
      grinder({ noLoadRPM: 12000 }),
      wheel({ maxRPM: 12000, purpose: 'grinding' }),
    );
    // 같은 값은 통과다. 숫돌 정격이 기계 회전속도 "이상"이면 되기 때문이다.
    expect(result.verdict).toBe('COMPATIBLE');
    expect(checkOf(result, RULE.RPM_SAFETY).passed).toBe(true);
  });
});

describe('규칙엔진 — 부적합 케이스', () => {
  it('5. 숫돌 8500rpm < 그라인더 11000rpm → INCOMPATIBLE (RPM 위반)', () => {
    const result = matchSpecs(grinder(), wheel({ maxRPM: 8500 }));
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(checkOf(result, RULE.RPM_SAFETY).passed).toBe(false);
    expect(checkOf(result, RULE.RPM_SAFETY).reason).toBe(
      '숫돌 최고사용회전속도(8500rpm)가 그라인더 무부하 회전속도(11000rpm)보다 낮습니다. 파손·비산 위험이 있습니다.',
    );
  });

  it('6. 숫돌 지름 125mm > 그라인더 허용 100mm → INCOMPATIBLE (지름 위반)', () => {
    const result = matchSpecs(
      grinder({ model: 'GWS 750-100', maxWheelDiameter: 100 }),
      wheel(),
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(checkOf(result, RULE.RPM_SAFETY).passed).toBe(true);
    expect(checkOf(result, RULE.DIAMETER_FIT).passed).toBe(false);
    expect(checkOf(result, RULE.DIAMETER_FIT).reason).toBe(
      '숫돌 지름(125mm)이 그라인더 허용 최대 지름(100mm)을 초과합니다.',
    );
  });

  it('7. RPM과 지름을 동시에 위반 → INCOMPATIBLE, 원인 2건', () => {
    const result = matchSpecs(
      grinder({ noLoadRPM: 12000 }),
      wheel({
        maxRPM: 11000,
        diameter: 180,
        thickness: 6.0,
        purpose: 'grinding',
      }),
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(failureReasons(result)).toHaveLength(2);
  });

  it('8. 숫돌 9000rpm < 그라인더 10000rpm → INCOMPATIBLE', () => {
    const result = matchSpecs(
      grinder({
        model: 'GWS 750-100',
        noLoadRPM: 10000,
        maxWheelDiameter: 100,
      }),
      wheel({ maxRPM: 9000, diameter: 100 }),
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('9. 경계값 — 숫돌 10999rpm vs 그라인더 11000rpm, 1rpm 차이도 INCOMPATIBLE', () => {
    const result = matchSpecs(grinder(), wheel({ maxRPM: 10999 }));
    // 1rpm이라도 모자라면 통과시키지 않는다. 여유를 임의로 주지 않는다.
    expect(result.verdict).toBe('INCOMPATIBLE');
  });
});

describe('규칙엔진 — 판정불가 케이스', () => {
  it('10. 그라인더 RPM null → UNDETERMINED', () => {
    const result = matchSpecs(grinder({ noLoadRPM: null }), wheel());
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.REQUIRED_VALUES).passed).toBeNull();
    expect(checkOf(result, RULE.RPM_SAFETY).passed).toBeNull();
  });

  it('11. 숫돌 RPM null → UNDETERMINED', () => {
    const result = matchSpecs(grinder(), wheel({ maxRPM: null }));
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.REQUIRED_VALUES).passed).toBeNull();
  });

  it('12. 그라인더·숫돌 RPM 둘 다 null → UNDETERMINED', () => {
    const result = matchSpecs(
      grinder({ noLoadRPM: null }),
      wheel({ maxRPM: null }),
    );
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.REQUIRED_VALUES).grinderValue).toBeNull();
    expect(checkOf(result, RULE.REQUIRED_VALUES).wheelValue).toBeNull();
  });

  it('13. 그라인더 허용 지름 null → 지름 항목만 판정불가, RPM은 적합', () => {
    const result = matchSpecs(grinder({ maxWheelDiameter: null }), wheel());
    expect(checkOf(result, RULE.RPM_SAFETY).passed).toBe(true);
    expect(checkOf(result, RULE.DIAMETER_FIT).passed).toBeNull();
    // 허용 지름을 모르면 적합하다고 말할 수 없다.
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('14. 그라인더 confidence low → UNDETERMINED', () => {
    const result = matchSpecs(grinder({ confidence: 'low' }), wheel());
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.CONFIDENCE).passed).toBeNull();
    expect(checkOf(result, RULE.CONFIDENCE).reason).toBe(
      '라벨 인식 신뢰도가 낮습니다. 재촬영하거나 수동으로 값을 입력하세요.',
    );
  });

  it('15. 숫돌 confidence low → UNDETERMINED', () => {
    const result = matchSpecs(grinder(), wheel({ confidence: 'low' }));
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.CONFIDENCE).passed).toBeNull();
  });
});

describe('규칙엔진 — 용도 관련', () => {
  it('16. purpose unknown + 나머지 적합 → COMPATIBLE + 용도 경고', () => {
    const result = matchSpecs(grinder(), wheel({ purpose: 'unknown' }));
    // 용도 미인식은 경고 수준이다. 전체 판정을 끌어내리지 않는다.
    expect(result.verdict).toBe('COMPATIBLE');
    expect(checkOf(result, RULE.PURPOSE).passed).toBeNull();
    expect(checkOf(result, RULE.PURPOSE).reason).toBe(
      '숫돌 용도(절단/연삭)를 인식하지 못했습니다. 라벨을 직접 확인하세요.',
    );
  });

  it('17. purpose cutting + RPM·지름 적합 → COMPATIBLE', () => {
    const result = matchSpecs(grinder(), wheel({ purpose: 'cutting' }));
    expect(result.verdict).toBe('COMPATIBLE');
    expect(checkOf(result, RULE.PURPOSE).passed).toBe(true);
    expect(checkOf(result, RULE.PURPOSE).wheelValue).toBe('절단용');
  });
});

describe('규칙엔진 — 복합 시나리오', () => {
  it('18. 숫돌 RPM null + confidence low → UNDETERMINED', () => {
    const result = matchSpecs(
      grinder(),
      wheel({ maxRPM: null, confidence: 'low' }),
    );
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.REQUIRED_VALUES).passed).toBeNull();
    expect(checkOf(result, RULE.CONFIDENCE).passed).toBeNull();
  });

  it('19. 값 정상 + purpose unknown + confidence medium → COMPATIBLE + 경고', () => {
    const result = matchSpecs(
      grinder({ confidence: 'medium' }),
      wheel({ purpose: 'unknown', confidence: 'medium' }),
    );
    // medium은 차단 사유가 아니다. low만 판정을 막는다.
    expect(result.verdict).toBe('COMPATIBLE');
    expect(checkOf(result, RULE.CONFIDENCE).passed).toBe(true);
    expect(checkOf(result, RULE.PURPOSE).passed).toBeNull();
  });

  it('20. 모든 항목 통과 → COMPATIBLE, 5개 검사 전부 true', () => {
    const result = matchSpecs(grinder(), wheel());
    expect(result.verdict).toBe('COMPATIBLE');
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((check) => check.passed === true)).toBe(true);
  });
});

describe('규칙엔진 — 작업 목적 대조', () => {
  it('작업을 고르지 않으면 이 항목 자체가 없다 (기존 동작 유지)', () => {
    const result = matchSpecs(grinder(), wheel());
    expect(
      result.checks.find((c) => c.rule === RULE.WORK_PURPOSE),
    ).toBeUndefined();
    expect(result.checks).toHaveLength(5);
  });

  it('절단 작업 + 절단용 숫돌 → 통과', () => {
    const result = matchSpecs(grinder(), wheel({ purpose: 'cutting' }), {
      declaredPurpose: 'cutting',
    });
    expect(checkOf(result, RULE.WORK_PURPOSE).passed).toBe(true);
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('연삭 작업인데 절단용 숫돌 → INCOMPATIBLE', () => {
    // 절단날에 측면 하중을 주면 깨진다. 경고가 아니라 부적합이다.
    const result = matchSpecs(grinder(), wheel({ purpose: 'cutting' }), {
      declaredPurpose: 'grinding',
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(checkOf(result, RULE.WORK_PURPOSE).passed).toBe(false);
    expect(checkOf(result, RULE.WORK_PURPOSE).reason).toContain('측면 하중');
  });

  it('절단 작업인데 연삭용 숫돌 → INCOMPATIBLE', () => {
    const result = matchSpecs(grinder(), wheel({ purpose: 'grinding' }), {
      declaredPurpose: 'cutting',
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('작업을 골랐는데 숫돌 용도를 못 읽으면 → UNDETERMINED', () => {
    // 작업을 선언한 이상 "모르겠다"를 통과시키지 않는다.
    // 작업을 고르지 않았을 때(테스트 16)와 결과가 달라지는 지점이다.
    const result = matchSpecs(grinder(), wheel({ purpose: 'unknown' }), {
      declaredPurpose: 'cutting',
    });
    expect(result.verdict).toBe('UNDETERMINED');
    expect(checkOf(result, RULE.WORK_PURPOSE).passed).toBeNull();
  });

  it('목적이 맞아도 RPM이 부족하면 여전히 부적합이다', () => {
    // 새 규칙이 기존 안전 판정을 덮어쓰지 않는지 확인한다.
    const result = matchSpecs(
      grinder(),
      wheel({ maxRPM: 8500, purpose: 'cutting' }),
      { declaredPurpose: 'cutting' },
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(checkOf(result, RULE.RPM_SAFETY).passed).toBe(false);
    expect(checkOf(result, RULE.WORK_PURPOSE).passed).toBe(true);
  });

  it('작업 목적 항목은 그라인더·숫돌 값을 나란히 보여준다', () => {
    const result = matchSpecs(grinder(), wheel({ purpose: 'grinding' }), {
      declaredPurpose: 'cutting',
    });
    const check = checkOf(result, RULE.WORK_PURPOSE);
    expect(check.grinderValue).toBe('절단');
    expect(check.wheelValue).toBe('연삭용');
  });
});

describe('규칙엔진 — 결과 형식', () => {
  it('timestamp는 ISO 8601 문자열로 기록된다', () => {
    const result = matchSpecs(grinder(), wheel(), {
      now: new Date('2026-08-31T09:00:00.000Z'),
    });
    expect(result.timestamp).toBe('2026-08-31T09:00:00.000Z');
  });

  it('받침 유무에 맞는 조사를 붙인다', () => {
    expect(withParticle('회전속도', '을', '를')).toBe('회전속도를');
    expect(withParticle('최고사용회전속도', '을', '를')).toBe(
      '최고사용회전속도를',
    );
    expect(withParticle('지름값', '을', '를')).toBe('지름값을');
    // 한글이 아닌 글자로 끝나면 받침 없는 쪽을 쓴다.
    expect(withParticle('RPM', '을', '를')).toBe('RPM를');
  });

  it('필수값 누락 사유에 "을(를)" 같은 표기가 남지 않는다', () => {
    const result = matchSpecs(grinder({ noLoadRPM: null }), wheel());
    const reason = checkOf(result, RULE.REQUIRED_VALUES).reason;
    expect(reason).toContain('그라인더 무부하 회전속도를 읽지 못했습니다');
    expect(reason).not.toContain('을(를)');
  });

  it('모든 검사 항목은 한국어 사유를 반드시 가진다', () => {
    const result = matchSpecs(
      grinder({ noLoadRPM: null, maxWheelDiameter: null, confidence: 'low' }),
      wheel({
        maxRPM: null,
        diameter: null,
        purpose: 'unknown',
        confidence: 'low',
      }),
    );
    for (const check of result.checks) {
      expect(check.reason.length).toBeGreaterThan(0);
    }
  });
});
