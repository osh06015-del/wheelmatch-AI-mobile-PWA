// 그라인더 상태 확인 Gate의 순수 로직.
//
// WheelCondition과 같은 규칙이지만 파일을 따로 둔다. 항목이 뜻하는 안전
// 조건이 서로 다르고, 하나로 일반화하면 화면에서 어느 Gate의 실패인지
// 코드만 보고 알 수 없게 된다.
//
// 이 Gate는 **AI 입력이 아예 없다.** 현재 촬영은 명판 중심이라 사진으로는
// 전원선·덮개·손잡이·스핀들을 볼 수 없다. 다섯 항목 모두 작업자가 직접
// 눌러야 하고, 미확인(null)과 문제 발견(false)을 똑같이 진행 불가로 본다.

import type { GrinderCondition } from '@/lib/rules/types';

export const EMPTY_GRINDER_CONDITION: GrinderCondition = {
  cordAndPlugUndamaged: null,
  bodyUndamaged: null,
  guardSecure: null,
  auxiliaryHandleSecure: null,
  spindleAssemblyUndamaged: null,
};

export const GRINDER_CONDITION_KEYS: ReadonlyArray<keyof GrinderCondition> = [
  'cordAndPlugUndamaged',
  'bodyUndamaged',
  'guardSecure',
  'auxiliaryHandleSecure',
  'spindleAssemblyUndamaged',
];

export function unansweredGrinderConditionCount(
  condition: GrinderCondition | null,
): number {
  if (!condition) return GRINDER_CONDITION_KEYS.length;
  return GRINDER_CONDITION_KEYS.filter((key) => condition[key] === null).length;
}

export function hasGrinderConditionIssue(
  condition: GrinderCondition | null,
): boolean {
  if (!condition) return false;
  return GRINDER_CONDITION_KEYS.some((key) => condition[key] === false);
}

/** 모든 항목을 작업자가 정상으로 확인한 경우에만 Gate를 연다. */
export function isGrinderConditionComplete(
  condition: GrinderCondition | null,
): condition is GrinderCondition {
  if (!condition) return false;
  return GRINDER_CONDITION_KEYS.every((key) => condition[key] === true);
}
