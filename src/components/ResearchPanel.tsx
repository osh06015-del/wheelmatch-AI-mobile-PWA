'use client';

// 연구·실험 모드 패널. 이력 화면 맨 아래에 둔다.
//
// 평소에는 스위치만 보이고, 켜야 CSV 내려받기가 나온다.
// 현장에서 쓰는 사람이 실수로 눌러도 데이터가 지워지지 않는 기능들이다.

import { useState } from 'react';

import { MetricsPanel } from './MetricsPanel';
import { csvFilename, toCsv } from '@/lib/record/csv';
import { parseGroundTruth } from '@/lib/record/groundTruth';
import type { GroundTruth } from '@/lib/record/metrics';
import { useResearchMode } from '@/lib/record/researchMode';
import type { InspectionRecord } from '@/lib/rules/types';

export function ResearchPanel({ records }: { records: InspectionRecord[] }) {
  const [enabled, setEnabled] = useResearchMode();
  const [error, setError] = useState<string | null>(null);
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
        setError('읽어낸 정답이 없습니다. JSON 배열 형식인지 확인하세요.');
      }
    } catch {
      setError('정답 파일을 읽지 못했습니다.');
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
      setError('내려받기에 실패했습니다. 저장 공간을 확인하세요.');
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 px-4 py-4">
      <label className="flex min-h-12 items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-base font-semibold text-slate-200">
            연구·실험 모드
          </span>
          <span className="text-sm text-slate-400">
            측정값을 CSV로 내보냅니다. 현장 사용에는 필요하지 않습니다.
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
            CSV 내려받기 ({records.length}건)
          </button>
          <p className="text-sm leading-relaxed text-slate-500">
            기록은 이 기기에만 있습니다. 내려받은 파일은 직접 옮겨야 합니다.
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-base font-semibold text-slate-200">
              정답(Ground Truth) 파일
            </span>
            <span className="text-sm leading-relaxed text-slate-400">
              촬영 전에 직접 읽어 적어둔 값입니다. 넣어야 지표를 계산할 수
              있습니다. 앱이 정답을 만들지는 않습니다.
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
              형식이 맞지 않아 {rejected}줄을 제외했습니다. 표본 수를
              확인하세요.
            </p>
          )}

          <MetricsPanel records={records} truths={truths} />

          {error && <p className="text-base text-red-300">{error}</p>}
        </>
      )}
    </section>
  );
}
