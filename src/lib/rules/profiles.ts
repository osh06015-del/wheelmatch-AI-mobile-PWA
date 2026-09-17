// 부속품 Profile — 종류마다 "무엇이 맞아야 쓸 수 있는가"를 한 곳에 모은다.
//
// 지금은 일반 결합숫돌 하나만 있다. 이 앱이 규격을 대조해 온 유일한 종류이고,
// 아래 값은 그 동작을 그대로 옮겨 적은 것이다 — 이 파일을 도입해도 결합숫돌의
// 판정은 달라지지 않는다(engine.test.ts의 기존 시나리오가 지킨다).
//
// 새 종류를 더할 때 지킬 것.
//   · 근거를 확인한 항목만 required·not_applicable로 적는다. 확인하지 못했으면
//     'unverified'다. 흔히 그렇다는 관행으로 채우지 않는다.
//   · Profile이 없는 종류는 지원하지 않는 종류다. 기본 Profile을 두지 않는다 —
//     기본값이 있으면 모르는 종류가 조용히 그 기본값으로 대조된다.
//   · 요구를 바꾸면 version을 올리고, 판정 규칙이 바뀌면 RULESET_VERSION도 올린다.
//   · 판정에 쓰는 필드를 늘리면 PROFILE_FIELD_USE와 엔진 규칙을 함께 고친다.
//
// 엔진(engine.ts)은 이 파일을 불러오지 않는다. 화면이 profileFor로 Profile을
// 찾아 matchSpecs의 인자로 넘긴다 — engine.ts를 import 없는 순수 함수로 두기
// 위해서다(safety-invariants.md §1). 이 파일은 엔진을 불러와도 된다.
//
// 이 폴더는 판정 계층이다. 상대 경로 import만 쓴다(eslint boundary).

import { guardConflicts } from './engine';
import type {
  AccessoryProfile,
  AccessoryProfileRef,
  GrinderSpec,
  ProfileCondition,
  WheelSpec,
  WheelType,
  WorkConditions,
} from './types';

/**
 * 일반 결합숫돌(절단날·연삭석).
 *
 * 근거는 docs/regulatory-sources.md에 있다.
 *   · RPM   — 산업안전보건기준에 관한 규칙 제122조 ④ (최고사용회전속도 초과 사용 금지)
 *   · 덮개  — 같은 규칙 제122조 ① (지름 5cm 이상 연삭숫돌에 덮개 설치)
 *   · 작업  — 같은 규칙 제122조 ⑤ (측면 사용 목적이 아닌 숫돌의 측면 사용 금지)
 *   · 시험운전 — 같은 규칙 제122조 ②
 *   · 유효기한 — oSa 「Product marking requirements for bonded abrasives」(2020-04)
 *
 * 지름은 그라인더 명판의 허용 최대 지름과 대조한다(명판에 적힌 값끼리의 대조).
 * 장착 구멍은 명판에 스핀들 규격이 없어 대조할 상대가 없다 — advisory.
 * 재료·건식/습식·회전방향·플랜지는 근거를 확인하지 못했다 — unverified.
 */
export const BONDED_ABRASIVE_PROFILE: AccessoryProfile = {
  type: 'bonded_abrasive',
  family: 'bonded_abrasive',
  supported: true,
  allowedWork: ['cutting', 'grinding'],
  allowedMaterials: 'unverified',
  specs: {
    rpm: 'required',
    diameter: 'required',
    mounting: 'advisory',
  },
  equipment: {
    guard: 'required',
    flange: 'unverified',
    backingPad: 'not_applicable',
    adapter: 'unverified',
  },
  cooling: 'unverified',
  rotationDirection: 'unverified',
  expiryPolicy: 'label_marked_month',
  trialRunPolicy: 'kr_osh_122',
  conditionGate: 'wheel_condition_v1',
  requiredPhotos: ['front', 'back', 'edge', 'bore'],
  sources: ['krOsh', 'kosha', 'osa'],
  version: '2026.09.17-r2',
};

