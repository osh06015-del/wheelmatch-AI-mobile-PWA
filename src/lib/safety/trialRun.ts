// 시험운전 절차의 순수 로직.
//
// 근거: 산업안전보건기준에 관한 규칙 제122조 ② — 작업을 시작하기 전에는
// 1분 이상, 연삭숫돌을 교체한 후에는 3분 이상 시험운전을 하고 해당 기계에
// 이상이 있는지를 확인하여야 한다. (docs/regulatory-sources.md §1)
//
// **이 앱은 시간을 재고 작업자의 답을 남길 뿐이다.** 법정 절차를 대신하지
// 않고, 시간을 줄여주지도 않는다.
//
// 시각은 이 파일이 읽지 않는다. 전부 인자로 받는다 — 같은 입력에 같은 결과가
// 나와야 기록을 되짚을 수 있고, 테스트에서 실제로 3분을 기다리지 않아도 된다.

import type {
  TrialRun,
  TrialRunFinding,
  TrialRunOutcome,
  Verdict,
} from '@/lib/rules/types';

/** 제122조 ②가 정한 두 가지 시간. 줄이지 않는다. */
export const TRIAL_RUN_SECONDS = {
  /** 작업을 시작하기 전: 1분 이상 */
  beforeWork: 60,
  /** 연삭숫돌을 교체한 후: 3분 이상 */
  afterReplacement: 180,
} as const;

export const TRIAL_RUN_FINDING_KEYS: ReadonlyArray<TrialRunFinding> = [
  'vibration',
  'noise',
  'wobble',
  'wheelDamage',
  'equipment',
];

export function requiredTrialRunSeconds(wheelReplaced: boolean): number {
  return wheelReplaced
    ? TRIAL_RUN_SECONDS.afterReplacement
    : TRIAL_RUN_SECONDS.beforeWork;
}

/**
 * 진행 중인 시험운전.
 *
 * **절대 종료시각을 저장한다.** 틱을 세면 탭이 백그라운드로 내려가거나 렌더가
 * 멈춘 만큼 시간이 짧아진다 — 법이 정한 시간을 앱이 마음대로 줄이는 셈이다.
 * 끝나는 시각을 박아두면 화면이 멈췄다 돌아와도 남은 시간이 정확하다.
 */
export interface TrialRunProgress {
  wheelReplaced: boolean;
  requiredSeconds: number;
  startedAt: string;
  /** 이 시각이 지나야 완료할 수 있다 */
  endsAt: string;
}

export function startTrialRun(
  wheelReplaced: boolean,
  now: Date,
): TrialRunProgress {
  const requiredSeconds = requiredTrialRunSeconds(wheelReplaced);
  return {
    wheelReplaced,
    requiredSeconds,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + requiredSeconds * 1000).toISOString(),
  };
}

/** 남은 초. 올림한다 — 0.4초 남았는데 0으로 보이면 끝난 줄 안다. */
export function remainingSeconds(
  progress: TrialRunProgress | null,
  now: Date,
): number {
  if (!progress) return 0;
  const ends = Date.parse(progress.endsAt);
  if (Number.isNaN(ends)) return 0;
  return Math.max(0, Math.ceil((ends - now.getTime()) / 1000));
}

/** 요구 시간을 다 채웠는가. 진행 중이 아니면 false다. */
export function isTrialRunElapsed(
  progress: TrialRunProgress | null,
  now: Date,
): boolean {
  if (!progress) return false;
  return remainingSeconds(progress, now) === 0;
}

/** mm:ss. 화면과 테스트가 같은 문자열을 본다. */
export function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface TrialRunPreconditions {
  verdict: Verdict;
  grinderConditionComplete: boolean;
  wheelConditionComplete: boolean;
  checklistComplete: boolean;
}

/**
 * 시험운전을 시작할 수 있는가.
 *
 * 규격이 맞지 않거나 판정하지 못한 조합으로 기계를 돌리게 두지 않는다.
 * 부적합 조합의 시험운전을 앱이 유도하면 그 자체가 사고 경로다.
 * 두 상태 Gate와 작업 전 체크리스트도 모두 끝나 있어야 한다.
 */
export function canStartTrialRun(input: TrialRunPreconditions): boolean {
  return (
    input.verdict === 'COMPATIBLE' &&
    input.grinderConditionComplete &&
    input.wheelConditionComplete &&
    input.checklistComplete
  );
}

/**
 * 타이머가 끝난 뒤 작업자의 답을 받아 기록을 만든다.
 *
 * 시간이 남았으면 null이다 — 화면 버튼과 별개로 여기서 한 번 더 막는다.
 * "이상 없음"인데 이상 항목이 골라져 있으면 그것도 null이다. 서로 어긋나는
 * 기록을 만들 바에는 만들지 않는다.
 */
export function completeTrialRun(
  progress: TrialRunProgress | null,
  now: Date,
  outcome: TrialRunOutcome,
  findings: readonly TrialRunFinding[],
): TrialRun | null {
  if (!progress) return null;
  if (!isTrialRunElapsed(progress, now)) return null;
  if (outcome === 'normal' && findings.length > 0) return null;

  const started = Date.parse(progress.startedAt);
  const elapsedSeconds = Number.isNaN(started)
    ? progress.requiredSeconds
    : Math.max(0, Math.round((now.getTime() - started) / 1000));

  return {
    wheelReplaced: progress.wheelReplaced,
    requiredSeconds: progress.requiredSeconds,
    startedAt: progress.startedAt,
    finishedAt: now.toISOString(),
    elapsedSeconds,
    outcome,
    findings: outcome === 'abnormal' ? [...findings] : [],
    completed: true,
  };
}

/** 이상이 확인된 시험운전인가. 저장 버튼 문구가 갈린다. */
export function isTrialRunStopped(trialRun: TrialRun | null): boolean {
  return trialRun !== null && trialRun.outcome === 'abnormal';
}
