'use client';

// 연구용 평가 지표 화면.
//
// 계산은 metrics.ts의 evaluate()가 한다. 여기서는 다시 계산하지 않고
// 보여주기만 한다 — 화면과 계산이 갈라지면 논문 숫자가 어느 쪽인지 모르게 된다.
//
// **분모가 0이면 비율을 만들지 않는다.** 위험 조합이 하나도 없는데
// False-Safe Rate를 0%로 적으면 "0%를 달성했다"로 읽힌다. 아무것도 재지
// 않았다는 사실이 그 순간 사라진다. 그래서 N/A로 둔다.
//
// 작업자 화면에는 나오지 않는다. 연구모드에서만 보인다.

import { evaluate, formatRate, type GroundTruth } from '@/lib/record/metrics';
import type { InspectionRecord } from '@/lib/rules/types';

const NOT_AVAILABLE = 'N/A — 계산할 데이터 없음';

function Metric({
  name,
  definition,
  numerator,
  denominator,
  rate,
  unit,
}: {
  name: string;
  definition: string;
  numerator: number;
  denominator: number;
  rate: number;
  unit: string;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-slate-900 px-3 py-3">
      <span className="text-base font-semibold text-slate-100">{name}</span>
      <span className="text-sm leading-relaxed text-slate-400">
        {definition}
      </span>
      <span className="text-base text-slate-200">
        {numerator} / {denominator}
        {unit}{' '}
        <span className="font-bold">
          {denominator === 0 ? NOT_AVAILABLE : formatRate(rate)}
        </span>
      </span>
    </li>
  );
}

interface MetricsPanelProps {
  records: InspectionRecord[];
  truths: GroundTruth[];
}

export function MetricsPanel({ records, truths }: MetricsPanelProps) {
  const report = evaluate(records, truths);
  const graded = report.fieldAccuracy.fields.reduce(
    (sum, field) => sum + field.correct + field.missed + field.wrong,
    0,
  );
  const correct = report.fieldAccuracy.fields.reduce(
    (sum, field) => sum + field.correct,
    0,
  );

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-slate-800 px-4 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-slate-100">평가 지표</h3>
        <p className="text-sm leading-relaxed text-slate-400">
          정답을 넣은 기록 {report.scored}건으로 계산했습니다. 인식 정확도는
          사용자가 고치기 전의 OCR 원본값으로 잽니다.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        <Metric
          name="False-Safe Rate"
          definition="실제 부적합인데 앱이 적합으로 낸 비율. 0이 아니면 출시하지 않습니다."
          numerator={report.falseSafe.count}
          denominator={report.scored}
          rate={report.falseSafe.rate}
          unit="건"
        />
        <Metric
          name="판정불가율"
          definition="판정하지 못한 비율. 실패가 아니라 설계된 동작입니다."
          numerator={report.unreadable.count}
          denominator={report.scored}
          rate={report.unreadable.rate}
          unit="건"
        />
        <Metric
          name="필드 추출 정확도"
          definition="정답이 있는 필드 중 OCR 원본값이 정답과 맞은 비율."
          numerator={correct}
          denominator={graded}
          rate={report.fieldAccuracy.overall}
          unit="필드"
        />
        <Metric
          name="단위 정규화 오류"
          definition="m/s에서 환산한 기록 중 결과가 정답과 다른 비율."
          numerator={report.unitNormalization.wrong}
          denominator={report.unitNormalization.converted}
          rate={report.unitNormalization.rate}
          unit="건"
        />
      </ul>

      {report.falseSafe.recordIds.length > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-base text-red-200"
        >
          False-Safe 기록 id: {report.falseSafe.recordIds.join(', ')} — 개별로
          분석해 보고하세요. 숨기지 않습니다.
        </p>
      )}
    </section>
  );
}
