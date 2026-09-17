import { describe, expect, it } from 'vitest';

import {
  EMPTY_WHEEL_CONDITION,
  hasWheelConditionIssue,
  isWheelConditionComplete,
  unansweredWheelConditionCount,
} from './wheelCondition';
import type { WheelCondition } from '@/lib/rules/types';
import { pickWheelCondition } from './wheelCondition';

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

describe('종류별 Gate 항목', () => {
  const DIAMOND_KEYS = [
    'damageFree',
    'notDeformed',
    'diamondRimIntact',
    'mountingAreaUndamaged',
    'labelLegible',
  ] as const;
  const allTrue: WheelCondition = {
    damageFree: true,
    notDeformed: true,
    mountingAreaUndamaged: true,
    labelLegible: true,
    expiryValid: null,
  };

  it('종류별 항목에 답하지 않았으면(없음) Gate를 열지 않는다', () => {
    expect(isWheelConditionComplete(allTrue, DIAMOND_KEYS)).toBe(false);
    expect(unansweredWheelConditionCount(allTrue, DIAMOND_KEYS)).toBe(1);
  });

  it('그 종류에서 묻는 항목을 모두 확인하면 연다 — 묻지 않는 유효기한은 보지 않는다', () => {
    const answered = { ...allTrue, diamondRimIntact: true };
    expect(isWheelConditionComplete(answered, DIAMOND_KEYS)).toBe(true);
    // 기본 다섯 항목으로 보면 유효기한 미확인이라 열리지 않는다.
    expect(isWheelConditionComplete(answered)).toBe(false);
  });

  it('종류별 항목에서 문제 있음이면 중지 경고 대상이다', () => {
    expect(
      hasWheelConditionIssue(
        { ...allTrue, diamondRimIntact: false },
        DIAMOND_KEYS,
      ),
    ).toBe(true);
  });

  it('기록에는 물은 항목의 답만 남긴다 — 다른 종류로 답한 항목은 버린다', () => {
    const picked = pickWheelCondition(
      {
        ...allTrue,
        expiryValid: true,
        wiresIntact: true,
        diamondRimIntact: true,
      },
      DIAMOND_KEYS,
    );
    expect(picked).toEqual({
      damageFree: true,
      notDeformed: true,
      mountingAreaUndamaged: true,
      labelLegible: true,
      expiryValid: null,
      diamondRimIntact: true,
    });
    expect(picked).not.toHaveProperty('wiresIntact');
  });
});
