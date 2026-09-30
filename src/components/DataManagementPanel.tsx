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
  type ImportResult,
} from '@/lib/backup/backupStore';
import {
  backupFilename,
  MAX_BACKUP_FILE_BYTES,
} from '@/lib/backup/backupModel';
import {
  inspectionCount,
  listAllInspectionsWithoutPhotos,
  listInspectionsByIds,
  photoStorageStats,
} from '@/lib/db';
import { saveOrShareFile } from '@/lib/record/fileExport';
import { ReportExportButton } from './ReportExportButton';
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
      // 파일 주소를 누른 직후 지우면 폰에서 다운로드가 시작 전에 취소될 수 있다.
      // 공유 창을 쓸 수 있으면 그것으로 넘긴다(fileExport.ts).
      const result = await saveOrShareFile(
        new File([JSON.stringify(file, null, 2)], backupFilename(), {
          type: 'application/json',
        }),
        t('backup.title'),
      );
      // 공유를 취소했으면 저장된 것이 없다. 성공 문구를 띄우지 않는다.
      if (result !== 'cancelled') setExportedCount(file.records.length);
    } catch {
      setExportError(true);
    }
  }

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importedSummary, setImportedSummary] = useState<ImportResult | null>(
    null,
  );
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState(false);

  async function handleFile(file: File) {
    if (importBusy) return;
    setImportBusy(true);
    setImportError(false);
    setPreview(null);
    setImportedSummary(null);
    try {
      // 상한 검사를 읽기 전에 해야 대용량 파일이 메모리에 먼저 올라오지 않는다.
      if (file.size > MAX_BACKUP_FILE_BYTES) {
        setPreview({ status: 'error', error: 'too_large' });
        return;
      }
      const text = await file.text();
      setPreview(await previewImport(text, file.size));
    } catch {
      setImportError(true);
    } finally {
      setImportBusy(false);
    }
  }

  async function handleConfirmImport() {
    if (importBusy || !preview || preview.status !== 'ready') return;
    setImportBusy(true);
    setImportError(false);
    try {
      const result = await applyImport(
        preview.validRecords,
        preview.validSavedGrinders,
      );
      setImportedSummary(result);
      setPreview(null);
    } catch {
      setImportError(true);
    } finally {
      setImportBusy(false);
    }
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
          {t('report.sectionTitle')}
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          {t('report.sectionHint')}
        </p>
        <ReportExportButton
          label={t('report.saveAll', { count: recordCount ?? 0 })}
          disabled={!recordCount}
          loadRecords={async () => {
            // 최신순 전체. 사진까지 읽어야 해서 id로 다시 읽는다.
            const rows = await listAllInspectionsWithoutPhotos();
            return listInspectionsByIds(rows.map((row) => row.id));
          }}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-700 pt-3">
        <h3 className="text-base font-bold text-slate-200">
          {t('backup.title')}
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          {t('backup.notice')}
        </p>
        <p className="text-sm leading-relaxed text-slate-400">
          {t('backup.restoreOnly')}
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
            disabled={importBusy}
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void handleFile(file);
            }}
            className="min-h-12 text-base text-slate-300"
          />
        </label>

        {importBusy && <p role="status">{t('backup.working')}</p>}
        {importError && (
          <p role="alert" className="text-sm text-red-300">
            {t('backup.operationFailed')}
          </p>
        )}

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
                importBusy ||
                (preview.validRecords.length === 0 &&
                  preview.validSavedGrinders.length === 0)
              }
              className="min-h-14 rounded-lg bg-sky-500 text-lg font-bold text-slate-950 active:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {t('backup.applyButton')}
            </button>
            <button
              type="button"
              disabled={importBusy}
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
              records: importedSummary.importedRecords,
              saved: importedSummary.importedSavedGrinders,
            })}
          </p>
        )}
        {importedSummary && importedSummary.skipped > 0 && (
          <p role="status" className="text-sm text-slate-300">
            {t('backup.skippedAtApply', { count: importedSummary.skipped })}
          </p>
        )}
        {importedSummary && importedSummary.failed > 0 && (
          <p role="alert" className="text-sm text-red-300">
            {t('backup.failedAtApply', { count: importedSummary.failed })}
          </p>
        )}
      </div>
    </section>
  );
}