/**
 * Profile 필드가 실제로 어디에 쓰이는가.
 *
 *   verdict     — 규칙엔진이 이 필드(또는 그와 같은 조건)로 판정을 막는다
 *   guidance    — 판정에 쓰지 않는다. 안내·조건 표·진행 Gate에서만 쓴다
 *   unverified  — 근거를 확인하지 못했다. 판정에도 안내 기준에도 쓰지 않는다
 *
 * **required로 선언한 필드는 verdict여야 한다.** 선언만 하고 엔진이 무시하면
 * Profile을 읽는 사람이 막힌다고 믿는 조건이 실제로는 통과한다(profiles.test.ts가
 * 확인한다). 진행 Gate(conditionGate·trialRunPolicy·requiredPhotos)는 판정과
 * 다른 계층이라 guidance로 두지만, 해당 Gate가 따로 진행을 막는다.
 */
export const PROFILE_FIELD_USE = {
  supported: 'verdict', // 숫돌 종류 규칙(checkWheelType)
  'specs.rpm': 'verdict', // 필수값 존재·RPM 안전
  'specs.diameter': 'verdict', // 지름 호환
  'specs.mounting': 'guidance', // 장착 규격 — 경고 수준, 대조 상대 없음
  'equipment.guard': 'verdict', // 덮개 조건(checkGuard) — 명시적 어긋남만 막는다
  'equipment.flange': 'unverified',
  'equipment.backingPad': 'guidance', // not_applicable — 판정에 쓰지 않는다
  'equipment.adapter': 'unverified',
  allowedWork: 'guidance', // 두 작업을 모두 허용. 작업-용도 대조는 작업 목적 일치 규칙이 한다
  allowedMaterials: 'unverified',
  cooling: 'unverified',
  rotationDirection: 'unverified',
  expiryPolicy: 'verdict', // 유효기한 규칙(label_marked_month)
  trialRunPolicy: 'guidance', // 시험운전 Gate(canStartTrialRun)
  conditionGate: 'guidance', // Wheel Condition Gate
  requiredPhotos: 'guidance', // 다각도 확인 Gate(wheelExamRequired)
} as const satisfies Record<string, 'verdict' | 'guidance' | 'unverified'>;

/**
 * 종류별 Profile. 없는 종류는 이 앱이 대조하지 않는 종류다.
 *
 * Partial인 이유: 모든 종류에 Profile을 억지로 채우면 근거 없는 요구가 생긴다.
 */
export const ACCESSORY_PROFILES: Readonly<
  Partial<Record<WheelType, AccessoryProfile>>
> = {
  bonded_abrasive: BONDED_ABRASIVE_PROFILE,
};

/** 종류의 Profile. 없으면 null이다 — 기본 Profile로 대신하지 않는다. */
export function profileFor(type: WheelType): AccessoryProfile | null {
  return ACCESSORY_PROFILES[type] ?? null;
}

/** 이 앱이 규격을 대조하는 종류인가. */
export function isSupportedType(type: WheelType): boolean {
  return profileFor(type)?.supported === true;
}

/** 기록에 남길 참조. Profile이 없으면 null이다. */
export function profileRef(type: WheelType): AccessoryProfileRef | null {
  const profile = profileFor(type);
  return profile ? { type: profile.type, version: profile.version } : null;
}

/** 모르는 작업 조건. 입력하지 않은 기록·화면의 기본값이다. */
export const UNKNOWN_WORK_CONDITIONS: WorkConditions = {
  material: 'unknown',
  cooling: 'unknown',
};

/**
 * 허용 목록 정책 하나를 입력값과 맞춰 본다.
 *
 * 모르면 unknown, 근거가 없으면(unverified) 직접 확인, 목록에 없으면 어긋남,
 * 목록에 있어도 직접 확인이다 — 목록에 있다는 것이 그 제품이 맞다는 뜻은 아니다.
 */
function allowListCondition<T extends string>(
  key: 'material' | 'cooling',
  value: T | 'unknown',
  policy: readonly T[] | 'unverified',
): ProfileCondition {
  if (value === 'unknown') {
    return { key, status: 'unknown', code: `${key}.unknown` };
  }
  if (policy === 'unverified') {
    return { key, status: 'manual_check', code: `${key}.unverified` };
  }
  if (!policy.includes(value)) {
    return { key, status: 'conflict', code: `${key}.notAllowed` };
  }
  return { key, status: 'manual_check', code: `${key}.manualCheck` };
}

