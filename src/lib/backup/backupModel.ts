// 로컬 백업 파일(JSON) 형식과 가져오기 유효성 검사.
//
// 이 파일은 저장소를 모른다(순수 함수). IndexedDB 읽기·쓰기는 backupStore.ts가 한다.
//
// 담는 것: 최종 InspectionRecord(사진 제외)와 저장된 그라인더뿐이다. draft,
// sessionStorage 값, Gate 진행 상태, API 키·프롬프트·원시 API 응답은 애초에
// 이 형태에 없다 — InspectionRecord/SavedGrinder 자체가 그런 값을 담지 않는다
// (safety-critical.md #8). 사진은 항상 뺀다: 내보내는 쪽이 InspectionWithoutPhotos만
// 넘긴다.
//
// 객체를 통째로 직렬화해 믿지 않는다. 기록은 recordSanitize.ts의
// sanitizeInspectionRecord()로, 저장된 그라인더는 savedGrinderModel.ts의
// parseSavedGrinder()로 허용 필드만 새 객체에 옮겨 담는다 — `{...raw}` 같은
// 통째 복사는 어디서도 쓰지 않는다. 내보내기(buildBackupFile)와
// 가져오기(parseImportedRecord/classifyImportSavedGrinders)가 같은 함수를 쓴다.

import { sanitizeInspectionRecord } from './recordSanitize';
import { parseSavedGrinder } from '@/lib/db/savedGrinderModel';
import type { InspectionWithoutPhotos } from '@/lib/db';
import type { SavedGrinder } from '@/lib/db/savedGrinderModel';

export const BACKUP_FORMAT = 'wheelmatch-backup';
export const BACKUP_VERSION = 1;

/** JSON 문자열 기준 상한. 사진이 없으므로 이 정도로도 수만 건을 담는다 */
export const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  records: InspectionWithoutPhotos[];
  savedGrinders: SavedGrinder[];
}

/**
 * 내보낼 기록·저장된 그라인더를 허용 필드만으로 다시 만든 뒤 담는다.
 *
 * DB에서 읽은 값이라도 TypeScript 타입은 런타임 속성을 지우지 않으므로
 * 그대로 넘기지 않는다 — sanitizeInspectionRecord/parseSavedGrinder를 거쳐야만
 * 결과에 실린다. 정상적으로 저장된 값이라면 이 단계에서 거의 걸러지지 않지만,
 * 손상된 항목이 섞여 있어도 방어적으로 뺀다(무효 항목을 예외로 만들지 않는다).
 */
export function buildBackupFile(
  records: InspectionWithoutPhotos[],
  savedGrinders: SavedGrinder[],
  now: Date = new Date(),
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    records: records
      .map(sanitizeInspectionRecord)
      .filter((record): record is InspectionWithoutPhotos => record !== null),
    savedGrinders: savedGrinders
      .map(parseSavedGrinder)
      .filter((item): item is SavedGrinder => item !== null),
  };
}

export function backupFilename(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `wheelmatch-backup-${stamp}.json`;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export type BackupFileError =
  | 'bad_shape' // 최상위 구조(format·version·records·savedGrinders)가 아니다
  | 'bad_format' // format 값이 이 앱의 백업 파일이 아니다
  | 'unsupported_version'; // 이 앱이 모르는 버전이다(더 새 버전 포함)

/**
 * 최상위 구조만 본다. 레코드·저장된 그라인더 하나하나의 유효성은
 * classifyImportRecords/classifyImportSavedGrinders가 각각 담당한다 —
 * 파일 전체가 형식에 맞아도 항목 일부만 손상됐을 수 있어서다.
 */
export function parseBackupFile(
  raw: unknown,
): { file: BackupFile } | { error: BackupFileError } {
  if (!isObject(raw)) return { error: 'bad_shape' };
  if (raw.format !== BACKUP_FORMAT) return { error: 'bad_format' };
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) {
    return { error: 'bad_shape' };
  }
  // 과거 버전이 아직 없으므로(v1이 최초) 알려진 버전이 아니면 전부 미지원이다.
  if (raw.version !== BACKUP_VERSION) return { error: 'unsupported_version' };
  if (typeof raw.exportedAt !== 'string') return { error: 'bad_shape' };
  if (!Array.isArray(raw.records) || !Array.isArray(raw.savedGrinders)) {
    return { error: 'bad_shape' };
  }
  return {
    file: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: raw.exportedAt,
      records: raw.records as InspectionWithoutPhotos[],
      savedGrinders: raw.savedGrinders as SavedGrinder[],
    },
  };
}

/**
 * 가져온 기록 하나를 허용 필드만으로 재구성한다.
 *
 * sanitizeInspectionRecord()에 그대로 위임한다 — 미리보기(previewImport)와
 * 실제 적용(applyImport)이 같은 결과를 쓰게 하려는 것이다. id·필수 필드가
 * 없거나, 알려진 필드의 타입·enum·날짜·길이가 어긋나면 레코드 전체를 버린다.
 */
export function parseImportedRecord(
  raw: unknown,
): InspectionWithoutPhotos | null {
  return sanitizeInspectionRecord(raw);
}

export interface RecordImportClassification {
  valid: InspectionWithoutPhotos[];
  duplicateIds: number[];
  invalidCount: number;
}

/** 유효한 기록만 골라내고, 이미 있는 id는 별도로 센다(건너뛸 대상) */
export function classifyImportRecords(
  rawRecords: readonly unknown[],
  existingIds: ReadonlySet<number>,
): RecordImportClassification {
  const valid: InspectionWithoutPhotos[] = [];
  const duplicateIds: number[] = [];
  let invalidCount = 0;
  for (const raw of rawRecords) {
    const record = parseImportedRecord(raw);
    if (!record) {
      invalidCount += 1;
      continue;
    }
    if (existingIds.has(record.id)) {
      duplicateIds.push(record.id);
      continue;
    }
    valid.push(record);
  }
  return { valid, duplicateIds, invalidCount };
}

export interface SavedGrinderImportClassification {
  valid: SavedGrinder[];
  duplicateIds: number[];
  invalidCount: number;
}

export function classifyImportSavedGrinders(
  rawItems: readonly unknown[],
  existingIds: ReadonlySet<number>,
): SavedGrinderImportClassification {
  const valid: SavedGrinder[] = [];
  const duplicateIds: number[] = [];
  let invalidCount = 0;
  for (const raw of rawItems) {
    const item = parseSavedGrinder(raw);
    if (!item) {
      invalidCount += 1;
      continue;
    }
    if (existingIds.has(item.id)) {
      duplicateIds.push(item.id);
      continue;
    }
    valid.push(item);
  }
  return { valid, duplicateIds, invalidCount };
}
