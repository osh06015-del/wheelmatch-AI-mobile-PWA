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
// 객체를 통째로 직렬화해 믿지 않는다. 판정 재계산·현재 점검 복원에 최소한
// 필요한 필드만 확인하고, 그 외 필드는 옵션이라 있으면 쓰고 없으면 비운다
// (InspectionRecord의 대부분 필드가 "이 기능 도입 전 기록에는 없다"는 전제로
// 이미 optional이다 — parseSavedGrinder와 같은 원칙).

import { parseSavedGrinder } from '@/lib/db/savedGrinderModel';
import type { InspectionWithoutPhotos } from '@/lib/db';
import type { SavedGrinder } from '@/lib/db/savedGrinderModel';
import type { Verdict } from '@/lib/rules/types';

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

export function buildBackupFile(
  records: InspectionWithoutPhotos[],
  savedGrinders: SavedGrinder[],
  now: Date = new Date(),
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    records,
    savedGrinders,
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

const VERDICTS: ReadonlyArray<Verdict> = [
  'COMPATIBLE',
  'INCOMPATIBLE',
  'UNDETERMINED',
];

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
 * 기록 하나가 가리킬 수 있는(id로 되짚을 수 있는) 최소 형태인지 본다.
 *
 * 판정 재계산·현재 점검 복원에 쓰지 않으므로 result.checks[]의 각 항목까지
 * 검증하지 않는다 — 이력 화면이 그대로 보여줄 수 있는 최소 필드(핵심 규격·
 * 판정·저장 시각)만 확인하고, 나머지 optional 필드는 있으면 그대로 쓴다.
 */
export function parseImportedRecord(
  raw: unknown,
): InspectionWithoutPhotos | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'number' || !Number.isInteger(raw.id)) return null;
  if (typeof raw.createdAt !== 'string' || raw.createdAt === '') return null;
  if (!isObject(raw.grinder) || !isObject(raw.wheel)) return null;
  if (!isObject(raw.result)) return null;
  const verdict = raw.result.verdict;
  if (typeof verdict !== 'string' || !VERDICTS.includes(verdict as Verdict)) {
    return null;
  }
  if (!Array.isArray(raw.result.checks)) return null;
  if (!isObject(raw.checklist)) return null;
  return raw as unknown as InspectionWithoutPhotos;
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
