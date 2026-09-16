import { describe, expect, it } from 'vitest';

import { canSaveInspection, type SaveGuardInput } from './saveGuard';
import type { TrialRun } from '@/lib/rules/types';

const TRIAL_RUN: TrialRun = {
  wheelReplaced: false,
  requiredSeconds: 60,
  startedAt: '2026-09-16T09:00:00.000Z',
  finishedAt: '2026-09-16T09:01:00.000Z',
  elapsedSeconds: 61,
  outcome: 'normal',
  findings: [],
  completed: true,
};

function input(overrides: Partial<SaveGuardInput> = {}): SaveGuardInput {
  return {
    grinderConditionComplete: true,
    wheelConditionComplete: true,
    checklistComplete: true,
    verdict: 'COMPATIBLE',
    trialRunRecord: TRIAL_RUN,
    ...overrides,
  };
}

describe('canSaveInspection', () => {
  it('네 조건을 모두 갖추면 저장을 허용한다', () => {
    expect(canSaveInspection(input())).toBe(true);
  });

  it('그라인더 장비 상태를 확인하지 않았으면 막는다', () => {
    expect(canSaveInspection(input({ grinderConditionComplete: false }))).toBe(
      false,
    );
  });

  it('숫돌 상태를 확인하지 않았으면 막는다', () => {
    expect(canSaveInspection(input({ wheelConditionComplete: false }))).toBe(
      false,
    );
  });

  it('체크리스트를 다 채우지 않았으면 막는다', () => {
    expect(canSaveInspection(input({ checklistComplete: false }))).toBe(false);
  });

  it('적합인데 시험운전을 아직 끝내지 않았으면 막는다', () => {
    expect(
      canSaveInspection(input({ verdict: 'COMPATIBLE', trialRunRecord: null })),
    ).toBe(false);
  });

  it.each([['INCOMPATIBLE' as const], ['UNDETERMINED' as const]])(
    '%s는 시험운전이 열리지 않으므로 기록 없이도 저장을 허용한다',
    (verdict) => {
      expect(
        canSaveInspection({
          grinderConditionComplete: true,
          wheelConditionComplete: true,
          checklistComplete: true,
          verdict,
          trialRunRecord: null,
        }),
      ).toBe(true);
    },
  );

  it('여러 조건이 동시에 미충족이어도 하나만 확인하지 않고 전부 본다', () => {
    expect(
      canSaveInspection(
        input({
          grinderConditionComplete: false,
          checklistComplete: false,
          trialRunRecord: null,
        }),
      ),
    ).toBe(false);
  });
});
