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
  DEFAULT_CONDITION_ITEMS,
  PROFILE_FIELD_USE,
  UNKNOWN_WORK_CONDITIONS,
  conditionItemsFor,
  isSupportedType,
  needsSubtype,
  profileConditions,
  profileFor,
  profileRef,
  refinesSuggestion,
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
  'bonded_cutting',
  'bonded_grinding',
  'bonded_combination',
  'bonded_cup',
  'flap_disc',
  'cup_wheel',
  'diamond',
  'diamond_continuous',
  'diamond_turbo',
  'diamond_segmented',
  'diamond_cup',
  'tuck_pointing',
  'wire_brush',
  'fibre_disc',
  'nonwoven_disc',
  'polishing_pad',
  'other',
  'unknown',
];

/** Profile이 없는 종류 — 이번 범위에서 바꾸지 않았다 */
const NO_PROFILE_TYPES: WheelType[] = [
  'cup_wheel',
  'diamond',
  'other',
  'unknown',
];

/** 결합숫돌이 아닌, 근거를 확인하지 못한 기본값을 쓰는 종류 */
const UNVERIFIED_TYPES: WheelType[] = [
  'flap_disc',
  'diamond_continuous',
  'diamond_turbo',
  'diamond_segmented',
  'diamond_cup',
  'tuck_pointing',
  'wire_brush',
  'fibre_disc',
  'nonwoven_disc',
  'polishing_pad',
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
      scope: 'full',
    });
  });

  it('판정 범위(scope)는 full이다 — RPM·지름이 맞으면 적합을 낼 수 있다', () => {
    expect(BONDED_ABRASIVE_PROFILE.scope).toBe('full');
  });
});

