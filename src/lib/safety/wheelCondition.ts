// 숫돌 상태 확인 Gate의 순수 로직.
//
// AI 판독값은 이 상태를 채우지 않는다. 항목은 모두 작업자가 직접 눌러야 하며,
// 미확인(null·없음)과 문제 발견(false)을 모두 진행 불가로 본다.
//
// 묻는 항목은 부속품 종류마다 다르다(profiles.ts의 conditionItemsFor). 기본은
// 네 상태 항목이고, 호출자가 종류에 맞는 항목을 넘긴다. 종류별 항목은 기존
// 기록에 없는 선택 필드라 답하지 않은 상태(undefined)도 미확인으로 센다.

import type { WheelCondition, WheelConditionKey } from '@/lib/rules/types';

export const EMPTY_WHEEL_CONDITION: WheelCondition = {
  damageFree: null,
  notDeformed: null,
  mountingAreaUndamaged: null,
  labelLegible: null,
  expiryValid: null,
};

export const WHEEL_CONDITION_KEYS: ReadonlyArray<WheelConditionKey> = [
  'damageFree',
  'notDeformed',
  'mountingAreaUndamaged',
  'labelLegible',
];

export function unansweredWheelConditionCount(
  condition: WheelCondition | null,
  keys: ReadonlyArray<WheelConditionKey> = WHEEL_CONDITION_KEYS,
): number {
  if (!condition) return keys.length;
  // undefined(아직 없는 종류별 항목)도 답하지 않은 것이다.
  return keys.filter((key) => condition[key] == null).length;
}

export function hasWheelConditionIssue(
  condition: WheelCondition | null,
  keys: ReadonlyArray<WheelConditionKey> = WHEEL_CONDITION_KEYS,
): boolean {
  if (!condition) return false;
  return (
    condition.expiryValid === false ||
    keys.some((key) => condition[key] === false)
  );
}

/** 모든 상태 항목을 직접 확인해야 연다. 구버전의 기한 문제 있음도 보존한다. */
export function isWheelConditionComplete(
  condition: WheelCondition | null,
  keys: ReadonlyArray<WheelConditionKey> = WHEEL_CONDITION_KEYS,
): condition is WheelCondition {
  if (!condition) return false;
  return (
    condition.expiryValid !== false &&
    keys.every((key) => condition[key] === true)
  );
}

/**
 * 이 종류에서 묻는 항목의 답만 남긴다.
 *
 * 종류를 바꾸기 전에 답한 다른 종류의 항목이 기록에 섞이면, 묻지 않은 것을
 * 확인한 것처럼 남긴다. 기본 다섯 항목은 타입상 늘 있어야 하므로 묻지 않았으면
 * null로 둔다.
 */
export function pickWheelCondition(
  condition: WheelCondition,
  keys: ReadonlyArray<WheelConditionKey>,
): WheelCondition {
  const picked: WheelCondition = { ...EMPTY_WHEEL_CONDITION };
  for (const key of keys) {
    picked[key] = condition[key] ?? null;
  }
  return picked;
}
