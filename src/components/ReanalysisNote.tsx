'use client';

// 서버 재분석 기록 카드. 결과 화면과 이력 상세에서, 재분석을 받은 점검에만 그린다.
//
// 왜 필요한가. 재분석을 받았어도 받아들이지 않은 점검의 판정 사유는 「확정한 값을
// 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만 대조했습니다」
// 그대로다 — 대조는 실제로 그 값으로만 했으므로 사실이고, 규칙엔진이 낸 문장이라
// 화면이 고쳐 쓰지 않는다. 그 문장은 서버가 이 사진을 다시 읽었는지를 말하지 않는데,
// 결과의 외관 손상 항목은 그 재분석이 올린 의심일 수 있다. 그래서 받았다는 사실과
// 받아들였는지, 결과에 반영한 것을 판정 항목과 따로 적는다. 제한 대조가 풀린
// 점검에는 그것이 재분석을 받아들여 풀린 것이라는 사실을 적는다.
//
// 이 카드는 요약만 한다. 판독마다의 내역(AI 값·시각)은 판정 근거(EvidencePanel)를
// 펼치면 보인다. 판정을 다시 계산하지 않는다 — 저장된 판독을 그대로 말할 뿐이다.
//
// 재분석을 하지 않은 점검(빈 목록)과 알 수 없는 기록(칸 없음)에는 아무것도 그리지
// 않는다. 없던 일을 "없음"이라고 적는 카드를 만들지 않는다.

import { useId } from 'react';

import { useLocale } from '@/lib/i18n';
import { reanalysisSummaryText } from '@/lib/i18n/reanalysisText';
import type { ReanalysisRecord } from '@/lib/rules/types';

export function ReanalysisNote({
  reanalyses,
  heading: Heading = 'h3',
}: {
  reanalyses?: readonly ReanalysisRecord[] | null;
  /** 놓이는 자리의 제목 수준. 결과 화면은 h2, 이력 상세는 h3다 */
  heading?: 'h2' | 'h3';
}) {
  const { t } = useLocale();
  const titleId = useId();
  const lines = reanalysisSummaryText(reanalyses, t);
  if (lines.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-4"
    >
      <Heading id={titleId} className="text-lg font-bold text-slate-100">
        {t('reanalysis.title')}
      </Heading>
      {lines.map((line) => (
        <p key={line} className="text-base leading-relaxed text-slate-300">
          {line}
        </p>
      ))}
    </section>
  );
}
