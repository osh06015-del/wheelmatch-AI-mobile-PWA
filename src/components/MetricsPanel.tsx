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
// False-Safe Rate의 분모는 정답이 부적합인 기록 수다(metrics.ts). 채점 기록
// 전체가 아니다. 분모가 0이면 metrics.ts가 비율을 null로 내준다.
//
// 작업자 화면에는 나오지 않는다. 연구모드에서만 보인다.

import { useLocale, type MessageKey, type Translate } from '@/lib/i18n';
import { evaluate, formatRate, type GroundTruth } from '@/lib/record/metrics';
import type { InspectionRecord } from '@/lib/rules/types';

function Metric({
  t,
  nameKey,
  definitionKey,
  countKey,
  numerator,
  denominator,
  rate,
}: {
  t: Translate;
  nameKey: MessageKey;
  definitionKey: MessageKey;
  /** 분자/분모를 무엇으로 셌는지(기록 또는 필드) */
  countKey: MessageKey;
  numerator: number;
  denominator: number;
  rate: number | null;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-slate-900 px-3 py-3">
      <span className="text-base font-semibold text-slate-100">
        {t(nameKey)}
      </span>
      <span className="text-sm leading-relaxed text-slate-400">
        {t(definitionKey)}
      </span>
      <span className="text-base text-slate-200">
        {t(countKey, { numerator, denominator })}{' '}
        <span className="font-bold">
          {denominator === 0 || rate === null
            ? t('metrics.notAvailable')
            : formatRate(rate)}
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
  const { t } = useLocale();
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
        <h3 className="text-base font-bold text-slate-100">
          {t('metrics.title')}
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          {t('metrics.note', { count: report.scored })}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        <Metric
          t={t}
          nameKey="metrics.falseSafe.name"
          definitionKey="metrics.falseSafe.definition"
          countKey="metrics.records"
          numerator={report.falseSafe.count}
          denominator={report.falseSafe.denominator}
          rate={report.falseSafe.rate}
        />
        <Metric
          t={t}
          nameKey="metrics.undetermined.name"
          definitionKey="metrics.undetermined.definition"
          countKey="metrics.records"
          numerator={report.unreadable.count}
          denominator={report.scored}
          rate={report.unreadable.rate}
        />
        <Metric
          t={t}
          nameKey="metrics.fieldAccuracy.name"
          definitionKey="metrics.fieldAccuracy.definition"
          countKey="metrics.fields"
          numerator={correct}
          denominator={graded}
          rate={report.fieldAccuracy.overall}
        />
        <Metric
          t={t}
          nameKey="metrics.unitNormalization.name"
          definitionKey="metrics.unitNormalization.definition"
          countKey="metrics.records"
          numerator={report.unitNormalization.wrong}
          denominator={report.unitNormalization.converted}
          rate={report.unitNormalization.rate}
        />
      </ul>

      {report.falseSafe.recordIds.length > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-base text-red-200"
        >
          {t('metrics.falseSafeIds', {
            ids: report.falseSafe.recordIds.join(', '),
          })}
        </p>
      )}
    </section>
  );
}
