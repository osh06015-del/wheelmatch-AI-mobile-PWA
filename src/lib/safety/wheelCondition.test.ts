import { describe, expect, it } from 'vitest';

import {
  EMPTY_WHEEL_CONDITION,
  hasWheelConditionIssue,
  isWheelConditionComplete,
  unansweredWheelConditionCount,
} from './wheelCondition';
import type { WheelCondition } from '@/lib/rules/types';

const CONFIRMED: WheelCondition = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

describe('Wheel Condition Gate', () => {
  it('다섯 항목을 모두 작업자가 확인해야 열린다', () => {
    expect(isWheelConditionComplete(CONFIRMED)).toBe(true);
    expect(isWheelConditionComplete(null)).toBe(false);

    for (const key of Object.keys(CONFIRMED) as Array<keyof WheelCondition>) {
      expect(isWheelConditionComplete({ ...CONFIRMED, [key]: null })).toBe(
        false,
      );
    }
  });

  it('문제 있음은 확인 완료로 바뀌지 않는다', () => {
    expect(isWheelConditionComplete({ ...CONFIRMED, damageFree: false })).toBe(
      false,
    );
    expect(hasWheelConditionIssue({ ...CONFIRMED, damageFree: false })).toBe(
      true,
    );
  });

  it('AI가 채울 기본값 없이 다섯 항목 모두 미확인으로 시작한다', () => {
    expect(unansweredWheelConditionCount(EMPTY_WHEEL_CONDITION)).toBe(5);
    expect(hasWheelConditionIssue(EMPTY_WHEEL_CONDITION)).toBe(false);
  });

  it('상태 자체가 없으면 전부 미확인으로 본다', () => {
    // 기록이 없는 것을 "문제 없음"으로 읽으면 Gate가 통째로 열린다.
    expect(unansweredWheelConditionCount(null)).toBe(5);
    expect(hasWheelConditionIssue(null)).toBe(false);
  });
});
