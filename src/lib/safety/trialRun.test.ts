// 시험운전 순수 로직 테스트.
//
// 실제 60초·180초를 기다리지 않는다. 이 모듈이 시계를 읽지 않고 now를
// 인자로 받기 때문에 가능한 일이다. 운영 코드의 시간은 줄이지 않는다.

import { describe, expect, it } from 'vitest';

import {
  TRIAL_RUN_FINDING_KEYS,
  TRIAL_RUN_SECONDS,
  canStartTrialRun,
  completeTrialRun,
  formatRemaining,
  isTrialRunElapsed,
  isTrialRunProgress,
  isTrialRunStopped,
  remainingSeconds,
  requiredTrialRunSeconds,
  startTrialRun,
} from './trialRun';
import type { Verdict } from '@/lib/rules/types';

const T0 = new Date('2026-09-12T09:00:00.000Z');
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

const READY = {
  verdict: 'COMPATIBLE' as Verdict,
  grinderConditionComplete: true,
  wheelConditionComplete: true,
  checklistComplete: true,
};

describe('요구 시간 — 제122조 ②', () => {
  it('교체하지 않았으면 60초다', () => {
    expect(requiredTrialRunSeconds(false)).toBe(60);
    expect(TRIAL_RUN_SECONDS.beforeWork).toBe(60);
    expect(startTrialRun(false, T0).requiredSeconds).toBe(60);
  });

  it('숫돌을 교체했으면 180초다', () => {
    expect(requiredTrialRunSeconds(true)).toBe(180);
    expect(TRIAL_RUN_SECONDS.afterReplacement).toBe(180);
    expect(startTrialRun(true, T0).requiredSeconds).toBe(180);
  });
});

describe('남은 시간 — 절대 종료시각 기준', () => {
  it('시작 시각과 요구 시간으로 종료시각을 박아둔다', () => {
    const p = startTrialRun(true, T0);
    expect(p.startedAt).toBe(T0.toISOString());
    expect(p.endsAt).toBe(at(180).toISOString());
  });

  it('흐른 시각만큼 줄어든다', () => {
    const p = startTrialRun(false, T0);
    expect(remainingSeconds(p, T0)).toBe(60);
    expect(remainingSeconds(p, at(20))).toBe(40);
    expect(remainingSeconds(p, at(59))).toBe(1);
  });

  it('렌더가 멈췄다 돌아와도 시간이 줄어들지 않는다', () => {
    // 틱을 세면 백그라운드에 있던 만큼 시간이 짧아진다. 그러면 앱이
    // 법이 정한 시간을 마음대로 줄이는 셈이다.
    const p = startTrialRun(true, T0);
    // 화면이 100초 동안 한 번도 갱신되지 않은 경우
    expect(remainingSeconds(p, at(100))).toBe(80);
    // 종료시각을 훌쩍 넘겨 돌아온 경우
    expect(remainingSeconds(p, at(5000))).toBe(0);
  });

  it('음수로 내려가지 않는다', () => {
    const p = startTrialRun(false, T0);
    expect(remainingSeconds(p, at(90))).toBe(0);
  });

  it('진행 중이 아니면 남은 시간도 경과도 없다', () => {
    expect(remainingSeconds(null, T0)).toBe(0);
    expect(isTrialRunElapsed(null, T0)).toBe(false);
  });

  it('종료시각이 망가진 값이면 경과로 보지 않는다', () => {
    const broken = { ...startTrialRun(false, T0), endsAt: '언젠가' };
    expect(remainingSeconds(broken, T0)).toBe(0);
  });

  it('mm:ss로 보여준다', () => {
    expect(formatRemaining(180)).toBe('03:00');
    expect(formatRemaining(61)).toBe('01:01');
    expect(formatRemaining(9)).toBe('00:09');
    expect(formatRemaining(0)).toBe('00:00');
    expect(formatRemaining(-5)).toBe('00:00');
  });
});

describe('시작 조건', () => {
  it('네 조건이 모두 맞아야 시작할 수 있다', () => {
    expect(canStartTrialRun(READY)).toBe(true);
  });

  it('부적합 조합으로는 시험운전을 시작하지 않는다', () => {
    // 맞지 않는 조합으로 기계를 돌리게 두면 앱이 사고를 유도하는 셈이다.
    expect(canStartTrialRun({ ...READY, verdict: 'INCOMPATIBLE' })).toBe(false);
  });

  it('판정불가에서도 시작하지 않는다', () => {
    expect(canStartTrialRun({ ...READY, verdict: 'UNDETERMINED' })).toBe(false);
  });

  it('상태 Gate나 체크리스트가 남아 있으면 시작하지 않는다', () => {
    expect(
      canStartTrialRun({ ...READY, grinderConditionComplete: false }),
    ).toBe(false);
    expect(canStartTrialRun({ ...READY, wheelConditionComplete: false })).toBe(
      false,
    );
    expect(canStartTrialRun({ ...READY, checklistComplete: false })).toBe(
      false,
    );
  });
});

