// 부속품 Profile 테스트.
//
// 1. 일반 결합숫돌 Profile이 기존 엔진 동작을 그대로 옮겼는지.
// 2. Profile이 없는 종류는 지원하지 않는 종류로 남는지(기본 Profile로 대신하지 않는지).
// 3. 조건 대조가 "맞다"를 만들지 않고, 모르면 unknown, 모순이면 conflict인지.
// 4. 조건 대조가 규격 판정(verdict)을 움직이지 않는지.

import { describe, expect, it } from 'vitest';

import { RULE, matchSpecs } from './engine';
import {
  ACCESSORY_PROFILES,
  BONDED_ABRASIVE_PROFILE,
  PROFILE_FIELD_USE,
  UNKNOWN_WORK_CONDITIONS,
  isSupportedType,
  profileConditions,
  profileFor,
  profileRef,
} from './profiles';
import type {
  AccessoryProfile,
  GrinderSpec,
  ProfileCondition,
  WheelSpec,
  WheelType,
} from './types';

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
    visibleDamage: 'unknown',
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

/** 테스트용 Profile. 결합숫돌을 바탕으로 필요한 정책만 바꾼다 */
function profile(overrides: Partial<AccessoryProfile> = {}): AccessoryProfile {
  return { ...BONDED_ABRASIVE_PROFILE, ...overrides };
}

const byKey = (conditions: ProfileCondition[], key: ProfileCondition['key']) =>
  conditions.find((condition) => condition.key === key);

const ALL_TYPES: WheelType[] = [
  'bonded_abrasive',
  'flap_disc',
  'cup_wheel',
  'diamond',
  'wire_brush',
  'other',
  'unknown',
];

describe('일반 결합숫돌 Profile — 기존 동작 이전', () => {
  it('결합숫돌이 첫 Profile이며 규격을 대조하는 종류다', () => {
    expect(profileFor('bonded_abrasive')).toBe(BONDED_ABRASIVE_PROFILE);
    expect(isSupportedType('bonded_abrasive')).toBe(true);
    expect(BONDED_ABRASIVE_PROFILE.family).toBe('bonded_abrasive');
  });

  it('기존 규칙이 요구하던 것을 그대로 적는다', () => {
    // RPM·지름은 판정을 막는 규칙(Rule 1~3), 장착 규격은 경고 수준(advisory)이었다.
    expect(BONDED_ABRASIVE_PROFILE.specs).toEqual({
      rpm: 'required',
      diameter: 'required',
      mounting: 'advisory',
    });
    expect(BONDED_ABRASIVE_PROFILE.allowedWork).toEqual([
      'cutting',
      'grinding',
    ]);
    expect(BONDED_ABRASIVE_PROFILE.expiryPolicy).toBe('label_marked_month');
    expect(BONDED_ABRASIVE_PROFILE.trialRunPolicy).toBe('kr_osh_122');
    expect(BONDED_ABRASIVE_PROFILE.conditionGate).toBe('wheel_condition_v1');
    expect(BONDED_ABRASIVE_PROFILE.requiredPhotos).toEqual([
      'front',
      'back',
      'edge',
      'bore',
    ]);
  });

  it('근거를 확인하지 못한 항목은 unverified로 둔다 — 관행으로 채우지 않는다', () => {
    expect(BONDED_ABRASIVE_PROFILE.allowedMaterials).toBe('unverified');
    expect(BONDED_ABRASIVE_PROFILE.cooling).toBe('unverified');
    expect(BONDED_ABRASIVE_PROFILE.rotationDirection).toBe('unverified');
    expect(BONDED_ABRASIVE_PROFILE.equipment.flange).toBe('unverified');
  });

  it('근거 문서와 버전을 함께 남긴다', () => {
    expect(BONDED_ABRASIVE_PROFILE.sources).toEqual(['krOsh', 'kosha', 'osa']);
    expect(BONDED_ABRASIVE_PROFILE.version).toMatch(
      /^\d{4}\.\d{2}\.\d{2}-r\d+$/,
    );
    expect(profileRef('bonded_abrasive')).toEqual({
      type: 'bonded_abrasive',
      version: BONDED_ABRASIVE_PROFILE.version,
    });
  });
});

