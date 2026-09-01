'use client';

// 부적합일 때 "그래서 지금 무엇을 해야 하는가"를 보여주는 화면.
//
// 현장에서는 위험하다는 설명보다 다음 행동이 먼저 보여야 한다.
// 그래서 차이값(몇 rpm 초과인지)과 조치 문장을 규칙별로 고정해 둔다.
//
// 문구는 AI가 만들지 않는다. 규칙마다 미리 정해둔 문장을 쓴다.
// 매번 다른 표현이 나오면 작업자가 익힐 수 없고, 잘못된 문장이 섞일 수도 있다.

import { useLocale, type Translate } from '@/lib/i18n';
import { ACTION_MESSAGE_KEY, RULE_MESSAGE_KEY } from '@/lib/i18n/ruleLabel';
import { RULE } from '@/lib/rules/engine';
import type { CheckItem } from '@/lib/rules/types';

/** 검사 항목에서 숫자만 뽑는다. "11000rpm" → 11000 */
function numberIn(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/**
 * 두 값의 차이를 사람이 읽는 문장으로 만든다.
 * 차이를 보여주면 "얼마나 위험한가"가 한눈에 들어온다.
 */
function describeGap(check: CheckItem, t: Translate): string | null {
  const grinderValue = numberIn(check.grinderValue);
  const wheelValue = numberIn(check.wheelValue);
  if (grinderValue === null || wheelValue === null) return null;

  if (check.rule === RULE.RPM_SAFETY) {
    const over = grinderValue - wheelValue;
    if (over <= 0) return null;
    // 숫자와 단위만 남긴다. 언어와 무관하게 읽히고, 문장을 언어마다
    // 새로 만들 필요도 없다. 어느 쪽이 큰지는 화살표가 말해준다.
    return `${t('common.grinder')} ${check.grinderValue} > ${t('common.wheel')} ${check.wheelValue} (+${over.toLocaleString('en-US')}rpm)`;
  }

  if (check.rule === RULE.DIAMETER_FIT) {
    const over = wheelValue - grinderValue;
    if (over <= 0) return null;
    return `${t('common.wheel')} ${check.wheelValue} > ${t('common.grinder')} ${check.grinderValue} (+${over}mm)`;
  }

  return null;
}

export function ActionGuide({ failures }: { failures: CheckItem[] }) {
  const { t } = useLocale();

  if (failures.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border-2 border-red-500 bg-red-500/10 px-4 py-5">
      <h2 className="text-2xl font-black text-red-200">{t('action.title')}</h2>

      {failures.map((check) => {
        const gap = describeGap(check, t);
        const ruleKey = RULE_MESSAGE_KEY[check.rule];
        // 조치 문장이 따로 없는 규칙은 공통 문장으로 받는다.
        // 엔진의 한국어 사유를 그대로 띄우면 다른 언어 사용자는 읽지 못한다.
        const actionKey = ACTION_MESSAGE_KEY[check.rule] ?? 'action.generic';
        return (
          <div key={check.rule} className="flex flex-col gap-3">
            <p className="text-xl font-bold text-red-100">
              {ruleKey ? t(ruleKey) : check.rule}
            </p>

            {/* 두 값을 크게 나란히 보여준다 */}
            {check.grinderValue && check.wheelValue && (
              <div className="flex items-stretch gap-3">
                <div className="flex flex-1 flex-col gap-1 rounded-lg bg-slate-900/60 px-3 py-3">
                  <span className="text-sm text-slate-400">
                    {t('common.grinder')}
                  </span>
                  <span className="text-2xl font-black text-slate-100">
                    {check.grinderValue}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 rounded-lg bg-slate-900/60 px-3 py-3">
                  <span className="text-sm text-slate-400">
                    {t('common.wheel')}
                  </span>
                  <span className="text-2xl font-black text-slate-100">
                    {check.wheelValue}
                  </span>
                </div>
              </div>
            )}

            {gap && <p className="text-lg font-bold text-red-200">{gap}</p>}

            {/* 다음 행동. 이게 이 화면의 핵심이다. */}
            <p className="rounded-lg bg-red-500 px-4 py-4 text-lg font-bold leading-relaxed text-white">
              → {t(actionKey)}
            </p>
          </div>
        );
      })}
    </section>
  );
}
