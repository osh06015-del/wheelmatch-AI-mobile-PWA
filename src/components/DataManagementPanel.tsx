'use client';

// 로컬 데이터 관리. 이력 화면 맨 아래에 둔다.
//
// 두 가지를 묶는다.
//   1. 백업 파일(JSON) 내보내기/가져오기 — 최종 기록과 저장된 그라인더만 담는다.
//      사진은 애초에 InspectionWithoutPhotos에 없어 담기지 않는다.
//   2. 저장공간 확인과 정리 — 전체 기록 수, 사진 용량, draft 존재 여부를 보여주고
//      사진만 지우거나(기록별로는 HistoryList에서) 진행 중 draft를 지울 수 있게 한다.
//
// 자동 삭제·자동 정리는 없다. 모든 지우기는 명시적 확인을 거친다.

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

import {
  applyImport,
  buildBackupFileNow,
  previewImport,
  type ImportPreview,
} from '@/lib/backup/backupStore';
import { backupFilename } from '@/lib/backup/backupModel';
import { inspectionCount, photoStorageStats } from '@/lib/db';
import { savedGrinderStore } from '@/lib/db/savedGrinderStore';
import { draftStore, formDraftStore } from '@/lib/draft/draftStore';
import { useLocale, type MessageKey } from '@/lib/i18n';
import { estimateStorageUsage } from '@/lib/storage/storageUsage';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

const IMPORT_ERROR_KEY: Record<
  'bad_shape' | 'bad_format' | 'unsupported_version' | 'too_large' | 'not_json',
  MessageKey
> = {
  bad_shape: 'backup.errorBadShape',
  bad_format: 'backup.errorBadFormat',
  unsupported_version: 'backup.errorUnsupportedVersion',
  too_large: 'backup.errorTooLarge',
  not_json: 'backup.errorNotJson',
};