describe('Profile이 없는 종류', () => {
  it('결합숫돌 말고는 Profile이 없고 지원하지 않는 종류다', () => {
    for (const type of ALL_TYPES.filter((t) => t !== 'bonded_abrasive')) {
      expect(profileFor(type)).toBeNull();
      expect(isSupportedType(type)).toBe(false);
      expect(profileRef(type)).toBeNull();
    }
    expect(Object.keys(ACCESSORY_PROFILES)).toEqual(['bonded_abrasive']);
  });

  it('Profile이 없는 종류는 엔진에서 판정불가로 끝난다 — 이전 동작 그대로', () => {
    for (const type of ALL_TYPES.filter((t) => t !== 'bonded_abrasive')) {
      const result = matchSpecs(grinder(), wheel({ wheelType: type }), {
        profile: BONDED_ABRASIVE_PROFILE,
        today: '2026-09-17',
      });
      const check = result.checks.find((c) => c.rule === RULE.WHEEL_TYPE);
      expect(check?.passed).toBeNull();
      expect(result.verdict).toBe('UNDETERMINED');
    }
  });

  it('supported가 false인 Profile도 지원하지 않는 종류로 본다', () => {
    // 나중에 Profile만 먼저 적어 두는 경우. supported를 켜기 전에는 대조하지 않는다.
    const draft = profile({ type: 'flap_disc', supported: false });
    expect(draft.supported).toBe(false);
    expect(isSupportedType('flap_disc')).toBe(false);
  });
});

describe('profileConditions — 입력이 없을 때', () => {
  it('구기록처럼 입력이 없으면 모두 모름·직접 확인이다 — 맞다고 하지 않는다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder(),
      wheel(),
    );

    expect(conditions).toEqual([
      { key: 'material', status: 'unknown', code: 'material.unknown' },
      { key: 'cooling', status: 'unknown', code: 'cooling.unknown' },
      { key: 'spindle', status: 'unknown', code: 'spindle.unknown' },
      { key: 'guard', status: 'unknown', code: 'guard.unknown' },
      { key: 'guardSize', status: 'unknown', code: 'guardSize.unknown' },
      { key: 'rotation', status: 'manual_check', code: 'rotation.unverified' },
    ]);
  });

  it('모름으로 고른 경우도 같다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      UNKNOWN_WORK_CONDITIONS,
      grinder({
        spindleThread: 'unknown',
        guardType: 'unknown',
        guardSize: null,
      }),
      wheel(),
    );
    expect(conditions.map((c) => c.status)).toEqual([
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'manual_check',
    ]);
  });

  it('어떤 입력에서도 "맞다"는 상태가 나오지 않는다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      { material: 'steel', cooling: 'dry' },
      grinder({ spindleThread: 'M14', guardType: 'cutting', guardSize: 125 }),
      wheel({ diameter: 125 }),
    );
    for (const condition of conditions) {
      expect(['unknown', 'manual_check', 'conflict']).toContain(
        condition.status,
      );
    }
  });
});

describe('profileConditions — 결합숫돌', () => {
  it('재료·건식/습식을 골라도 근거가 없으니 직접 확인이다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      { material: 'stainless', cooling: 'wet' },
      grinder(),
      wheel(),
    );
    expect(byKey(conditions, 'material')).toEqual({
      key: 'material',
      status: 'manual_check',
      code: 'material.unverified',
    });
    expect(byKey(conditions, 'cooling')).toEqual({
      key: 'cooling',
      status: 'manual_check',
      code: 'cooling.unverified',
    });
  });

  it('스핀들을 알아도 대조할 상대가 없어 직접 확인이다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder({ spindleThread: 'M14' }),
      wheel(),
    );
    expect(byKey(conditions, 'spindle')?.status).toBe('manual_check');
  });

  it('덮개가 없다고 고르면 어긋남이다(제122조 ①)', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder({ guardType: 'none' }),
      wheel(),
    );
    expect(byKey(conditions, 'guard')).toEqual({
      key: 'guard',
      status: 'conflict',
      code: 'guard.missing',
    });
  });

  it('덮개가 있어도 작업에 맞는지는 직접 확인이다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder({ guardType: 'grinding' }),
      wheel(),
    );
    expect(byKey(conditions, 'guard')?.code).toBe('guard.manualCheck');
  });

  it('덮개가 숫돌보다 작으면 어긋남, 같거나 크면 직접 확인이다 — 경계값', () => {
    const smaller = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder({ guardSize: 124.9 }),
      wheel({ diameter: 125 }),
    );
    expect(byKey(smaller, 'guardSize')?.status).toBe('conflict');

    const same = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder({ guardSize: 125 }),
      wheel({ diameter: 125 }),
    );
    // 같다고 해서 맞는 덮개라는 뜻은 아니다.
    expect(byKey(same, 'guardSize')).toEqual({
      key: 'guardSize',
      status: 'manual_check',
      code: 'guardSize.manualCheck',
    });
  });

  it('숫돌 지름을 모르면 덮개 크기와 대조하지 않는다 — 어긋남을 지어내지 않는다', () => {
    const conditions = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      grinder({ guardSize: 100 }),
      wheel({ diameter: null }),
    );
    expect(byKey(conditions, 'guardSize')?.status).toBe('manual_check');
  });
});

