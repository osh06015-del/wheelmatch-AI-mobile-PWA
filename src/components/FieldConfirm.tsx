'use client';

// OCR 결과 수동 보정 UI.
//
// OCR이 틀릴 수 있다는 전제로 만든 화면이다. 사용자가 고친 값은 그대로 신뢰하고,
// 값이 비어 있으면 채워 넣지 않고 null로 남긴다. 임의로 추정한 값을 넣지 않는다.

import { useState } from 'react';
import type { Confidence, WheelPurpose } from '@/lib/rules/types';

export interface FieldSpec {
  key: string;
  label: string;
  unit?: string;
  kind: 'number' | 'text' | 'purpose';
  value: string;
}

interface FieldConfirmProps {
  title: string;
  fields: FieldSpec[];
  confidence: Confidence;
  rawText: string;
  onChange: (key: string, value: string) => void;
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: '인식 신뢰도 높음',
  medium: '인식 신뢰도 보통 — 값을 확인하세요',
  low: '인식 신뢰도 낮음 — 재촬영하거나 직접 입력하세요',
};

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: 'bg-green-500/15 text-green-300 border-green-500/40',
  medium: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/40',
  low: 'bg-red-500/15 text-red-300 border-red-500/40',
};

export const PURPOSE_OPTIONS: Array<{ value: WheelPurpose; label: string }> = [
  { value: 'cutting', label: '절단용' },
  { value: 'grinding', label: '연삭용' },
  { value: 'unknown', label: '모르겠음' },
];

export function FieldConfirm({
  title,
  fields,
  confidence,
  rawText,
  onChange,
}: FieldConfirmProps) {
  const [rawOpen, setRawOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-slate-100">{title}</h2>

      <p
        className={`rounded-lg border px-4 py-3 text-base leading-relaxed ${CONFIDENCE_STYLE[confidence]}`}
      >
        {CONFIDENCE_LABEL[confidence]}
      </p>

      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-2">
            <span className="text-base font-medium text-slate-300">
              {field.label}
              {field.unit ? ` (${field.unit})` : ''}
            </span>

            {field.kind === 'purpose' ? (
              <select
                value={field.value}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-4 text-lg text-slate-100"
              >
                {PURPOSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.kind === 'number' ? 'number' : 'text'}
                inputMode={field.kind === 'number' ? 'numeric' : 'text'}
                value={field.value}
                placeholder="인식하지 못함 — 직접 입력"
                onChange={(event) => onChange(field.key, event.target.value)}
                className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-4 text-lg text-slate-100 placeholder:text-slate-500"
              />
            )}
          </label>
        ))}
      </div>

      {rawText.trim().length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setRawOpen((open) => !open)}
            className="min-h-12 text-base text-slate-400 underline underline-offset-4"
          >
            {rawOpen ? '읽어낸 원문 접기' : '읽어낸 원문 보기'}
          </button>
          {rawOpen && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-800 p-4 text-sm leading-relaxed text-slate-300">
              {rawText}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

/** 입력값 문자열을 숫자로 바꾼다. 비어 있거나 숫자가 아니면 null로 남긴다. */
export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** 입력값 문자열을 텍스트로 바꾼다. 비어 있으면 null로 남긴다. */
export function toTextOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** 숫자를 입력 필드용 문자열로 바꾼다. */
export function fromNumber(value: number | null): string {
  return value === null ? '' : String(value);
}
