// 백업 저장소 연결부 테스트.
//
// db/index.ts와 savedGrinderStore는 실제 IndexedDB가 필요해 이 환경(happy-dom)
// 에서 직접 쓸 수 없다. 모듈을 모킹해 "미리보기는 아무것도 쓰지 않는다",
// "중복 id는 건너뛴다", "가져온 기록은 그대로 저장한다(판정 재계산 없음)"만 본다.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listAllInspectionsWithoutPhotos,
  inspectionIdsPresent,
  putInspectionWithId,
  savedList,
  savedUpdate,
} = vi.hoisted(() => ({
  listAllInspectionsWithoutPhotos: vi.fn(),
  inspectionIdsPresent: vi.fn(),
  putInspectionWithId: vi.fn(),
  savedList: vi.fn(),
  savedUpdate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  listAllInspectionsWithoutPhotos,
  inspectionIdsPresent,
  putInspectionWithId,
}));

vi.mock('@/lib/db/savedGrinderStore', () => ({
  savedGrinderStore: {
    list: savedList,
    add: vi.fn(),
    update: savedUpdate,
    remove: vi.fn(),
  },
}));

import {
  applyImport,
  buildBackupFileNow,
  gatherBackupData,
  previewImport,
} from './backupStore';
import { BACKUP_FORMAT, BACKUP_VERSION } from './backupModel';
import type { InspectionWithoutPhotos } from '@/lib/db';
import type { SavedGrinder } from '@/lib/db/savedGrinderModel';

function record(
  overrides: Partial<InspectionWithoutPhotos> = {},
): InspectionWithoutPhotos {
  return {
    id: 1,
    createdAt: '2026-09-17T00:00:00.000Z',
    grinder: {
      model: 'GWS 750-125',
      noLoadRPM: 11000,
      maxWheelDiameter: 125,
      rawText: 'GWS 750-125',
      confidence: 'high',
    },
    wheel: {
      maxRPM: 12000,
      diameter: 125,
      thickness: 6,
      purpose: 'grinding',
      wheelType: 'bonded_grinding',
      visibleDamage: 'none_visible',
      accessoryName: null,
      rawText: '125x6',
      confidence: 'high',
    },
    result: {
      verdict: 'COMPATIBLE',
      checks: [],
      timestamp: '2026-09-17T00:00:00.000Z',
    },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    ...overrides,
  } as InspectionWithoutPhotos;
}

function saved(overrides: Partial<SavedGrinder> = {}): SavedGrinder {
  return {
    id: 1,
    schemaVersion: 1,
    alias: '1호기',
    savedAt: '2026-09-17T00:00:00.000Z',
    model: 'DWE100',
    noLoadRPM: '10000',
    maxWheelDiameter: '100',
    spindleThread: 'M10',
    guardType: 'cutting',
    guardSize: '100',
    ...overrides,
  };
}

beforeEach(() => {
  listAllInspectionsWithoutPhotos.mockReset().mockResolvedValue([]);
  inspectionIdsPresent.mockReset().mockResolvedValue(new Set());
  putInspectionWithId.mockReset().mockResolvedValue(undefined);
  savedList.mockReset().mockResolvedValue([]);
  savedUpdate.mockReset().mockResolvedValue(true);
});

describe('gatherBackupData / buildBackupFileNow — 내보낼 범위', () => {
  it('사진 없는 기록과 저장된 그라인더만 모은다', async () => {
    listAllInspectionsWithoutPhotos.mockResolvedValue([record()]);
    savedList.mockResolvedValue([saved()]);

    const data = await gatherBackupData();
    expect(data.records).toEqual([record()]);
    expect(data.savedGrinders).toEqual([saved()]);
    // 이 형태 자체에 사진 필드가 없다 — 빼는 게 아니라 애초에 담기지 않는다.
    expect(data.records[0]).not.toHaveProperty('grinderImage');
  });

  it('백업 파일에 format·version이 박힌다', async () => {
    const file = await buildBackupFileNow();
    expect(file.format).toBe(BACKUP_FORMAT);
    expect(file.version).toBe(BACKUP_VERSION);
  });
});

describe('previewImport — 확인 전에는 아무것도 쓰지 않는다', () => {
  it('정상 파일을 미리보기만 하고 저장 함수는 부르지 않는다', async () => {
    const file = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: '2026-09-17T00:00:00.000Z',
      records: [record()],
      savedGrinders: [saved()],
    };

    const preview = await previewImport(JSON.stringify(file), 100);
    expect(preview).toMatchObject({
      status: 'ready',
      validRecords: [record()],
      duplicateRecordCount: 0,
      invalidRecordCount: 0,
      validSavedGrinders: [saved()],
      duplicateSavedGrinderCount: 0,
      invalidSavedGrinderCount: 0,
    });
    expect(putInspectionWithId).not.toHaveBeenCalled();
    expect(savedUpdate).not.toHaveBeenCalled();
  });

  it('파일 크기가 상한을 넘으면 거부한다', async () => {
    const preview = await previewImport('{}', 100 * 1024 * 1024);
    expect(preview).toEqual({ status: 'error', error: 'too_large' });
  });

  it('JSON으로 읽을 수 없으면(손상) 거부한다', async () => {
    const preview = await previewImport('{ broken', 10);
    expect(preview).toEqual({ status: 'error', error: 'not_json' });
  });

  it('이 앱이 모르는 버전(과대·미지원)은 거부한다', async () => {
    const preview = await previewImport(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 999,
        exportedAt: 'x',
        records: [],
        savedGrinders: [],
      }),
      10,
    );
    expect(preview).toEqual({ status: 'error', error: 'unsupported_version' });
  });

  it('중복 id는 duplicate로 세고, 무효 항목은 invalid로 센다', async () => {
    inspectionIdsPresent.mockResolvedValue(new Set([1]));
    savedList.mockResolvedValue([saved({ id: 9 })]);
    const file = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: 'x',
      records: [record({ id: 1 }), record({ id: 2 }), { broken: true }],
      savedGrinders: [saved({ id: 9 }), saved({ id: 10 }), { alias: '깨짐' }],
    };

    const preview = await previewImport(JSON.stringify(file), 10);
    expect(preview).toMatchObject({
      status: 'ready',
      validRecords: [record({ id: 2 })],
      duplicateRecordCount: 1,
      invalidRecordCount: 1,
      validSavedGrinders: [saved({ id: 10 })],
      duplicateSavedGrinderCount: 1,
      invalidSavedGrinderCount: 1,
    });
  });
});

describe('applyImport — 미리보기에서 확인한 항목만, 있는 그대로 저장한다', () => {
  it('기록을 판정 재계산 없이 그대로 넘긴다', async () => {
    const item = record({ id: 3 });
    const result = await applyImport([item], []);

    expect(putInspectionWithId).toHaveBeenCalledWith(item);
    expect(result.importedRecords).toBe(1);
  });

  it('저장된 그라인더도 그대로 넘긴다', async () => {
    const item = saved({ id: 7 });
    const result = await applyImport([], [item]);

    expect(savedUpdate).toHaveBeenCalledWith(item);
    expect(result.importedSavedGrinders).toBe(1);
  });

  it('한 항목이 실패해도 나머지는 계속 저장한다', async () => {
    putInspectionWithId
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);

    const result = await applyImport(
      [record({ id: 1 }), record({ id: 2 })],
      [],
    );
    expect(result.importedRecords).toBe(1);
  });
});
