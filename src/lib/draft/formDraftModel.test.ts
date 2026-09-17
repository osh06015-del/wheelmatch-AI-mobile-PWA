// 확인 화면 입력 draft 복구 테스트.
//
// 핵심: 형태가 어긋난 값은 추정해 채우지 않고 기본값으로 되돌리는지, 사진이
// 없거나 Blob이 아니면 버리는지, 구버전(스키마 불일치)에서도 가능한 값은 살리는지.

import { describe, expect, it } from 'vitest';

import {
  EMPTY_GRINDER_FORM_FIELDS,
  EMPTY_WHEEL_EXAM_DRAFT,
  EMPTY_WHEEL_FORM_FIELDS,
  FORM_DRAFT_SCHEMA_VERSION,
  recoverGrinderFormDraft,
  recoverWheelExamDraft,
  recoverWheelFormDraft,
} from './formDraftModel';
import type {
  CaptureQualityMetrics,
  GrinderSpec,
  WheelExamResult,
  WheelSpec,
} from '@/lib/rules/types';

/** 다각도 확인을 요구하는 종류(일반 결합숫돌) */
const EXAM_REQUIRED_TYPE = 'bonded_abrasive';
/** 요구하지 않는 종류 */
const EXAM_NOT_REQUIRED_TYPE = 'flap_disc';

const METRICS: CaptureQualityMetrics = {
  originalWidth: 4032,
  originalHeight: 3024,
  originalBytes: 7_500_000,
  uploadWidth: 2048,
  uploadHeight: 1536,
  uploadBytes: 1_800_000,
  meanBrightness: 130,
  contrast: 40,
  darkPixelRatio: 0.05,
  brightPixelRatio: 0.05,
  blurMetric: 400,
  optimizeMs: 120,
};

const EXAM_RESULT: WheelExamResult = {
  status: 'not_observed',
  findings: [],
  photoQuality: [],
  model: 'claude-x',
  promptVersion: 'v1',
  analyzedAt: '2026-09-17T00:00:00.000Z',
};

const GRINDER_OCR: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL_OCR: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'flap_disc',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

describe('recoverGrinderFormDraft', () => {
  it('형태가 온전한 draft는 그대로 살린다', () => {
    const recovered = recoverGrinderFormDraft({
      slot: 'grinder',
      schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: {
        model: 'GWS 750-125',
        noLoadRPM: '11000',
        maxWheelDiameter: '125',
        spindleThread: 'M14',
        guardType: 'grinding',
        guardSize: '125',
      },
      photo: new Blob(['plate']),
      ocr: GRINDER_OCR,
      analysisSource: 'server',
    });

    expect(recovered).not.toBeNull();
    expect(recovered?.fields).toEqual({
      model: 'GWS 750-125',
      noLoadRPM: '11000',
      maxWheelDiameter: '125',
      spindleThread: 'M14',
      guardType: 'grinding',
      guardSize: '125',
    });
    expect(recovered?.photo).toBeInstanceOf(Blob);
    expect(recovered?.ocr).toEqual(GRINDER_OCR);
    expect(recovered?.analysisSource).toBe('server');
  });

  it('그릇 형태 자체를 읽지 못하면 null이다', () => {
    expect(recoverGrinderFormDraft(null)).toBeNull();
    expect(recoverGrinderFormDraft('garbage')).toBeNull();
    expect(recoverGrinderFormDraft({})).toBeNull();
  });

  it('필드 하나가 어긋나도 나머지는 살리고 어긋난 것만 기본값으로 둔다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: {
        model: 42, // 숫자 — 문자열이 아니다
        noLoadRPM: '11000',
        maxWheelDiameter: '125',
        spindleThread: 'M20', // 목록에 없는 값
        guardType: 'grinding',
        guardSize: '125',
      },
      photo: null,
      ocr: null,
      analysisSource: 'manual',
    });

    expect(recovered).toEqual({
      fields: {
        ...EMPTY_GRINDER_FORM_FIELDS,
        noLoadRPM: '11000',
        maxWheelDiameter: '125',
        guardType: 'grinding',
        guardSize: '125',
      },
      photo: null,
      ocr: null,
      analysisSource: 'manual',
    });
  });

  it('사진이 Blob이 아니면 버린다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: 'data:image/png;base64,xxx',
      ocr: null,
      analysisSource: 'server',
    });
    expect(recovered?.photo).toBeNull();
  });

  it('OCR 원본의 형태가 어긋나면 버린다 — 지어내지 않는다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: null,
      ocr: { noLoadRPM: 'not a number' },
      analysisSource: 'server',
    });
    expect(recovered?.ocr).toBeNull();
  });

  it('구버전(스키마 불일치)이어도 값이 온전하면 그대로 살린다', () => {
    const recovered = recoverGrinderFormDraft({
      slot: 'grinder',
      schemaVersion: 0,
      fields: {
        model: 'old',
        noLoadRPM: '9000',
        maxWheelDiameter: '100',
        spindleThread: 'unknown',
        guardType: 'unknown',
        guardSize: '',
      },
      photo: null,
      ocr: null,
      analysisSource: 'server',
    });
    expect(recovered?.fields.model).toBe('old');
  });

  it('analysisSource가 없는 구버전 draft — offline:true는 직접 입력(manual)으로 옮긴다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: null,
      ocr: null,
      offline: true,
    });
    expect(recovered?.analysisSource).toBe('manual');
  });

  it('analysisSource가 없는 구버전 draft — offline:false는 온라인으로 승격하지 않고 local_ocr로 둔다', () => {
    // 이 시절 코드는 로컬 OCR과 서버 실패를 offline 하나에 합쳐 썼던 적이 있어
    // offline:false가 실제로 온라인이었다고 확정할 수 없다. 보수적으로 제한
    // 판정(local_ocr)으로 남긴다 — server로 승격하지 않는다.
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: null,
      ocr: null,
      offline: false,
    });
    expect(recovered?.analysisSource).toBe('local_ocr');
  });

  it('offline 필드조차 없는 구버전 draft도 online으로 승격하지 않는다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: null,
      ocr: null,
    });
    expect(recovered?.analysisSource).toBe('local_ocr');
  });
});

