'use client';

// IndexedDB 스키마 (Dexie).
// 점검 기록은 이 기기 안에만 남는다. 서버로 올리지 않는다.

import Dexie, { type EntityTable } from 'dexie';
import { researchToolsEnabled } from '@/lib/record/researchMode';
import type { InspectionRecord } from '@/lib/rules/types';
import {
  fromStoredPhoto,
  storedPhotoSize,
  toStoredPhoto,
  type StoredPhoto,
} from './storedPhoto';

/**
 * 검증 빌드와 현장 배포판은 이름이 다른 IndexedDB를 쓴다.
 *
 * 같은 이름을 쓰면 한 기기에서 검증용으로 찍은 시험 기록과 현장에서 찍은 실제
 * 점검 기록이 한 저장소에 섞인다. 검증 빌드가 CSV로 내보내는 순간 그 둘을
 * 구분할 수 없게 된다. 빌드 시점에 박히는 값이라 배포 뒤에 바뀌지 않는다.
 */
const DB_NAME = researchToolsEnabled() ? 'wheelmatch-validation' : 'wheelmatch';

/**
 * 저장된 기록은 id가 반드시 있다.
 * InspectionRecord의 id는 저장 전 상태를 표현하느라 optional이므로 여기서 좁힌다.
 */
export type StoredInspection = Omit<InspectionRecord, 'id'> & { id: number };

/** 저장 요청 형태 — id는 Dexie가 부여한다. */
export type NewInspection = Omit<InspectionRecord, 'id'>;

const PHOTO_KEYS = [
  'grinderImage',
  'wheelImage',
  'wheelBackImage',
  'wheelEdgeImage',
  'wheelBoreImage',
] as const;
type PhotoKey = (typeof PHOTO_KEYS)[number];

/**
 * 저장소 안의 실제 행. 사진은 Blob이 아니라 바이트로 들어간다(storedPhoto.ts —
 * 모바일 WebKit이 IndexedDB의 Blob 저장을 거부한다). 예전 기록은 Blob 그대로다.
 * 이 파일 밖으로는 항상 Blob으로 되돌려 내보낸다.
 */
type StoredRow = Omit<StoredInspection, PhotoKey> &
  Partial<Record<PhotoKey, StoredPhoto>>;

/** 사진 필드만 저장 가능한 형태로 바꾼다. 다른 필드는 그대로 둔다 */
async function encodePhotos<T extends Partial<Record<PhotoKey, unknown>>>(
  record: T,
): Promise<Omit<T, PhotoKey> & Partial<Record<PhotoKey, StoredPhoto>>> {
  const out: Record<string, unknown> = { ...record };
  for (const key of PHOTO_KEYS) {
    const value = record[key];
    if (value instanceof Blob) out[key] = await toStoredPhoto(value);
  }
  return out as Omit<T, PhotoKey> & Partial<Record<PhotoKey, StoredPhoto>>;
}

/** 저장소 행을 앱이 쓰는 형태(사진 Blob)로 되돌린다 */
function decodePhotos(row: StoredRow): StoredInspection {
  const out: Record<string, unknown> = { ...row };
  for (const key of PHOTO_KEYS) {
    if (row[key] === undefined) continue;
    const blob = fromStoredPhoto(row[key]);
    if (blob) out[key] = blob;
    else delete out[key];
  }
  return out as StoredInspection;
}

class WheelMatchDB extends Dexie {
  inspections!: EntityTable<StoredRow, 'id'>;

  constructor() {
    super(DB_NAME);
    // createdAt으로 최신순 정렬할 수 있게 인덱스를 잡는다.
    this.version(1).stores({
      inspections: '++id, createdAt',
    });
  }
}

export const db = new WheelMatchDB();

/** 점검 기록을 저장하고 새 id를 돌려준다. */
export async function saveInspection(record: NewInspection): Promise<number> {
  return db.inspections.add(await encodePhotos(record));
}

/** 사진 Blob을 뺀 기록. 전체를 훑어야 하지만 사진은 필요 없는 곳(필터·CSV)에 쓴다. */
export type InspectionWithoutPhotos = Omit<
  StoredInspection,
  | 'grinderImage'
  | 'wheelImage'
  | 'wheelBackImage'
  | 'wheelEdgeImage'
  | 'wheelBoreImage'
>;

/**
 * 사진을 뺀 전체 기록을 최신순으로 가져온다.
 *
 * "최근 50건" 같은 상한을 두지 않는다 — 상한을 두면 오래된 기록이 필터·CSV에서
 * 조용히 빠진다. 대신 사진 Blob을 아예 읽지 않으므로 기록이 아무리 많아도
 * 한 번에 메모리에 올라오는 양이 늘지 않는다.
 *
 * `each()`로 한 건씩 순회하며 그 자리에서 사진 필드를 버린다 — `toArray()`로
 * 통째로 받으면 순간적으로나마 모든 사진이 메모리에 함께 올라온다.
 */
