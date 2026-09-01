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
