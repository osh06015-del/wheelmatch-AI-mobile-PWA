// 로컬 백업 내보내기/가져오기의 저장소 연결부.
//
// backupModel.ts(순수 검증)와 IndexedDB(db/index.ts, savedGrinderStore.ts)를
// 잇는다. 미리보기(previewImport)와 실제 적용(applyImport)을 분리해 둔다 —
// 작업자가 확인하기 전에는 아무것도 쓰지 않는다.

import {
  BACKUP_FORMAT,
  MAX_BACKUP_FILE_BYTES,
  buildBackupFile,
  classifyImportRecords,
  classifyImportSavedGrinders,
  parseBackupFile,
  parseImportedRecord,
  type BackupFile,
  type BackupFileError,
} from './backupModel';
import {
  inspectionIdsPresent,
  listAllInspectionsWithoutPhotos,
  putInspectionWithId,
  type InspectionWithoutPhotos,
} from '@/lib/db';
import { savedGrinderStore } from '@/lib/db/savedGrinderStore';
import type { SavedGrinder } from '@/lib/db/savedGrinderModel';

/** 최종 InspectionRecord(사진 제외)와 저장된 그라인더를 모아 백업 파일을 만든다 */
export async function gatherBackupData(): Promise<{
  records: InspectionWithoutPhotos[];
  savedGrinders: SavedGrinder[];
}> {
  const [records, savedGrinders] = await Promise.all([
    listAllInspectionsWithoutPhotos(),
    savedGrinderStore.list(),
  ]);
  return { records, savedGrinders };
}

export async function buildBackupFileNow(): Promise<BackupFile> {
  const { records, savedGrinders } = await gatherBackupData();
  return buildBackupFile(records, savedGrinders);
}

export type ImportPreviewError =
  | BackupFileError
  | 'too_large' // 파일 크기 상한 초과
  | 'not_json'; // JSON으로 읽을 수 없다

export type ImportPreview =
  | { status: 'error'; error: ImportPreviewError }
  | {
      status: 'ready';
      validRecords: InspectionWithoutPhotos[];
      duplicateRecordCount: number;
      invalidRecordCount: number;
      validSavedGrinders: SavedGrinder[];
      duplicateSavedGrinderCount: number;
      invalidSavedGrinderCount: number;
    };

/**
 * 파일을 적용하기 전 미리보기만 만든다. 이 단계에서는 아무것도 쓰지 않는다.
 *
 * 중복 판단 기준: 기록은 이미 저장된 id, 저장된 그라인더도 이미 저장된 id다.
 * 후보 id를 먼저 뽑아 존재 여부를 한 번에 물어본 뒤, 같은 목록을 다시
 * classify*에 넘겨 유효/무효/중복을 가른다.
 */
export async function previewImport(
  text: string,
  fileSizeBytes: number,
): Promise<ImportPreview> {
  if (fileSizeBytes > MAX_BACKUP_FILE_BYTES) {
    return { status: 'error', error: 'too_large' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { status: 'error', error: 'not_json' };
  }

  const parsed = parseBackupFile(raw);
  if ('error' in parsed) return { status: 'error', error: parsed.error };
  const { file } = parsed;

  const candidateRecordIds = file.records
    .map((row) => parseImportedRecord(row))
    .filter((row): row is InspectionWithoutPhotos => row !== null)
    .map((row) => row.id);
  const existingRecordIds = await inspectionIdsPresent(candidateRecordIds);
  const recordResult = classifyImportRecords(file.records, existingRecordIds);

  const existingSavedGrinders = await savedGrinderStore.list();
  const existingSavedGrinderIds = new Set(
    existingSavedGrinders.map((item) => item.id),
  );
  const savedGrinderResult = classifyImportSavedGrinders(
    file.savedGrinders,
    existingSavedGrinderIds,
  );

  return {
    status: 'ready',
    validRecords: recordResult.valid,
    duplicateRecordCount: recordResult.duplicateIds.length,
    invalidRecordCount: recordResult.invalidCount,
    validSavedGrinders: savedGrinderResult.valid,
    duplicateSavedGrinderCount: savedGrinderResult.duplicateIds.length,
    invalidSavedGrinderCount: savedGrinderResult.invalidCount,
  };
}

export interface ImportResult {
  importedRecords: number;
  importedSavedGrinders: number;
}

/**
 * 미리보기에서 작업자가 확인한 유효·비중복 항목만 실제로 저장한다.
 *
 * 판정을 다시 계산하지 않는다 — 레코드를 있는 그대로(저장 당시 verdict·
 * ruleVersion·accessoryProfile 등) 넣는다. 현재 진행 중인 점검(draft)에도
 * 손대지 않는다. id는 원본 그대로 보존한다(put은 같은 id가 없을 때만
 * 부른다는 전제 — previewImport가 이미 중복을 걸러 넘긴다).
 */
export async function applyImport(
  validRecords: readonly InspectionWithoutPhotos[],
  validSavedGrinders: readonly SavedGrinder[],
): Promise<ImportResult> {
  let importedRecords = 0;
  for (const record of validRecords) {
    try {
      await putInspectionWithId(record);
      importedRecords += 1;
    } catch {
      // 개별 항목 저장 실패는 나머지 가져오기를 막지 않는다.
    }
  }

  let importedSavedGrinders = 0;
  for (const item of validSavedGrinders) {
    // update()는 id가 있으면 갱신, 없으면 추가한다(Dexie put). previewImport가
    // 이미 존재하는 id를 걸러 넘기므로 여기서는 항상 새로 추가되는 셈이다.
    const ok = await savedGrinderStore.update(item);
    if (ok) importedSavedGrinders += 1;
  }

  return { importedRecords, importedSavedGrinders };
}

export { BACKUP_FORMAT };
