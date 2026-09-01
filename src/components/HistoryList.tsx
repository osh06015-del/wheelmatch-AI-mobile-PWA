'use client';

// 점검 이력 목록. 항목을 누르면 촬영 사진과 검사 항목별 결과가 펼쳐진다.
//
// 사진을 함께 남기는 이유: 나중에 "그때 그 숫돌이 뭐였지"를 되짚을 수 있어야
// 기록이 증빙이 된다. 사진은 IndexedDB 안, 즉 이 기기에만 있다.

import { useCallback, useState } from 'react';

import { formatElapsed } from '@/lib/record/elapsed';
import type { InspectionRecord, Verdict, WorkPurpose } from '@/lib/rules/types';

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

const PURPOSE_TEXT: Record<WorkPurpose, string> = {
  cutting: '절단',
  grinding: '연삭',
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

/**
 * 저장된 Blob을 화면에 띄운다.
 *
 * object URL의 수명을 <img> 엘리먼트에 그대로 묶는다.
 * useMemo로 만들고 useEffect 정리에서 해제하면, StrictMode가 마운트를 두 번
 * 시뮬레이션할 때 첫 정리에서 URL이 이미 해제된 뒤 같은 URL을 다시 쓰게 되어
 * 사진이 뜨지 않는다(실제로 그렇게 만들었다가 빈 사진을 봤다).
 * ref 콜백은 엘리먼트가 붙을 때마다 새로 만들고 떨어질 때 해제하므로 어긋나지 않고,
 * 해제를 빠뜨려 사진이 메모리에 쌓이는 일도 없다.
 */
function Photo({ blob, label }: { blob: Blob; label: string }) {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(blob);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [blob],
  );

  return (
    <figure className="flex flex-1 flex-col gap-1">
      {/* next/image는 크기를 미리 알아야 하는데 object URL은 알 수 없다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={attach}
        alt={label}
        className="aspect-square w-full rounded-lg object-cover"
      />
      <figcaption className="text-sm text-slate-400">{label}</figcaption>
    </figure>
  );
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
        const purpose = record.declaredPurpose
          ? PURPOSE_TEXT[record.declaredPurpose]
          : null;
        const elapsed = formatElapsed(record.elapsedMs ?? null);
        const hasPhoto = Boolean(record.grinderImage ?? record.wheelImage);

        return (
          <li key={record.id} className="rounded-lg bg-slate-800">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : (record.id ?? null))}
              aria-expanded={open}
              className="flex min-h-12 w-full items-start gap-3 px-4 py-4 text-left"
            >
              <span
                className={`shrink-0 rounded-md px-3 py-1 text-base font-bold ${BADGE_STYLE[record.result.verdict]}`}
              >
                {BADGE_TEXT[record.result.verdict]}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                {/* 한 줄에 다 넣으면 좁은 화면에서 접혀 읽기 나빠진다.
                    작업 구분·시각 / 규격 / 소요시간 순으로 줄을 나눈다. */}
                <span className="flex items-center gap-2">
                  {purpose && (
                    <span className="rounded border border-slate-600 px-2 py-0.5 text-sm font-semibold text-slate-200">
                      {purpose}
                    </span>
                  )}
                  <span className="text-base text-slate-300">
                    {formatDateTime(record.createdAt)}
                  </span>
                </span>
                <span className="text-base text-slate-100">
                  {summarize(record)}
                </span>
                {elapsed && (
                  <span className="text-sm text-slate-400">
                    점검에 {elapsed} 걸림
                  </span>
                )}
              </span>
              <span aria-hidden className="pt-1 text-slate-400">
                {open ? '▲' : '▼'}
              </span>
            </button>

            {open && (
              <div className="flex flex-col gap-4 border-t border-slate-700 px-4 py-4">
                {hasPhoto ? (
                  <div className="flex gap-3">
                    {record.grinderImage && (
                      <Photo blob={record.grinderImage} label="그라인더 명판" />
                    )}
                    {record.wheelImage && (
                      <Photo blob={record.wheelImage} label="숫돌 라벨" />
                    )}
                  </div>
                ) : (
                  <p className="text-base text-slate-400">
                    저장된 사진이 없습니다.
                  </p>
                )}

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