describe('recoverWheelFormDraft', () => {
  it('형태가 온전한 draft는 그대로 살린다', () => {
    const recovered = recoverWheelFormDraft({
      slot: 'wheel',
      schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: {
        maxRPM: '12200',
        diameter: '125',
        thickness: '1.6',
        purpose: 'cutting',
        expiry: '04/2027',
        wheelType: 'flap_disc',
        accessoryName: '',
      },
      photo: new Blob(['label']),
      ocr: WHEEL_OCR,
      analysisSource: 'server',
    });

    expect(recovered?.fields).toEqual({
      maxRPM: '12200',
      diameter: '125',
      thickness: '1.6',
      purpose: 'cutting',
      expiry: '04/2027',
      wheelType: 'flap_disc',
      accessoryName: '',
    });
    expect(recovered?.ocr).toEqual(WHEEL_OCR);
  });

  it('그릇 형태 자체를 읽지 못하면 null이다', () => {
    expect(recoverWheelFormDraft(undefined)).toBeNull();
    expect(recoverWheelFormDraft({ fields: 'not an object' })).toBeNull();
  });

  it('필드가 문자열이 아니면 기본값으로 되돌린다', () => {
    const recovered = recoverWheelFormDraft({
      fields: {
        maxRPM: 12200, // 숫자 — 문자열이 아니다
        diameter: '125',
        thickness: null,
        purpose: 'cutting',
        expiry: '04/2027',
        wheelType: 'flap_disc',
        accessoryName: '',
      },
      photo: null,
      ocr: null,
      analysisSource: 'server',
    });

    expect(recovered?.fields).toEqual({
      ...EMPTY_WHEEL_FORM_FIELDS,
      diameter: '125',
      purpose: 'cutting',
      expiry: '04/2027',
      wheelType: 'flap_disc',
      accessoryName: '',
    });
  });

  it('종류가 다각도 확인을 요구하면 사진·품질·AI 결과가 모두 있어야 함께 살린다', () => {
    const recovered = recoverWheelFormDraft({
      fields: { ...EMPTY_WHEEL_FORM_FIELDS, wheelType: EXAM_REQUIRED_TYPE },
      photo: null,
      ocr: null,
      analysisSource: 'server',
      exam: {
        photos: {
          back: new Blob(['back']),
          edge: new Blob(['edge']),
          bore: new Blob(['bore']),
        },
        metrics: { back: METRICS, edge: METRICS, bore: METRICS },
        exam: EXAM_RESULT,
        notRunReason: null,
      },
    });

    expect(recovered?.exam.photos.back).toBeInstanceOf(Blob);
    expect(recovered?.exam.photos.edge).toBeInstanceOf(Blob);
    expect(recovered?.exam.photos.bore).toBeInstanceOf(Blob);
    expect(recovered?.exam.metrics).toEqual({
      back: METRICS,
      edge: METRICS,
      bore: METRICS,
    });
    expect(recovered?.exam.exam).toEqual(EXAM_RESULT);
  });

  it('analysisSource가 없는 구버전 draft — offline:true는 직접 입력(manual)으로 옮긴다', () => {
    const recovered = recoverWheelFormDraft({
      fields: EMPTY_WHEEL_FORM_FIELDS,
      photo: null,
      ocr: null,
      offline: true,
    });
    expect(recovered?.analysisSource).toBe('manual');
  });

  it('analysisSource가 없는 구버전 draft — offline:false는 온라인으로 승격하지 않고 local_ocr로 둔다', () => {
    const recovered = recoverWheelFormDraft({
      fields: EMPTY_WHEEL_FORM_FIELDS,
      photo: null,
      ocr: null,
      offline: false,
    });
    expect(recovered?.analysisSource).toBe('local_ocr');
  });
});