export function DataManagementPanel() {
  const { t } = useLocale();

  const recordCount = useLiveQuery(() => inspectionCount(), []);
  const photoStats = useLiveQuery(() => photoStorageStats(), []);
  const savedGrinderCount = useLiveQuery(
    () => savedGrinderStore.list().then((items) => items.length),
    [],
  );

  const [storageUsage, setStorageUsage] = useState<{
    supported: boolean;
    usageBytes: number | null;
    quotaBytes: number | null;
  } | null>(null);
  const [draftExists, setDraftExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void estimateStorageUsage().then((result) => {
      if (!cancelled) setStorageUsage(result);
    });
    void Promise.all([
      draftStore.load(),
      formDraftStore.load('grinder'),
      formDraftStore.load('wheel'),
    ]).then(([wheelExam, grinderForm, wheelForm]) => {
      if (!cancelled) {
        setDraftExists(
          wheelExam.status === 'found' ||
            grinderForm.status === 'found' ||
            wheelForm.status === 'found',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [exportError, setExportError] = useState(false);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  async function handleExport() {
    setExportError(false);
    setExportedCount(null);
    try {
      const file = await buildBackupFileNow();
      const blob = new Blob([JSON.stringify(file, null, 2)], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFilename();
      link.click();
      URL.revokeObjectURL(url);
      setExportedCount(file.records.length);
    } catch {
      setExportError(true);
    }
  }

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importedSummary, setImportedSummary] = useState<{
    records: number;
    saved: number;
  } | null>(null);

  async function handleFile(file: File) {
    setImportedSummary(null);
    const text = await file.text();
    setPreview(await previewImport(text, file.size));
  }

  async function handleConfirmImport() {
    if (!preview || preview.status !== 'ready') return;
    const result = await applyImport(
      preview.validRecords,
      preview.validSavedGrinders,
    );
    setImportedSummary({
      records: result.importedRecords,
      saved: result.importedSavedGrinders,
    });
    setPreview(null);
  }

  const [confirmingDraftDelete, setConfirmingDraftDelete] = useState(false);

  async function handleDeleteDraft() {
    await Promise.all([
      draftStore.remove(),
      formDraftStore.remove('grinder'),
      formDraftStore.remove('wheel'),
    ]);
    setDraftExists(false);
    setConfirmingDraftDelete(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 px-4 py-4">
      <h2 className="text-lg font-bold text-slate-100">
        {t('dataManagement.title')}
      </h2>

      <div className="flex flex-col gap-1 text-base text-slate-300">
        <p>{t('dataManagement.recordCount', { count: recordCount ?? 0 })}</p>
        <p>
          {t('dataManagement.savedGrinderCount', {
            count: savedGrinderCount ?? 0,
          })}
        </p>
        <p>
          {t(
            draftExists
              ? 'dataManagement.draftExists'
              : 'dataManagement.draftNone',
          )}
        </p>
        <p>
          {t('dataManagement.photoStats', {
            records: photoStats?.recordsWithPhotos ?? 0,
            bytes: formatBytes(photoStats?.totalPhotoBytes ?? 0),
          })}
        </p>
        {storageUsage?.supported ? (
          <p>
            {t('dataManagement.storageUsage', {
              usage: formatBytes(storageUsage.usageBytes),
              quota: formatBytes(storageUsage.quotaBytes),
            })}
          </p>
        ) : (
          storageUsage && <p>{t('dataManagement.storageUnsupported')}</p>
        )}
      </div>

      {draftExists && (
        <div className="flex flex-col gap-3 border-t border-slate-700 pt-3">
          {confirmingDraftDelete ? (
            <>
              <p className="text-base leading-relaxed text-yellow-100">
                {t('dataManagement.deleteDraftConfirm')}
              </p>
              <button
                type="button"
                onClick={() => void handleDeleteDraft()}
                className="min-h-14 rounded-lg bg-yellow-500 text-lg font-bold text-slate-950 active:bg-yellow-400"
              >
                {t('dataManagement.deleteDraftConfirmButton')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDraftDelete(false)}
                className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-700"
              >
                {t('dataManagement.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDraftDelete(true)}
              className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-300 active:bg-slate-700"
            >
              {t('dataManagement.deleteDraft')}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-700 pt-3">
        <h3 className="text-base font-bold text-slate-200">
          {t('backup.title')}
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          {t('backup.notice')}
        </p>

        <button
          type="button"
          onClick={() => void handleExport()}
          className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-slate-100 active:bg-slate-600"
        >
          {t('backup.export')}
        </button>
        {exportedCount !== null && (
          <p role="status" className="text-sm text-slate-300">
            {t('backup.exported', { count: exportedCount })}
          </p>
        )}
        {exportError && (
          <p role="alert" className="text-sm text-red-300">
            {t('backup.exportFailed')}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-slate-200">
            {t('backup.importLabel')}
          </span>
          <span className="text-sm leading-relaxed text-slate-400">
            {t('backup.importHint')}
          </span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void handleFile(file);
            }}
            className="min-h-12 text-base text-slate-300"
          />
        </label>

        {preview?.status === 'error' && (
          <p role="alert" className="text-base text-red-300">
            {t(IMPORT_ERROR_KEY[preview.error])}
          </p>
        )}

        {preview?.status === 'ready' && (
          <div className="flex flex-col gap-3 rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-3">
            <h4 className="text-base font-bold text-sky-100">
              {t('backup.previewTitle')}
            </h4>
            <p className="text-sm leading-relaxed text-sky-200">
              {t('backup.previewRecords', {
                valid: preview.validRecords.length,
                duplicate: preview.duplicateRecordCount,
                invalid: preview.invalidRecordCount,
              })}
            </p>
            <p className="text-sm leading-relaxed text-sky-200">
              {t('backup.previewSavedGrinders', {
                valid: preview.validSavedGrinders.length,
                duplicate: preview.duplicateSavedGrinderCount,
                invalid: preview.invalidSavedGrinderCount,
              })}
            </p>
            <button
              type="button"
              onClick={() => void handleConfirmImport()}
              disabled={
                preview.validRecords.length === 0 &&
                preview.validSavedGrinders.length === 0
              }
              className="min-h-14 rounded-lg bg-sky-500 text-lg font-bold text-slate-950 active:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {t('backup.applyButton')}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-700"
            >
              {t('backup.cancelButton')}
            </button>
          </div>
        )}

        {importedSummary && (
          <p role="status" className="text-sm text-slate-300">
            {t('backup.applied', {
              records: importedSummary.records,
              saved: importedSummary.saved,
            })}
          </p>
        )}
      </div>
    </section>
  );
}
