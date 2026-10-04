// 제한 대조가 된 까닭을 고른 언어의 줄로 만든다.
//
// 결과 화면(OfflineReanalysisPanel)과 내보낸 문서(record/report.ts)가 같은 줄을
// 쓰도록 여기 한 곳에 둔다. 까닭은 확인 화면이 확정할 때 남긴 값 그대로다 —
// 여기서 추정하거나 고쳐 적지 않는다.

import type {
  AnalysisLimitCause,
  AnalysisLimitCauses,
} from '@/lib/rules/types';
import type { Translate } from './index';
import type { MessageKey } from './messages/ko';

type LimitStep = keyof AnalysisLimitCauses;

/** 적는 순서. 점검 순서(명판 → 숫돌 라벨)와 같다 */
const STEPS: readonly LimitStep[] = ['grinder', 'wheel'];

const STEP_LABEL: Readonly<Record<LimitStep, MessageKey>> = {
  grinder: 'common.grinder',
  wheel: 'common.wheel',
};

const CAUSE_TEXT: Readonly<Record<AnalysisLimitCause, MessageKey>> = {
  manual: 'offline.cause.manual',
  local_ocr: 'offline.cause.localOcr',
  dropped_ocr: 'offline.cause.ocrDropped',
  unknown: 'offline.cause.unknown',
};

export interface LimitCauseLine {
  step: LimitStep;
  text: string;
}

/**
 * 제한된 단계마다 「단계: 까닭」 한 줄. 제한되지 않은 단계는 줄이 없다.
 */
export function limitCauseLines(
  causes: AnalysisLimitCauses,
  t: Translate,
): LimitCauseLine[] {
  return STEPS.flatMap((step) => {
    const cause: string | undefined = causes[step];
    if (cause === undefined) return [];
    // 내보낸 문서는 저장된 기록의 값을 그대로 넘긴다. 목록에 없는 값(다른 버전이 쓴
    // 기록 등)을 문구 키로 쓰면 빈 문장이 찍힌다 — 까닭이 기록되지 않은 것으로 적는다.
    const causeKey = Object.prototype.hasOwnProperty.call(CAUSE_TEXT, cause)
      ? CAUSE_TEXT[cause as AnalysisLimitCause]
      : CAUSE_TEXT.unknown;
    return [
      {
        step,
        text: t('offline.cause.line', {
          step: t(STEP_LABEL[step]),
          cause: t(causeKey),
        }),
      },
    ];
  });
}
