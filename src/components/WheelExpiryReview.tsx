'use client';

import { useLocale } from '@/lib/i18n';
import type { WheelSpec } from '@/lib/rules/types';

interface Props {
  value: WheelSpec['expiryReview'];
  text: string;
  onReview: (value: NonNullable<WheelSpec['expiryReview']>) => void;
  onText: (value: string) => void;
}

/** 날짜 입력과 작업자의 미확인 응답을 분리한다. 응답은 AI가 채우지 않는다. */
export function WheelExpiryReview({ value, text, onReview, onText }: Props) {
  const { t } = useLocale();
  const labels = {
    marked: 'expiryReview.marked',
    not_found: 'expiryReview.not_found',
    unreadable: 'expiryReview.unreadable',
  } as const;
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-yellow-500/40 bg-slate-800 p-4">
      <legend className="text-lg font-bold text-slate-100">
        {t('expiryReview.title')}
      </legend>
      <p className="text-base text-slate-300">{t('expiryReview.note')}</p>
      <div className="flex flex-col gap-2">
        {(['marked', 'not_found', 'unreadable'] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            onClick={() => onReview(choice)}
            className={`min-h-12 rounded-lg border px-4 py-3 text-left text-base ${value === choice ? 'border-yellow-400 bg-yellow-500/10 text-yellow-100' : 'border-slate-600 text-slate-200'}`}
          >
            {t(labels[choice])}
          </button>
        ))}
      </div>
      {(value === 'marked' || text.trim() !== '') && (
        <label className="flex flex-col gap-2 text-base text-slate-100">
          {t('field.expiry')}
          <input
            type="text"
            value={text}
            placeholder="MM/YYYY"
            onChange={(event) => onText(event.target.value)}
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-base"
          />
        </label>
      )}
      {(value === 'not_found' || value === 'unreadable') && (
        <p role="status" className="text-base text-yellow-200">
          {t(
            text.trim() ? 'expiryReview.keptDate' : 'expiryReview.unconfirmed',
          )}
        </p>
      )}
    </fieldset>
  );
}
