import { describe, expect, it } from 'vitest';

import { CSV_COLUMNS, csvFilename, toCsv } from './csv';
import type {
  GrinderSpec,
  InspectionRecord,
  WheelSpec,
} from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

const LEGACY_COLUMNS = [
  'id',
  'createdAt',
  'elapsedMs',
  'declaredPurpose',
  'verdict',
  'failedRules',
  'grinderModel',
  'grinderRPM',
  'grinderMaxDiameter',
  'grinderConfidence',
  'grinderRPM_ocr',
  'grinderMaxDiameter_ocr',
  'grinderEdited',
  'wheelMaxRPM',
  'wheelDiameter',
  'wheelThickness',
  'wheelPurpose',
  'wheelType',
  'visibleDamage',
  'wheelConfidence',
  'wheelMaxRPM_ocr',
  'wheelDiameter_ocr',
  'wheelEdited',
  'checkGuardCover',
  'checkAuxiliaryHandle',
  'checkWheelDamage',
  'checkPPE',
] as const;

function record(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: 1,
    grinder: GRINDER,
    wheel: WHEEL,
    result: {
      verdict: 'COMPATIBLE',
      checks: [
        {
          rule: 'RPM 안전',
          passed: true,
          reason: '통과',
          grinderValue: null,
          wheelValue: null,
        },
      ],
      timestamp: '2026-09-01T00:00:00.000Z',
    },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    declaredPurpose: 'cutting',
    elapsedMs: 28_400,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function parse(csv: string): string[][] {
  return csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split('\r\n')
    .map((line) => line.split(','));
}

describe('toCsv', () => {
  it('첫 줄은 열 이름이다', () => {
    const [header] = parse(toCsv([]));
    expect(header).toEqual([...CSV_COLUMNS]);
  });

  it('기존 27열의 이름과 순서를 유지하고 상태 확인 열은 뒤에만 붙인다', () => {
    expect(CSV_COLUMNS.slice(0, LEGACY_COLUMNS.length)).toEqual(LEGACY_COLUMNS);
  });

  it('모든 줄의 칸 수가 열 이름 수와 같다', () => {
    // 열이 밀리면 분석 단계에서 조용히 엉뚱한 값을 읽게 된다.
    const rows = parse(toCsv([record(), record({ id: 2 })]));
    for (const row of rows) {
      expect(row).toHaveLength(CSV_COLUMNS.length);
    }
  });

  it('쉼표가 든 값은 따옴표로 감싼다', () => {
    const csv = toCsv([
      record({ grinder: { ...GRINDER, model: 'GWS 750, 125' } }),
    ]);
    expect(csv).toContain('"GWS 750, 125"');
  });

  it('값에 든 따옴표는 두 번 겹쳐 쓴다', () => {
    const csv = toCsv([
      record({ grinder: { ...GRINDER, model: '5" 그라인더' } }),
    ]);
    expect(csv).toContain('"5"" 그라인더"');
  });

  it('읽지 못한 값은 빈 칸으로 둔다 — 0으로 채우지 않는다', () => {
    const csv = toCsv([
      record({ grinder: { ...GRINDER, noLoadRPM: null, model: null } }),
    ]);
    const [, row] = parse(csv);
    expect(row[CSV_COLUMNS.indexOf('grinderRPM')]).toBe('');
    expect(row[CSV_COLUMNS.indexOf('grinderModel')]).toBe('');
  });

  it('사용자가 값을 고쳤으면 Y로 적는다', () => {
    const csv = toCsv([
      record({
        wheelOcr: { ...WHEEL, maxRPM: 1220 },
        wheel: { ...WHEEL, maxRPM: 12200 },
      }),
    ]);
    const [, row] = parse(csv);
    expect(row[CSV_COLUMNS.indexOf('wheelEdited')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('wheelMaxRPM_ocr')]).toBe('1220');
  });

  it('고치지 않았으면 N', () => {
    const csv = toCsv([record({ wheelOcr: WHEEL })]);
    const [, row] = parse(csv);
    expect(row[CSV_COLUMNS.indexOf('wheelEdited')]).toBe('N');
  });

  it('OCR 원본이 없는 기록은 정정 여부를 비워 둔다', () => {
    // 'N'으로 적으면 정정률이 실제보다 낮게 나온다.
    const [, row] = parse(toCsv([record()]));
    expect(row[CSV_COLUMNS.indexOf('wheelEdited')]).toBe('');
    expect(row[CSV_COLUMNS.indexOf('grinderEdited')]).toBe('');
  });

  it('부적합 기록은 걸린 규칙 이름을 남긴다', () => {
    const csv = toCsv([
      record({
        result: {
          verdict: 'INCOMPATIBLE',
          checks: [
            {
              rule: 'RPM 안전',
              passed: false,
              reason: '숫돌이 느림',
              grinderValue: null,
              wheelValue: null,
            },
          ],
          timestamp: '2026-09-01T00:00:00.000Z',
        },
      }),
    ]);
    const [, row] = parse(csv);
    expect(row[CSV_COLUMNS.indexOf('verdict')]).toBe('INCOMPATIBLE');
    expect(row[CSV_COLUMNS.indexOf('failedRules')]).toBe('RPM 안전');
  });

  it('체크리스트는 미확인과 아니오를 구분한다', () => {
    const csv = toCsv([
      record({
        checklist: {
          guardCover: true,
          auxiliaryHandle: false,
          wheelDamage: null,
          ppe: true,
        },
      }),
    ]);
    const [, row] = parse(csv);
    expect(row[CSV_COLUMNS.indexOf('checkGuardCover')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('checkAuxiliaryHandle')]).toBe('N');
    expect(row[CSV_COLUMNS.indexOf('checkWheelDamage')]).toBe('');
  });

  it('숫돌 상태 직접 확인을 별도 열에 기록한다', () => {
    const csv = toCsv([
      record({
        wheelCondition: {
          damageFree: true,
          notDeformed: true,
          mountingAreaUndamaged: false,
          labelLegible: true,
          expiryValid: null,
        },
      }),
    ]);
    const [, row] = parse(csv);

    expect(row[CSV_COLUMNS.indexOf('conditionDamageFree')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('conditionNotDeformed')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('conditionMountingAreaUndamaged')]).toBe(
      'N',
    );
    expect(row[CSV_COLUMNS.indexOf('conditionLabelLegible')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('conditionExpiryValid')]).toBe('');
  });

  it('Gate 도입 전 기록의 새 열은 빈 칸으로 둔다', () => {
    const [, row] = parse(toCsv([record()]));
    for (const column of CSV_COLUMNS.slice(LEGACY_COLUMNS.length)) {
      expect(row[CSV_COLUMNS.indexOf(column)]).toBe('');
    }
  });

  it('숫돌 상태 열 뒤에 그라인더 장비 상태 열이 붙는다', () => {
    // 순서가 바뀌면 이미 뽑아둔 분석 파일과 열이 어긋난다.
    const wheelColumns = [
      'conditionDamageFree',
      'conditionNotDeformed',
      'conditionMountingAreaUndamaged',
      'conditionLabelLegible',
      'conditionExpiryValid',
    ];
    const grinderColumns = [
      'conditionCordAndPlugUndamaged',
      'conditionBodyUndamaged',
      'conditionGuardSecure',
      'conditionAuxiliaryHandleSecure',
      'conditionSpindleAssemblyUndamaged',
    ];
    expect([...CSV_COLUMNS]).toEqual([
      ...LEGACY_COLUMNS,
      ...wheelColumns,
      ...grinderColumns,
    ]);
  });

  it('그라인더 장비 상태를 Y/N/빈 칸으로 구분해 적는다', () => {
    const csv = toCsv([
      record({
        grinderCondition: {
          cordAndPlugUndamaged: true,
          bodyUndamaged: false,
          guardSecure: true,
          auxiliaryHandleSecure: true,
          spindleAssemblyUndamaged: null,
        },
      }),
    ]);
    const [, row] = parse(csv);

    expect(row[CSV_COLUMNS.indexOf('conditionCordAndPlugUndamaged')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('conditionBodyUndamaged')]).toBe('N');
    expect(row[CSV_COLUMNS.indexOf('conditionGuardSecure')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('conditionAuxiliaryHandleSecure')]).toBe(
      'Y',
    );
    expect(row[CSV_COLUMNS.indexOf('conditionSpindleAssemblyUndamaged')]).toBe(
      '',
    );
  });

  it('두 Gate 기록이 서로의 열을 덮지 않는다', () => {
    const [, row] = parse(
      toCsv([
        record({
          wheelCondition: {
            damageFree: true,
            notDeformed: true,
            mountingAreaUndamaged: true,
            labelLegible: true,
            expiryValid: true,
          },
        }),
      ]),
    );

    expect(row[CSV_COLUMNS.indexOf('conditionDamageFree')]).toBe('Y');
    // 그라인더 Gate를 거치지 않은 기록이면 그쪽은 비어 있어야 한다.
    expect(row[CSV_COLUMNS.indexOf('conditionCordAndPlugUndamaged')]).toBe('');
  });

  it('Excel이 한글을 깨뜨리지 않게 BOM을 붙인다', () => {
    expect(toCsv([])).toMatch(/^\uFEFF/);
  });
});

describe('csvFilename', () => {
  it('시각을 붙여 덮어쓰이지 않게 한다', () => {
    expect(csvFilename(new Date(2026, 8, 1, 9, 5))).toBe(
      'wheelmatch-20260901-0905.csv',
    );
  });
});
