// 숫돌 상태 확인 Gate의 순수 로직.
//
// AI 판독값은 이 상태를 채우지 않는다. 다섯 항목은 모두 작업자가 직접
// 눌러야 하며, 미확인(null)과 문제 발견(false)을 모두 진행 불가로 본다.

import type { WheelCondition } from '@/lib/rules/types';

export const EMPTY_WHEEL_CONDITION: WheelCondition = {
  damageFree: null,
  notDeformed: null,
  mountingAreaUndamaged: null,
  labelLegible: null,
  expiryValid: null,
};

export const WHEEL_CONDITION_KEYS: ReadonlyArray<keyof WheelCondition> = [
  'damageFree',
  'notDeformed',
  'mountingAreaUndamaged',
  'labelLegible',
  'expiryValid',
];

export function unansweredWheelConditionCount(
  condition: WheelCondition | null,
): number {
  if (!condition) return WHEEL_CONDITION_KEYS.length;
  return WHEEL_CONDITION_KEYS.filter((key) => condition[key] === null).length;
}

export function hasWheelConditionIssue(
  condition: WheelCondition | null,
): boolean {
  if (!condition) return false;
  return WHEEL_CONDITION_KEYS.some((key) => condition[key] === false);
}

/** 모든 항목을 작업자가 정상으로 확인한 경우에만 Gate를 연다. */
export function isWheelConditionComplete(
  condition: WheelCondition | null,
): condition is WheelCondition {
  if (!condition) return false;
  return WHEEL_CONDITION_KEYS.every((key) => condition[key] === true);
}
