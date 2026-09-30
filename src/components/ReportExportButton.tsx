'use client';

// 점검 기록 문서(사진 포함) 저장 버튼.
//
// 이력의 기록 하나와 저장공간 관리의 전체 기록이 같은 버튼을 쓴다. 어떤 기록을
// 담을지는 loadRecords가 정한다. 결과(공유 창을 열었는지·다운로드했는지·실패했는지)를
// 버튼 바로 아래에 알린다 — 폰에서 파일이 어디로 갔는지 모르면 안 된 것처럼 보인다.

import { useRef, useState } from 'react';

import { useLocale } from '@/lib/i18n';
import {
  saveOrShareFile,
  type FileExportResult,
} from '@/lib/record/fileExport';
import {
  buildReportHtml,
  reportFilename,
  type ReportEntry,
  type ReportPhoto,
} from '@/lib/record/report';
import { photoToDataUrl } from '@/lib/record/reportPhoto';
import type { InspectionRecord } from '@/lib/rules/types';
import type { MessageKey } from '@/lib/i18n';

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; done: number; total: number }
  | { kind: 'done'; result: FileExportResult }
  | { kind: 'failed' };

const RESULT_TEXT: Record<FileExportResult, MessageKey> = {
  shared: 'report.shared',
  downloaded: 'report.downloaded',
  cancelled: 'report.cancelled',
};

export function ReportExportButton({
  label,
  loadRecords,
  disabled = false,
}: {
  label: string;
  /** 문서에 담을 기록(사진 포함). 부를 때마다 새로 읽는다 */
  loadRecords: () => Promise<InspectionRecord[]>;
  disabled?: boolean;
}) {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // 같은 틱의 두 번 누름을 막는다(상태는 다음 렌더에서야 바뀐다).
  const busyRef = useRef(false);

  async function handleClick() {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus({ kind: 'working', done: 0, total: 0 });
    try {
      const records = await loadRecords();
      const entries: ReportEntry[] = [];
      for (const record of records) {
        setStatus({
          kind: 'working',
          done: entries.length,
          total: records.length,
        });
        entries.push({ record, photos: await photosOf(record) });
      }
      const html = buildReportHtml(entries, {
        t,
        locale,
        generatedAt: new Date(),
      });
      const file = new File([html], reportFilename(), { type: 'text/html' });
      const result = await saveOrShareFile(file, t('report.title'));
      setStatus({ kind: 'done', result });
    } catch {
      setStatus({ kind: 'failed' });
    } finally {
      busyRef.current = false;
    }
  }

  async function photosOf(record: InspectionRecord): Promise<ReportPhoto[]> {
    const slots: Array<[Blob | undefined, MessageKey]> = [
      [record.grinderImage, 'history.grinderPhoto'],
      [record.wheelImage, 'history.wheelPhoto'],
      [record.wheelBackImage, 'exam.view.back'],
      [record.wheelEdgeImage, 'exam.view.edge'],
      [record.wheelBoreImage, 'exam.view.bore'],
    ];
    const photos: ReportPhoto[] = [];
    for (const [blob, key] of slots) {
      if (blob instanceof Blob) {
        photos.push({ label: t(key), dataUrl: await photoToDataUrl(blob) });
      }
    }
    return photos;
  }

  const working = status.kind === 'working';

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || working}
        className="min-h-12 rounded-lg border border-slate-500 px-3 text-base font-semibold text-slate-100 active:bg-slate-700 disabled:opacity-50"
      >
        {label}
      </button>
      {working && (
        <p role="status" className="text-sm text-slate-300">
          {t('report.working', { done: status.done, total: status.total })}
        </p>
      )}
      {status.kind === 'done' && (
        <p role="status" className="text-sm text-green-300">
          {t(RESULT_TEXT[status.result])}
        </p>
      )}
      {status.kind === 'failed' && (
        <p role="alert" className="text-sm text-red-300">
          {t('report.failed')}
        </p>
      )}
    </div>
  );
}
