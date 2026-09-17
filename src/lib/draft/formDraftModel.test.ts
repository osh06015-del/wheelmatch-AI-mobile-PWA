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
      offline: false,
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
    expect(recovered?.offline).toBe(false);
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
      offline: true,
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
      offline: true,
    });
  });

  it('사진이 Blob이 아니면 버린다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: 'data:image/png;base64,xxx',
      ocr: null,
      offline: false,
    });
    expect(recovered?.photo).toBeNull();
  });

  it('OCR 원본의 형태가 어긋나면 버린다 — 지어내지 않는다', () => {
    const recovered = recoverGrinderFormDraft({
      fields: EMPTY_GRINDER_FORM_FIELDS,
      photo: null,
      ocr: { noLoadRPM: 'not a number' },
      offline: false,
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
      offline: false,
    });
    expect(recovered?.fields.model).toBe('old');
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
      offline: false,
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
      offline: false,
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
});
