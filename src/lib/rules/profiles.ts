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
  WheelConditionKey,
  WheelSpec,
  WheelType,
  WorkConditions,
} from './types';

/**
 * 기존 Wheel Condition Gate의 다섯 항목. Profile이 없는 종류와 결합숫돌이 쓴다.
 * 순서가 곧 화면 순서다.
 */
export const DEFAULT_CONDITION_ITEMS: readonly WheelConditionKey[] = [
  'damageFree',
  'notDeformed',
  'mountingAreaUndamaged',
  'labelLegible',
  'expiryValid',
];

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
  // 라벨의 절단용/연삭용 표기로 작업을 대조해 왔다. 그대로 둔다.
  workCheck: 'label_purpose',
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
  conditionItems: DEFAULT_CONDITION_ITEMS,
  aiSuggestions: ['bonded_abrasive'],
  requiredPhotos: ['front', 'back', 'edge', 'bore'],
  sources: ['krOsh', 'kosha', 'osa'],
  version: '2026.09.17-r2',
};

/** 세부 형식 Profile의 버전. 요구를 바꾸면 올린다 */
const KNOWN_ACCESSORY_VERSION = '2026.09.17-r1';

/**
 * 결합숫돌 세부 형식의 공통 부분.
 *
 * 일반 결합숫돌과 같은 근거(제122조 ①②④, oSa)를 쓴다 — 모두 결합숫돌이다.
 * 형식마다 다른 것(작업·사진·상태 항목)만 아래에서 덮어쓴다.
 */
const BONDED_BASE: AccessoryProfile = {
  ...BONDED_ABRASIVE_PROFILE,
  version: KNOWN_ACCESSORY_VERSION,
};

/**
 * 결합숫돌이 아닌 부속품의 공통 부분. **근거를 확인하지 못한 기본값이다.**
 *
 * 회전속도·지름은 모든 부속품에 공통으로 표시값을 대조한다(공통 엔진 규칙).
 * 저장소에 확인된 근거(제122조·oSa)는 연삭숫돌·결합숫돌에 대한 것이라 이 종류들에
 * 인용하지 않는다. 그래서 작업·재료·건습식·회전방향·덮개·장착 부품·유효기한·
 * 시험운전이 모두 unverified다 — 자동으로 통과시키지 않고 직접 확인으로 남긴다.
 */
const UNVERIFIED_BASE: Omit<
  AccessoryProfile,
  'type' | 'family' | 'conditionItems' | 'aiSuggestions'
> = {
  supported: true,
  allowedWork: 'unverified',
  // 라벨에 절단용/연삭용 표기가 없는 종류다. 라벨 용도로 대조하지 않는다.
  workCheck: 'allowed_work',
  allowedMaterials: 'unverified',
  specs: {
    rpm: 'required',
    diameter: 'required',
    mounting: 'advisory',
  },
  equipment: {
    guard: 'unverified',
    flange: 'unverified',
    backingPad: 'unverified',
    adapter: 'unverified',
  },
  cooling: 'unverified',
  rotationDirection: 'unverified',
  expiryPolicy: 'unverified',
  trialRunPolicy: 'unverified',
  conditionGate: 'wheel_condition_v1',
  requiredPhotos: ['front'],
  sources: [],
  version: KNOWN_ACCESSORY_VERSION,
};

/** 형식을 가리지 않는 상태 항목. 유효기한은 근거가 있는 결합숫돌에만 묻는다 */
const COMMON_ITEMS: readonly WheelConditionKey[] = [
  'damageFree',
  'mountingAreaUndamaged',
  'labelLegible',
];

/** 컵 형식: 나사·어댑터, 편마모, 전용 덮개 */
const CUP_ITEMS: readonly WheelConditionKey[] = [
  'threadAdapterFit',
  'evenWear',
  'dedicatedGuardFitted',
];

/** 다이아몬드: 세그먼트·림, 균열(damageFree), 휨(notDeformed) */
const DIAMOND_ITEMS: readonly WheelConditionKey[] = [
  'damageFree',
  'notDeformed',
  'diamondRimIntact',
  'mountingAreaUndamaged',
  'labelLegible',
];

