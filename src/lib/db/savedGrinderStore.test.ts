// 저장된 그라인더 저장소 테스트.
//
// 실제 IndexedDB는 이 환경(happy-dom)에 없다. 저장소가 쓰는 표 기능(toArray·add·
// put·delete)을 가짜로 넣어, 손상되거나 구버전 형태인 항목이 앱을 깨뜨리지
// 않는지, DB 오류가 나도 던지지 않는지 본다.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SAVED_GRINDER_DB_VERSIONS,
  createSavedGrinderStore,
  savedGrinderDbName,
  type SavedGrinderTable,
} from './savedGrinderStore';
import type { NewSavedGrinder, SavedGrinder } from './savedGrinderModel';

function row(overrides: Partial<SavedGrinder> = {}): SavedGrinder {
  return {
    id: 1,
    schemaVersion: 1,
    alias: '1번 그라인더',
    savedAt: '2026-09-17T00:00:00.000Z',
    model: 'GWS 750-125',
    noLoadRPM: '11000',
    maxWheelDiameter: '125',
    spindleThread: 'M14',
    guardType: 'grinding',
    guardSize: '125',
    ...overrides,
  };
}

/** 메모리 표. put/add가 실패하면 이전 값이 그대로 남는다 */
function memoryTable(
  initial: SavedGrinder[] = [],
): SavedGrinderTable & { rows: Map<number, unknown> } {
  const rows = new Map<number, unknown>(initial.map((r) => [r.id, r]));
  let nextId = Math.max(0, ...initial.map((r) => r.id)) + 1;
  return {
    rows,
    toArray: vi.fn(async () => [...rows.values()]),
    add: vi.fn(async (value: NewSavedGrinder) => {
      const id = nextId++;
      rows.set(id, { ...value, id });
      return id;
    }),
    put: vi.fn(async (value: SavedGrinder) => {
      rows.set(value.id, value);
      return value.id;
    }),
    delete: vi.fn(async (id: number) => {
      rows.delete(id);
    }),
  };
}

function throwingTable(error: Error = new Error('db unavailable')) {
  return {
    toArray: vi.fn(async () => {
      throw error;
    }),
    add: vi.fn(async () => {
      throw error;
    }),
    put: vi.fn(async () => {
      throw error;
    }),
    delete: vi.fn(async () => {
      throw error;
    }),
  } satisfies SavedGrinderTable;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('저장된 그라인더 데이터베이스 — 다른 저장소와 분리', () => {
  it('점검 기록·draft와 다른 이름을 쓴다 — 현장판·검증판 모두', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS', undefined);
    expect(savedGrinderDbName()).toBe('wheelmatch-saved-grinders');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS', 'true');
    expect(savedGrinderDbName()).toBe('wheelmatch-validation-saved-grinders');
  });

  it('스키마 버전은 additive하다 — 이전 버전 줄을 지우지 않는다', () => {
    const versions = SAVED_GRINDER_DB_VERSIONS.map((entry) => entry.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(SAVED_GRINDER_DB_VERSIONS[0]).toEqual({
      version: 1,
      stores: { savedGrinders: '++id, alias' },
    });
  });
});

describe('저장된 그라인더 저장소 — 저장/선택/수정/삭제', () => {
  it('현재 값을 저장하면 id를 받고 목록에서 별칭으로 정렬돼 보인다', async () => {
    const table = memoryTable();
    const store = createSavedGrinderStore(() => table);

    const idA = await store.add({
      schemaVersion: 1,
      alias: '나',
      savedAt: '2026-09-17T00:00:00.000Z',
      model: 'B',
      noLoadRPM: '9000',
      maxWheelDiameter: '100',
      spindleThread: 'unknown',
      guardType: 'unknown',
      guardSize: '',
    });
    const idB = await store.add({
      schemaVersion: 1,
      alias: '가',
      savedAt: '2026-09-17T00:00:00.000Z',
      model: 'A',
      noLoadRPM: '8000',
      maxWheelDiameter: '90',
      spindleThread: 'unknown',
      guardType: 'unknown',
      guardSize: '',
    });

    expect(idA).not.toBeNull();
    expect(idB).not.toBeNull();

    const list = await store.list();
    expect(list.map((item) => item.alias)).toEqual(['가', '나']);
  });

  it('수정하면 같은 id의 값이 바뀐다', async () => {
    const table = memoryTable([row()]);
    const store = createSavedGrinderStore(() => table);

    const ok = await store.update(row({ alias: '수정됨', model: 'GWS 800' }));
    expect(ok).toBe(true);

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ alias: '수정됨', model: 'GWS 800' });
  });

  it('삭제하면 목록에서 사라진다', async () => {
    const table = memoryTable([row()]);
    const store = createSavedGrinderStore(() => table);

    const ok = await store.remove(1);
    expect(ok).toBe(true);
    expect(await store.list()).toEqual([]);
  });
});

