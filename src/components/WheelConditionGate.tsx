'use client';

// 숫돌을 장착하기 전 작업자 직접 상태 확인.
//
// 사진 분석은 의심을 알릴 수만 있다. 정상 버튼은 절대 자동으로 선택하지 않는다.
// 작업자가 다섯 항목을 모두 직접 확인해야 규격 대조 버튼이 열린다.

import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  hasWheelConditionIssue,
  unansweredWheelConditionCount,
} from '@/lib/safety/wheelCondition';
import type { VisibleDamage, WheelCondition } from '@/lib/rules/types';

export const WHEEL_CONDITION_ITEMS: ReadonlyArray<{
  key: keyof WheelCondition;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  {
    key: 'damageFree',
    labelKey: 'wheelCondition.damageFree',
    hintKey: 'wheelCondition.damageFreeHint',
  },
  {
    key: 'notDeformed',
    labelKey: 'wheelCondition.notDeformed',
    hintKey: 'wheelCondition.notDeformedHint',
  },
  {
    key: 'mountingAreaUndamaged',
    labelKey: 'wheelCondition.mountingAreaUndamaged',
    hintKey: 'wheelCondition.mountingAreaUndamagedHint',
  },
  {
    key: 'labelLegible',
    labelKey: 'wheelCondition.labelLegible',
    hintKey: 'wheelCondition.labelLegibleHint',
  },
  {
    key: 'expiryValid',
    labelKey: 'wheelCondition.expiryValid',
    hintKey: 'wheelCondition.expiryValidHint',
  },
];

interface WheelConditionGateProps {
  condition: WheelCondition;
  visibleDamage: VisibleDamage;
  labelNeedsReview: boolean;
  expiryNeedsReview: boolean;
  onChange: (key: keyof WheelCondition, value: boolean) => void;
}

export function WheelConditionGate({
  condition,
  visibleDamage,
  labelNeedsReview,
  expiryNeedsReview,
  onChange,
}: WheelConditionGateProps) {
  const { t } = useLocale();
  const hasIssue = hasWheelConditionIssue(condition);
  const unanswered = unansweredWheelConditionCount(condition);

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="wheel-condition-title"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="wheel-condition-title"
          className="text-xl font-bold text-slate-100"
        >
          {t('wheelCondition.title')}
        </h2>
        <p className="text-base leading-relaxed text-slate-300">
          {t('wheelCondition.note')}
        </p>
        <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-300">
          {t('wheelCondition.aiBoundary')}
        </p>
      </div>

      {visibleDamage === 'suspected' && (
        <p
          role="alert"
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-4 text-base font-semibold leading-relaxed text-yellow-100"
        >
          ⚠ {t('wheelCondition.aiDamageWarning')}
        </p>
      )}

      {labelNeedsReview && (
        <p
          role="alert"
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base leading-relaxed text-yellow-100"
        >
          ⚠ {t('wheelCondition.labelWarning')}
        </p>
      )}

      {expiryNeedsReview && (
        <p
          role="alert"
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base leading-relaxed text-yellow-100"
        >
          ⚠ {t('wheelCondition.expiryWarning')}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {WHEEL_CONDITION_ITEMS.map((item, index) => {
          const value = condition[item.key];
          return (
            <fieldset
              key={item.key}
              className="rounded-xl bg-slate-800 px-4 py-4"
            >
              <legend className="sr-only">{t(item.labelKey)}</legend>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-slate-100">
                  {index + 1}. {t(item.labelKey)}
                </p>
                <p className="text-base leading-relaxed text-slate-400">
                  {t(item.hintKey)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={value === true}
                  onClick={() => onChange(item.key, true)}
                  className={`min-h-12 rounded-lg border text-base font-bold ${
                    value === true
                      ? 'border-green-400 bg-green-500 text-slate-950'
                      : 'border-slate-600 bg-slate-900 text-slate-200 active:bg-slate-700'
                  }`}
                >
                  ✓ {t('wheelCondition.confirmed')}
                </button>
                <button
                  type="button"
                  aria-pressed={value === false}
                  onClick={() => onChange(item.key, false)}
                  className={`min-h-12 rounded-lg border text-base font-bold ${
                    value === false
                      ? 'border-red-400 bg-red-500 text-white'
                      : 'border-slate-600 bg-slate-900 text-slate-200 active:bg-slate-700'
                  }`}
                >
                  ⚠ {t('wheelCondition.issue')}
                </button>
              </div>
            </fieldset>
          );
        })}
      </div>

      {hasIssue ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-500 bg-red-500/15 px-4 py-5"
        >
          <h3 className="text-xl font-black text-red-100">
            {t('wheelCondition.stopTitle')}
          </h3>
          <p className="mt-2 text-base leading-relaxed text-red-100">
            {t('wheelCondition.stopBody')}
          </p>
        </div>
      ) : unanswered > 0 ? (
        <p className="text-base text-slate-400">
          {t('wheelCondition.incomplete', { count: unanswered })}
        </p>
      ) : null}
    </section>
  );
}
