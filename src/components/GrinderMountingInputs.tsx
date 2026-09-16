'use client';

// 그라인더 장착 입력 — 스핀들(축) 나사, 덮개 종류, 덮개 크기.
//
// 명판에 거의 적히지 않는 값이라 OCR이 채우지 않는다. 작업자가 실물을 보고 고르고,
// 모르면 모름으로 둔다. 규격 판정(verdict)에는 들어가지 않는다 — 결과 화면에서
// 부속품 Profile과 맞춰 직접 확인 항목으로만 보인다.

import { useId } from 'react';
import { SelectField } from './SelectField';

import { useLocale } from '@/lib/i18n';
import { GUARD_LABEL, SPINDLE_LABEL } from '@/lib/i18n/profileLabels';
import type { GuardType, SpindleThread } from '@/lib/rules/types';

const SPINDLES: readonly SpindleThread[] = [
  'unknown',
  'M14',
  'M10',
  '5/8-11',
  'other',
];
const GUARDS: readonly GuardType[] = [
  'unknown',
  'grinding',
  'cutting',
  'none',
  'other',
];

export interface GrinderMountingValue {
  spindleThread: SpindleThread;
  guardType: GuardType;
  /** 입력 그대로의 문자열. 비어 있으면 모름이다 */
  guardSize: string;
}

export const UNKNOWN_GRINDER_MOUNTING: GrinderMountingValue = {
  spindleThread: 'unknown',
  guardType: 'unknown',
  guardSize: '',
};

export function GrinderMountingInputs({
  value,
  onChange,
}: {
  value: GrinderMountingValue;
  onChange: (next: GrinderMountingValue) => void;
}) {
  const { t } = useLocale();
  const sizeId = useId();

  return (
    <section
      className="flex flex-col gap-3 rounded-xl bg-slate-800 px-4 py-4"
      aria-labelledby={`${sizeId}-title`}
    >
      <h2 id={`${sizeId}-title`} className="text-lg font-bold text-slate-100">
        {t('grinderMount.title')}
      </h2>
      <p className="text-base leading-relaxed text-slate-400">
        {t('grinderMount.note')}
      </p>
      <SelectField
        label={t('grinderMount.spindle.label')}
        value={value.spindleThread}
        options={SPINDLES.map((spindle) => ({
          value: spindle,
          label: t(SPINDLE_LABEL[spindle]),
        }))}
        onChange={(spindleThread) => onChange({ ...value, spindleThread })}
      />
      <SelectField
        label={t('grinderMount.guardType.label')}
        value={value.guardType}
        options={GUARDS.map((guard) => ({
          value: guard,
          label: t(GUARD_LABEL[guard]),
        }))}
        onChange={(guardType) => onChange({ ...value, guardType })}
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor={sizeId}
          className="text-base font-semibold text-slate-200"
        >
          {t('grinderMount.guardSize.label')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={sizeId}
            type="number"
            inputMode="numeric"
            value={value.guardSize}
            onChange={(event) =>
              onChange({ ...value, guardSize: event.target.value })
            }
            className="min-h-12 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
          />
          <span className="text-base text-slate-400">mm</span>
        </div>
        <p className="text-sm text-slate-400">
          {t('grinderMount.guardSize.hint')}
        </p>
      </div>
    </section>
  );
}
