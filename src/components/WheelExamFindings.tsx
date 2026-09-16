'use client';

// AI가 사진에서 본 이상 징후 목록.
//
// 촬영 화면과 결과·이력의 근거 카드가 같은 목록을 쓴다. 어느 사진에서(위치),
// 무엇으로 보였고(유형), 왜 그렇게 보았는지(이유)를 한 항목에 함께 적는다 —
// 셋 중 하나라도 빠지면 작업자가 실물의 어디를 봐야 할지 알 수 없다.

import { useLocale } from '@/lib/i18n';
import {
  EXAM_CONFIDENCE_LABEL,
  EXAM_FINDING_LABEL,
  EXAM_VIEW_LABEL,
} from '@/lib/i18n/examLabels';
import type { WheelExamFinding } from '@/lib/rules/types';

export function WheelExamFindings({
  findings,
}: {
  findings: readonly WheelExamFinding[];
}) {
  const { t } = useLocale();
  if (findings.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {findings.map((finding, index) => (
        <li
          key={`${finding.kind}-${finding.view}-${index}`}
          className="flex flex-col gap-1 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3"
        >
          <p className="text-base font-bold text-yellow-100">
            {t(EXAM_FINDING_LABEL[finding.kind])} ·{' '}
            {t(EXAM_VIEW_LABEL[finding.view])}
          </p>
          {/* 모델이 쓴 문장이다. 작업자가 실물의 어디를 봐야 하는지 알려준다. */}
          <p className="text-base leading-relaxed text-yellow-100">
            {finding.reason}
          </p>
          <p className="text-sm text-yellow-200/80">
            {t('exam.findingConfidence', {
              confidence: t(EXAM_CONFIDENCE_LABEL[finding.confidence]),
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
