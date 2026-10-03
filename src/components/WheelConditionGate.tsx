'use client';

// 숫돌을 장착하기 전 작업자 직접 상태 확인.
//
// 사진 분석은 의심을 알릴 수만 있다. 정상 버튼은 절대 자동으로 선택하지 않는다.
// 작업자가 상태 항목을 모두 직접 확인해야 규격 대조 버튼이 열린다.

import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  WHEEL_CONDITION_KEYS,
  hasWheelConditionIssue,
  unansweredWheelConditionCount,
} from '@/lib/safety/wheelCondition';
import type {
  VisibleDamage,
  WheelCondition,
  WheelConditionKey,
} from '@/lib/rules/types';

/** 항목별 문구. 종류마다 이 중 일부를 묻는다(profiles.ts의 conditionItemsFor). */
const ITEM_TEXT: Readonly<
  Record<WheelConditionKey, { labelKey: MessageKey; hintKey: MessageKey }>
> = {
  damageFree: {
    labelKey: 'wheelCondition.damageFree',
    hintKey: 'wheelCondition.damageFreeHint',
  },
  notDeformed: {
    labelKey: 'wheelCondition.notDeformed',
    hintKey: 'wheelCondition.notDeformedHint',
  },
  mountingAreaUndamaged: {
    labelKey: 'wheelCondition.mountingAreaUndamaged',
    hintKey: 'wheelCondition.mountingAreaUndamagedHint',
  },
  labelLegible: {
    labelKey: 'wheelCondition.labelLegible',
    hintKey: 'wheelCondition.labelLegibleHint',
  },
  expiryValid: {
    labelKey: 'wheelCondition.expiryValid',
    hintKey: 'wheelCondition.expiryValidHint',
  },
  diamondRimIntact: {
    labelKey: 'wheelCondition.diamondRimIntact',
    hintKey: 'wheelCondition.diamondRimIntactHint',
  },
  flapsIntact: {
    labelKey: 'wheelCondition.flapsIntact',
    hintKey: 'wheelCondition.flapsIntactHint',
  },
  noDelamination: {
    labelKey: 'wheelCondition.noDelamination',
    hintKey: 'wheelCondition.noDelaminationHint',
  },
  flapBackingIntact: {
    labelKey: 'wheelCondition.flapBackingIntact',
    hintKey: 'wheelCondition.flapBackingIntactHint',
  },
  threadAdapterFit: {
    labelKey: 'wheelCondition.threadAdapterFit',
    hintKey: 'wheelCondition.threadAdapterFitHint',
  },
  evenWear: {
    labelKey: 'wheelCondition.evenWear',
    hintKey: 'wheelCondition.evenWearHint',
  },
  dedicatedGuardFitted: {
    labelKey: 'wheelCondition.dedicatedGuardFitted',
    hintKey: 'wheelCondition.dedicatedGuardFittedHint',
  },
  wiresIntact: {
    labelKey: 'wheelCondition.wiresIntact',
    hintKey: 'wheelCondition.wiresIntactHint',
  },
  backingPadUndamaged: {
    labelKey: 'wheelCondition.backingPadUndamaged',
    hintKey: 'wheelCondition.backingPadUndamagedHint',
  },
};

/** 기본 네 상태 항목(Profile이 없는 종류·일반 결합숫돌). */
export const WHEEL_CONDITION_ITEMS: ReadonlyArray<{
  key: WheelConditionKey;
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
];

/**
 * 상태 항목 하나 — 질문과 「확인함」·「문제 있음」 두 버튼.
 *
 * Gate 밖에서 같은 항목을 다시 받을 때도 이 요소를 그대로 쓴다(결과 화면의 서버
 * 재분석이 손상을 의심했을 때 — OfflineReanalysisPanel). 같은 질문은 같은 모양이어야
 * 작업자가 같은 무게로 답한다. 어느 버튼도 미리 눌러 두지 않는다.
 */
export function WheelConditionQuestion({
  itemKey,
  value,
  index,
  onChange,
}: {
  itemKey: WheelConditionKey;
  value: boolean | null;
  /** 목록 안의 순번(0부터). 넘기지 않으면 번호 없이 보인다 */
  index?: number;
  onChange: (key: WheelConditionKey, value: boolean) => void;
}) {
  const { t } = useLocale();
  const { labelKey, hintKey } = ITEM_TEXT[itemKey];

  return (
    <fieldset className="rounded-xl bg-slate-800 px-4 py-4">
      <legend className="sr-only">{t(labelKey)}</legend>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-slate-100">
          {index === undefined ? '' : `${index + 1}. `}
          {t(labelKey)}
        </p>
        <p className="text-base leading-relaxed text-slate-400">{t(hintKey)}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          aria-pressed={value === true}
          onClick={() => onChange(itemKey, true)}
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
          onClick={() => onChange(itemKey, false)}
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
}

interface WheelConditionGateProps {
  condition: WheelCondition;
  /** 이 종류에서 묻는 항목. 넘기지 않으면 기본 네 상태 항목이다 */
  keys?: ReadonlyArray<WheelConditionKey>;
  visibleDamage: VisibleDamage;
  labelNeedsReview: boolean;
  expiryNeedsReview: boolean;
  onChange: (key: WheelConditionKey, value: boolean) => void;
}

export function WheelConditionGate({
  condition,
  keys = WHEEL_CONDITION_KEYS,
  visibleDamage,
  labelNeedsReview,
  expiryNeedsReview,
  onChange,
}: WheelConditionGateProps) {
  const { t } = useLocale();
  const hasIssue = hasWheelConditionIssue(condition, keys);
  const unanswered = unansweredWheelConditionCount(condition, keys);

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
        {keys.map((key, index) => (
          <WheelConditionQuestion
            key={key}
            itemKey={key}
            value={condition[key] ?? null}
            index={index}
            onChange={onChange}
          />
        ))}
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
