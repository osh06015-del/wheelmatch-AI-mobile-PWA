// 다각도 외관 확인 결과를 안전 규칙으로 옮기는 순수 로직.
//
// 이 파일이 지키는 계약은 한 줄이다.
//
//   **AI는 의심을 더할 수 있을 뿐, 덜어낼 수 없다.**
//
// 그래서 not_observed(찾지 못함)는 어떤 경로로도 "손상 없음"이나 규칙 통과로
// 바뀌지 않는다. 작업자 확인 Gate(WheelConditionGate)를 대신 채우지도 않는다 —
// 그 Gate는 사람이 실물을 보고 누르는 것만 받는다(docs/safety-boundaries.md).
//
// 화면 없이 조건 하나하나를 테스트할 수 있도록 순수 함수로 둔다.

import { ExtractError } from '@/lib/ocr/errors';
import type {
  VisibleDamage,
  WheelExamNotRunReason,
  WheelExamResult,
  WheelExamView,
  WheelType,
} from '@/lib/rules/types';

/**
 * 다각도 확인을 요구하는 숫돌 종류.
 *
 * 이 앱이 규격을 대조하는 종류(일반 결합숫돌)와 같다. 다이아몬드날·플랩디스크·
 * 컵휠 등은 애초에 규격 대조 자체가 판정불가로 끝나므로(engine.ts의
 * checkWheelType) 사진을 더 받아도 결과가 달라지지 않는다. 요구하지 않는 것이
 * 판정을 완화하지 않는다 — 그 종류는 계속 판정불가다.
 */
export function wheelExamRequired(wheelType: WheelType): boolean {
  return wheelType === 'bonded_abrasive';
}

/** 앞면 외에 작업자가 더 찍어야 하는 사진. 순서가 곧 화면에 보이는 순서다. */
export const EXTRA_EXAM_VIEWS: ReadonlyArray<
  Extract<WheelExamView, 'back' | 'edge' | 'bore'>
> = ['back', 'edge', 'bore'];

/**
 * 다시 찍어야 하는 사진.
 *
 * 모델이 판독할 수 없다고 한 사진(readable=false)만 고른다. issues가 비어
 * 있지 않아도 판독은 됐다면 다시 찍게 하지 않는다 — 반사가 조금 있는 사진까지
 * 되돌리면 현장에서 아무것도 진행되지 않는다.
 */
export function viewsNeedingRetake(
  exam: WheelExamResult | null,
): WheelExamView[] {
  if (!exam) return [];
  return exam.photoQuality
    .filter((photo) => !photo.readable)
    .map((photo) => photo.view);
}

/**
 * 다각도 확인 결과를 VisibleDamage로 옮긴다.
 *
 * suspected만 'suspected'가 된다. 나머지는 전부 'unknown'이다 —
 * not_observed를 'none_visible'로 적으면 "사진에서 보이지 않았다"는 기록이
 * 남는데, 그것을 통과 근거로 읽는 코드가 나중에 생길 여지를 만든다.
 * 확인하지 못한 것은 확인하지 못한 채로 둔다.
 */
export function examVisibleDamage(exam: WheelExamResult | null): VisibleDamage {
  return exam?.status === 'suspected' ? 'suspected' : 'unknown';
}

/**
 * 라벨 사진의 판독값과 다각도 확인 결과를 합친다.
 *
 * 한쪽이라도 의심하면 의심이다. 반대 방향으로는 절대 움직이지 않는다 —
 * 라벨 사진이 'suspected'인데 다각도 확인이 찾지 못했다고 해서 의심을
 * 지우지 않는다.
 */
export function mergeVisibleDamage(
  fromLabel: VisibleDamage,
  fromExam: VisibleDamage,
): VisibleDamage {
  if (fromLabel === 'suspected' || fromExam === 'suspected') return 'suspected';
  return fromLabel;
}

/**
 * 실패를 "실행되지 않은 이유"로 옮긴다.
 *
 * 실패를 not_observed·unassessable로 바꾸지 않는다 — 그 둘은 사진을 보았다는
 * 뜻이다. 원인을 가릴 수 없으면 user_manual_continue로 남긴다: 무엇이
 * 잘못됐는지는 모르지만 작업자가 직접점검으로 진행하기로 했다는 사실만은 남는다.
 *
 * @param online 시도 시점에 기기가 온라인이었는가. 브라우저 밖에서는 판단하지
 *   않는 값이라 호출자가 넘긴다(navigator.onLine).
 */
