'use client';

// 이 판정이 어느 규칙 세트로, 무엇을 근거로 나왔는지.
//
// 법적 인증이나 법령 적합 보증이 아니다. 규칙의 출처와 적용 범위를 보여줄
// 뿐이다 — 그래야 나중에 "이 판정이 어디서 왔는지"를 되짚을 수 있다.

import { useLocale } from '@/lib/i18n';
import { RULESET_VERSION, RULE_SOURCES } from '@/lib/rules/version';

interface RuleVersionNoteProps {
  /**
   * 보여줄 버전. 저장된 기록을 볼 때는 그 기록에 남은 버전을 넘긴다.
   * 없으면(기능 도입 전 기록) 미기록으로 표시한다 — 지금 버전으로 채우면
   * 어느 규칙으로 나온 판정인지 거짓으로 적게 된다.
   */
  version?: string | null;
}

export function RuleVersionNote({ version }: RuleVersionNoteProps) {
  const { t } = useLocale();
  const shown = version === undefined ? RULESET_VERSION : version;

  return (
    <section className="flex flex-col gap-2 rounded-lg bg-slate-800 px-4 py-3">
      <p className="text-base font-semibold text-slate-200">
        {t('ruleVersion.label')}{' '}
        <span className="font-mono text-slate-100">
          {shown ?? t('ruleVersion.missing')}
        </span>
      </p>
      <p className="text-sm leading-relaxed text-slate-400">
        {t('ruleVersion.note')}
      </p>
      <ul className="flex flex-col gap-2">
        {RULE_SOURCES.map((source) => (
          <li key={source.reference} className="text-sm text-slate-400">
            <span className="text-slate-300">{source.label}</span>{' '}
            {source.reference}
            <br />
            <span className="text-slate-500">{source.scope}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