/**
 * 결합 절단숫돌 Type 1/41.
 *
 * 절단 전용이다. 측면(연삭)으로 쓰면 제122조 ⑤에 어긋난다 — 연삭 작업을 고르면
 * 종류와 작업이 어긋나 판정불가다.
 */
export const BONDED_CUTTING_PROFILE: AccessoryProfile = {
  ...BONDED_BASE,
  type: 'bonded_cutting',
  allowedWork: ['cutting'],
};

/** 결합 연삭숫돌 Type 27/28. 절단 사용 제한은 근거를 확인하지 못했다 — 라벨 용도로만 대조 */
export const BONDED_GRINDING_PROFILE: AccessoryProfile = {
  ...BONDED_BASE,
  type: 'bonded_grinding',
  allowedWork: 'unverified',
};

/**
 * 절단·연삭 겸용 Type 27/42.
 *
 * 라벨 용도 표기 하나로는 겸용을 나타낼 수 없어 라벨 용도로 대조하지 않는다.
 * 허용 작업의 근거도 없으니 작업은 직접 확인이다.
 */
export const BONDED_COMBINATION_PROFILE: AccessoryProfile = {
  ...BONDED_BASE,
  type: 'bonded_combination',
  allowedWork: 'unverified',
  workCheck: 'allowed_work',
};

/** 결합 컵숫돌 Type 6/11. 다각도 확인 지시문은 평형 숫돌용이라 앞면 사진만 요구한다 */
export const BONDED_CUP_PROFILE: AccessoryProfile = {
  ...BONDED_BASE,
  type: 'bonded_cup',
  allowedWork: 'unverified',
  conditionItems: [...DEFAULT_CONDITION_ITEMS, ...CUP_ITEMS],
  aiSuggestions: ['cup_wheel', 'bonded_abrasive'],
  requiredPhotos: ['front'],
};

/** 플랩디스크 Type 27/29: 날개 탈락·박리·백킹판 */
export const FLAP_DISC_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'flap_disc',
  family: 'coated_abrasive',
  conditionItems: [
    ...COMMON_ITEMS,
    'flapsIntact',
    'noDelamination',
    'flapBackingIntact',
  ],
  aiSuggestions: ['flap_disc'],
};

function diamondCutting(
  type: 'diamond_continuous' | 'diamond_turbo' | 'diamond_segmented',
): AccessoryProfile {
  return {
    ...UNVERIFIED_BASE,
    type,
    family: 'superabrasive',
    conditionItems: DIAMOND_ITEMS,
    aiSuggestions: ['diamond'],
  };
}

export const DIAMOND_CONTINUOUS_PROFILE = diamondCutting('diamond_continuous');
export const DIAMOND_TURBO_PROFILE = diamondCutting('diamond_turbo');
export const DIAMOND_SEGMENTED_PROFILE = diamondCutting('diamond_segmented');

/** 다이아몬드 컵휠: 세그먼트·균열·휨 + 컵 항목 */
export const DIAMOND_CUP_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'diamond_cup',
  family: 'superabrasive',
  conditionItems: [...DIAMOND_ITEMS, ...CUP_ITEMS],
  aiSuggestions: ['diamond', 'cup_wheel'],
};

/** 줄눈(턱포인팅) 휠. 대개 다이아몬드 세그먼트형이라 같은 항목을 묻는다 */
export const TUCK_POINTING_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'tuck_pointing',
  family: 'superabrasive',
  conditionItems: DIAMOND_ITEMS,
  aiSuggestions: ['diamond'],
};

/** 와이어 휠·컵 브러시: 끊어지거나 풀린 와이어 */
export const WIRE_BRUSH_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'wire_brush',
  family: 'brush',
  conditionItems: [...COMMON_ITEMS, 'wiresIntact'],
  aiSuggestions: ['wire_brush'],
};

/**
 * 파이버·샌딩 디스크. 백킹패드와 함께 쓴다 — 디스크(damageFree)와 패드를 따로 묻는다.
 * AI 분류에 해당 값이 없어 제안과 견주지 않는다(골랐으면 직접 확인을 받는다).
 */
export const FIBRE_DISC_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'fibre_disc',
  family: 'coated_abrasive',
  conditionItems: [...COMMON_ITEMS, 'backingPadUndamaged'],
  aiSuggestions: [],
};

