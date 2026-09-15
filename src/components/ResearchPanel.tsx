'use client';

// 연구·실험 모드 패널. 이력 화면 맨 아래에 둔다.
//
// 이 패널은 연구 도구를 넣은 검증 빌드에서만 그려진다
// (NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS=true — src/app/history/page.tsx).
// 현장 배포판에는 없다.
//
// 평소에는 스위치만 보이고, 켜야 CSV 내려받기가 나온다.
// 현장에서 쓰는 사람이 실수로 눌러도 데이터가 지워지지 않는 기능들이다.

import { useState } from 'react';

import { MetricsPanel } from './MetricsPanel';
import { useLocale, type MessageKey } from '@/lib/i18n';
import { csvFilename, toCsv } from '@/lib/record/csv';
import { parseGroundTruth } from '@/lib/record/groundTruth';
import type { GroundTruth } from '@/lib/record/metrics';
import { useResearchMode } from '@/lib/record/researchMode';
import type { InspectionRecord } from '@/lib/rules/types';

export function ResearchPanel({ records }: { records: InspectionRecord[] }) {
  const { t } = useLocale();
  const [enabled, setEnabled] = useResearchMode();
  // 문장 대신 문구 키를 둔다. 문장은 그릴 때 고른 언어로 만든다.
  const [error, setError] = useState<MessageKey | null>(null);
  const [truths, setTruths] = useState<GroundTruth[]>([]);
  const [rejected, setRejected] = useState(0);

  // 정답은 앱이 만들 수 없다. 촬영 전에 사람이 적어둔 것을 읽어 들이기만 한다.
  async function loadTruth(file: File) {
    setError(null);
    try {
      const parsed = parseGroundTruth(await file.text());
      setTruths(parsed.truths);
      setRejected(parsed.rejected);
      if (parsed.truths.length === 0) {
        setError('research.truthEmpty');
      }
    } catch {
      setError('research.truthUnreadable');
    }
  }

  function download() {
    setError(null);
    try {
      // text/csv로 주면 브라우저가 새 탭에서 열어버리는 경우가 있다.
      // 저장이 목적이므로 octet-stream으로 내린다.
      const blob = new Blob([toCsv(records)], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = csvFilename();
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('research.downloadFailed');
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 px-4 py-4">
      {/* 스위치를 켜기 전부터 여기가 현장 화면이 아니라는 것을 보여준다.
          판정 3색(초록·빨강·노랑)과 겹치지 않는 색을 쓴다. */}
      <div
        role="note"
        className="flex flex-col gap-1 rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-3"
      >
        <p className="text-base font-bold leading-relaxed text-sky-100">
          {t('research.notice')}
        </p>
        <p className="text-sm leading-relaxed text-sky-200">
          {t('research.noticeDetail')}
        </p>
      </div>

      <label className="flex min-h-12 items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-base font-semibold text-slate-200">
            {t('research.modeTitle')}
          </span>
          <span className="text-sm text-slate-400">
            {t('research.modeHint')}
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-7 w-7 shrink-0 accent-slate-400"
        />
      </label>

      {enabled && (
        <>
          <button
            type="button"
            onClick={download}
            disabled={records.length === 0}
            className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-slate-100 active:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {t('research.download', { count: records.length })}
          </button>
          <p className="text-sm leading-relaxed text-slate-500">
            {t('research.deviceOnly')}
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-base font-semibold text-slate-200">
              {t('research.truthTitle')}
            </span>
            <span className="text-sm leading-relaxed text-slate-400">
              {t('research.truthHint')}
            </span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadTruth(file);
              }}
              className="min-h-12 text-base text-slate-300"
            />
          </label>
          {rejected > 0 && (
            <p className="text-base text-yellow-200">
              {t('research.truthRejected', { count: rejected })}
            </p>
          )}

          <MetricsPanel records={records} truths={truths} />

          {error && <p className="text-base text-red-300">{t(error)}</p>}
        </>
      )}
    </section>
  );
}
