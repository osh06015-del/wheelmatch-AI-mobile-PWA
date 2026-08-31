'use client';

// 적합 / 부적합 / 판정불가 결과 카드.
// 야외 눈부심을 고려해 배경은 어둡게, 판정은 큰 글씨와 색으로 즉시 구분되게 한다.

import type { CheckItem, MatchResult, Verdict } from '@/lib/rules/types';

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
  COMPATIBLE: '표시된 규격끼리는 서로 맞습니다. 아래 안전 체크리스트를 확인하세요.',
  INCOMPATIBLE: '이 조합은 사용하면 안 됩니다. 아래 원인을 확인하세요.',
  UNDETERMINED: '값이 부족해 판정할 수 없습니다. 재촬영하거나 값을 직접 입력하세요.',
};

function checkIcon(passed: boolean | null): string {
  if (passed === true) return '✅';
  if (passed === false) return '❌';
  return '⚠';
}

function CheckRow({ check }: { check: CheckItem }) {
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
        <span
          className={`text-base leading-relaxed ${
            check.passed === false
              ? 'font-bold text-red-300'
              : 'text-slate-400'
          }`}
        >
          {check.reason}
        </span>
      </div>
    </li>
  );
}

export function ResultCard({ result }: { result: MatchResult }) {
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

      <h2 className="text-xl font-bold text-slate-100">검사 항목별 결과</h2>
      <ul className="flex flex-col gap-3">
        {result.checks.map((check) => (
          <CheckRow key={check.rule} check={check} />
        ))}
      </ul>
    </section>
  );
}
