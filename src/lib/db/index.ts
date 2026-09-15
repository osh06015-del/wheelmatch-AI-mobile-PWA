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

/** 최근 기록을 최신순으로 가져온다. 기본 50건. */
export async function listInspections(limit = 50): Promise<StoredInspection[]> {
  return db.inspections.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function deleteInspection(id: number): Promise<void> {
  await db.inspections.delete(id);
}

export async function clearInspections(): Promise<void> {
  await db.inspections.clear();
}
