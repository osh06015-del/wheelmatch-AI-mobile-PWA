// draft 저장소 테스트.
//
// 실제 IndexedDB는 이 환경(happy-dom)에 없다. 저장소가 쓰는 표 기능(get·put·delete)을
// 가짜로 넣어, 저장 공간 부족·실패·지우기 경합에서 기존 데이터를 망가뜨리지 않는지
// 본다. 실제 브라우저의 IndexedDB 동작은 이 테스트가 대신하지 못한다.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_ID, type InspectionDraft } from './draftModel';
import type { GrinderFormDraft } from './formDraftModel';
import {
  DRAFT_DB_VERSIONS,
  createDraftStore,
  createFormDraftStore,
  draftDbName,
  isQuotaError,
  type DraftTable,
  type FormDraftTable,
} from './draftStore';

function draft(overrides: Partial<InspectionDraft> = {}): InspectionDraft {
  return {
    id: DRAFT_ID,
    schemaVersion: 1,
    savedAt: '2026-09-17T03:00:00.000Z',
    profile: null,
    state: {} as InspectionDraft['state'],
    photos: { grinder: new Blob(['g']) },
    photoSlots: ['grinder'],
    photosOmitted: false,
    ...overrides,
  };
}

function grinderFormDraft(
  overrides: Partial<GrinderFormDraft> = {},
): GrinderFormDraft {
  return {
    slot: 'grinder',
    schemaVersion: 1,
    savedAt: '2026-09-17T03:00:00.000Z',
    fields: {
      model: 'GWS 750-125',
      noLoadRPM: '11000',
      maxWheelDiameter: '125',
      spindleThread: 'unknown',
      guardType: 'unknown',
      guardSize: '',
    },
    photo: new Blob(['plate']),
    ocr: null,
    analysisSource: 'server',
    ...overrides,
  };
}

/** 확인 화면 입력 draft용 메모리 표 */
function memoryFormTable(): FormDraftTable & {
  rows: Map<string, GrinderFormDraft>;
} {
  const rows = new Map<string, GrinderFormDraft>();
  return {
    rows,
    get: vi.fn(async (slot: string) => rows.get(slot)),
    put: vi.fn(async (value: GrinderFormDraft) => {
      rows.set(value.slot, value);
    }),
    delete: vi.fn(async (slot: string) => {
      rows.delete(slot);
    }),
  };
}

function quotaError(): Error {
  const error = new Error('full');
  error.name = 'QuotaExceededError';
  return error;
}