export function notRunReasonFrom(
  error: unknown,
  online: boolean,
): WheelExamNotRunReason {
  if (!online) return 'offline';
  if (error instanceof ExtractError) {
    return error.failure === 'network' ? 'network_error' : 'api_error';
  }
  return 'user_manual_continue';
}

/** 진행을 막는 이유. null이면 이 기능이 막을 이유가 없다는 뜻이다. */
export type WheelExamBlock =
  | 'photosMissing' // 추가 사진 3장이 아직 없다
  | 'captureReview' // 사진 상태 경고에 아직 답하지 않았다(다시 찍기·그래도 사용)
  | 'notAnalyzed' // 사진은 있는데 아직 분석하지 않았다
  | 'retakeRequired' // 판독할 수 없는 사진이 있다
  | 'needsAcknowledge' // 이상 징후를 작업자가 아직 확인하지 않았다
  | 'needsManualContinue'; // AI가 확인하지 못했다는 것을 아직 확인하지 않았다

export interface WheelExamGateInput {
  /** 이 종류에 다각도 확인을 요구하는가 (wheelExamRequired) */
  required: boolean;
  /** 추가 사진 세 장을 모두 받았는가 */
  photosReady: boolean;
  /**
   * 사진 상태 경고가 붙은 사진 중 작업자가 아직 답하지 않은 것이 있는가.
   *
   * 사진을 보내기 전의 확인일 뿐 안전 조건이 아니다. "그래도 사용"으로 풀린다.
   */
  captureReviewPending: boolean;
  /** 분석 결과. 아직 돌리지 않았거나 실패했으면 null */
  exam: WheelExamResult | null;
  /** 이상 징후 경고를 작업자가 확인했는가 */
  acknowledged: boolean;
  /**
   * 분석을 시도했지만 서버·네트워크 오류로 실패했는가.
   *
   * 실패해도 영원히 막지는 않는다. AI가 돌지 않았다고 법이 요구하는 사람의
   * 점검까지 막으면 앱이 점검 자체를 가로막는 셈이다. 다만 **조용히 넘어가지도
   * 않는다** — 작업자가 "AI 확인 없이 직접점검으로 진행"을 명시적으로 확인해야
   * 열린다(manualContinueAcknowledged). AI 실패는 아무것도 승인하지 않고
   * 아무것도 확인해주지 않는다.
   */
  analysisFailed: boolean;
  /** 작업자가 AI 확인 없이 직접점검으로 진행하겠다고 확인했는가 */
  manualContinueAcknowledged: boolean;
}

/**
 * 다각도 확인 때문에 진행을 막아야 하는가.
 *
 * 막는 경우는 여섯이다.
 *   1. 요구되는데 사진이 아직 없다
 *   1-1. 사진 상태 경고에 아직 답하지 않았다(다시 찍기·그래도 사용으로 풀린다)
 *   2. 사진은 있는데 분석을 돌리지 않았다
 *   3. 판독할 수 없는 사진이 있다 → 그 사진을 다시 찍어야 한다
 *   4. 이상 징후가 보이는데 작업자가 아직 확인하지 않았다
 *   5. AI가 확인하지 못했는데 직접점검으로 진행하겠다는 확인이 없다
 *
 * not_observed는 막지 않는다. 대신 아무것도 통과시키지도 않는다 —
 * 작업자 확인 Gate가 그대로 남아 있어 사람이 직접 눌러야 다음으로 간다.
 */
export function wheelExamBlock(
  input: WheelExamGateInput,
): WheelExamBlock | null {
  if (!input.required) return null;
  // 서버·네트워크 실패는 영원히 막지 않지만, 확인 없이 지나가지도 못한다.
  if (input.analysisFailed) {
    return input.manualContinueAcknowledged ? null : 'needsManualContinue';
  }
  if (!input.photosReady) return 'photosMissing';
  if (input.captureReviewPending) return 'captureReview';
  if (!input.exam) return 'notAnalyzed';
  if (viewsNeedingRetake(input.exam).length > 0) return 'retakeRequired';
  if (input.exam.status === 'suspected' && !input.acknowledged) {
    return 'needsAcknowledge';
  }
  return null;
}