describe('profileConditions — 정책이 정해진 Profile', () => {
  it('허용 목록에 없으면 어긋남, 있어도 직접 확인이다', () => {
    const strict = profile({
      allowedMaterials: ['steel', 'stainless'],
      cooling: ['dry'],
    });

    const denied = profileConditions(
      strict,
      { material: 'stone_concrete', cooling: 'wet' },
      grinder(),
      wheel(),
    );
    expect(byKey(denied, 'material')?.code).toBe('material.notAllowed');
    expect(byKey(denied, 'material')?.status).toBe('conflict');
    expect(byKey(denied, 'cooling')?.code).toBe('cooling.notAllowed');

    const allowed = profileConditions(
      strict,
      { material: 'steel', cooling: 'dry' },
      grinder(),
      wheel(),
    );
    expect(byKey(allowed, 'material')).toEqual({
      key: 'material',
      status: 'manual_check',
      code: 'material.manualCheck',
    });
    expect(byKey(allowed, 'cooling')?.code).toBe('cooling.manualCheck');
  });

  it('덮개가 필요 없다는 근거가 있으면 덮개 항목을 빼고, 경고 수준이면 없음도 직접 확인이다', () => {
    const noGuard = profileConditions(
      profile({
        equipment: {
          ...BONDED_ABRASIVE_PROFILE.equipment,
          guard: 'not_applicable',
        },
      }),
      undefined,
      grinder({ guardType: 'none' }),
      wheel(),
    );
    expect(byKey(noGuard, 'guard')).toBeUndefined();
    expect(byKey(noGuard, 'guardSize')).toBeUndefined();

    const advisory = profileConditions(
      profile({
        equipment: { ...BONDED_ABRASIVE_PROFILE.equipment, guard: 'advisory' },
      }),
      undefined,
      grinder({ guardType: 'none' }),
      wheel(),
    );
    expect(byKey(advisory, 'guard')?.code).toBe('guard.manualCheck');
  });

  it('회전방향 정책에 따라 안내가 달라지고, 어느 방향이든 되면 항목을 뺀다', () => {
    const arrow = profileConditions(
      profile({ rotationDirection: 'follow_marked_arrow' }),
      undefined,
      grinder(),
      wheel(),
    );
    expect(byKey(arrow, 'rotation')?.code).toBe('rotation.followArrow');

    const any = profileConditions(
      profile({ rotationDirection: 'any' }),
      undefined,
      grinder(),
      wheel(),
    );
    expect(byKey(any, 'rotation')).toBeUndefined();
  });
});

