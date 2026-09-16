'use client';

// 이력 화면 필터. IndexedDB 기록은 건드리지 않는다 — 이미 읽어 온 배열을
// 화면에서만 걸러 보여준다(src/lib/record/historyFilter.ts).

import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  EMPTY_HISTORY_FILTER,
  TRIAL_RUN_NONE,
  isFilterActive,
  type HistoryFilterState,
} from '@/lib/record/historyFilter';
import type {
  TrialRunOutcome,
  Verdict,
  WheelType,
  WorkPurpose,
} from '@/lib/rules/types';
import { WHEEL_TYPE_OPTIONS } from './WheelTypeConfirm';

const PURPOSE_OPTIONS: ReadonlyArray<{
  value: WorkPurpose;
  labelKey: MessageKey;
}> = [
  { value: 'cutting', labelKey: 'home.cutting' },
  { value: 'grinding', labelKey: 'home.grinding' },
];

const VERDICT_OPTIONS: ReadonlyArray<{ value: Verdict; labelKey: MessageKey }> =
  [
    { value: 'COMPATIBLE', labelKey: 'verdict.compatible' },
    { value: 'INCOMPATIBLE', labelKey: 'verdict.incompatible' },
    { value: 'UNDETERMINED', labelKey: 'verdict.undetermined' },
  ];

const TRIAL_RUN_OPTIONS: ReadonlyArray<{
  value: TrialRunOutcome | typeof TRIAL_RUN_NONE;
  labelKey: MessageKey;
}> = [
  { value: 'normal', labelKey: 'history.filter.trialRunNormal' },
  { value: 'abnormal', labelKey: 'history.filter.trialRunAbnormal' },
  { value: TRIAL_RUN_NONE, labelKey: 'history.filter.trialRunNone' },
];

export interface HistoryFiltersProps {
  filter: HistoryFilterState;
  onChange: (next: HistoryFilterState) => void;
  /** 전체 기록 수. 결과 건수 문구에 쓴다. */
  total: number;
  /** 필터를 통과한 기록 수 */
  count: number;
}

export function HistoryFilters({
  filter,
  onChange,
  total,
  count,
}: HistoryFiltersProps) {
  const { t } = useLocale();
  const active = isFilterActive(filter);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-100">
          {t('history.filter.title')}
        </h2>
        <button
          type="button"
          onClick={() => onChange(EMPTY_HISTORY_FILTER)}
          disabled={!active}
          className="min-h-10 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-300 active:bg-slate-800 disabled:border-slate-700 disabled:text-slate-600"
        >
          {t('history.filter.reset')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">
            {t('history.filter.purpose')}
          </span>
          <select
            value={filter.purpose ?? ''}
            onChange={(event) =>
              onChange({
                ...filter,
                purpose: (event.target.value || null) as WorkPurpose | null,
              })
            }
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"
          >
            <option value="">{t('history.filter.purposeAll')}</option>
            {PURPOSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">
            {t('history.filter.verdict')}
          </span>
          <select
            value={filter.verdict ?? ''}
            onChange={(event) =>
              onChange({
                ...filter,
                verdict: (event.target.value || null) as Verdict | null,
              })
            }
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"
          >
            <option value="">{t('history.filter.verdictAll')}</option>
            {VERDICT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">
            {t('history.filter.wheelType')}
          </span>
          <select
            value={filter.wheelType ?? ''}
            onChange={(event) =>
              onChange({
                ...filter,
                wheelType: (event.target.value || null) as WheelType | null,
              })
            }
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"
          >
            <option value="">{t('history.filter.wheelTypeAll')}</option>
            {WHEEL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">
            {t('history.filter.trialRun')}
          </span>
          <select
            value={filter.trialRunOutcome ?? ''}
            onChange={(event) =>
              onChange({
                ...filter,
                trialRunOutcome: (event.target.value || null) as
                  TrialRunOutcome | typeof TRIAL_RUN_NONE | null,
              })
            }
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"
          >
            <option value="">{t('history.filter.trialRunAll')}</option>
            {TRIAL_RUN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">
            {t('history.filter.dateFrom')}
          </span>
          <input
            type="date"
            value={filter.dateFrom ?? ''}
            onChange={(event) =>
              onChange({ ...filter, dateFrom: event.target.value || null })
            }
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">
            {t('history.filter.dateTo')}
          </span>
          <input
            type="date"
            value={filter.dateTo ?? ''}
            onChange={(event) =>
              onChange({ ...filter, dateTo: event.target.value || null })
            }
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"
          />
        </label>
      </div>

      <p className="text-sm text-slate-400">
        {active
          ? t('history.filter.resultCountOf', { count, total })
          : t('history.filter.resultCount', { count: total })}
      </p>
    </section>
  );
}
