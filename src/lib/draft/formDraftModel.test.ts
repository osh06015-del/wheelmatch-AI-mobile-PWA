// 확인 화면 입력 draft 복구 테스트.
//
// 핵심: 형태가 어긋난 값은 추정해 채우지 않고 기본값으로 되돌리는지, 사진이
// 없거나 Blob이 아니면 버리는지, 구버전(스키마 불일치)에서도 가능한 값은 살리는지.

import { describe, expect, it } from 'vitest';

import {
  EMPTY_GRINDER_FORM_FIELDS,
  EMPTY_WHEEL_FORM_FIELDS,
  FORM_DRAFT_SCHEMA_VERSION,
  recoverGrinderFormDraft,
  recoverWheelFormDraft,
} from './formDraftModel';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

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

  it('이전 버전 draft의 다각도 확인(추가 사진·AI 결과)은 되살리지 않는다 — 입력값은 그대로 살린다', () => {
    // 다각도 외관 확인을 빼기 전(2026-10-03 이전)에 저장된 모양이다. 그 단계가
    // 이제 없으므로 받을 화면이 없다. 나머지 입력까지 버리지는 않는다.
    const recovered = recoverWheelFormDraft({
      fields: {
        ...EMPTY_WHEEL_FORM_FIELDS,
        maxRPM: '12200',
        wheelType: 'bonded_abrasive',
      },
      photo: new Blob(['label'], { type: 'image/jpeg' }),
      ocr: null,
      analysisSource: 'server',
      exam: {
        photos: {
          back: new Blob(['back']),
          edge: new Blob(['edge']),
          bore: new Blob(['bore']),
        },
        metrics: { back: null, edge: null, bore: null },
        exam: {
          status: 'not_observed',
          findings: [],
          photoQuality: [],
          model: 'claude-x',
          promptVersion: 'v1',
          analyzedAt: '2026-09-17T00:00:00.000Z',
        },
        notRunReason: null,
      },
    });

    expect(recovered).not.toHaveProperty('exam');
    expect(recovered?.fields.maxRPM).toBe('12200');
    expect(recovered?.fields.wheelType).toBe('bonded_abrasive');
    expect(recovered?.photo).toBeInstanceOf(Blob);
    expect(recovered?.analysisSource).toBe('server');
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
