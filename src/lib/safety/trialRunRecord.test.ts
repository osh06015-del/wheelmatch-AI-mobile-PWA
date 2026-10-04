import { describe, expect, it } from 'vitest';
import { completeTrialRun, isSettledTrialRun, startTrialRun } from './trialRun';

const start = new Date('2026-10-04T01:00:00.000Z');
const normal = completeTrialRun(
  startTrialRun(false, start),
  new Date(start.getTime() + 60_000),
  'normal',
  [],
)!;

describe('진행 중 점검의 시험운전 기록 일관성', () => {
  it.each([false, true])(
    '정상 완료와 조기 중지를 구분한다 (교체 %s)',
    (replaced) => {
      const progress = startTrialRun(replaced, start);
      const boundary = new Date(progress.endsAt);
      expect(
        isSettledTrialRun(completeTrialRun(progress, boundary, 'normal', [])),
      ).toBe(true);
      expect(
        completeTrialRun(
          progress,
          new Date(boundary.getTime() - 1),
          'normal',
          [],
        ),
      ).toBeNull();
      for (const ms of [
        0,
        1_000,
        progress.requiredSeconds * 1000 - 1,
        progress.requiredSeconds * 1000,
      ]) {
        expect(
          isSettledTrialRun(
            completeTrialRun(
              progress,
              new Date(start.getTime() + ms),
              'abnormal',
              ['noise'],
            ),
          ),
        ).toBe(true);
      }
    },
  );

  it.each([
    null,
    undefined,
    {},
    [],
    { ...normal, wheelReplaced: 'false' },
    { ...normal, requiredSeconds: 59 },
    { ...normal, startedAt: 'invalid' },
    { ...normal, finishedAt: 'invalid' },
    { ...normal, elapsedSeconds: Infinity },
    { ...normal, elapsedSeconds: NaN },
    { ...normal, elapsedSeconds: 60.5 },
    { ...normal, completed: 'true' },
    { ...normal, outcome: 'unknown' },
    { ...normal, findings: null },
    { ...normal, findings: ['unknown'] },
    { ...normal, completed: false },
    { ...normal, finishedAt: start.toISOString(), elapsedSeconds: 0 },
    { ...normal, finishedAt: '2026-10-04T00:59:59.000Z' },
    { ...normal, elapsedSeconds: 59 },
  ])('모양이나 값끼리 어긋난 기록은 받지 않는다: %j', (value) => {
    expect(isSettledTrialRun(value)).toBe(false);
  });
});