/**
 * Profile과 작업·그라인더 입력을 맞춰 본다.
 *
 * **판정을 내지 않는다.** 결과에 "맞다"는 상태가 없다. 모르는 값은 unknown,
 * 근거가 없거나 앱이 대조할 상대가 없는 항목은 manual_check(작업자 확인),
 * 입력끼리 분명히 어긋나는 경우만 conflict다. 판정(verdict)은 규칙엔진이 낸다 —
 * 여기 결과로 적합을 만들거나 완화하지 않는다. 덮개 conflict는 엔진의 덮개 조건
 * 규칙(checkGuard)과 같은 guardConflicts로 정하므로 판정불가와 함께 나온다.
 *
 * 구기록처럼 새 입력이 없으면(undefined) 모두 unknown으로 읽는다.
 */
export function profileConditions(
  profile: AccessoryProfile,
  work: WorkConditions | undefined,
  grinder: GrinderSpec,
  wheel: WheelSpec,
): ProfileCondition[] {
  const spindle = grinder.spindleThread ?? 'unknown';
  const guard = grinder.guardType ?? 'unknown';
  const guardSize = grinder.guardSize ?? null;

  const conditions: ProfileCondition[] = [
    allowListCondition(
      'material',
      work?.material ?? 'unknown',
      profile.allowedMaterials,
    ),
    allowListCondition('cooling', work?.cooling ?? 'unknown', profile.cooling),
    // 스핀들 — 명판에 규격이 없어 숫돌 내경과 대조할 근거가 없다. 알아도 직접 확인.
    spindle === 'unknown'
      ? { key: 'spindle', status: 'unknown', code: 'spindle.unknown' }
      : { key: 'spindle', status: 'manual_check', code: 'spindle.manualCheck' },
  ];

  // 덮개가 필요 없다는 근거가 있는 종류만 덮개 항목을 뺀다.
  if (profile.equipment.guard !== 'not_applicable') {
    // 어긋남 판단은 엔진의 guardConflicts 하나로 한다. 판정 규칙(checkGuard)과
    // 같은 함수를 써야 표는 어긋남인데 판정은 적합인 모순이 생기지 않는다.
    const conflicts = guardConflicts(grinder, wheel, profile);
    if (conflicts.missing) {
      // 결합숫돌은 덮개가 필요하다(제122조 ①). 없다고 답했으면 어긋난다.
      conditions.push({
        key: 'guard',
        status: 'conflict',
        code: 'guard.missing',
      });
    } else if (guard === 'unknown') {
      conditions.push({
        key: 'guard',
        status: 'unknown',
        code: 'guard.unknown',
      });
    } else {
      // 덮개 종류가 작업에 맞는지는 근거를 확인하지 못했다. 있다는 것만으로
      // 맞다고 하지 않는다.
      conditions.push({
        key: 'guard',
        status: 'manual_check',
        code: 'guard.manualCheck',
      });
    }

    // 덮개 크기 — 숫돌보다 작은 덮개는 숫돌을 감싸지 못한다. 입력끼리의 모순이다.
    // 크거나 같다고 해서 맞는 덮개라는 뜻은 아니다(형태·장착 방식이 다를 수 있다).
    if (guardSize === null) {
      conditions.push({
        key: 'guardSize',
        status: 'unknown',
        code: 'guardSize.unknown',
      });
    } else if (conflicts.smallerThanWheel) {
      conditions.push({
        key: 'guardSize',
        status: 'conflict',
        code: 'guardSize.smallerThanWheel',
      });
    } else {
      conditions.push({
        key: 'guardSize',
        status: 'manual_check',
        code: 'guardSize.manualCheck',
      });
    }
  }

  // 회전방향 — 어느 방향이든 된다는 근거가 있을 때만 항목을 뺀다.
  if (profile.rotationDirection === 'follow_marked_arrow') {
    conditions.push({
      key: 'rotation',
      status: 'manual_check',
      code: 'rotation.followArrow',
    });
  } else if (profile.rotationDirection === 'unverified') {
    conditions.push({
      key: 'rotation',
      status: 'manual_check',
      code: 'rotation.unverified',
    });
  }

  return conditions;
}
