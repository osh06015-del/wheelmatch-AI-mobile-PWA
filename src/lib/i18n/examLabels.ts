// 다각도 외관 확인 값에 붙는 문구 키.
//
// 촬영 화면(WheelExamPanel)과 결과·이력의 근거 카드(WheelExamEvidence)가 같은
// 값을 서로 다른 말로 부르면 작업자가 같은 것인지 알 수 없다. 두 화면이 이
// 표 하나를 함께 쓴다.

import type { MessageKey } from './messages/ko';
import type {
  Confidence,
  WheelExamFindingKind,
  WheelExamNotRunReason,
  WheelExamPhotoIssue,
  WheelExamStatus,
  WheelExamView,
} from '@/lib/rules/types';

export const EXAM_VIEW_LABEL: Readonly<Record<WheelExamView, MessageKey>> = {
  front: 'exam.view.front',
  back: 'exam.view.back',
  edge: 'exam.view.edge',
  bore: 'exam.view.bore',
};

export const EXAM_FINDING_LABEL: Readonly<
  Record<WheelExamFindingKind, MessageKey>
> = {
  crack: 'exam.finding.crack',
  chip: 'exam.finding.chip',
  edge_break: 'exam.finding.edgeBreak',
  bore_damage: 'exam.finding.boreDamage',
  deformation: 'exam.finding.deformation',
  contamination: 'exam.finding.contamination',
  other: 'exam.finding.other',
};

export const EXAM_ISSUE_LABEL: Readonly<
  Record<WheelExamPhotoIssue, MessageKey>
> = {
  blur: 'exam.quality.blur',
  glare: 'exam.quality.glare',
  darkness: 'exam.quality.darkness',
  incomplete_view: 'exam.quality.incompleteView',
};

export const EXAM_CONFIDENCE_LABEL: Readonly<Record<Confidence, MessageKey>> = {
  high: 'confidence.high',
  medium: 'confidence.medium',
  low: 'confidence.low',
};

/**
 * 근거 카드에 적는 한 줄 결론.
 *
 * not_observed에 "정상"·"안전"·"통과"에 해당하는 말을 쓰지 않는다. 찾지
 * 못했다는 사실과 직접 확인하라는 요구를 한 줄에 함께 적는다.
 */
export const EXAM_STATUS_LABEL: Readonly<Record<WheelExamStatus, MessageKey>> =
  {
    suspected: 'exam.evidence.suspected',
    not_observed: 'exam.evidence.notObserved',
    unassessable: 'exam.evidence.unassessable',
  };

/** 확인하지 못한 이유. 실패는 실패로만 적고 결과로 바꾸지 않는다. */
export const EXAM_NOT_RUN_LABEL: Readonly<
  Record<WheelExamNotRunReason, MessageKey>
> = {
  network_error: 'exam.notRun.networkError',
  api_error: 'exam.notRun.apiError',
  offline: 'exam.notRun.offline',
  user_manual_continue: 'exam.notRun.userManualContinue',
};