describe('완료 처리', () => {
  it.each([false, true])(
    '이상 없음은 요구 시간 직전까지 막는다 — 교체 %s',
    (replaced) => {
      const p = startTrialRun(replaced, T0);
      expect(
        completeTrialRun(p, at(p.requiredSeconds - 0.001), 'normal', []),
      ).toBeNull();
      expect(
        completeTrialRun(p, at(p.requiredSeconds), 'normal', [])?.completed,
      ).toBe(true);
    },
  );

  it.each([false, true])(
    '이상 있음은 시작 즉시부터 중지 기록을 남긴다 — 교체 %s',
    (replaced) => {
      const p = startTrialRun(replaced, T0);
      for (const seconds of [0, 1, p.requiredSeconds - 1]) {
        const run = completeTrialRun(p, at(seconds), 'abnormal', ['noise']);
        expect(run).toMatchObject({
          outcome: 'abnormal',
          findings: ['noise'],
          completed: false,
          elapsedSeconds: seconds,
          requiredSeconds: p.requiredSeconds,
          finishedAt: at(seconds).toISOString(),
        });
        expect(isTrialRunStopped(run)).toBe(true);
      }
    },
  );

  it('증상 선택 없이도 즉시 이상을 보고할 수 있다', () => {
    expect(
      completeTrialRun(startTrialRun(false, T0), T0, 'abnormal', []),
    ).toMatchObject({
      outcome: 'abnormal',
      findings: [],
      elapsedSeconds: 0,
      completed: false,
    });
    expect(completeTrialRun(null, T0, 'abnormal', [])).toBeNull();
  });

  it('진행 중인 시험운전이 없으면 완료할 수 없다', () => {
    expect(completeTrialRun(null, T0, 'normal', [])).toBeNull();
  });

  it('이상 없음인데 이상 항목이 골라져 있으면 기록을 만들지 않는다', () => {
    // 서로 어긋나는 기록을 만들 바에는 만들지 않는다.
    const p = startTrialRun(false, T0);
    expect(completeTrialRun(p, at(60), 'normal', ['vibration'])).toBeNull();
  });

  it('이상 없음으로 끝내면 항목이 비어 있다', () => {
    const p = startTrialRun(false, T0);
    const run = completeTrialRun(p, at(65), 'normal', []);

    expect(run).not.toBeNull();
    expect(run?.outcome).toBe('normal');
    expect(run?.findings).toEqual([]);
    expect(run?.completed).toBe(true);
    expect(run?.requiredSeconds).toBe(60);
    expect(run?.elapsedSeconds).toBe(65);
    expect(run?.wheelReplaced).toBe(false);
    expect(run?.startedAt).toBe(T0.toISOString());
    expect(run?.finishedAt).toBe(at(65).toISOString());
  });

  it('이상 있음은 고른 항목을 그대로 남긴다', () => {
    const p = startTrialRun(true, T0);
    const run = completeTrialRun(p, at(190), 'abnormal', ['wobble', 'noise']);

    expect(run?.outcome).toBe('abnormal');
    expect(run?.findings).toEqual(['wobble', 'noise']);
    expect(run?.completed).toBe(true);
    expect(isTrialRunStopped(run)).toBe(true);
  });

  it('요구 시간보다 오래 돌렸으면 실제 시간을 남긴다', () => {
    // "1분 이상"이므로 더 돌린 것은 정상이다. 줄여 적지 않는다.
    const p = startTrialRun(false, T0);
    expect(completeTrialRun(p, at(240), 'normal', [])?.elapsedSeconds).toBe(
      240,
    );
  });

  it('이상 없음 기록은 중지로 보지 않는다', () => {
    const p = startTrialRun(false, T0);
    expect(isTrialRunStopped(completeTrialRun(p, at(60), 'normal', []))).toBe(
      false,
    );
    expect(isTrialRunStopped(null)).toBe(false);
  });

  it('확인 항목 다섯 가지를 고정한다', () => {
    expect([...TRIAL_RUN_FINDING_KEYS]).toEqual([
      'vibration',
      'noise',
      'wobble',
      'wheelDamage',
      'equipment',
    ]);
  });
});

