import { describe, expect, it } from 'vitest';

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackupFile,
  classifyImportRecords,
  classifyImportSavedGrinders,
  parseBackupFile,
  parseImportedRecord,
} from './backupModel';
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

describe('parseBackupFile — 최상위 구조', () => {
  it('정상 파일을 그대로 읽는다', () => {
    const file = buildBackupFile([record()], [saved()], new Date('2026-09-17'));
    const result = parseBackupFile(JSON.parse(JSON.stringify(file)));
    expect(result).toEqual({ file });
  });

  it('객체가 아니면 형식 오류다', () => {
    expect(parseBackupFile('not an object')).toEqual({ error: 'bad_shape' });
    expect(parseBackupFile(null)).toEqual({ error: 'bad_shape' });
    expect(parseBackupFile([1, 2, 3])).toEqual({ error: 'bad_shape' });
  });

  it('format이 이 앱의 것이 아니면 거부한다', () => {
    expect(
      parseBackupFile({
        format: 'some-other-app-backup',
        version: 1,
        exportedAt: 'x',
        records: [],
        savedGrinders: [],
      }),
    ).toEqual({ error: 'bad_format' });
  });

  it('버전이 이 앱이 아는 버전이 아니면(미래 버전 포함) 거부한다', () => {
    expect(
      parseBackupFile({
        format: BACKUP_FORMAT,
        version: 999,
        exportedAt: 'x',
        records: [],
        savedGrinders: [],
      }),
    ).toEqual({ error: 'unsupported_version' });
    expect(
      parseBackupFile({
        format: BACKUP_FORMAT,
        version: 0,
        exportedAt: 'x',
        records: [],
        savedGrinders: [],
      }),
    ).toEqual({ error: 'unsupported_version' });
  });

  it('records·savedGrinders가 배열이 아니면 거부한다', () => {
    expect(
      parseBackupFile({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: 'x',
        records: 'not-array',
        savedGrinders: [],
      }),
    ).toEqual({ error: 'bad_shape' });
  });
});

describe('parseImportedRecord — 손상된 기록 방어', () => {
  it('id·createdAt·grinder·wheel·result·checklist가 갖춰지면 받아들인다', () => {
    expect(parseImportedRecord(record())).toEqual(record());
  });

  it('id가 없거나 정수가 아니면 버린다', () => {
    expect(
      parseImportedRecord(record({ id: undefined as unknown as number })),
    ).toBeNull();
    expect(parseImportedRecord({ ...record(), id: 1.5 })).toBeNull();
  });

  it('핵심 판정 필드(result.verdict)가 알려진 값이 아니면 버린다', () => {
    expect(
      parseImportedRecord({
        ...record(),
        result: { ...record().result, verdict: 'MAYBE' },
      }),
    ).toBeNull();
  });

  it('객체가 아니거나 grinder·wheel·checklist가 없으면 버린다', () => {
    expect(parseImportedRecord('not an object')).toBeNull();
    expect(parseImportedRecord({ ...record(), grinder: undefined })).toBeNull();
    expect(
      parseImportedRecord({ ...record(), checklist: undefined }),
    ).toBeNull();
  });
});

describe('classifyImportRecords — 유효/무효/중복', () => {
  it('유효한 기록만 담고, 이미 있는 id는 중복으로 센다', () => {
    const result = classifyImportRecords(
      [record({ id: 1 }), record({ id: 2 }), { broken: true }],
      new Set([2]),
    );
    expect(result.valid.map((r) => r.id)).toEqual([1]);
    expect(result.duplicateIds).toEqual([2]);
    expect(result.invalidCount).toBe(1);
  });
});

describe('classifyImportSavedGrinders — 유효/무효/중복', () => {
  it('parseSavedGrinder로 손상 항목을 거르고, 기존 id는 중복 처리한다', () => {
    const result = classifyImportSavedGrinders(
      [saved({ id: 5 }), saved({ id: 6 }), { alias: '별칭만' }],
      new Set([6]),
    );
    expect(result.valid.map((item) => item.id)).toEqual([5]);
    expect(result.duplicateIds).toEqual([6]);
    expect(result.invalidCount).toBe(1);
  });
});
