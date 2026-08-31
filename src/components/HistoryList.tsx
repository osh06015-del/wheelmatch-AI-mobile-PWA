'use client';

// 점검 이력 목록. 항목을 누르면 검사 항목별 결과가 펼쳐진다.

import { useState } from 'react';
import type { InspectionRecord, Verdict } from '@/lib/rules/types';

const BADGE_TEXT: Record<Verdict, string> = {
  COMPATIBLE: '적합',
  INCOMPATIBLE: '부적합',
  UNDETERMINED: '판정불가',
};

const BADGE_STYLE: Record<Verdict, string> = {
  COMPATIBLE: 'bg-green-500 text-slate-950',
  INCOMPATIBLE: 'bg-red-500 text-white',
  UNDETERMINED: 'bg-yellow-500 text-slate-950',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function summarize(record: InspectionRecord): string {
  const model = record.grinder.model ?? '모델 미상';
  const rpm =
    record.grinder.noLoadRPM === null ? '—' : `${record.grinder.noLoadRPM}rpm`;
  const wheel =
    record.wheel.diameter === null
      ? '지름 미상'
      : `Φ${record.wheel.diameter}mm`;
  const wheelRpm =
    record.wheel.maxRPM === null ? '—' : `${record.wheel.maxRPM}rpm`;
  return `${model} ${rpm} · 숫돌 ${wheel} ${wheelRpm}`;
}

export function HistoryList({ records }: { records: InspectionRecord[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (records.length === 0) {
    return (
      <p className="rounded-lg bg-slate-800 px-4 py-8 text-center text-base leading-relaxed text-slate-400">
        저장된 점검 기록이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {records.map((record) => {
        const open = openId === record.id;
        return (
          <li key={record.id} className="rounded-lg bg-slate-800">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : (record.id ?? null))}
              aria-expanded={open}
              className="flex min-h-12 w-full items-center gap-3 px-4 py-4 text-left"
            >
              <span
                className={`shrink-0 rounded-md px-3 py-1 text-base font-bold ${BADGE_STYLE[record.result.verdict]}`}
              >
                {BADGE_TEXT[record.result.verdict]}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-base text-slate-300">
                  {formatDateTime(record.createdAt)}
                </span>
                <span className="text-base text-slate-100">
                  {summarize(record)}
                </span>
              </span>
              <span aria-hidden className="text-slate-400">
                {open ? '▲' : '▼'}
              </span>
            </button>

            {open && (
              <div className="border-t border-slate-700 px-4 py-4">
                <ul className="flex flex-col gap-3">
                  {record.result.checks.map((check) => (
                    <li key={check.rule} className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-slate-200">
                        {check.passed === true
                          ? '✅'
                          : check.passed === false
                            ? '❌'
                            : '⚠'}{' '}
                        {check.rule}
                      </span>
                      <span className="text-base leading-relaxed text-slate-400">
                        {check.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