describe('recoverWheelExamDraft', () => {
  it('사진 세 장과 품질·AI 결과가 온전하면 그대로 살린다', () => {
    const recovered = recoverWheelExamDraft(
      {
        photos: {
          back: new Blob(['back']),
          edge: new Blob(['edge']),
          bore: new Blob(['bore']),
        },
        metrics: { back: METRICS, edge: METRICS, bore: METRICS },
        exam: EXAM_RESULT,
        notRunReason: null,
      },
      EXAM_REQUIRED_TYPE,
    );

    expect(recovered.photos.back).toBeInstanceOf(Blob);
    expect(recovered.exam).toEqual(EXAM_RESULT);
    expect(recovered.metrics.back).toEqual(METRICS);
  });

  it('지금 종류가 다각도 확인을 요구하지 않으면 저장된 값이 있어도 비운다', () => {
    const recovered = recoverWheelExamDraft(
      {
        photos: {
          back: new Blob(['back']),
          edge: new Blob(['edge']),
          bore: new Blob(['bore']),
        },
        metrics: { back: METRICS, edge: METRICS, bore: METRICS },
        exam: EXAM_RESULT,
        notRunReason: null,
      },
      EXAM_NOT_REQUIRED_TYPE,
    );

    expect(recovered).toEqual(EMPTY_WHEEL_EXAM_DRAFT);
  });

  it('사진 하나라도 없으면(누락) AI 분석 결과를 폐기하고 재촬영을 요구한다', () => {
    const recovered = recoverWheelExamDraft(
      {
        photos: {
          back: new Blob(['back']),
          edge: new Blob(['edge']),
          bore: null, // 이 자리만 없다
        },
        metrics: { back: METRICS, edge: METRICS, bore: METRICS },
        exam: EXAM_RESULT,
        notRunReason: null,
      },
      EXAM_REQUIRED_TYPE,
    );

    expect(recovered.photos.bore).toBeNull();
    // 사진이 갖춰지지 않았으므로 그 사진들을 보고 낸 결과라고 믿을 수 없다.
    expect(recovered.exam).toBeNull();
  });

  it('사진 자리에 Blob이 아닌 손상된 값이 들어 있으면 버리고 재촬영을 요구한다', () => {
    const recovered = recoverWheelExamDraft(
      {
        photos: {
          back: new Blob(['back']),
          edge: 'data:image/png;base64,broken', // Blob이 아니다 — 손상된 값
          bore: new Blob(['bore']),
        },
        metrics: { back: METRICS, edge: METRICS, bore: METRICS },
        exam: EXAM_RESULT,
        notRunReason: null,
      },
      EXAM_REQUIRED_TYPE,
    );

    expect(recovered.photos.edge).toBeNull();
    expect(recovered.exam).toBeNull();
  });

  it('그릇 형태 자체를 읽지 못하면 빈 상태를 돌려준다', () => {
    expect(recoverWheelExamDraft(null, EXAM_REQUIRED_TYPE)).toEqual(
      EMPTY_WHEEL_EXAM_DRAFT,
    );
    expect(recoverWheelExamDraft('garbage', EXAM_REQUIRED_TYPE)).toEqual(
      EMPTY_WHEEL_EXAM_DRAFT,
    );
  });

  it('AI 확인을 하지 못한 사유(notRunReason)는 목록에 있는 값만 믿는다', () => {
    const recovered = recoverWheelExamDraft(
      {
        photos: { back: null, edge: null, bore: null },
        metrics: { back: null, edge: null, bore: null },
        exam: null,
        notRunReason: 'network_error',
      },
      EXAM_REQUIRED_TYPE,
    );
    expect(recovered.notRunReason).toBe('network_error');

    const garbage = recoverWheelExamDraft(
      {
        photos: { back: null, edge: null, bore: null },
        metrics: { back: null, edge: null, bore: null },
        exam: null,
        notRunReason: 'made_up_reason',
      },
      EXAM_REQUIRED_TYPE,
    );
    expect(garbage.notRunReason).toBeNull();
  });
});