/** 메모리 표. put이 실패하면 이전 값이 그대로 남는다(IndexedDB 트랜잭션과 같다) */
function memoryTable(): DraftTable & { rows: Map<string, InspectionDraft> } {
  const rows = new Map<string, InspectionDraft>();
  return {
    rows,
    get: vi.fn(async (id: string) => rows.get(id)),
    put: vi.fn(async (value: InspectionDraft) => {
      rows.set(value.id, value);
    }),
    delete: vi.fn(async (id: string) => {
      rows.delete(id);
    }),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('draft 데이터베이스 — 최종 기록과 분리', () => {
  it('최종 기록 DB와 다른 이름을 쓴다 — 현장판·검증판 모두', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS', undefined);
    expect(draftDbName()).toBe('wheelmatch-draft');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS', 'true');
    expect(draftDbName()).toBe('wheelmatch-validation-draft');
    expect(['wheelmatch', 'wheelmatch-validation']).not.toContain(
      draftDbName(),
    );
  });

  it('스키마는 버전 순서대로 쌓이고 drafts 표 하나만 둔다(migration 기준)', () => {
    // 버전을 올릴 때 이전 줄을 지우면 이미 만들어진 draft DB를 열지 못한다.
    const versions = DRAFT_DB_VERSIONS.map((entry) => entry.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(DRAFT_DB_VERSIONS[0]).toEqual({
      version: 1,
      stores: { drafts: 'id' },
    });
    for (const entry of DRAFT_DB_VERSIONS) {
      expect(Object.keys(entry.stores)).not.toContain('inspections');
    }
  });
});

describe('createDraftStore', () => {
  it('draft가 없으면 none, 있으면 found를 돌려준다', async () => {
    const table = memoryTable();
    const store = createDraftStore(() => table);
    expect(await store.load()).toEqual({ status: 'none' });

    await store.save(draft());
    const loaded = await store.load();
    expect(loaded.status).toBe('found');
  });

  it('읽기에 실패해도 던지지 않는다', async () => {
    const table = memoryTable();
    table.get = vi.fn(async () => {
      throw new Error('broken');
    });
    expect(await createDraftStore(() => table).load()).toEqual({
      status: 'error',
    });
  });

  it('IndexedDB가 없는 환경에서는 저장하지 않고 조용히 넘어간다', async () => {
    const store = createDraftStore(() => null);
    expect(await store.load()).toEqual({ status: 'none' });
    expect(await store.save(draft())).toBe('skipped');
    expect(await store.remove()).toBe(true);
  });

  it('저장 공간이 모자라면 사진을 빼고 다시 저장한다', async () => {
    const table = memoryTable();
    const put = table.put;
    table.put = vi.fn(async (value: InspectionDraft) => {
      if (Object.keys(value.photos).length > 0) throw quotaError();
      return put(value);
    });
    const store = createDraftStore(() => table);

    expect(await store.save(draft())).toBe('savedWithoutPhotos');
    const saved = table.rows.get(DRAFT_ID);
    expect(saved?.photos).toEqual({});
    expect(saved?.photosOmitted).toBe(true);
    // 사진이 있던 자리는 남는다 — 복구 때 빠진 사진을 경고하는 기준이다.
    expect(saved?.photoSlots).toEqual(['grinder']);
  });

  it('사진을 빼도 실패하면 failed이고, 이전 draft는 그대로 남는다', async () => {
    const table = memoryTable();
    const previous = draft({ savedAt: 'previous' });
    table.rows.set(DRAFT_ID, previous);
    table.put = vi.fn(async () => {
      throw quotaError();
    });

    expect(await createDraftStore(() => table).save(draft())).toBe('failed');
    expect(table.rows.get(DRAFT_ID)).toBe(previous);
  });

  it('저장 공간 문제가 아닌 실패는 사진을 버리지 않고 failed로 끝낸다', async () => {
    const table = memoryTable();
    table.put = vi.fn(async () => {
      throw new Error('transaction aborted');
    });
    expect(await createDraftStore(() => table).save(draft())).toBe('failed');
    expect(table.put).toHaveBeenCalledTimes(1);
  });

  it('저장 도중 지우기가 일어나면 늦게 끝난 저장이 draft를 되살리지 않는다', async () => {
    const table = memoryTable();
    let release: () => void = () => {};
    const put = table.put;
    table.put = vi.fn(
      (value: InspectionDraft) =>
        new Promise<void>((resolve) => {
          release = () => {
            void put(value).then(() => resolve());
          };
        }),
    );
    const store = createDraftStore(() => table);

    const saving = store.save(draft());
    expect(await store.remove()).toBe(true);
    release();
    await saving;

    expect(table.rows.has(DRAFT_ID)).toBe(false);
  });

  it('지우기에 실패하면 false — 호출자가 사용자에게 알린다', async () => {
    const table = memoryTable();
    table.delete = vi.fn(async () => {
      throw new Error('blocked');
    });
    expect(await createDraftStore(() => table).remove()).toBe(false);
  });
});

describe('스키마 — 확인 화면 입력 draft(v2)', () => {
  it('v2가 formDrafts 표를 더한다 — 이전 버전 줄은 그대로 둔다', () => {
    const v2 = DRAFT_DB_VERSIONS.find((entry) => entry.version === 2);
    expect(v2?.stores).toEqual({ drafts: 'id', formDrafts: 'slot' });
    // v1 줄이 남아 있어야 이미 만들어진 draft DB를 열 수 있다(Dexie 규칙).
    expect(
      DRAFT_DB_VERSIONS.find((entry) => entry.version === 1)?.stores,
    ).toEqual({ drafts: 'id' });
  });
});

describe('createFormDraftStore', () => {
  it('draft가 없으면 none, 있으면 found를 돌려준다', async () => {
    const table = memoryFormTable();
    const store = createFormDraftStore(() => table);
    expect(await store.load('grinder')).toEqual({ status: 'none' });

    await store.save(grinderFormDraft());
    expect((await store.load('grinder')).status).toBe('found');
  });

  it('읽기에 실패해도 던지지 않는다', async () => {
    const table = memoryFormTable();
    table.get = vi.fn(async () => {
      throw new Error('broken');
    });
    expect(await createFormDraftStore(() => table).load('grinder')).toEqual({
      status: 'error',
    });
  });

  it('IndexedDB가 없는 환경에서는 저장하지 않고 조용히 넘어간다', async () => {
    const store = createFormDraftStore(() => null);
    expect(await store.load('grinder')).toEqual({ status: 'none' });
    expect(await store.save(grinderFormDraft())).toBe('skipped');
    expect(await store.remove('grinder')).toBe(true);
  });

  it('저장 공간이 모자라면 사진을 빼고 다시 저장한다', async () => {
    const table = memoryFormTable();
    const put = table.put;
    table.put = vi.fn(async (value: GrinderFormDraft) => {
      if (value.photo !== null) throw quotaError();
      return put(value);
    });
    const store = createFormDraftStore(() => table);

    expect(await store.save(grinderFormDraft())).toBe('savedWithoutPhoto');
    expect(table.rows.get('grinder')?.photo).toBeNull();
  });

  it('사진을 빼도 실패하면 failed다', async () => {
    const table = memoryFormTable();
    table.put = vi.fn(async () => {
      throw quotaError();
    });
    expect(
      await createFormDraftStore(() => table).save(grinderFormDraft()),
    ).toBe('failed');
  });

  it('지우기에 실패하면 false를 돌려준다', async () => {
    const table = memoryFormTable();
    table.delete = vi.fn(async () => {
      throw new Error('blocked');
    });
    expect(await createFormDraftStore(() => table).remove('grinder')).toBe(
      false,
    );
  });
});

describe('isQuotaError', () => {
  it('브라우저 오류와 Dexie가 감싼 오류(inner)를 모두 알아본다', () => {
    expect(isQuotaError(quotaError())).toBe(true);
    expect(isQuotaError({ name: 'AbortError', inner: quotaError() })).toBe(
      true,
    );
    expect(isQuotaError(new Error('other'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});
