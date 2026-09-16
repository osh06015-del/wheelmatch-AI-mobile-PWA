// 부속품 Profile·작업 조건·그라인더 장착 입력에 붙는 문구 키.
//
// 입력 화면(작업 선택·명판 확인)과 결과·이력의 조건 표가 같은 값을 같은 말로
// 부르게 한 곳에 둔다.

import type { MessageKey } from './messages/ko';
import type {
  CoolingMode,
  GuardType,
  ProfileCondition,
  ProfileConditionCode,
  ProfileConditionKey,
  SpindleThread,
  WorkMaterial,
} from '@/lib/rules/types';

export const MATERIAL_LABEL: Readonly<Record<WorkMaterial, MessageKey>> = {
  steel: 'work.material.steel',
  stainless: 'work.material.stainless',
  non_ferrous: 'work.material.nonFerrous',
  stone_concrete: 'work.material.stoneConcrete',
  other: 'work.material.other',
  unknown: 'work.material.unknown',
};

export const COOLING_LABEL: Readonly<Record<CoolingMode, MessageKey>> = {
  dry: 'work.cooling.dry',
  wet: 'work.cooling.wet',
  unknown: 'work.cooling.unknown',
};

export const SPINDLE_LABEL: Readonly<Record<SpindleThread, MessageKey>> = {
  M14: 'grinderMount.spindle.m14',
  M10: 'grinderMount.spindle.m10',
  '5/8-11': 'grinderMount.spindle.unc58',
  other: 'grinderMount.spindle.other',
  unknown: 'grinderMount.spindle.unknown',
};

export const GUARD_LABEL: Readonly<Record<GuardType, MessageKey>> = {
  grinding: 'grinderMount.guardType.grinding',
  cutting: 'grinderMount.guardType.cutting',
  none: 'grinderMount.guardType.none',
  other: 'grinderMount.guardType.other',
  unknown: 'grinderMount.guardType.unknown',
};

export const CONDITION_KEY_LABEL: Readonly<
  Record<ProfileConditionKey, MessageKey>
> = {
  material: 'profile.key.material',
  cooling: 'profile.key.cooling',
  spindle: 'profile.key.spindle',
  guard: 'profile.key.guard',
  guardSize: 'profile.key.guardSize',
  rotation: 'profile.key.rotation',
};

export const CONDITION_STATUS_LABEL: Readonly<
  Record<ProfileCondition['status'], MessageKey>
> = {
  unknown: 'profile.status.unknown',
  manual_check: 'profile.status.manualCheck',
  conflict: 'profile.status.conflict',
};

export const CONDITION_CODE_TEXT: Readonly<
  Record<ProfileConditionCode, MessageKey>
> = {
  'material.unknown': 'profile.code.material.unknown',
  'material.unverified': 'profile.code.material.unverified',
  'material.manualCheck': 'profile.code.material.manualCheck',
  'material.notAllowed': 'profile.code.material.notAllowed',
  'cooling.unknown': 'profile.code.cooling.unknown',
  'cooling.unverified': 'profile.code.cooling.unverified',
  'cooling.manualCheck': 'profile.code.cooling.manualCheck',
  'cooling.notAllowed': 'profile.code.cooling.notAllowed',
  'spindle.unknown': 'profile.code.spindle.unknown',
  'spindle.manualCheck': 'profile.code.spindle.manualCheck',
  'guard.unknown': 'profile.code.guard.unknown',
  'guard.missing': 'profile.code.guard.missing',
  'guard.manualCheck': 'profile.code.guard.manualCheck',
  'guardSize.unknown': 'profile.code.guardSize.unknown',
  'guardSize.smallerThanWheel': 'profile.code.guardSize.smallerThanWheel',
  'guardSize.manualCheck': 'profile.code.guardSize.manualCheck',
  'rotation.unverified': 'profile.code.rotation.unverified',
  'rotation.followArrow': 'profile.code.rotation.followArrow',
};
