// 최종 기록 저장 — 모바일 WebKit이 IndexedDB의 Blob 저장을 거부해도 사진과 함께 저장된다.
//
// 현장 폰에서 "저장에 실패했습니다"가 뜬 원인의 회귀 테스트다. 실제 IndexedDB는
// 이 환경에 없어 표의 add·bulkGet·each를 바꿔 끼운다.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  db,
  listInspectionsByIds,
  photoStorageStats,
  saveInspection,
  type NewInspection,
  type StoredInspection,
} from './index';

afterEach(() => vi.restoreAllMocks());

function containsBlob(value: unknown): boolean {
  if (value instanceof Blob) return true;
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).some(containsBlob);
}

function record(): NewInspection {
  return {
    createdAt: '2026-09-30T00:00:00.000Z',
    grinderImage: new Blob(['plate'], { type: 'image/jpeg' }),
    wheelImage: new Blob(['label'], { type: 'image/jpeg' }),
  } as NewInspection;
}

describe('최종 기록 저장 — 사진은 바이트로 넣고 Blob으로 읽는다', () => {
  it('Blob이 든 값을 거부하는 저장소(모바일 WebKit)에서도 저장된다', async () => {
    let stored: unknown;
    vi.spyOn(db.inspections, 'add').mockImplementation((async (
      value: unknown,
    ) => {
      if (containsBlob(value)) {
        const error = new Error(
          'Error preparing Blob/File data to be stored in object store',
        );
        error.name = 'UnknownError';
        throw error;
      }
      stored = value;
      return 1;
    }) as never);

    await expect(saveInspection(record())).resolves.toBe(1);
    expect(containsBlob(stored)).toBe(false);
  });

  it('읽을 때는 사진을 같은 내용·형식의 Blob으로 되돌리고, 예전 Blob 기록도 읽는다', async () => {
    let stored: unknown;
    vi.spyOn(db.inspections, 'add').mockImplementation((async (
      value: unknown,
    ) => {
      stored = value;
      return 1;
    }) as never);
    await saveInspection(record());

    const oldRecord = {
      id: 2,
      createdAt: '2026-09-01T00:00:00.000Z',
      grinderImage: new Blob(['old-plate']),
    };
    vi.spyOn(db.inspections, 'bulkGet').mockResolvedValue([
      { ...(stored as object), id: 1 } as never,
      oldRecord as never,
    ]);

    const [fresh, old] = (await listInspectionsByIds([1, 2])) as [
      StoredInspection,
      StoredInspection,
    ];
    expect(fresh.grinderImage).toBeInstanceOf(Blob);
    expect(fresh.grinderImage?.type).toBe('image/jpeg');
    expect(await fresh.grinderImage?.text()).toBe('plate');
    expect(await fresh.wheelImage?.text()).toBe('label');
    expect(await old.grinderImage?.text()).toBe('old-plate');
  });

  it('사진 용량 통계는 바이트로 저장된 새 기록과 Blob으로 저장된 예전 기록을 함께 센다', async () => {
    let stored: unknown;
    vi.spyOn(db.inspections, 'add').mockImplementation((async (
      value: unknown,
    ) => {
      stored = value;
      return 1;
    }) as never);
    await saveInspection(record());

    const rows = [stored, { grinderImage: new Blob(['1234']) }, {}];
    vi.spyOn(db.inspections, 'each').mockImplementation((async (
      callback: (row: unknown) => void,
    ) => {
      rows.forEach((row) => callback(row));
    }) as never);

    await expect(photoStorageStats()).resolves.toEqual({
      recordsWithPhotos: 2,
      totalPhotoBytes: 'plate'.length + 'label'.length + 4,
    });
  });
});