/** 부직포 표면처리 디스크 */
export const NONWOVEN_DISC_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'nonwoven_disc',
  family: 'nonwoven',
  conditionItems: [...COMMON_ITEMS, 'backingPadUndamaged'],
  aiSuggestions: [],
};

/** 제조사 승인 연마 패드. 승인 여부는 앱이 확인하지 못한다 — 작업자가 설명서로 본다 */
export const POLISHING_PAD_PROFILE: AccessoryProfile = {
  ...UNVERIFIED_BASE,
  type: 'polishing_pad',
  family: 'polishing',
  conditionItems: [...COMMON_ITEMS, 'backingPadUndamaged'],
  aiSuggestions: [],
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
  allowedWork: 'verdict', // 작업 목적 일치 — 근거 있는 허용 작업 밖이면 판정불가
  workCheck: 'verdict', // 작업 목적 일치 — 라벨 용도로 대조할지
  allowedMaterials: 'unverified',
  cooling: 'unverified',
  rotationDirection: 'unverified',
  expiryPolicy: 'verdict', // 유효기한 규칙(label_marked_month)
  trialRunPolicy: 'guidance', // 시험운전 Gate(canStartTrialRun)
  conditionGate: 'guidance', // Wheel Condition Gate
  conditionItems: 'guidance', // Wheel Condition Gate 항목(작업자가 직접 답한다)
  aiSuggestions: 'guidance', // 종류 선택 화면의 AI 제안 비교
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
  bonded_cutting: BONDED_CUTTING_PROFILE,
  bonded_grinding: BONDED_GRINDING_PROFILE,
  bonded_combination: BONDED_COMBINATION_PROFILE,
  bonded_cup: BONDED_CUP_PROFILE,
  flap_disc: FLAP_DISC_PROFILE,
  diamond_continuous: DIAMOND_CONTINUOUS_PROFILE,
  diamond_turbo: DIAMOND_TURBO_PROFILE,
  diamond_segmented: DIAMOND_SEGMENTED_PROFILE,
  diamond_cup: DIAMOND_CUP_PROFILE,
  tuck_pointing: TUCK_POINTING_PROFILE,
  wire_brush: WIRE_BRUSH_PROFILE,
  fibre_disc: FIBRE_DISC_PROFILE,
  nonwoven_disc: NONWOVEN_DISC_PROFILE,
  polishing_pad: POLISHING_PAD_PROFILE,
};

/** 종류의 Profile. 없으면 null이다 — 기본 Profile로 대신하지 않는다. */
export function profileFor(type: WheelType): AccessoryProfile | null {
  return ACCESSORY_PROFILES[type] ?? null;
}

/** 이 앱이 규격을 대조하는 종류인가. */
export function isSupportedType(type: WheelType): boolean {
  return profileFor(type)?.supported === true;
}

/**
 * 이 종류에서 작업자가 답해야 하는 상태 항목.
 * Profile이 없는 종류는 기존 다섯 항목이다 — 줄이지 않는다.
 */
export function conditionItemsFor(
  type: WheelType,
): readonly WheelConditionKey[] {
  return profileFor(type)?.conditionItems ?? DEFAULT_CONDITION_ITEMS;
}

/**
 * 작업자가 고른 종류가 AI 제안을 좁힌 것인가.
 *
 * AI는 "다이아몬드"까지만 말하고 연속 림·세그먼트는 고르지 못한다. 작업자가
 * 세부 형식을 고른 것은 제안과 어긋난 것이 아니다. 좁힌 경우가 아니면 기존처럼
 * 어긋남으로 보고 직접 확인을 받는다.
 */
export function refinesSuggestion(
  suggested: WheelType,
  selected: WheelType,
): boolean {
  return profileFor(selected)?.aiSuggestions.includes(suggested) === true;
}

/**
 * 세부 형식을 골라야 대조할 수 있는 굵은 분류인가(다이아몬드·컵휠).
 * 그 자체에는 Profile이 없고, 그것을 제안값으로 갖는 세부 Profile이 있다.
 */
export function needsSubtype(type: WheelType): boolean {
  if (profileFor(type) !== null) return false;
  return Object.values(ACCESSORY_PROFILES).some((profile) =>
    profile.aiSuggestions.includes(type),
  );
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