export async function listAllInspectionsWithoutPhotos(): Promise<
  InspectionWithoutPhotos[]
> {
  const out: InspectionWithoutPhotos[] = [];
  await db.inspections
    .orderBy('createdAt')
    .reverse()
    .each((record) => {
      const {
        /* eslint-disable @typescript-eslint/no-unused-vars -- 사진 필드를 버리는 목적의 구조분해다. */
        grinderImage,
        wheelImage,
        wheelBackImage,
        wheelEdgeImage,
        wheelBoreImage,
        /* eslint-enable @typescript-eslint/no-unused-vars */
        ...rest
      } = record;
      out.push(rest);
    });
  return out;
}

/**
 * id로 여러 건을 한 번에 사진과 함께 읽는다. 넘긴 id 순서를 그대로 지킨다
 * (`bulkGet`의 계약). 이력 화면이 필터링된 id 목록 중 지금 보여줄 페이지만
 * 사진 포함으로 다시 읽을 때 쓴다 — 삭제된 id는 결과에서 조용히 빠진다.
 */
export async function listInspectionsByIds(
  ids: readonly number[],
): Promise<StoredInspection[]> {
  if (ids.length === 0) return [];
  const rows = await db.inspections.bulkGet(ids as number[]);
  return rows
    .filter((row): row is StoredRow => row !== undefined)
    .map(decodePhotos);
}

export async function deleteInspection(id: number): Promise<void> {
  await db.inspections.delete(id);
}

export async function clearInspections(): Promise<void> {
  await db.inspections.clear();
}

/** 전체 기록 수. 저장공간 관리 화면에 보여준다 */
export async function inspectionCount(): Promise<number> {
  return db.inspections.count();
}

/**
 * 넘긴 id 중 이미 저장돼 있는 것만 돌려준다. 백업 가져오기가 중복 id를
 * 건너뛰기 위해 쓴다 — 사진을 포함한 전체 레코드를 읽지 않고 primary key만 본다.
 */
export async function inspectionIdsPresent(
  ids: readonly number[],
): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const keys = await db.inspections
    .where('id')
    .anyOf(ids as number[])
    .primaryKeys();
  return new Set(keys);
}

/**
 * 백업 가져오기 전용. id를 보존한 채 새로 추가한다.
 *
 * 기존 호출부 이름은 유지하지만 실제 쓰기는 add()다. 사전 중복 조회만으로는
 * 다른 탭의 동시 저장을 막지 못하므로 DB의 유일키 제약으로 덮어쓰기를 막는다.
 */
export async function putInspectionWithId(
  record: StoredInspection,
): Promise<void> {
  await db.inspections.add(await encodePhotos(record));
}

/**
 * 사진 Blob만 지운다. 판정·Evidence·telemetry는 그대로 둔다 — 저장공간을
 * 줄이면서도 기록 자체는 증빙으로 남겨야 하기 때문이다.
 */
export async function clearInspectionPhotos(id: number): Promise<void> {
  await db.inspections.update(id, {
    grinderImage: undefined,
    wheelImage: undefined,
    wheelBackImage: undefined,
    wheelEdgeImage: undefined,
    wheelBoreImage: undefined,
  });
}

export interface PhotoStorageStats {
  /** 사진이 하나라도 남아 있는 기록 수 */
  recordsWithPhotos: number;
  /** 사진 Blob 크기 합계(byte) */
  totalPhotoBytes: number;
}

/**
 * 저장공간 관리 화면에 쓰는 사진 통계. Blob 내용을 읽지 않고 크기(size)만 더한다.
 */
export async function photoStorageStats(): Promise<PhotoStorageStats> {
  let recordsWithPhotos = 0;
  let totalPhotoBytes = 0;
  await db.inspections.each((record) => {
    // 예전 기록(Blob)과 새 기록(바이트)을 함께 센다.
    const sizes = PHOTO_KEYS.map((key) => storedPhotoSize(record[key])).filter(
      (size) => size > 0,
    );
    if (sizes.length > 0) recordsWithPhotos += 1;
    totalPhotoBytes += sizes.reduce((sum, size) => sum + size, 0);
  });
  return { recordsWithPhotos, totalPhotoBytes };
}

/**
 * IndexedDB 저장 공간이 가득 찼는지.
 *
 * 브라우저 네이티브 오류와 Dexie가 감싼 오류 모두 이 이름을 쓴다
 * (Dexie.errnames.QuotaExceeded === 'QuotaExceededError'). 값을 지어내지
 * 않고 실제 오류 이름으로만 판단한다.
 */
export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof Error && error.name === 'QuotaExceededError';
}
