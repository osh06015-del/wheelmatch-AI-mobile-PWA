// 작업자가 이름 붙여 저장해 두는 그라인더 정보(저장된 그라인더).
//
// 점검 기록(InspectionRecord)·진행 중 draft와는 다른 데이터다. 다음 점검에서
// 입력칸을 빨리 채우기 위한 개인 메모에 가깝다 — 그래서 판정에 쓰이는 값만
// 담는다. 사진·OCR 원본/신뢰도·장비 상태 Gate 답·userConfirmed·판정 결과는
// 애초에 이 형태에 없다: "저장해 둔 이름"을 고르는 것이 확인을 대신하면 안 된다.
//
// 이 파일은 저장소를 모른다(순수 함수). IndexedDB 읽기·쓰기는 savedGrinderStore.ts가 한다.

import type { GuardType, SpindleThread } from '@/lib/rules/types';

export const SAVED_GRINDER_SCHEMA_VERSION = 1;

export interface SavedGrinderFields {
  model: string;
  noLoadRPM: string;
  maxWheelDiameter: string;
  spindleThread: SpindleThread;
  guardType: GuardType;
  guardSize: string;
}

export const EMPTY_SAVED_GRINDER_FIELDS: SavedGrinderFields = {
  model: '',
  noLoadRPM: '',
  maxWheelDiameter: '',
  spindleThread: 'unknown',
  guardType: 'unknown',
  guardSize: '',
};

export interface SavedGrinder extends SavedGrinderFields {
  id: number;
  schemaVersion: number;
  /** 작업자가 붙인 이름. 목록에서 이것만으로 고른다 */
  alias: string;
  savedAt: string;
}

/** 새로 저장할 때 넘기는 형태. id는 저장소가 부여한다 */
export type NewSavedGrinder = Omit<SavedGrinder, 'id'>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const SPINDLES: readonly SpindleThread[] = [
  'unknown',
  'M14',
  'M10',
  '5/8-11',
  'other',
];
const GUARDS: readonly GuardType[] = [
  'unknown',
  'grinding',
  'cutting',
  'none',
  'other',
];

const isSpindleThread = (value: unknown): value is SpindleThread =>
  isString(value) && (SPINDLES as readonly string[]).includes(value);

const isGuardType = (value: unknown): value is GuardType =>
  isString(value) && (GUARDS as readonly string[]).includes(value);

function pickString(value: unknown, fallback: string): string {
  return isString(value) ? value : fallback;
}

/** 별칭이 없는 항목은 목록에서 고를 수 없다 — 저장 자체를 뜻 없게 만든다 */
function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * 읽어 온 값에서 믿을 수 있는 필드만 골라 되살린다.
 *
 * 손상되었거나(형태가 어긋난 값) 구버전이라 필드가 빠진 항목도 앱을 깨뜨리지
 * 않는다 — 값이 없으면 draft 복구와 같은 원칙으로 기본값으로 채운다. 다만
 * id·alias가 없으면 목록에서 가리킬 수도, 고를 수도 없는 항목이라 통째로
 * 버린다(null).
 */
export function parseSavedGrinder(raw: unknown): SavedGrinder | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'number' || !isNonEmptyString(raw.alias)) return null;
  return {
    id: raw.id,
    schemaVersion: SAVED_GRINDER_SCHEMA_VERSION,
    alias: raw.alias,
    savedAt: pickString(raw.savedAt, new Date(0).toISOString()),
    model: pickString(raw.model, ''),
    noLoadRPM: pickString(raw.noLoadRPM, ''),
    maxWheelDiameter: pickString(raw.maxWheelDiameter, ''),
    spindleThread: isSpindleThread(raw.spindleThread)
      ? raw.spindleThread
      : 'unknown',
    guardType: isGuardType(raw.guardType) ? raw.guardType : 'unknown',
    guardSize: pickString(raw.guardSize, ''),
  };
}

/** 저장 전 다듬기. 별칭 앞뒤 공백을 없애고, 비어 있으면 저장하지 않는다 */
export function normalizeAlias(alias: string): string {
  return alias.trim();
}

/** 두 필드 값이 화면에 보이는 값 기준으로 같은지. 하나라도 다르면 조용히 덮지 않는다 */
export function savedGrinderFieldsDiffer(
  a: SavedGrinderFields,
  b: SavedGrinderFields,
): boolean {
  return (
    a.model !== b.model ||
    a.noLoadRPM !== b.noLoadRPM ||
    a.maxWheelDiameter !== b.maxWheelDiameter ||
    a.spindleThread !== b.spindleThread ||
    a.guardType !== b.guardType ||
    a.guardSize !== b.guardSize
  );
}