describe('시작 조건 — 시험운전 근거', () => {
  it('근거가 확인되지 않은 종류에는 적합이어도 시험운전을 열지 않는다', () => {
    expect(canStartTrialRun({ ...READY, policyVerified: false })).toBe(false);
  });

  it('근거가 확인됐거나 넘기지 않으면(결합숫돌) 기존처럼 연다', () => {
    expect(canStartTrialRun({ ...READY, policyVerified: true })).toBe(true);
    expect(canStartTrialRun(READY)).toBe(true);
  });
});

describe('저장된 진행 중 시험운전 — 되살려도 되는 값인가', () => {
  // 진행 중 시험운전은 새로고침을 넘도록 저장된다. 저장소에서 읽은 값은 타입이
  // 보장하지 않는다 — 종료시각을 읽지 못하는 값은 남은 시간이 0으로 나와, 그대로
  // 되살리면 1분·3분을 기다리지 않고 답할 수 있다. 되살리기 전에 이 검사를 거친다.

  /** 저장소를 한 번 거친 모양(JSON) */
  const stored = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

  it.each([
    ['작업 시작 전(60초)', false],
    ['교체 후(180초)', true],
  ])('앱이 시작한 시험운전은 통과한다 — %s', (_name, wheelReplaced) => {
    const progress = startTrialRun(wheelReplaced, T0);

    expect(isTrialRunProgress(progress)).toBe(true);
    expect(isTrialRunProgress(stored(progress))).toBe(true);
  });

  it('종료시각이 요구 시간보다 뒤여도 통과한다 — 더 기다리게 할 뿐이다', () => {
    expect(
      isTrialRunProgress({
        ...startTrialRun(false, T0),
        endsAt: at(90).toISOString(),
      }),
    ).toBe(true);
  });

  const REPLACED = startTrialRun(true, T0);

  it.each([
    ['null', null],
    ['문자열', 'running'],
    ['배열', []],
    ['빈 객체', {}],
    ['교체 여부가 없는 값', { ...REPLACED, wheelReplaced: undefined }],
    ['교체 여부가 boolean이 아닌 값', { ...REPLACED, wheelReplaced: 'yes' }],
    ['요구 시간이 없는 값', { ...REPLACED, requiredSeconds: undefined }],
    ['요구 시간이 문자열인 값', { ...REPLACED, requiredSeconds: '180' }],
    ['시작시각이 없는 값', { ...REPLACED, startedAt: undefined }],
    ['시작시각이 숫자인 값', { ...REPLACED, startedAt: T0.getTime() }],
    ['시작시각이 날짜가 아닌 값', { ...REPLACED, startedAt: '아까' }],
    ['종료시각이 없는 값', { ...REPLACED, endsAt: undefined }],
    ['종료시각이 숫자인 값', { ...REPLACED, endsAt: at(180).getTime() }],
    ['종료시각이 날짜가 아닌 값', { ...REPLACED, endsAt: '언젠가' }],
  ])('형태가 어긋나면 통과하지 못한다 — %s', (_name, value) => {
    expect(isTrialRunProgress(value)).toBe(false);
  });

  it.each([
    [
      '법정 시간이 아닌 요구 시간(5초)',
      { ...REPLACED, requiredSeconds: 5, endsAt: at(5).toISOString() },
    ],
    [
      '교체했는데 60초인 값',
      { ...REPLACED, requiredSeconds: 60, endsAt: at(60).toISOString() },
    ],
    ['교체하지 않았는데 180초인 값', { ...REPLACED, wheelReplaced: false }],
    [
      '종료시각이 시작 + 요구 시간보다 1초 이른 값',
      { ...REPLACED, endsAt: at(179).toISOString() },
    ],
    [
      '종료시각이 시작시각보다 앞선 값',
      { ...REPLACED, endsAt: at(-1).toISOString() },
    ],
  ])('법정 시간과 맞지 않으면 통과하지 못한다 — %s', (_name, value) => {
    // 형태는 온전해도, 이 값을 되살리면 제122조 ②의 시간보다 일찍 끝난다.
    expect(isTrialRunProgress(value)).toBe(false);
  });

  it('경계 — 종료시각이 정확히 시작 + 요구 시간이면 통과한다', () => {
    expect(
      isTrialRunProgress({ ...REPLACED, endsAt: at(180).toISOString() }),
    ).toBe(true);
  });
});
