'use client';

// 저장된 그라인더 저장소. 점검 기록(index.ts)·draft(draft/draftStore.ts)와
// 또 다른 IndexedDB 데이터베이스에 둔다.
//
// 왜 따로인가: 점검 기록 DB 스키마를 이것 때문에 올리면, 이 표 도입 전 버전이
// 실수로 열지 못하게 되는 위험을 기존 기록에 지운다. 별도 데이터베이스면 이
// 기능이 통째로 실패해도(저장 공간 부족 등) 점검 기록·draft는 영향받지 않는다.
//
// 이 모듈의 함수는 던지지 않는다. 목록을 못 읽거나 저장에 실패해도 점검
// 흐름은 계속된다 — 이건 편의 기능이지 필수 기능이 아니다.

import Dexie, { type Table } from 'dexie';

import { researchToolsEnabled } from '@/lib/record/researchMode';
import {
  SAVED_GRINDER_SCHEMA_VERSION,
  parseSavedGrinder,
  type NewSavedGrinder,
  type SavedGrinder,
} from './savedGrinderModel';

/**
 * 스키마 버전. 올릴 때는 이전 버전 줄을 지우지 말고 새 줄을 더한다(Dexie 규칙)
 * — draft/draftStore.ts의 DRAFT_DB_VERSIONS와 같은 이유다.
 */
export const SAVED_GRINDER_DB_VERSIONS: ReadonlyArray<{
  version: number;
  stores: Readonly<Record<string, string>>;
}> = [{ version: 1, stores: { savedGrinders: '++id, alias' } }];

export function savedGrinderDbName(): string {
  return researchToolsEnabled()
    ? 'wheelmatch-validation-saved-grinders'
    : 'wheelmatch-saved-grinders';
}

/** 저장소가 쓰는 최소한의 표 기능. 테스트는 이 형태로 가짜 표를 넣는다 */
export interface SavedGrinderTable {
  toArray(): Promise<unknown[]>;
  add(row: NewSavedGrinder): Promise<number>;
  put(row: SavedGrinder): Promise<number>;
  delete(id: number): Promise<void>;
}

export interface SavedGrinderStore {
  /** 손상되었거나 가리킬 수 없는 항목은 조용히 뺀다. 별칭 순으로 정렬한다 */
  list(): Promise<SavedGrinder[]>;
  /** 새 항목을 만든다. 실패하면 null */
  add(row: NewSavedGrinder): Promise<number | null>;
  /** 기존 항목을 덮어쓴다. 성공하면 true */
  update(row: SavedGrinder): Promise<boolean>;
  /** 성공적으로 지웠으면 true */
  remove(id: number): Promise<boolean>;
}

export function createSavedGrinderStore(
  openTable: () => SavedGrinderTable | null,
): SavedGrinderStore {
  return {
    async list() {
      const table = openTable();
      if (!table) return [];
      try {
        const rows = await table.toArray();
        return rows
          .map(parseSavedGrinder)
          .filter((row): row is SavedGrinder => row !== null)
          .sort((a, b) => a.alias.localeCompare(b.alias));
      } catch {
        return [];
      }
    },

    async add(row) {
      const table = openTable();
      if (!table) return null;
      try {
        return await table.add({
          ...row,
          schemaVersion: SAVED_GRINDER_SCHEMA_VERSION,
        });
      } catch {
        return null;
      }
    },

    async update(row) {
      const table = openTable();
      if (!table) return false;
      try {
        await table.put({
          ...row,
          schemaVersion: SAVED_GRINDER_SCHEMA_VERSION,
        });
        return true;
      } catch {
        return false;
      }
    },

    async remove(id) {
      const table = openTable();
      if (!table) return true;
      try {
        await table.delete(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

class SavedGrinderDatabase extends Dexie {
  savedGrinders!: Table<SavedGrinder, number>;

  constructor() {
    super(savedGrinderDbName());
    for (const { version, stores } of SAVED_GRINDER_DB_VERSIONS) {
      this.version(version).stores(stores);
    }
  }
}

let database: SavedGrinderDatabase | null = null;

function openSavedGrinderTable(): SavedGrinderTable | null {
  // IndexedDB가 없는 환경(서버 렌더·일부 테스트)에서는 저장하지 않는다.
  if (typeof indexedDB === 'undefined') return null;
  database ??= new SavedGrinderDatabase();
  return database.savedGrinders;
}

export const savedGrinderStore: SavedGrinderStore = createSavedGrinderStore(
  openSavedGrinderTable,
);
