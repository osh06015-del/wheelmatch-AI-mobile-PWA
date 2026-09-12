// 그라인더 상태 Gate의 순수 로직 테스트.
//
// 숫돌 쪽과 같은 규칙이지만 같은 함수를 쓰지 않는다. 한쪽을 고쳐 다른 쪽이
// 조용히 느슨해지는 일을 막으려면 두 Gate가 각자 자기 경계를 지켜야 한다.

import { describe, expect, it } from 'vitest';

import {
  EMPTY_GRINDER_CONDITION,
  GRINDER_CONDITION_KEYS,
  hasGrinderConditionIssue,
  isGrinderConditionComplete,
  unansweredGrinderConditionCount,
} from './grinderCondition';
import type { GrinderCondition } from '@/lib/rules/types';

const CONFIRMED: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

describe('Grinder Condition Gate', () => {
  it('다섯 항목을 요구한다', () => {
    expect(GRINDER_CONDITION_KEYS).toHaveLength(5);
    expect([...GRINDER_CONDITION_KEYS]).toEqual([
      'cordAndPlugUndamaged',
      'bodyUndamaged',
      'guardSecure',
      'auxiliaryHandleSecure',
      'spindleAssemblyUndamaged',
    ]);
  });

  it('AI가 채울 기본값 없이 다섯 항목 모두 미확인으로 시작한다', () => {
    expect(unansweredGrinderConditionCount(EMPTY_GRINDER_CONDITION)).toBe(5);
    expect(hasGrinderConditionIssue(EMPTY_GRINDER_CONDITION)).toBe(false);
    expect(isGrinderConditionComplete(EMPTY_GRINDER_CONDITION)).toBe(false);
    for (const key of GRINDER_CONDITION_KEYS) {
      expect(EMPTY_GRINDER_CONDITION[key]).toBeNull();
    }
  });

  it('다섯 항목을 모두 작업자가 확인해야 열린다', () => {
    expect(isGrinderConditionComplete(CONFIRMED)).toBe(true);

    for (const key of GRINDER_CONDITION_KEYS) {
      expect(isGrinderConditionComplete({ ...CONFIRMED, [key]: null })).toBe(
        false,
      );
    }
  });

  it('문제 있음은 확인 완료로 바뀌지 않는다', () => {
    for (const key of GRINDER_CONDITION_KEYS) {
      const withIssue = { ...CONFIRMED, [key]: false };
      expect(isGrinderConditionComplete(withIssue)).toBe(false);
      expect(hasGrinderConditionIssue(withIssue)).toBe(true);
    }
  });

  it('상태 자체가 없으면 전부 미확인으로 본다', () => {
    // 기록이 없는 것을 "문제 없음"으로 읽으면 Gate가 통째로 열린다.
    expect(unansweredGrinderConditionCount(null)).toBe(5);
    expect(hasGrinderConditionIssue(null)).toBe(false);
    expect(isGrinderConditionComplete(null)).toBe(false);
  });

  it('미확인 개수를 정확히 센다', () => {
    expect(
      unansweredGrinderConditionCount({ ...CONFIRMED, guardSecure: null }),
    ).toBe(1);
    expect(
      unansweredGrinderConditionCount({
        ...EMPTY_GRINDER_CONDITION,
        bodyUndamaged: false,
      }),
      // 문제 있음은 "답한 것"이다. 미확인이 아니다.
    ).toBe(4);
  });
});