describe('저장된 그라인더 저장소 — 손상·구버전 항목과 DB 오류', () => {
  it('별칭·id가 없는 손상된 항목은 조용히 빼고 나머지는 보여준다', async () => {
    const table = memoryTable([row()]);
    // 손상된 원시 데이터를 직접 끼워 넣는다(예: 다른 원인으로 깨진 레코드).
    table.rows.set(2, { id: 2 });
    table.rows.set(3, { alias: '별칭만 있음' });
    table.rows.set(4, 'not even an object');

    const store = createSavedGrinderStore(() => table);
    const list = await store.list();

    expect(list).toHaveLength(1);
    expect(list[0].alias).toBe('1번 그라인더');
  });

  it('필드가 일부 빠진 구버전 항목은 남은 값을 살리고 나머지는 기본값으로 채운다', async () => {
    const table = memoryTable();
    table.rows.set(5, { id: 5, alias: '구버전', model: 'OLD-1' });

    const store = createSavedGrinderStore(() => table);
    const list = await store.list();

    expect(list).toEqual([
      {
        id: 5,
        schemaVersion: 1,
        alias: '구버전',
        savedAt: expect.any(String),
        model: 'OLD-1',
        noLoadRPM: '',
        maxWheelDiameter: '',
        spindleThread: 'unknown',
        guardType: 'unknown',
        guardSize: '',
      },
    ]);
  });

  it('저장된 값에 알려지지 않은 속성이 섞여 있어도 목록에는 남지 않는다', async () => {
    // TypeScript 타입은 런타임 속성을 지우지 않는다 — 다른 원인으로 DB에
    // 이런 값이 들어왔다고 가정해도 list()가 허용 필드만 돌려주는지 본다.
    const table = memoryTable();
    table.rows.set(1, {
      ...row(),
      apiKey: 'sk-ant-secret',
      rawApiResponse: { id: 'msg_1' },
    });

    const store = createSavedGrinderStore(() => table);
    const list = await store.list();

    expect(list).toEqual([row()]);
    expect(list[0]).not.toHaveProperty('apiKey');
    expect(list[0]).not.toHaveProperty('rawApiResponse');
  });

  it('목록 조회가 실패해도 던지지 않고 빈 배열을 돌려준다', async () => {
    const store = createSavedGrinderStore(() => throwingTable());
    await expect(store.list()).resolves.toEqual([]);
  });

  it('저장·수정·삭제가 실패해도 던지지 않고 실패를 알린다', async () => {
    const store = createSavedGrinderStore(() => throwingTable());

    await expect(
      store.add({
        schemaVersion: 1,
        alias: 'x',
        savedAt: '2026-09-17T00:00:00.000Z',
        model: '',
        noLoadRPM: '',
        maxWheelDiameter: '',
        spindleThread: 'unknown',
        guardType: 'unknown',
        guardSize: '',
      }),
    ).resolves.toBeNull();
    await expect(store.update(row())).resolves.toBe(false);
    await expect(store.remove(1)).resolves.toBe(false);
  });

  it('저장소를 쓸 수 없는 환경(IndexedDB 없음)에서는 빈 목록·안전한 기본값을 돌려준다', async () => {
    const store = createSavedGrinderStore(() => null);
    await expect(store.list()).resolves.toEqual([]);
    await expect(
      store.add({
        schemaVersion: 1,
        alias: 'x',
        savedAt: '2026-09-17T00:00:00.000Z',
        model: '',
        noLoadRPM: '',
        maxWheelDiameter: '',
        spindleThread: 'unknown',
        guardType: 'unknown',
        guardSize: '',
      }),
    ).resolves.toBeNull();
    await expect(store.remove(1)).resolves.toBe(true);
  });
});
