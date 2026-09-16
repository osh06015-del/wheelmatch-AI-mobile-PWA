'use client';

// IndexedDB 스키마 (Dexie).
// 점검 기록은 이 기기 안에만 남는다. 서버로 올리지 않는다.

import Dexie, { type EntityTable } from 'dexie';
import { researchToolsEnabled } from '@/lib/record/researchMode';
import type { InspectionRecord } from '@/lib/rules/types';

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

class WheelMatchDB extends Dexie {
  inspections!: EntityTable<StoredInspection, 'id'>;

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
  return db.inspections.add(record);
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
  return rows.filter((row): row is StoredInspection => row !== undefined);
}

export async function deleteInspection(id: number): Promise<void> {
  await db.inspections.delete(id);
}

export async function clearInspections(): Promise<void> {
  await db.inspections.clear();
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
