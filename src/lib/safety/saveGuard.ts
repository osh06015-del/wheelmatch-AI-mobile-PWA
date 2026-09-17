// 저장 허용 조건의 순수 로직.
//
// 결과 화면의 저장 버튼(canSave)과 저장 함수 내부의 재검사가 **같은 함수**를
// 부른다. 따로 계산하면 한쪽만 고쳤을 때 버튼은 막아도 저장 함수는 그대로
// 저장해버리는 식으로 조용히 어긋날 수 있다. 판정 로직은 건드리지 않는다 —
// 이미 계산된 verdict·Gate 완료 여부·시험운전 기록을 조합만 한다.

import type { TrialRun, Verdict } from '@/lib/rules/types';

export interface SaveGuardInput {
  grinderConditionComplete: boolean;
  wheelConditionComplete: boolean;
  checklistComplete: boolean;
  verdict: Verdict;
  /** 완료된 시험운전 기록. 시작 전이거나 진행 중이면 null. */
  trialRunRecord: TrialRun | null;
  /**
   * 이 종류에 시험운전 근거가 확인됐는가(Profile의 trialRunPolicy).
   * 근거가 없으면 앱이 시험운전을 열지 않으므로 요구하지도 않는다.
   * 넘기지 않으면 기존처럼 요구한다.
   */
  trialRunPolicyVerified?: boolean;
}

/**
 * 시험운전이 필요한 조합인데 아직 끝내지 않았는가.
 *
 * 적합(COMPATIBLE) 조합만 시험운전을 요구한다. 부적합·판정불가는 시험운전
 * 자체가 열리지 않으므로(canStartTrialRun) 이 항목에서 막히지 않는다.
 */
function trialRunSettled(
  verdict: Verdict,
  trialRunRecord: TrialRun | null,
  policyVerified: boolean,
): boolean {
  return !policyVerified || verdict !== 'COMPATIBLE' || trialRunRecord !== null;
}

/**
 * 지금 저장해도 되는가.
 *
 * 두 Condition Gate, 작업 전 체크리스트, 필요한 경우의 시험운전 완료까지
 * 넷 다 갖춰야 true다. 하나라도 미충족이면 saveInspection을 부르지 않는다 —
 * 호출자(결과 화면)는 이 값이 false일 때 저장 함수 자체를 실행하지 않는다.
 */
export function canSaveInspection(input: SaveGuardInput): boolean {
  return (
    input.grinderConditionComplete &&
    input.wheelConditionComplete &&
    input.checklistComplete &&
    trialRunSettled(
      input.verdict,
      input.trialRunRecord,
      input.trialRunPolicyVerified ?? true,
    )
  );
}
