// 규칙엔진 단위 테스트 — 프로젝트에서 가장 중요한 테스트다.
// 판정 로직을 바꿀 때는 반드시 이 20개 시나리오를 먼저 확인한다.

import { describe, expect, it } from 'vitest';
import {
  RULE,
  checkMountingSpec,
  checkPeripheralSpeed,
  checkUnitConsistency,
  failureReasons,
  matchSpecs,
  undeterminedReasons,
  peripheralSpeedMps,
  withParticle,
} from './engine';
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
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
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

  it('20. 모든 항목 통과 → COMPATIBLE, 차단 항목이 하나도 없다', () => {
    const result = matchSpecs(grinder(), wheel());
    expect(result.verdict).toBe('COMPATIBLE');
    // 경고 항목(외관 손상 등)은 언제나 null로 남는다. 사진으로 확정할 수 없기
    // 때문이다. 그래서 "전부 true"가 아니라 "차단 항목이 없다"로 확인한다.
    const blocking = result.checks.filter((check) => !check.advisory);
    expect(blocking.every((check) => check.passed === true)).toBe(true);
  });
});

describe('규칙엔진 — 작업 목적 대조', () => {
  it('작업을 고르지 않으면 이 항목 자체가 없다 (기존 동작 유지)', () => {
    const result = matchSpecs(grinder(), wheel());
    expect(
      result.checks.find((c) => c.rule === RULE.WORK_PURPOSE),
    ).toBeUndefined();
    expect(result.verdict).toBe('COMPATIBLE');
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

describe('규칙엔진 — 숫돌 종류 (사진으로 판별)', () => {
  it('결합숫돌이면 통과한다', () => {
    const result = matchSpecs(
      grinder(),
      wheel({ wheelType: 'bonded_abrasive' }),
    );
    expect(checkOf(result, RULE.WHEEL_TYPE).passed).toBe(true);
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it.each([
    ['diamond', '다이아몬드'],
    ['cup_wheel', '컵휠'],
    ['flap_disc', '플랩디스크'],
    ['wire_brush', '와이어 브러시'],
  ] as const)('%s 는 이 앱이 다루지 않으므로 UNDETERMINED', (type, label) => {
    // 규격 체계가 달라 같은 규칙을 적용하면 조용히 틀린 답이 나온다.
    // 부적합이 아니라 판정불가다. 위험하다는 뜻이 아니라 판단할 수 없다는 뜻이다.
    const result = matchSpecs(grinder(), wheel({ wheelType: type }));
    expect(result.verdict).toBe('UNDETERMINED');
    const check = checkOf(result, RULE.WHEEL_TYPE);
    expect(check.passed).toBeNull();
    expect(check.wheelValue).toBe(label);
  });

  it('종류를 못 봤으면 경고만 하고 판정을 막지 않는다', () => {
    // 글자만 읽는 Tesseract 경로는 형태를 볼 수 없어 항상 unknown이다.
    // 이걸 차단하면 오프라인 모드가 통째로 쓸모없어진다.
    const result = matchSpecs(grinder(), wheel({ wheelType: 'unknown' }));
    expect(result.verdict).toBe('COMPATIBLE');
    expect(checkOf(result, RULE.WHEEL_TYPE).advisory).toBe(true);
  });

  it('미지원 종류라도 RPM 위반이 있으면 부적합이 먼저다', () => {
    const result = matchSpecs(
      grinder(),
      wheel({ wheelType: 'diamond', maxRPM: 8500 }),
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
  });
});

describe('규칙엔진 — 외관 손상 (한 방향으로만)', () => {
  it('손상이 보이면 경고하되 판정은 끌어내리지 않는다', () => {
    const result = matchSpecs(grinder(), wheel({ visibleDamage: 'suspected' }));
    const check = checkOf(result, RULE.VISIBLE_DAMAGE);
    expect(check.passed).toBeNull();
    expect(check.advisory).toBe(true);
    expect(check.reason).toContain('사용하지 말고');
  });

  it('손상이 안 보여도 통과로 치지 않는다', () => {
    // 사진에 안 보인다고 손상이 없는 것이 아니다. 미세균열은 타음검사로 확인한다.
    const result = matchSpecs(
      grinder(),
      wheel({ visibleDamage: 'none_visible' }),
    );
    const check = checkOf(result, RULE.VISIBLE_DAMAGE);
    expect(check.passed).not.toBe(true);
    expect(check.reason).toContain('타음검사');
  });

  it('어느 값이든 적합 판정을 막지 않는다', () => {
    for (const damage of ['suspected', 'none_visible', 'unknown'] as const) {
      expect(
        matchSpecs(grinder(), wheel({ visibleDamage: damage })).verdict,
      ).toBe('COMPATIBLE');
    }
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

describe('원주속도 교차검증', () => {
  function speedCheck(g: GrinderSpec, w: WheelSpec) {
    const check = checkPeripheralSpeed(g, w);
    if (check === null) throw new Error('검사 항목이 만들어지지 않았다');
    return check;
  }

  it('v = π × 지름 × rpm / 60 을 계산한다', () => {
    // Φ125 12,200rpm → 시중 절단날의 설계 속도 80m/s 근처
    expect(peripheralSpeedMps(125, 12200)).toBeCloseTo(79.85, 1);
  });

  it('0 이하 값은 계산하지 않는다', () => {
    // 0rpm·Φ0 오독을 "가장자리 속도 0m/s"로 계산해버리면 원주속도 검증이
    // 먼저 걸려서, 진짜 원인(회전속도가 0)이 가려진다. 계산 불가로 두면
    // RPM 검사가 제 이름으로 부적합을 낸다.
    expect(peripheralSpeedMps(125, 0)).toBeNull();
    expect(peripheralSpeedMps(0, 12200)).toBeNull();
    expect(peripheralSpeedMps(-125, 12200)).toBeNull();
  });

  it.each([
    ['Φ125 절단날', 125, 12200],
    ['Φ100 절단날', 100, 15300],
    ['Φ115 절단날', 115, 13300],
    ['Φ180 절단날', 180, 8500],
    ['Φ230 절단날', 230, 6600],
    ['Φ150 탁상용 숫돌', 150, 4500],
  ])('실제 제품 조합 %s 은 걸리지 않는다', (_label, diameter, maxRPM) => {
    // 멀쩡한 숫돌이 막히면 작업자는 이 앱을 끄고 그냥 쓴다.
    const check = speedCheck(grinder(), wheel({ diameter, maxRPM }));
    expect(check.passed).toBe(true);
  });

  it('rpm에서 자리 하나가 빠지면 걸린다 (12200 → 1220)', () => {
    const check = speedCheck(grinder(), wheel({ maxRPM: 1220 }));
    expect(check.passed).toBeNull();
    expect(check.reason).toContain('숫돌');
  });

  it('지름을 작게 읽으면 걸린다 (Φ125 → Φ12.5)', () => {
    const check = speedCheck(grinder(), wheel({ diameter: 12.5 }));
    expect(check.passed).toBeNull();
  });

  it('rpm을 크게 읽으면 걸린다 (12200 → 122000)', () => {
    const check = speedCheck(grinder(), wheel({ maxRPM: 122000 }));
    expect(check.passed).toBeNull();
  });

  it('그라인더 쪽 오독도 잡는다', () => {
    const check = speedCheck(grinder({ noLoadRPM: 1100 }), wheel());
    expect(check.passed).toBeNull();
    expect(check.reason).toContain('그라인더');
  });

  it('양쪽 다 이상하면 둘 다 지목한다', () => {
    const check = speedCheck(
      grinder({ noLoadRPM: 1100 }),
      wheel({ maxRPM: 1220 }),
    );
    expect(check.reason).toContain('그라인더와 숫돌');
  });

  it('조사를 올바르게 붙인다', () => {
    const check = speedCheck(grinder(), wheel({ maxRPM: 1220 }));
    expect(check.reason).not.toContain('은(는)');
  });

  it('상식 범위 경계 안쪽은 통과한다', () => {
    // Φ125 2,300rpm ≈ 15.1m/s / Φ125 16,700rpm ≈ 109.3m/s
    expect(speedCheck(grinder(), wheel({ maxRPM: 2300 })).passed).toBe(true);
    expect(speedCheck(grinder(), wheel({ maxRPM: 16700 })).passed).toBe(true);
  });

  it('상식 범위 바깥은 걸린다', () => {
    // Φ125 2,280rpm ≈ 14.9m/s / Φ125 16,900rpm ≈ 110.6m/s
    expect(speedCheck(grinder(), wheel({ maxRPM: 2280 })).passed).toBeNull();
    expect(speedCheck(grinder(), wheel({ maxRPM: 16900 })).passed).toBeNull();
  });

  it('양쪽 다 계산할 수 없으면 항목 자체를 만들지 않는다', () => {
    // 값이 없는 것은 필수값 검사가 이미 잡는다. 같은 사유를 두 번 띄우지 않는다.
    const check = checkPeripheralSpeed(
      grinder({ noLoadRPM: null, maxWheelDiameter: null }),
      wheel({ maxRPM: null, diameter: null }),
    );
    expect(check).toBeNull();
  });

  it('한쪽만 계산할 수 있으면 그쪽만 본다', () => {
    const check = speedCheck(grinder({ noLoadRPM: null }), wheel());
    expect(check.passed).toBe(true);
    expect(check.grinderValue).toBeNull();
    expect(check.wheelValue).toBe('80m/s');
  });
});

describe('원주속도 검증이 조용한 오판정을 막는다', () => {
  it('그라인더 rpm을 낮게 읽으면 RPM 검사는 통과하지만 판정불가가 된다', () => {
    // 11,000 → 1,100 으로 읽으면 어떤 숫돌이든 "숫돌이 더 빠름"이 되어
    // 그냥 적합으로 나가버린다. 가장 위험한 오독 방향이다.
    const misread = grinder({ noLoadRPM: 1100 });
    const result = matchSpecs(misread, wheel());

    const rpm = result.checks.find((c) => c.rule === RULE.RPM_SAFETY);
    expect(rpm?.passed).toBe(true);
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('숫돌 지름을 작게 읽으면 지름 검사는 통과하지만 판정불가가 된다', () => {
    const result = matchSpecs(grinder(), wheel({ diameter: 12.5 }));

    const fit = result.checks.find((c) => c.rule === RULE.DIAMETER_FIT);
    expect(fit?.passed).toBe(true);
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('경고 항목이 아니므로 판정을 실제로 끌어내린다', () => {
    const result = matchSpecs(grinder(), wheel({ maxRPM: 1220 }));
    const check = result.checks.find((c) => c.rule === RULE.PERIPHERAL_SPEED);
    expect(check?.advisory).toBeUndefined();
  });

  it('명백한 부적합은 판정불가로 덮이지 않는다', () => {
    // 부적합이 판정불가보다 우선한다. 값이 의심스러워도 위반은 위반이다.
    const result = matchSpecs(
      grinder(),
      wheel({ maxRPM: 1220, diameter: 200 }),
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
  });
});

describe('undeterminedReasons', () => {
  it('판정불가 사유를 모은다', () => {
    const result = matchSpecs(grinder({ noLoadRPM: null }), wheel());
    const reasons = undeterminedReasons(result);

    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(' ')).toContain('회전속도');
  });

  it('경고 수준 항목도 빠뜨리지 않는다', () => {
    // 경고 항목(advisory)은 전체 판정을 끌어내리지 않지만, 사용자에게는
    // 반드시 보여야 한다. 여기서 걸러버리면 "사진으로는 미세균열을 확인할 수
    // 없다"는 안내가 화면에서 사라진다.
    const result = matchSpecs(grinder(), wheel({ visibleDamage: 'unknown' }));
    const damage = result.checks.find((c) => c.rule === RULE.VISIBLE_DAMAGE);

    expect(damage?.passed).toBeNull();
    expect(damage?.advisory).toBe(true);
    expect(undeterminedReasons(result)).toContain(damage?.reason);
  });

  it('통과한 항목은 넣지 않는다', () => {
    const result = matchSpecs(grinder(), wheel());
    for (const reason of undeterminedReasons(result)) {
      const check = result.checks.find((c) => c.reason === reason);
      expect(check?.passed).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 안전 판독 계층 시나리오
//
// 라벨을 잘못 읽었을 때 앱이 어떻게 행동하는지 고정한다.
// 원칙: 값을 믿을 수 없으면 통과가 아니라 판정불가.
// ─────────────────────────────────────────────────────────────

/** 원본 표시까지 갖춘 숫돌. markings가 있어야 표기 검사가 돈다. */
function marked(
  overrides: Partial<WheelSpec> = {},
  markings: Partial<WheelSpec['markings']> = {},
): WheelSpec {
  return wheel({
    markings: {
      labeledRPM: 12200,
      peripheralSpeedMps: null,
      boreDiameter: 22.23,
      ...markings,
    },
    rpmSource: 'label',
    ...overrides,
  });
}

describe('1. 공구와 숫돌의 회전수가 맞지 않는 경우', () => {
  it('숫돌이 더 느리면 부적합이다', () => {
    const result = matchSpecs(grinder(), marked({ maxRPM: 8500 }));
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('같은 값은 통과한다 — 경계에 여유를 주지 않는다', () => {
    const result = matchSpecs(grinder({ noLoadRPM: 12200 }), marked());
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('1rpm 부족해도 부적합이다', () => {
    const result = matchSpecs(grinder({ noLoadRPM: 12201 }), marked());
    expect(result.verdict).toBe('INCOMPATIBLE');
  });
});

describe('2. 회전수 단위가 다르거나 숫자가 애매한 경우', () => {
  it('rpm과 m/s 표기가 서로 맞으면 통과한다', () => {
    // Φ125 12,200rpm = 79.85m/s. 라벨의 "80m/s"는 반올림이다.
    const w = marked({}, { peripheralSpeedMps: 80 });
    const check = checkUnitConsistency(w);
    expect(check?.passed).toBe(true);
  });

  it('두 표기가 어긋나면 판정불가로 막는다', () => {
    // 회전수 자체는 그라인더보다 높아 RPM 검사를 통과한다. 그런데 라벨의
    // m/s 표기(8)가 rpm 표기(12,200 ≈ 80m/s)와 10배 어긋난다. 둘 중 하나를
    // 잘못 읽은 것이고 어느 쪽인지 알 수 없으므로 통과시키지 않는다.
    const w = marked({}, { peripheralSpeedMps: 8 });
    const check = checkUnitConsistency(w);
    expect(check?.passed).toBeNull();
    expect(check?.advisory).toBeUndefined(); // 경고가 아니라 차단이다
    expect(matchSpecs(grinder(), w).verdict).toBe('UNDETERMINED');
  });

  it('표기가 하나뿐이면 대조하지 않는다 — 항목 자체가 없다', () => {
    expect(checkUnitConsistency(marked())).toBeNull();
  });

  it('지름을 모르면 두 표기를 견줄 수 없다', () => {
    // rpm ↔ m/s 환산에는 지름이 필요하다. 없으면 비교 자체가 성립하지 않는다.
    const w = marked({ diameter: null }, { peripheralSpeedMps: 80 });
    expect(checkUnitConsistency(w)).toBeNull();
  });

  it('m/s가 0이면 나눗셈을 하지 않는다', () => {
    // 0으로 나누면 Infinity%가 나와 그대로 화면에 나간다.
    const w = marked({}, { peripheralSpeedMps: 0 });
    expect(checkUnitConsistency(w)).toBeNull();
  });

  it('rpm이 0이면 환산이 성립하지 않아 대조하지 않는다', () => {
    const w = marked({}, { labeledRPM: 0, peripheralSpeedMps: 80 });
    expect(checkUnitConsistency(w)).toBeNull();
  });

  it('m/s에서 환산했으면 출처를 남긴다', () => {
    const w = marked(
      { rpmSource: 'converted' },
      { labeledRPM: null, peripheralSpeedMps: 80 },
    );
    expect(w.rpmSource).toBe('converted');
    expect(w.markings?.peripheralSpeedMps).toBe(80);
  });
});

describe('3. 지름·장착 규격·종류가 누락된 경우', () => {
  it('지름이 없으면 판정불가다', () => {
    const result = matchSpecs(grinder(), marked({ diameter: null }));
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('내경을 못 읽으면 알리되 판정을 막지는 않는다', () => {
    // 그라인더 명판에 축 규격이 없어 대조할 상대가 없다. 막으면 모든 숫돌이 막힌다.
    const w = marked({}, { boreDiameter: null });
    const check = checkMountingSpec(w);
    expect(check?.passed).toBeNull();
    expect(check?.advisory).toBe(true);
    expect(matchSpecs(grinder(), w).verdict).toBe('COMPATIBLE');
  });

  it('내경을 읽어도 판정에 쓰지 않는다 — 통용 규격을 기준으로 삼지 않는다', () => {
    const check = checkMountingSpec(marked({}, { boreDiameter: 16 }));
    expect(check?.advisory).toBe(true);
    expect(check?.reason).toContain('직접 확인');
  });

  it('종류를 모르면 통과하고, 지원하지 않는 종류면 판정을 멈춘다', () => {
    expect(
      matchSpecs(grinder(), marked({ wheelType: 'unknown' })).verdict,
    ).toBe('COMPATIBLE');
    // 판정불가지 부적합이 아니다. 다이아몬드날이 '나쁜 숫돌'이라는 뜻이 아니라
    // 이 앱의 규칙이 적용되지 않는다는 뜻이다. 부적합이라 하면 거짓말이 된다.
    expect(
      matchSpecs(grinder(), marked({ wheelType: 'diamond' })).verdict,
    ).toBe('UNDETERMINED');
  });
});

describe('4. 두 영역에서 서로 다른 값이 인식된 경우', () => {
  it('rpm 표기와 원주속도 표기가 다르면 어느 쪽도 믿지 않는다', () => {
    const w = marked(
      { maxRPM: 12200 },
      { labeledRPM: 12200, peripheralSpeedMps: 8 },
    );
    expect(matchSpecs(grinder(), w).verdict).toBe('UNDETERMINED');
  });

  it('RPM 검사는 통과해도 표기 충돌이 판정을 끌어내린다', () => {
    const w = marked(
      { maxRPM: 12200 },
      { labeledRPM: 12200, peripheralSpeedMps: 8 },
    );
    const result = matchSpecs(grinder(), w);
    expect(result.checks.find((c) => c.rule === RULE.RPM_SAFETY)?.passed).toBe(
      true,
    );
    expect(result.verdict).toBe('UNDETERMINED');
  });
});

describe('5. 라벨이 흐리거나 반사광·마모·가림이 있는 경우', () => {
  it('값을 못 읽으면 통과가 아니라 판정불가다', () => {
    const result = matchSpecs(
      grinder(),
      marked({ maxRPM: null, diameter: null, confidence: 'low' }),
    );
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('일부만 읽혀도 빠진 값을 채워 통과시키지 않는다', () => {
    const result = matchSpecs(grinder(), marked({ maxRPM: null }));
    expect(result.verdict).toBe('UNDETERMINED');
  });
});

describe('6. 신뢰도가 낮지만 그럴듯한 숫자가 나온 경우', () => {
  it('값이 다 있고 규칙을 다 통과해도 신뢰도가 낮으면 판정불가다', () => {
    // 가장 위험한 경우다. 숫자가 그럴듯해서 사람이 의심하지 않는다.
    const w = marked({ confidence: 'low' });
    const result = matchSpecs(grinder(), w);

    expect(result.checks.find((c) => c.rule === RULE.RPM_SAFETY)?.passed).toBe(
      true,
    );
    expect(
      result.checks.find((c) => c.rule === RULE.DIAMETER_FIT)?.passed,
    ).toBe(true);
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('그라인더 쪽 신뢰도가 낮아도 마찬가지다', () => {
    const result = matchSpecs(grinder({ confidence: 'low' }), marked());
    expect(result.verdict).toBe('UNDETERMINED');
  });
});

describe('7. 지원하지 않는 숫돌 형식', () => {
  it.each([
    ['flap_disc'],
    ['cup_wheel'],
    ['diamond'],
    ['wire_brush'],
    ['other'],
  ] as const)('%s 는 이 앱이 다루지 않으므로 판정하지 않는다', (type) => {
    // 부적합이 아니라 판정불가다. 이 앱의 대조 규칙(회전속도·지름·용도)이
    // 이 형식들에는 그대로 적용되지 않는다. 모르면 모른다고 해야 한다.
    const result = matchSpecs(grinder(), marked({ wheelType: type }));
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('형태를 못 본 경우(unknown)는 막지 않고 경고로 남긴다', () => {
    // 사진에 형태가 안 보이는 것과, 보고 나서 다른 종류인 것은 다르다.
    const check = matchSpecs(
      grinder(),
      marked({ wheelType: 'unknown' }),
    ).checks;
    expect(check.find((c) => c.rule === RULE.WHEEL_TYPE)?.advisory).toBe(true);
  });
});

describe('8. 정상 fixture 회귀', () => {
  it('멀쩡한 조합은 계속 적합으로 나온다', () => {
    const result = matchSpecs(grinder(), marked(), {
      declaredPurpose: 'cutting',
    });
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('원본 표시가 없는 옛 기록도 깨지지 않는다', () => {
    // markings 도입 전에 저장된 기록이다. 새 검사는 항목 자체를 만들지 않는다.
    const old = wheel();
    expect(old.markings).toBeUndefined();
    expect(checkUnitConsistency(old)).toBeNull();
    expect(checkMountingSpec(old)).toBeNull();
    expect(matchSpecs(grinder(), old).verdict).toBe('COMPATIBLE');
  });
});