describe('Profile이 없는 종류', () => {
  it('굵은 분류(컵휠·다이아몬드)와 기타·모름에는 Profile이 없고 지원하지 않는다', () => {
    for (const type of NO_PROFILE_TYPES) {
      expect(profileFor(type)).toBeNull();
      expect(isSupportedType(type)).toBe(false);
      expect(profileRef(type)).toBeNull();
    }
    const withProfile = ALL_TYPES.filter((t) => !NO_PROFILE_TYPES.includes(t));
    expect(Object.keys(ACCESSORY_PROFILES).sort()).toEqual(
      [...withProfile].sort(),
    );
  });

  it('Profile이 없는 종류는 엔진에서 판정불가로 끝난다 — 이전 동작 그대로', () => {
    for (const type of NO_PROFILE_TYPES) {
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
    const draft = profile({ type: 'diamond', supported: false });
    expect(draft.supported).toBe(false);
    expect(isSupportedType('diamond')).toBe(false);
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
    scope: BONDED_ABRASIVE_PROFILE.scope,
    'specs.rpm': BONDED_ABRASIVE_PROFILE.specs.rpm,
    'specs.diameter': BONDED_ABRASIVE_PROFILE.specs.diameter,
    'specs.mounting': BONDED_ABRASIVE_PROFILE.specs.mounting,
    'equipment.guard': BONDED_ABRASIVE_PROFILE.equipment.guard,
    'equipment.flange': BONDED_ABRASIVE_PROFILE.equipment.flange,
    'equipment.backingPad': BONDED_ABRASIVE_PROFILE.equipment.backingPad,
    'equipment.adapter': BONDED_ABRASIVE_PROFILE.equipment.adapter,
    allowedWork: BONDED_ABRASIVE_PROFILE.allowedWork,
    workCheck: BONDED_ABRASIVE_PROFILE.workCheck,
    allowedMaterials: BONDED_ABRASIVE_PROFILE.allowedMaterials,
    cooling: BONDED_ABRASIVE_PROFILE.cooling,
    rotationDirection: BONDED_ABRASIVE_PROFILE.rotationDirection,
    expiryPolicy: BONDED_ABRASIVE_PROFILE.expiryPolicy,
    trialRunPolicy: BONDED_ABRASIVE_PROFILE.trialRunPolicy,
    conditionGate: BONDED_ABRASIVE_PROFILE.conditionGate,
    conditionItems: BONDED_ABRASIVE_PROFILE.conditionItems,
    aiSuggestions: BONDED_ABRASIVE_PROFILE.aiSuggestions,
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

describe('알려진 그라인더 액세서리 Profile', () => {
  const TODAY = '2026-09-17';
  const valid = (overrides: Partial<WheelSpec> = {}) =>
    wheel({ expiry: { year: 2099, month: 6 }, ...overrides });
  const run = (
    w: WheelSpec,
    options: { g?: GrinderSpec; declaredPurpose?: 'cutting' | 'grinding' } = {},
  ) =>
    matchSpecs(options.g ?? grinder(), w, {
      profile: profileFor(w.wheelType),
      declaredPurpose: options.declaredPurpose ?? null,
      today: TODAY,
    });
  const checkOf = (result: ReturnType<typeof run>, rule: string) =>
    result.checks.find((check) => check.rule === rule);

  it('일반 결합숫돌 Profile은 이번 확장으로 바뀌지 않았다', () => {
    expect(BONDED_ABRASIVE_PROFILE.version).toBe('2026.09.17-r2');
    expect(BONDED_ABRASIVE_PROFILE.workCheck).toBe('label_purpose');
    expect(BONDED_ABRASIVE_PROFILE.conditionItems).toEqual(
      DEFAULT_CONDITION_ITEMS,
    );
    expect(checkOf(run(valid()), RULE.WHEEL_TYPE)?.detail?.code).toBe(
      'wheelType.supported',
    );
  });

  it.each(ALL_TYPES.filter((t) => !NO_PROFILE_TYPES.includes(t)))(
    '%s — 공통 RPM·지름 규칙을 그대로 쓴다',
    (wheelType) => {
      const ok = run(valid({ wheelType }));
      expect(checkOf(ok, RULE.WHEEL_TYPE)?.passed).toBe(true);
      expect(checkOf(ok, RULE.RPM_SAFETY)?.passed).toBe(true);
      expect(checkOf(ok, RULE.DIAMETER_FIT)?.passed).toBe(true);

      // 1rpm 부족은 부적합, 지름 초과는 부적합, 값이 없으면 판정불가.
      expect(run(valid({ wheelType, maxRPM: 10999 })).verdict).toBe(
        'INCOMPATIBLE',
      );
      expect(run(valid({ wheelType, diameter: 126 })).verdict).toBe(
        'INCOMPATIBLE',
      );
      expect(run(valid({ wheelType, maxRPM: null })).verdict).toBe(
        'UNDETERMINED',
      );
    },
  );

  it.each(UNVERIFIED_TYPES)(
    '%s — 근거 없는 조건은 모두 unverified이고 판정 근거로 쓰지 않는다',
    (type) => {
      const p = profileFor(type) as AccessoryProfile;
      expect(p.supported).toBe(true);
      expect(p.allowedWork).toBe('unverified');
      expect(p.workCheck).toBe('allowed_work');
      expect(p.allowedMaterials).toBe('unverified');
      expect(p.cooling).toBe('unverified');
      expect(p.rotationDirection).toBe('unverified');
      expect(p.equipment).toEqual({
        guard: 'unverified',
        flange: 'unverified',
        backingPad: 'unverified',
        adapter: 'unverified',
      });
      expect(p.expiryPolicy).toBe('unverified');
      expect(p.trialRunPolicy).toBe('unverified');
      expect(p.sources).toEqual([]);
      // 유효기한 근거가 없으니 Gate에서도 유효기한을 묻지 않는다.
      expect(p.conditionItems).not.toContain('expiryValid');
    },
  );

  it.each(UNVERIFIED_TYPES)(
    '%s — 라벨 용도·유효기한을 몰라도 막지 않되 통과가 아니라 직접 확인으로 남긴다',
    (wheelType) => {
      const result = run(
        wheel({ wheelType, purpose: 'unknown', expiry: null }),
        { declaredPurpose: 'grinding' },
      );
      const work = checkOf(result, RULE.WORK_PURPOSE);
      const expiry = checkOf(result, RULE.EXPIRY);
      expect(work).toMatchObject({
        passed: null,
        advisory: true,
        detail: { code: 'workPurpose.manualCheck' },
      });
      expect(expiry).toMatchObject({
        passed: null,
        advisory: true,
        detail: { code: 'expiry.noPolicy' },
      });
      expect(checkOf(result, RULE.WHEEL_TYPE)?.detail?.code).toBe(
        'wheelType.supportedProfile',
      );
      // scope가 limited라 RPM·지름이 맞아도 적합에 이르지 못한다 — 작업·유효
      // 기한의 근거 미확인과 별개로, 판정 범위 자체가 이미 판정불가를 만든다.
      expect(checkOf(result, RULE.PROFILE_SCOPE)).toMatchObject({
        passed: null,
        detail: { code: 'profileScope.limited' },
      });
      expect(checkOf(result, RULE.PROFILE_SCOPE)?.advisory).toBeFalsy();
      expect(result.verdict).toBe('UNDETERMINED');
    },
  );

  it('결합 절단숫돌 Type 1/41 — 연삭 작업은 Profile 어긋남으로 판정불가', () => {
    // 라벨도 연삭용이라 라벨 대조는 맞지만, 절단 전용을 고른 선택과 어긋난다.
    const conflict = run(
      valid({ wheelType: 'bonded_cutting', purpose: 'grinding' }),
      { declaredPurpose: 'grinding' },
    );
    expect(checkOf(conflict, RULE.WORK_PURPOSE)).toMatchObject({
      passed: null,
      detail: { code: 'workPurpose.profileMismatch' },
    });
    expect(checkOf(conflict, RULE.WORK_PURPOSE)?.advisory).toBeFalsy();
    expect(conflict.verdict).toBe('UNDETERMINED');

    // 라벨 용도와 작업이 어긋나면 기존처럼 부적합이 앞선다.
    const labelMismatch = run(
      valid({ wheelType: 'bonded_cutting', purpose: 'cutting' }),
      { declaredPurpose: 'grinding' },
    );
    expect(labelMismatch.verdict).toBe('INCOMPATIBLE');

    const ok = run(valid({ wheelType: 'bonded_cutting' }), {
      declaredPurpose: 'cutting',
    });
    expect(ok.verdict).toBe('COMPATIBLE');
  });

  it('결합 연삭숫돌 — 라벨 용도 대조와 유효기한을 기존처럼 적용한다', () => {
    expect(
      run(valid({ wheelType: 'bonded_grinding', purpose: 'grinding' }), {
        declaredPurpose: 'cutting',
      }).verdict,
    ).toBe('INCOMPATIBLE');
    expect(
      run(
        wheel({
          wheelType: 'bonded_grinding',
          expiry: { year: 2020, month: 1 },
        }),
      ).verdict,
    ).toBe('INCOMPATIBLE');
    expect(
      run(wheel({ wheelType: 'bonded_grinding', expiry: null })).verdict,
    ).toBe('UNDETERMINED');
  });

  it('겸용 Type 27/42 — 라벨 용도 하나로 작업을 막지 않고 직접 확인으로 남긴다', () => {
    const result = run(
      valid({ wheelType: 'bonded_combination', purpose: 'grinding' }),
      { declaredPurpose: 'cutting' },
    );
    expect(checkOf(result, RULE.WORK_PURPOSE)?.detail?.code).toBe(
      'workPurpose.manualCheck',
    );
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('결합숫돌 세부 형식은 덮개가 필수 — 덮개 없음은 판정불가', () => {
    for (const wheelType of [
      'bonded_cutting',
      'bonded_grinding',
      'bonded_combination',
      'bonded_cup',
    ] as const) {
      const p = profileFor(wheelType) as AccessoryProfile;
      expect(p.equipment.guard).toBe('required');
      expect(p.trialRunPolicy).toBe('kr_osh_122');
      expect(p.expiryPolicy).toBe('label_marked_month');
      expect(
        run(valid({ wheelType }), { g: grinder({ guardType: 'none' }) })
          .verdict,
      ).toBe('UNDETERMINED');
    }
  });

  it('덮개 근거가 없는 종류는 덮개 없음을 막지 않고 직접 확인, 작은 덮개는 판정불가', () => {
    const none = run(valid({ wheelType: 'diamond_segmented' }), {
      g: grinder({ guardType: 'none' }),
    });
    expect(checkOf(none, RULE.GUARD)?.detail?.code).toBe('guard.manualCheck');
    // 덮개 자체는 막지 않지만, 이 종류는 scope가 limited라 판정불가로 남는다
    // (RULE.PROFILE_SCOPE) — 덮개 부재가 이유가 아니라는 것이 핵심이다.
    expect(none.verdict).toBe('UNDETERMINED');
    expect(checkOf(none, RULE.PROFILE_SCOPE)?.detail?.code).toBe(
      'profileScope.limited',
    );

    const small = run(valid({ wheelType: 'diamond_segmented' }), {
      g: grinder({ guardSize: 115 }),
    });
    expect(small.verdict).toBe('UNDETERMINED');
    expect(checkOf(small, RULE.GUARD)?.detail?.code).toBe(
      'guard.smallerThanWheel',
    );
  });

  it('종류마다 필요한 상태 항목을 묻는다', () => {
    expect(conditionItemsFor('diamond_segmented')).toEqual(
      expect.arrayContaining(['diamondRimIntact', 'damageFree', 'notDeformed']),
    );
    expect(conditionItemsFor('diamond_cup')).toEqual(
      expect.arrayContaining([
        'diamondRimIntact',
        'threadAdapterFit',
        'evenWear',
        'dedicatedGuardFitted',
      ]),
    );
    expect(conditionItemsFor('flap_disc')).toEqual(
      expect.arrayContaining([
        'flapsIntact',
        'noDelamination',
        'flapBackingIntact',
      ]),
    );
    expect(conditionItemsFor('bonded_cup')).toEqual(
      expect.arrayContaining([
        'expiryValid',
        'threadAdapterFit',
        'evenWear',
        'dedicatedGuardFitted',
      ]),
    );
    expect(conditionItemsFor('wire_brush')).toContain('wiresIntact');
    for (const type of [
      'fibre_disc',
      'nonwoven_disc',
      'polishing_pad',
    ] as const) {
      expect(conditionItemsFor(type)).toEqual(
        expect.arrayContaining(['damageFree', 'backingPadUndamaged']),
      );
    }
    // Profile이 없는 종류는 기존 다섯 항목 그대로다 — 줄이지 않는다.
    for (const type of NO_PROFILE_TYPES) {
      expect(conditionItemsFor(type)).toEqual(DEFAULT_CONDITION_ITEMS);
    }
  });

  it('다각도 사진은 평형 결합숫돌에만 요구한다', () => {
    for (const type of [
      'bonded_abrasive',
      'bonded_cutting',
      'bonded_grinding',
      'bonded_combination',
    ] as const) {
      expect(profileFor(type)?.requiredPhotos).toHaveLength(4);
    }
    for (const type of ['bonded_cup', ...UNVERIFIED_TYPES] as WheelType[]) {
      expect(profileFor(type)?.requiredPhotos).toEqual(['front']);
    }
  });

  it('AI 제안을 세부 형식으로 좁힌 선택만 어긋남이 아니다', () => {
    expect(refinesSuggestion('diamond', 'diamond_turbo')).toBe(true);
    expect(refinesSuggestion('cup_wheel', 'diamond_cup')).toBe(true);
    expect(refinesSuggestion('bonded_abrasive', 'bonded_cutting')).toBe(true);
    expect(refinesSuggestion('bonded_abrasive', 'diamond_turbo')).toBe(false);
    // 기타·모름은 좁힐 대상이 아니다 — 기존처럼 직접 확인을 받는다.
    expect(refinesSuggestion('other', 'fibre_disc')).toBe(false);
    expect(refinesSuggestion('unknown', 'bonded_cutting')).toBe(false);
    expect(refinesSuggestion('diamond', 'other')).toBe(false);
  });

  it('세부 형식을 골라야 하는 굵은 분류는 다이아몬드·컵휠뿐이다', () => {
    expect(needsSubtype('diamond')).toBe(true);
    expect(needsSubtype('cup_wheel')).toBe(true);
    expect(needsSubtype('other')).toBe(false);
    expect(needsSubtype('unknown')).toBe(false);
    expect(needsSubtype('bonded_abrasive')).toBe(false);
  });
  it('라벨 용도 표기가 없는 종류도 근거 있는 허용 작업 밖이면 판정불가, 안이면 직접 확인이다', () => {
    // 지금 이런 Profile은 없다. 근거가 확인돼 허용 작업을 적는 경우의 계약을 고정한다.
    const grindingOnly = profile({
      type: 'flap_disc',
      workCheck: 'allowed_work',
      allowedWork: ['grinding'],
      expiryPolicy: 'not_applicable',
    });
    const w = valid({ wheelType: 'flap_disc', purpose: 'unknown' });
    const outside = matchSpecs(grinder(), w, {
      profile: grindingOnly,
      declaredPurpose: 'cutting',
      today: TODAY,
    });
    expect(checkOf(outside, RULE.WORK_PURPOSE)?.detail?.code).toBe(
      'workPurpose.profileMismatch',
    );
    expect(outside.verdict).toBe('UNDETERMINED');

    const inside = matchSpecs(grinder(), w, {
      profile: grindingOnly,
      declaredPurpose: 'grinding',
      today: TODAY,
    });
    expect(checkOf(inside, RULE.WORK_PURPOSE)).toMatchObject({
      passed: null,
      advisory: true,
      detail: { code: 'workPurpose.manualCheck' },
    });
    // 적용하지 않는 유효기한도 통과가 아니라 직접 확인이다.
    expect(checkOf(inside, RULE.EXPIRY)?.detail?.code).toBe('expiry.noPolicy');
  });
});