describe('덮개 조건 — 조건 표와 최종 판정이 어긋나지 않는다', () => {
  const TODAY = '2026-09-17';
  /** 회전속도·지름·유효기한이 모두 맞는 결합숫돌 */
  const valid = () => wheel({ expiry: { year: 2099, month: 6 } });
  const run = (g: GrinderSpec, w: WheelSpec = valid()) =>
    matchSpecs(g, w, { profile: BONDED_ABRASIVE_PROFILE, today: TODAY });
  const guardCheck = (g: GrinderSpec, w: WheelSpec = valid()) =>
    run(g, w).checks.find((check) => check.rule === RULE.GUARD);

  it('1. RPM·지름 정상 + 덮개 있음 → 기존 판정(적합) 유지', () => {
    const result = run(grinder({ guardType: 'grinding', guardSize: 125 }));
    expect(result.verdict).toBe('COMPATIBLE');
    // 덮개가 있다는 입력을 통과(true)로 쓰지 않는다 — 직접 확인 경고다.
    expect(
      guardCheck(grinder({ guardType: 'grinding', guardSize: 125 })),
    ).toMatchObject({ passed: null, advisory: true });
  });

  it('2. RPM·지름 정상 + 덮개 없음 → 적합이 아니다(판정불가)', () => {
    const g = grinder({ guardType: 'none' });
    const result = run(g);
    expect(result.verdict).not.toBe('COMPATIBLE');
    expect(result.verdict).toBe('UNDETERMINED');
    expect(guardCheck(g)).toMatchObject({
      passed: null,
      detail: { code: 'guard.missing' },
    });
    expect(guardCheck(g)?.advisory).toBeFalsy();
    // 조건 표도 같은 것을 어긋남으로 적는다.
    const table = profileConditions(
      BONDED_ABRASIVE_PROFILE,
      undefined,
      g,
      valid(),
    );
    expect(byKey(table, 'guard')?.status).toBe('conflict');
  });

  it('3. 숫돌보다 작은 덮개 → 적합이 아니다(판정불가) — 경계값은 막지 않는다', () => {
    const small = grinder({ guardType: 'grinding', guardSize: 124 });
    expect(run(small).verdict).toBe('UNDETERMINED');
    expect(guardCheck(small)?.detail?.code).toBe('guard.smallerThanWheel');
    expect(
      byKey(
        profileConditions(BONDED_ABRASIVE_PROFILE, undefined, small, valid()),
        'guardSize',
      )?.status,
    ).toBe('conflict');

    // 크기 기준의 근거가 없어 같은 크기는 막지 않는다(어긋남이 아니다).
    expect(run(grinder({ guardSize: 125 })).verdict).toBe('COMPATIBLE');
  });

  it('4. 덮개 모름 → 없음으로 단정하지 않는다', () => {
    const unknown = grinder({ guardType: 'unknown', guardSize: null });
    expect(run(unknown).verdict).toBe('COMPATIBLE');
    expect(guardCheck(unknown)).toBeUndefined();
    expect(
      byKey(
        profileConditions(BONDED_ABRASIVE_PROFILE, undefined, unknown, valid()),
        'guard',
      )?.status,
    ).toBe('unknown');
  });

  it('5. 새 필드가 없는 구기록 입력도 판정과 항목이 이전과 같다', () => {
    const legacy = grinder();
    expect(legacy.guardType).toBeUndefined();
    const result = run(legacy);
    expect(result.verdict).toBe('COMPATIBLE');
    expect(result.checks.some((check) => check.rule === RULE.GUARD)).toBe(
      false,
    );
  });

  it('6. 근거 미확인(unverified) 항목은 판정에 영향이 없다', () => {
    const base = run(grinder());
    const withUnverified = matchSpecs(
      grinder({ spindleThread: 'M10' }),
      valid(),
      {
        // 재료·건식/습식·회전방향·플랜지 정책을 바꿔도 엔진은 읽지 않는다.
        profile: profile({
          allowedMaterials: ['stone_concrete'],
          cooling: ['wet'],
          rotationDirection: 'follow_marked_arrow',
          equipment: {
            ...BONDED_ABRASIVE_PROFILE.equipment,
            flange: 'required',
          },
        }),
        today: TODAY,
      },
    );
    expect(withUnverified.verdict).toBe(base.verdict);
    expect(withUnverified.checks).toEqual(base.checks);
  });

  it('8. Profile 없는 종류 → 덮개 입력과 무관하게 기존처럼 판정불가', () => {
    const result = matchSpecs(
      grinder({ guardType: 'none', guardSize: 10 }),
      wheel({ wheelType: 'diamond', expiry: { year: 2099, month: 6 } }),
      { profile: profileFor('diamond'), today: TODAY },
    );
    expect(result.verdict).toBe('UNDETERMINED');
    expect(result.checks.some((check) => check.rule === RULE.GUARD)).toBe(
      false,
    );
  });

  it('다른 종류의 Profile을 넘겨도 통과를 만들지 못한다', () => {
    const result = matchSpecs(
      grinder(),
      wheel({ wheelType: 'flap_disc', expiry: { year: 2099, month: 6 } }),
      { profile: BONDED_ABRASIVE_PROFILE, today: TODAY },
    );
    expect(result.verdict).toBe('UNDETERMINED');
    expect(
      result.checks.find((check) => check.rule === RULE.WHEEL_TYPE)?.detail
        ?.code,
    ).toBe('wheelType.unsupported');
    expect(result.checks.some((check) => check.rule === RULE.GUARD)).toBe(
      false,
    );
  });

  it('지원하지 않는 Profile(supported=false)은 판정불가다', () => {
    const result = matchSpecs(grinder(), valid(), {
      profile: profile({ supported: false }),
      today: TODAY,
    });
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('Profile이 null이면 판정불가다 — 기본 Profile로 대신하지 않는다', () => {
    expect(
      matchSpecs(grinder(), valid(), { profile: null, today: TODAY }).verdict,
    ).toBe('UNDETERMINED');
  });

  it('덮개가 필요 없다는 근거가 있는 Profile은 덮개 항목을 만들지 않는다', () => {
    const result = matchSpecs(grinder({ guardType: 'none' }), valid(), {
      profile: profile({
        equipment: {
          ...BONDED_ABRASIVE_PROFILE.equipment,
          guard: 'not_applicable',
        },
      }),
      today: TODAY,
    });
    expect(result.checks.some((check) => check.rule === RULE.GUARD)).toBe(
      false,
    );
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('덮개가 경고 수준인 Profile에서는 덮개 없음이 차단이 아니라 직접 확인이다', () => {
    const advisory = profile({
      equipment: { ...BONDED_ABRASIVE_PROFILE.equipment, guard: 'advisory' },
    });
    const result = matchSpecs(grinder({ guardType: 'none' }), valid(), {
      profile: advisory,
      today: TODAY,
    });
    expect(
      result.checks.find((check) => check.rule === RULE.GUARD)?.detail?.code,
    ).toBe('guard.manualCheck');
  });

  it('숫돌 지름을 모르면 덮개 크기로 어긋남을 만들지 않는다', () => {
    const check = guardCheck(
      grinder({ guardSize: 100 }),
      wheel({ diameter: null, expiry: { year: 2099, month: 6 } }),
    );
    expect(check?.detail?.code).toBe('guard.manualCheck');
  });
});

describe('Profile 필드 사용 구분', () => {
  const FIELD_VALUE: Record<string, unknown> = {
    supported: BONDED_ABRASIVE_PROFILE.supported,
    'specs.rpm': BONDED_ABRASIVE_PROFILE.specs.rpm,
    'specs.diameter': BONDED_ABRASIVE_PROFILE.specs.diameter,
    'specs.mounting': BONDED_ABRASIVE_PROFILE.specs.mounting,
    'equipment.guard': BONDED_ABRASIVE_PROFILE.equipment.guard,
    'equipment.flange': BONDED_ABRASIVE_PROFILE.equipment.flange,
    'equipment.backingPad': BONDED_ABRASIVE_PROFILE.equipment.backingPad,
    'equipment.adapter': BONDED_ABRASIVE_PROFILE.equipment.adapter,
    allowedWork: BONDED_ABRASIVE_PROFILE.allowedWork,
    allowedMaterials: BONDED_ABRASIVE_PROFILE.allowedMaterials,
    cooling: BONDED_ABRASIVE_PROFILE.cooling,
    rotationDirection: BONDED_ABRASIVE_PROFILE.rotationDirection,
    expiryPolicy: BONDED_ABRASIVE_PROFILE.expiryPolicy,
    trialRunPolicy: BONDED_ABRASIVE_PROFILE.trialRunPolicy,
    conditionGate: BONDED_ABRASIVE_PROFILE.conditionGate,
    requiredPhotos: BONDED_ABRASIVE_PROFILE.requiredPhotos,
  };

  it('모든 요구 필드를 판정·안내·근거 미확인 중 하나로 적는다', () => {
    expect(Object.keys(PROFILE_FIELD_USE).sort()).toEqual(
      Object.keys(FIELD_VALUE).sort(),
    );
  });

  it('required로 선언한 필드는 모두 판정에 쓰인다', () => {
    const required = Object.entries(FIELD_VALUE)
      .filter(([, value]) => value === 'required')
      .map(([field]) => field);
    expect(required.sort()).toEqual(
      ['equipment.guard', 'specs.diameter', 'specs.rpm'].sort(),
    );
    for (const field of required) {
      expect(PROFILE_FIELD_USE[field as keyof typeof PROFILE_FIELD_USE]).toBe(
        'verdict',
      );
    }
  });

  it('unverified 값은 판정에 쓰는 필드로 분류하지 않는다', () => {
    for (const [field, value] of Object.entries(FIELD_VALUE)) {
      if (value === 'unverified') {
        expect(PROFILE_FIELD_USE[field as keyof typeof PROFILE_FIELD_USE]).toBe(
          'unverified',
        );
      }
    }
  });

  it('required 필드를 어기면 실제로 적합이 나오지 않는다', () => {
    const TODAY = '2026-09-17';
    const w = wheel({ expiry: { year: 2099, month: 6 } });
    const verdict = (g: GrinderSpec, ws: WheelSpec = w) =>
      matchSpecs(g, ws, { profile: BONDED_ABRASIVE_PROFILE, today: TODAY })
        .verdict;
    expect(verdict(grinder())).toBe('COMPATIBLE');
    // specs.rpm
    expect(verdict(grinder({ noLoadRPM: 13000 }))).not.toBe('COMPATIBLE');
    expect(verdict(grinder({ noLoadRPM: null }))).not.toBe('COMPATIBLE');
    // specs.diameter
    expect(verdict(grinder({ maxWheelDiameter: 115 }))).not.toBe('COMPATIBLE');
    // equipment.guard
    expect(verdict(grinder({ guardType: 'none' }))).not.toBe('COMPATIBLE');
  });
});
