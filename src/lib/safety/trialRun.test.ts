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
  it('타이머가 남아 있으면 완료할 수 없다', () => {
    const p = startTrialRun(true, T0);
    expect(completeTrialRun(p, at(179), 'normal', [])).toBeNull();
    expect(completeTrialRun(p, at(1), 'abnormal', ['noise'])).toBeNull();
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
