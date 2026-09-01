'use client';

// 적합 / 부적합 / 판정불가 결과 카드.
// 야외 눈부심을 고려해 배경은 어둡게, 판정은 큰 글씨와 색으로 즉시 구분되게 한다.

import { RULE } from '@/lib/rules/engine';
import { grinderSummary, margins } from '@/lib/rules/requirement';
import type {
  CheckItem,
  GrinderSpec,
  MatchResult,
  Verdict,
  WheelSpec,
} from '@/lib/rules/types';

const VERDICT_TEXT: Record<Verdict, string> = {
  COMPATIBLE: '적합',
  INCOMPATIBLE: '부적합',
  UNDETERMINED: '판정불가',
};

const VERDICT_ICON: Record<Verdict, string> = {
  COMPATIBLE: '✅',
  INCOMPATIBLE: '❌',
  UNDETERMINED: '⚠',
};

const VERDICT_STYLE: Record<Verdict, string> = {
  COMPATIBLE: 'bg-green-500 text-slate-950',
  INCOMPATIBLE: 'bg-red-500 text-white',
  UNDETERMINED: 'bg-yellow-500 text-slate-950',
};

const VERDICT_NOTE: Record<Verdict, string> = {
  COMPATIBLE:
    '표시된 규격끼리는 서로 맞습니다. 아래 안전 체크리스트를 확인하세요.',
  INCOMPATIBLE: '이 조합은 사용하면 안 됩니다. 아래 원인을 확인하세요.',
  UNDETERMINED:
    '값이 부족해 판정할 수 없습니다. 재촬영하거나 값을 직접 입력하세요.',
};

function checkIcon(passed: boolean | null): string {
  if (passed === true) return '✅';
  if (passed === false) return '❌';
  return '⚠';
}

function CheckRow({
  check,
  margin,
}: {
  check: CheckItem;
  margin?: string | null;
}) {
  const comparison =
    check.grinderValue || check.wheelValue
      ? `그라인더 ${check.grinderValue ?? '—'} / 숫돌 ${check.wheelValue ?? '—'}`
      : null;

  return (
    <li className="flex gap-3 rounded-lg bg-slate-800 px-4 py-3">
      <span aria-hidden className="text-lg leading-7">
        {checkIcon(check.passed)}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold text-slate-100">
          {check.rule}
        </span>
        {comparison && (
          <span className="text-base text-slate-300">{comparison}</span>
        )}
        {/* 얼마나 여유가 있는지. 판정을 바꾸지 않고 정도만 보여준다. */}
        {margin && (
          <span
            className={`text-base font-bold ${
              margin.startsWith('부족') || margin.startsWith('여유 없음')
                ? 'text-yellow-200'
                : 'text-slate-200'
            }`}
          >
            {margin}
          </span>
        )}
        <span
          className={`text-base leading-relaxed ${
            check.passed === false ? 'font-bold text-red-300' : 'text-slate-400'
          }`}
        >
          {check.reason}
        </span>
      </div>
    </li>
  );
}

interface ResultCardProps {
  result: MatchResult;
  /** 여유율과 규격 요약을 함께 보여주려면 넘긴다. */
  grinder?: GrinderSpec;
  wheel?: WheelSpec;
}

export function ResultCard({ result, grinder, wheel }: ResultCardProps) {
  const gap = grinder && wheel ? margins(grinder, wheel) : null;
  const marginFor = (rule: string): string | null => {
    if (!gap) return null;
    if (rule === RULE.RPM_SAFETY) return gap.rpm;
    if (rule === RULE.DIAMETER_FIT) return gap.diameter;
    return null;
  };

  return (
    <section className="flex flex-col gap-4">
      <div
        className={`flex items-center justify-center gap-3 rounded-xl px-6 py-8 ${VERDICT_STYLE[result.verdict]}`}
      >
        <span aria-hidden className="text-3xl">
          {VERDICT_ICON[result.verdict]}
        </span>
        <span className="text-3xl font-black">
          {VERDICT_TEXT[result.verdict]}
        </span>
      </div>

      <p className="text-base leading-relaxed text-slate-300">
        {VERDICT_NOTE[result.verdict]}
      </p>

      {/* 어떤 기계로 점검했는지. 이력에서 다시 볼 때도 필요하다. */}
      {grinder && (
        <p className="rounded-lg bg-slate-800 px-4 py-3 text-base text-slate-300">
          {grinderSummary(grinder)}
        </p>
      )}

      <h2 className="text-xl font-bold text-slate-100">검사 항목별 결과</h2>
      <ul className="flex flex-col gap-3">
        {result.checks.map((check) => (
          <CheckRow
            key={check.rule}
            check={check}
            margin={marginFor(check.rule)}
          />
        ))}
      </ul>
    </section>
  );
}
