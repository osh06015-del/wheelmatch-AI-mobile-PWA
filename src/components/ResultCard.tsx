'use client';

// 적합 / 부적합 / 판정불가 결과 카드.
// 야외 눈부심을 고려해 배경은 어둡게, 판정은 큰 글씨와 색으로 즉시 구분되게 한다.

import { useLocale, type MessageKey, type Translate } from '@/lib/i18n';
import { RULE_MESSAGE_KEY } from '@/lib/i18n/ruleLabel';
import { RULE } from '@/lib/rules/engine';
import { grinderSummary, margins } from '@/lib/rules/requirement';
import type {
  CheckItem,
  GrinderSpec,
  MatchResult,
  Verdict,
  WheelSpec,
} from '@/lib/rules/types';

const VERDICT_TEXT: Record<Verdict, MessageKey> = {
  COMPATIBLE: 'verdict.compatible',
  INCOMPATIBLE: 'verdict.incompatible',
  UNDETERMINED: 'verdict.undetermined',
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

const VERDICT_NOTE: Record<Verdict, MessageKey> = {
  COMPATIBLE: 'verdict.note.compatible',
  INCOMPATIBLE: 'verdict.note.incompatible',
  UNDETERMINED: 'verdict.note.undetermined',
};

/**
 * 규칙 이름을 고른 언어로 바꾼다.
 *
 * 짝이 없으면 엔진이 낸 한국어 이름을 그대로 쓴다. 빈 칸이 되지 않게 하려는 것이다.
 */
function ruleLabel(rule: string, t: Translate): string {
  const key = RULE_MESSAGE_KEY[rule];
  return key ? t(key) : rule;
}

function checkIcon(passed: boolean | null): string {
  if (passed === true) return '✅';
  if (passed === false) return '❌';
  return '⚠';
}

function CheckRow({
  check,
  margin,
  t,
}: {
  check: CheckItem;
  margin?: string | null;
  t: Translate;
}) {
  const comparison =
    check.grinderValue || check.wheelValue
      ? `${t('common.grinder')} ${check.grinderValue ?? '—'} / ${t('common.wheel')} ${check.wheelValue ?? '—'}`
      : null;

  return (
    <li className="flex gap-3 rounded-lg bg-slate-800 px-4 py-3">
      <span aria-hidden className="text-lg leading-7">
        {checkIcon(check.passed)}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold text-slate-100">
          {ruleLabel(check.rule, t)}
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
  const { t } = useLocale();
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
          {t(VERDICT_TEXT[result.verdict])}
        </span>
      </div>

      <p className="text-base leading-relaxed text-slate-300">
        {t(VERDICT_NOTE[result.verdict])}
      </p>

      {/* 어떤 기계로 점검했는지. 이력에서 다시 볼 때도 필요하다. */}
      {grinder && (
        <p className="rounded-lg bg-slate-800 px-4 py-3 text-base text-slate-300">
          {grinderSummary(grinder)}
        </p>
      )}

      <h2 className="text-xl font-bold text-slate-100">{t('checks.title')}</h2>
      <ul className="flex flex-col gap-3">
        {result.checks.map((check) => (
          <CheckRow
            key={check.rule}
            check={check}
            margin={marginFor(check.rule)}
            t={t}
          />
        ))}
      </ul>
    </section>
  );
}
