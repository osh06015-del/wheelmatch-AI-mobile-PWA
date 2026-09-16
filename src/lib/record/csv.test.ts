import { describe, expect, it } from 'vitest';

import { CSV_COLUMNS, csvFilename, toCsv } from './csv';
import type {
  CaptureQualityMetrics,
  GrinderSpec,
  InspectionRecord,
  OcrTelemetry,
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

  it('숫돌 종류만 고쳐도 Y로 적는다', () => {
    // AI가 본 종류를 작업자가 바꾼 기록이다. N으로 남기면 그 차이가 데이터에서 사라진다.
    const csv = toCsv([
      record({
        wheelOcr: { ...WHEEL, wheelType: 'flap_disc' },
        wheel: { ...WHEEL, wheelType: 'bonded_abrasive' },
      }),
    ]);
    const [, row] = parse(csv);
    expect(row[CSV_COLUMNS.indexOf('wheelEdited')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('wheelType')]).toBe('bonded_abrasive');
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
    const trialRunColumns = [
      'trialRunWheelReplaced',
      'trialRunRequiredSeconds',
      'trialRunElapsedSeconds',
      'trialRunOutcome',
      'trialRunFindings',
    ];
    const environmentColumns = [
      'checkWorkpieceSecured',
      'checkSurroundingsClear',
    ];
    const captureColumns = (prefix: 'grinder' | 'wheel') => [
      `${prefix}CaptureOriginalWidth`,
      `${prefix}CaptureOriginalHeight`,
      `${prefix}CaptureOriginalBytes`,
      `${prefix}CaptureUploadWidth`,
      `${prefix}CaptureUploadHeight`,
      `${prefix}CaptureUploadBytes`,
      `${prefix}CaptureBrightness`,
      `${prefix}CaptureContrast`,
      `${prefix}CaptureDarkRatio`,
      `${prefix}CaptureBrightRatio`,
      `${prefix}CaptureBlur`,
      `${prefix}CaptureOptimizeMs`,
    ];
    const telemetryColumns = (prefix: 'grinder' | 'wheel') => [
      `${prefix}OcrEngine`,
      `${prefix}OcrModel`,
      `${prefix}OcrInputTokens`,
      `${prefix}OcrOutputTokens`,
      `${prefix}OcrCacheReadTokens`,
      `${prefix}OcrCacheCreationTokens`,
      `${prefix}OcrDurationMs`,
    ];
    const examColumns = [
      'wheelExamStatus',
      'wheelExamFindingCount',
      'wheelExamFindings',
      'wheelExamRetakeViews',
      'wheelExamAcknowledged',
      'wheelExamModel',
      'wheelExamPromptVersion',
      'wheelExamNotRunReason',
    ];
    const captureCheckColumns = [
      'captureCheckVersion',
      ...(['grinder', 'wheel', 'wheelBack', 'wheelEdge', 'wheelBore'] as const)
        .map((slot) => [
          `${slot}CaptureWarnings`,
          `${slot}CaptureUsedDespiteWarning`,
          `${slot}CaptureRetakeCount`,
        ])
        .flat(),
    ];
    expect([...CSV_COLUMNS]).toEqual([
      ...LEGACY_COLUMNS,
      ...wheelColumns,
      ...grinderColumns,
      ...trialRunColumns,
      ...environmentColumns,
      'ruleVersion',
      'preTrialElapsedMs',
      ...captureColumns('grinder'),
      ...captureColumns('wheel'),
      ...telemetryColumns('grinder'),
      ...telemetryColumns('wheel'),
      ...examColumns,
      ...captureCheckColumns,
      'workMaterial',
      'workCooling',
      'grinderSpindleThread',
      'grinderGuardType',
      'grinderGuardSize',
      'accessoryProfileType',
      'accessoryProfileVersion',
      'profileConflicts',
    ]);
  });

  it('작업 환경 체크도 Y/N/빈 칸으로 구분한다', () => {
    const [, row] = parse(
      toCsv([
        record({
          checklist: {
            guardCover: null,
            auxiliaryHandle: null,
            wheelDamage: null,
            ppe: true,
            workpieceSecured: false,
            surroundingsClear: null,
          },
        }),
      ]),
    );

    expect(row[CSV_COLUMNS.indexOf('checkPPE')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('checkWorkpieceSecured')]).toBe('N');
    expect(row[CSV_COLUMNS.indexOf('checkSurroundingsClear')]).toBe('');
    // 옛 열은 자리를 지키고 빈 칸으로 나간다.
    expect(row[CSV_COLUMNS.indexOf('checkGuardCover')]).toBe('');
  });

  it('시험운전 기록을 맨 뒤 열에 적는다', () => {
    const [, row] = parse(
      toCsv([
        record({
          trialRun: {
            wheelReplaced: true,
            requiredSeconds: 180,
            startedAt: '2026-09-12T09:00:00.000Z',
            finishedAt: '2026-09-12T09:03:10.000Z',
            elapsedSeconds: 190,
            outcome: 'abnormal',
            findings: ['noise', 'wobble'],
            completed: true,
          },
        }),
      ]),
    );

    expect(row[CSV_COLUMNS.indexOf('trialRunWheelReplaced')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('trialRunRequiredSeconds')]).toBe('180');
    expect(row[CSV_COLUMNS.indexOf('trialRunElapsedSeconds')]).toBe('190');
    expect(row[CSV_COLUMNS.indexOf('trialRunOutcome')]).toBe('abnormal');
    expect(row[CSV_COLUMNS.indexOf('trialRunFindings')]).toBe('noise wobble');
  });

  it('시험운전을 하지 않은 기록은 그 열이 빈 칸이다', () => {
    // 하지 않은 절차를 한 것처럼 남기지 않는다.
    const [, row] = parse(toCsv([record()]));
    for (const column of [
      'trialRunWheelReplaced',
      'trialRunRequiredSeconds',
      'trialRunOutcome',
      'trialRunFindings',
    ] as const) {
      expect(row[CSV_COLUMNS.indexOf(column)]).toBe('');
    }
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

describe('규칙 버전 열', () => {
  it('ruleVersion은 도입 당시 자리(45번째 열)를 지킨다', () => {
    // 뒤에 열이 붙어도 앞선 열의 위치는 바뀌지 않는다. 뽑아둔 분석 파일과 맞아야 한다.
    expect(CSV_COLUMNS.indexOf('ruleVersion')).toBe(44);
  });

  it('기록에 남은 버전을 그대로 적는다', () => {
    const [, row] = parse(toCsv([record({ ruleVersion: '2026.09.12-r1' })]));
    expect(row[CSV_COLUMNS.indexOf('ruleVersion')]).toBe('2026.09.12-r1');
  });

  it('기능 도입 전 기록은 빈 칸이다', () => {
    // 지금 버전으로 채우면 어느 규칙으로 나온 판정인지 거짓으로 적게 된다.
    const [, row] = parse(toCsv([record()]));
    expect(row[CSV_COLUMNS.indexOf('ruleVersion')]).toBe('');
  });
});

describe('사전점검 시간 열', () => {
  it('검증용 측정값 열보다 앞에 자리를 지킨다', () => {
    // 검증용 원시 측정값(촬영·OCR)이 이 열 뒤에 추가되면서 더는 맨 마지막이
    // 아니다. 자리 자체(45번째 뒤)가 밀리지 않았는지만 본다.
    expect(CSV_COLUMNS.indexOf('preTrialElapsedMs')).toBe(45);
    expect(CSV_COLUMNS.indexOf('elapsedMs')).toBe(2);
  });

  it('사전점검 시간과 전체 흐름 시간을 따로 적는다', () => {
    const [, row] = parse(
      toCsv([record({ elapsedMs: 250_000, preTrialElapsedMs: 22_000 })]),
    );
    expect(row[CSV_COLUMNS.indexOf('elapsedMs')]).toBe('250000');
    expect(row[CSV_COLUMNS.indexOf('preTrialElapsedMs')]).toBe('22000');
  });

  it('기능 도입 전 기록은 빈 칸이다 — 전체 시간으로 채우지 않는다', () => {
    // 옛 기록의 elapsedMs에는 시험운전이 섞였을 수 있다. 사전점검 시간으로 옮기지 않는다.
    const [, row] = parse(toCsv([record({ elapsedMs: 250_000 })]));
    expect(row[CSV_COLUMNS.indexOf('preTrialElapsedMs')]).toBe('');
  });
});

describe('검증용 원시 측정값 열', () => {
  const CAPTURE_METRICS: CaptureQualityMetrics = {
    originalWidth: 4032,
    originalHeight: 3024,
    originalBytes: 7_580_000,
    uploadWidth: 2048,
    uploadHeight: 1536,
    uploadBytes: 1_830_000,
    meanBrightness: 132.5,
    contrast: 48.1,
    darkPixelRatio: 0.02,
    brightPixelRatio: 0.01,
    blurMetric: 913.4,
    optimizeMs: 210,
  };

  const OCR_TELEMETRY: OcrTelemetry = {
    engine: 'claude',
    model: 'claude-sonnet-5',
    inputTokens: 1500,
    outputTokens: 80,
    cacheReadTokens: 0,
    cacheCreationTokens: 1500,
    durationMs: 2100,
  };

  it('preTrialElapsedMs 뒤 자리를 지킨다 — 뒤에 다각도 확인 열이 더 붙었다', () => {
    expect(CSV_COLUMNS[45]).toBe('preTrialElapsedMs');
    expect(CSV_COLUMNS[46]).toBe('grinderCaptureOriginalWidth');
    // 검증용 측정값 열 마지막. 그 뒤부터가 다각도 확인 열이다.
    expect(CSV_COLUMNS.indexOf('wheelOcrDurationMs')).toBe(83);
  });

  it('이 기능 도입 전 기록은 모두 빈 칸이다', () => {
    const [, row] = parse(toCsv([record()]));
    for (const column of CSV_COLUMNS.slice(46)) {
      expect(row[CSV_COLUMNS.indexOf(column)]).toBe('');
    }
  });

  it('그라인더·숫돌 측정값을 각자의 열에 적는다', () => {
    const [, row] = parse(
      toCsv([
        record({
          grinderCaptureMetrics: CAPTURE_METRICS,
          wheelCaptureMetrics: { ...CAPTURE_METRICS, originalWidth: 3000 },
        }),
      ]),
    );
    expect(row[CSV_COLUMNS.indexOf('grinderCaptureOriginalWidth')]).toBe(
      '4032',
    );
    expect(row[CSV_COLUMNS.indexOf('wheelCaptureOriginalWidth')]).toBe('3000');
    expect(row[CSV_COLUMNS.indexOf('grinderCaptureBlur')]).toBe('913.4');
    expect(row[CSV_COLUMNS.indexOf('grinderCaptureOptimizeMs')]).toBe('210');
  });

  it('OCR 응답 메타데이터를 각자의 열에 적는다', () => {
    const [, row] = parse(
      toCsv([
        record({
          grinderOcrTelemetry: OCR_TELEMETRY,
          wheelOcrTelemetry: { ...OCR_TELEMETRY, engine: 'tesseract' },
        }),
      ]),
    );
    expect(row[CSV_COLUMNS.indexOf('grinderOcrEngine')]).toBe('claude');
    expect(row[CSV_COLUMNS.indexOf('grinderOcrModel')]).toBe('claude-sonnet-5');
    expect(row[CSV_COLUMNS.indexOf('grinderOcrInputTokens')]).toBe('1500');
    expect(row[CSV_COLUMNS.indexOf('wheelOcrEngine')]).toBe('tesseract');
  });

  it('측정에 실패한 항목(null)은 값 0과 구분해 빈 칸으로 둔다', () => {
    const [, row] = parse(
      toCsv([
        record({
          grinderCaptureMetrics: {
            ...CAPTURE_METRICS,
            meanBrightness: null,
            blurMetric: null,
          },
        }),
      ]),
    );
    expect(row[CSV_COLUMNS.indexOf('grinderCaptureBrightness')]).toBe('');
    expect(row[CSV_COLUMNS.indexOf('grinderCaptureBlur')]).toBe('');
    // 0은 실측값이다 — 빈 칸으로 뭉개지지 않는다.
    expect(row[CSV_COLUMNS.indexOf('grinderCaptureDarkRatio')]).toBe('0.02');
  });

  it('기존 열에는 영향을 주지 않는다', () => {
    // 검증용 열 추가가 판정·인식 관련 기존 열을 건드리면 안 된다.
    const [, row] = parse(
      toCsv([
        record({
          grinderCaptureMetrics: CAPTURE_METRICS,
          grinderOcrTelemetry: OCR_TELEMETRY,
        }),
      ]),
    );
    expect(row[CSV_COLUMNS.indexOf('verdict')]).toBe('COMPATIBLE');
    expect(row[CSV_COLUMNS.indexOf('grinderRPM')]).toBe('11000');
  });
});

describe('다각도 외관 확인 열', () => {
  const EXAM: InspectionRecord['wheelExam'] = {
    status: 'suspected',
    findings: [
      {
        kind: 'edge_break',
        view: 'edge',
        reason: '가장자리 2시 방향 파손, 쉼표가 든 문장',
        confidence: 'high',
      },
      {
        kind: 'chip',
        view: 'back',
        reason: '뒷면 조각 떨어짐',
        confidence: 'medium',
      },
    ],
    photoQuality: [
      { view: 'front', issues: [], readable: true },
      { view: 'back', issues: [], readable: true },
      { view: 'edge', issues: [], readable: true },
      { view: 'bore', issues: ['blur'], readable: false },
    ],
    model: 'claude-sonnet-5',
    promptVersion: '2026.09.16-r1',
    analyzedAt: '2026-09-16T03:00:00.000Z',
  };

  it('맨 마지막 열에 붙인다 — 앞선 열의 자리를 밀지 않는다', () => {
    // 뒤에 사진 상태 확인 열이 더 붙었지만 다각도 확인 열의 자리는 그대로다.
    expect(CSV_COLUMNS.indexOf('wheelExamNotRunReason')).toBe(91);
    expect(CSV_COLUMNS.indexOf('wheelExamStatus')).toBe(84);
  });

  it('이 기능 도입 전 기록은 모두 빈 칸이다', () => {
    const [, row] = parse(toCsv([record()]));
    for (const column of CSV_COLUMNS.slice(84)) {
      expect(row[CSV_COLUMNS.indexOf(column)]).toBe('');
    }
  });

  it('상태·건수·종류:부위·재촬영·모델·지시문 버전을 적는다', () => {
    const [, row] = parse(
      toCsv([record({ wheelExam: EXAM, wheelExamAcknowledged: true })]),
    );

    expect(row[CSV_COLUMNS.indexOf('wheelExamStatus')]).toBe('suspected');
    expect(row[CSV_COLUMNS.indexOf('wheelExamFindingCount')]).toBe('2');
    // 자유 문장(reason)은 넣지 않는다 — 쉼표·줄바꿈이 섞여 열이 밀린다.
    expect(row[CSV_COLUMNS.indexOf('wheelExamFindings')]).toBe(
      'edge_break:edge chip:back',
    );
    expect(row[CSV_COLUMNS.indexOf('wheelExamRetakeViews')]).toBe('bore');
    expect(row[CSV_COLUMNS.indexOf('wheelExamAcknowledged')]).toBe('Y');
    expect(row[CSV_COLUMNS.indexOf('wheelExamModel')]).toBe('claude-sonnet-5');
    expect(row[CSV_COLUMNS.indexOf('wheelExamPromptVersion')]).toBe(
      '2026.09.16-r1',
    );
  });

  it('찾지 못한 결과도 "없음"이 아니라 not_observed로 적는다', () => {
    // 열 값이 "없음"이나 빈 칸이면 나중에 손상 없음으로 읽힌다.
    const [, row] = parse(
      toCsv([
        record({
          wheelExam: { ...EXAM, status: 'not_observed', findings: [] },
          wheelExamAcknowledged: false,
        }),
      ]),
    );

    expect(row[CSV_COLUMNS.indexOf('wheelExamStatus')]).toBe('not_observed');
    expect(row[CSV_COLUMNS.indexOf('wheelExamFindingCount')]).toBe('0');
    expect(row[CSV_COLUMNS.indexOf('wheelExamAcknowledged')]).toBe('N');
  });

  it('실행되지 않은 경우는 status가 아니라 사유 열에만 적는다', () => {
    // 실패를 status 칸에 적으면 사진을 본 결과와 구분되지 않는다.
    const [, row] = parse(
      toCsv([
        record({
          wheelExamNotRun: {
            reason: 'network_error',
            acknowledgedAt: '2026-09-16T03:00:00.000Z',
          },
        }),
      ]),
    );

    expect(row[CSV_COLUMNS.indexOf('wheelExamNotRunReason')]).toBe(
      'network_error',
    );
    expect(row[CSV_COLUMNS.indexOf('wheelExamStatus')]).toBe('');
    expect(row[CSV_COLUMNS.indexOf('wheelExamFindingCount')]).toBe('');
  });

  it('확인이 돌아간 기록의 사유 열은 빈 칸이다', () => {
    const [, row] = parse(toCsv([record({ wheelExam: EXAM })]));
    expect(row[CSV_COLUMNS.indexOf('wheelExamNotRunReason')]).toBe('');
  });
  it('촬영 자리별 경고·그래도 사용·재촬영 횟수를 맨 뒤 열에 적는다', () => {
    const [, row] = parse(
      toCsv([
        record({
          captureChecks: {
            grinder: {
              checkVersion: 'v1',
              warnings: [],
              usedDespiteWarning: false,
              retakeCount: 0,
            },
            wheelEdge: {
              checkVersion: 'v1',
              warnings: ['blur', 'overexposed'],
              usedDespiteWarning: true,
              retakeCount: 2,
            },
          },
        }),
      ]),
    );
    const at = (column: (typeof CSV_COLUMNS)[number]) =>
      row[CSV_COLUMNS.indexOf(column)];

    expect(at('captureCheckVersion')).toBe('v1');
    // 경고가 없던 자리: 경고 칸은 비고, 나머지는 N·0으로 남는다.
    expect(at('grinderCaptureWarnings')).toBe('');
    expect(at('grinderCaptureUsedDespiteWarning')).toBe('N');
    expect(at('grinderCaptureRetakeCount')).toBe('0');
    expect(at('wheelEdgeCaptureWarnings')).toBe('blur overexposed');
    expect(at('wheelEdgeCaptureUsedDespiteWarning')).toBe('Y');
    expect(at('wheelEdgeCaptureRetakeCount')).toBe('2');
    // 찍지 않은 자리는 세 칸 모두 빈 칸이다.
    expect(at('wheelCaptureUsedDespiteWarning')).toBe('');
    expect(at('wheelCaptureRetakeCount')).toBe('');
  });

  it('사진 상태 확인 기능 도입 전 기록은 새 열이 모두 빈 칸이다', () => {
    const [, row] = parse(toCsv([record()]));
    const start = CSV_COLUMNS.indexOf('captureCheckVersion');
    expect(start).toBe(92);
    for (const column of CSV_COLUMNS.slice(start)) {
      expect(row[CSV_COLUMNS.indexOf(column)]).toBe('');
    }
  });
  it('작업 조건·축·덮개·Profile·어긋남을 맨 뒤 열에 적는다', () => {
    const [, row] = parse(
      toCsv([
        record({
          grinder: {
            ...record().grinder,
            spindleThread: 'M14',
            guardType: 'none',
            guardSize: 125,
          },
          workConditions: { material: 'steel', cooling: 'unknown' },
          accessoryProfile: { type: 'bonded_abrasive', version: 'p1' },
          profileConditions: [
            {
              key: 'material',
              status: 'manual_check',
              code: 'material.unverified',
            },
            { key: 'guard', status: 'conflict', code: 'guard.missing' },
            { key: 'cooling', status: 'unknown', code: 'cooling.unknown' },
          ],
        }),
      ]),
    );
    const at = (column: (typeof CSV_COLUMNS)[number]) =>
      row[CSV_COLUMNS.indexOf(column)];

    expect(at('workMaterial')).toBe('steel');
    // 물었지만 모른 값은 빈 칸이 아니라 unknown이다.
    expect(at('workCooling')).toBe('unknown');
    expect(at('grinderSpindleThread')).toBe('M14');
    expect(at('grinderGuardType')).toBe('none');
    expect(at('grinderGuardSize')).toBe('125');
    expect(at('accessoryProfileType')).toBe('bonded_abrasive');
    expect(at('accessoryProfileVersion')).toBe('p1');
    // 어긋남만 적는다.
    expect(at('profileConflicts')).toBe('guard.missing');
  });

  it('Profile 도입 전 기록은 새 열이 모두 빈 칸이다', () => {
    const [, row] = parse(toCsv([record()]));
    const start = CSV_COLUMNS.indexOf('workMaterial');
    expect(start).toBe(108);
    expect(CSV_COLUMNS.slice(start)).toHaveLength(8);
    for (const column of CSV_COLUMNS.slice(start)) {
      expect(row[CSV_COLUMNS.indexOf(column)]).toBe('');
    }
  });
});
