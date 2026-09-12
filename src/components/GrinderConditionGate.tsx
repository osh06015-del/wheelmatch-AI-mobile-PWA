'use client';

// 명판을 확인한 뒤, 숫돌을 찍기 전에 작업자가 그라인더 장비를 직접 본다.
//
// 이 Gate에는 AI 입력이 없다. 명판 사진으로는 전원선·덮개·손잡이·스핀들을
// 볼 수 없기 때문이다. 보이지 않는 것을 "이상 없음"으로 넘기지 않으려면
// 추측 대신 사람에게 묻는 것이 맞다. 정상 버튼은 절대 자동으로 선택하지 않는다.

import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  hasGrinderConditionIssue,
  unansweredGrinderConditionCount,
} from '@/lib/safety/grinderCondition';
import type { GrinderCondition } from '@/lib/rules/types';

export const GRINDER_CONDITION_ITEMS: ReadonlyArray<{
  key: keyof GrinderCondition;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  {
    key: 'cordAndPlugUndamaged',
    labelKey: 'grinderCondition.cordAndPlug',
    hintKey: 'grinderCondition.cordAndPlugHint',
  },
  {
    key: 'bodyUndamaged',
    labelKey: 'grinderCondition.body',
    hintKey: 'grinderCondition.bodyHint',
  },
  {
    key: 'guardSecure',
    labelKey: 'grinderCondition.guard',
    hintKey: 'grinderCondition.guardHint',
  },
  {
    key: 'auxiliaryHandleSecure',
    labelKey: 'grinderCondition.auxiliaryHandle',
    hintKey: 'grinderCondition.auxiliaryHandleHint',
  },
  {
    key: 'spindleAssemblyUndamaged',
    labelKey: 'grinderCondition.spindle',
    hintKey: 'grinderCondition.spindleHint',
  },
];

interface GrinderConditionGateProps {
  condition: GrinderCondition;
  onChange: (key: keyof GrinderCondition, value: boolean) => void;
}

export function GrinderConditionGate({
  condition,
  onChange,
}: GrinderConditionGateProps) {
  const { t } = useLocale();
  const hasIssue = hasGrinderConditionIssue(condition);
  const unanswered = unansweredGrinderConditionCount(condition);

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="grinder-condition-title"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="grinder-condition-title"
          className="text-xl font-bold text-slate-100"
        >
          {t('grinderCondition.title')}
        </h2>
        <p className="text-base leading-relaxed text-slate-300">
          {t('grinderCondition.note')}
        </p>
        <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-300">
          {t('grinderCondition.aiBoundary')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {GRINDER_CONDITION_ITEMS.map((item, index) => {
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
                  ✓ {t('grinderCondition.confirmed')}
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
                  ⚠ {t('grinderCondition.issue')}
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
            {t('grinderCondition.stopTitle')}
          </h3>
          <p className="mt-2 text-base leading-relaxed text-red-100">
            {t('grinderCondition.stopBody')}
          </p>
        </div>
      ) : unanswered > 0 ? (
        <p className="text-base text-slate-400">
          {t('grinderCondition.incomplete', { count: unanswered })}
        </p>
      ) : null}
    </section>
  );
}
