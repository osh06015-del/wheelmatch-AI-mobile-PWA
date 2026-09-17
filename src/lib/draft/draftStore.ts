'use client';

// 진행 중 점검(draft) 저장소. IndexedDB에 최종 기록과 **다른 데이터베이스**로 둔다.
//
// 같은 데이터베이스에 표를 더하면 최종 기록 DB의 버전을 올려야 한다. 그 이전에
// 실패하면 최종 기록까지 열리지 않을 수 있다 — 복구 기능 때문에 기존 기록을
// 위험하게 만들지 않는다.
//
// 이 모듈의 함수는 던지지 않는다. draft 저장이 실패해도 지금 점검은 계속된다.
// 사진은 IndexedDB에만 둔다(localStorage·sessionStorage에 넣지 않는다).

import Dexie, { type Table } from 'dexie';

import { researchToolsEnabled } from '@/lib/record/researchMode';
import { DRAFT_ID, type InspectionDraft } from './draftModel';

/**
 * draft 데이터베이스 스키마. 버전을 올릴 때는 이전 버전 줄을 지우지 말고 새 줄을
 * 더한다(Dexie 규칙) — 지우면 이미 만들어진 draft 데이터베이스를 열지 못한다.
 */
export const DRAFT_DB_VERSIONS: ReadonlyArray<{
  version: number;
  stores: Readonly<Record<string, string>>;
}> = [{ version: 1, stores: { drafts: 'id' } }];

/**
 * 검증 빌드와 현장판은 draft도 다른 데이터베이스에 둔다 — 최종 기록 DB
 * (lib/db의 wheelmatch·wheelmatch-validation)와 같은 이유다.
 */
export function draftDbName(): string {
  return researchToolsEnabled()
    ? 'wheelmatch-validation-draft'
    : 'wheelmatch-draft';
}

/** 저장소가 쓰는 최소한의 표 기능. 테스트는 이 형태로 가짜 표를 넣는다 */
export interface DraftTable {
  get(id: string): Promise<unknown>;
  put(draft: InspectionDraft): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export type DraftLoadResult =
  | { status: 'none' }
  | { status: 'found'; draft: unknown }
  | { status: 'error' };

export type DraftSaveResult =
  | 'saved'
  | 'savedWithoutPhotos' // 저장 공간이 모자라 사진을 빼고 저장했다
  | 'failed'
  | 'skipped'; // 저장소를 쓸 수 없는 환경이다(IndexedDB 없음)

/** 저장 공간 부족. 브라우저 오류와 Dexie가 감싼 오류(inner) 모두 본다 */
export function isQuotaError(error: unknown): boolean {
  const name = (value: unknown): unknown =>
    typeof value === 'object' && value !== null
      ? (value as { name?: unknown }).name
      : undefined;
  return (
    name(error) === 'QuotaExceededError' ||
    name((error as { inner?: unknown } | null)?.inner) === 'QuotaExceededError'
  );
}

export interface DraftStore {
  load(): Promise<DraftLoadResult>;
  save(draft: InspectionDraft): Promise<DraftSaveResult>;
  /** 성공적으로 지웠으면 true. 최종 저장 성공·사용자의 명시적 폐기에서만 부른다 */
  remove(): Promise<boolean>;
}

export function createDraftStore(
  openTable: () => DraftTable | null,
): DraftStore {
  // 지우기가 저장 도중에 일어나면, 늦게 끝난 저장이 지운 draft를 되살린다.
  // 저장을 시작할 때의 세대가 끝날 때 달라져 있으면 방금 쓴 draft를 다시 지운다.
  let generation = 0;

  async function removeLate(table: DraftTable, startedAt: number) {
    if (startedAt === generation) return;
    try {
      await table.delete(DRAFT_ID);
    } catch {
      // 다음 지우기에서 다시 시도된다.
    }
  }

  return {
    async load() {
      const table = openTable();
      if (!table) return { status: 'none' };
      try {
        const draft = await table.get(DRAFT_ID);
        return draft === undefined
          ? { status: 'none' }
          : { status: 'found', draft };
      } catch {
        return { status: 'error' };
      }
    },

    async save(draft) {
      const table = openTable();
      if (!table) return 'skipped';
      const startedAt = generation;
      try {
        await table.put(draft);
        await removeLate(table, startedAt);
        return 'saved';
      } catch (error) {
        if (!isQuotaError(error)) return 'failed';
      }
      // 사진이 공간을 차지한다. 숫자·답만이라도 남기면 앱을 닫아도 이어할 수 있다.
      // 이전 draft(사진 포함)를 지우지 않고 덮어쓴다 — 실패하면 이전 것이 그대로 남는다.
      try {
        await table.put({ ...draft, photos: {}, photosOmitted: true });
        await removeLate(table, startedAt);
        return 'savedWithoutPhotos';
      } catch {
        return 'failed';
      }
    },

    async remove() {
      generation += 1;
      const table = openTable();
      if (!table) return true;
      try {
        await table.delete(DRAFT_ID);
        return true;
      } catch {
        return false;
      }
    },
  };
}

class DraftDatabase extends Dexie {
  drafts!: Table<InspectionDraft, string>;

  constructor() {
    super(draftDbName());
    for (const { version, stores } of DRAFT_DB_VERSIONS) {
      this.version(version).stores(stores);
    }
  }
}

let database: DraftDatabase | null = null;

function openDraftTable(): DraftTable | null {
  // IndexedDB가 없는 환경(서버 렌더·일부 테스트)에서는 저장하지 않는다.
  if (typeof indexedDB === 'undefined') return null;
  database ??= new DraftDatabase();
  return database.drafts;
}

export const draftStore: DraftStore = createDraftStore(openDraftTable);
