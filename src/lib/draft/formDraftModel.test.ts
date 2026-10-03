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
import { WHEEL_PURPOSE_LABEL, WHEEL_TYPE_LABEL } from '@/lib/i18n/checkText';
import { GUARD_LABEL, SPINDLE_LABEL } from '@/lib/i18n/profileLabels';
import type {
  GrinderSpec,
  GuardType,
  SpindleThread,
  VisibleDamage,
  WheelPurpose,
  WheelSpec,
  WheelType,
} from '@/lib/rules/types';

/**
 * WheelType의 모든 종류. 손으로 적은 목록이 아니라 Record<WheelType, …>의 키다 —
 * 종류를 더하거나 이름을 바꾸면 타입 검사가 그 표부터 고치게 하므로, 종류 하나가
 * 빠진 채로 이 테스트가 통과할 수 없다. 복구가 쓰는 허용 목록과는 다른 출처라
 * 둘이 어긋나면 여기서 드러난다.
 */
const EVERY_WHEEL_TYPE = Object.keys(WHEEL_TYPE_LABEL) as WheelType[];

/** WheelPurpose의 모든 값. 종류와 같은 방식으로 타입이 잠근 표에서 얻는다 */
const EVERY_WHEEL_PURPOSE = Object.keys(WHEEL_PURPOSE_LABEL) as WheelPurpose[];

/**
 * VisibleDamage의 모든 값. 이 타입으로 잠긴 표가 앱에 따로 없어 여기 둔다 —
 * satisfies가 빠진 값과 남는 값을 모두 타입 검사에서 막는다.
 */
const EVERY_VISIBLE_DAMAGE = Object.keys({
  suspected: true,
  none_visible: true,
  unknown: true,
} satisfies Record<VisibleDamage, true>) as VisibleDamage[];

/** 스핀들 규격·덮개 종류의 모든 값. 같은 방식으로 타입이 잠근 표에서 얻는다 */
const EVERY_SPINDLE_THREAD = Object.keys(SPINDLE_LABEL) as SpindleThread[];
const EVERY_GUARD_TYPE = Object.keys(GUARD_LABEL) as GuardType[];

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
      droppedOcr: null,
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

  it.each([
    ['스핀들 — 목록에 없는 값', { spindleThread: 'M99' }],
    ['덮개 종류 — 목록에 없는 값', { guardType: 'weird' }],
    ['덮개 크기 — 숫자 자리에 문자열', { guardSize: '125' }],
  ])(
    'OCR 원본의 없어도 되는 필드가 어긋나도 통째로 버린다 — %s',
    (_name, patch) => {
      // 명판 OCR에는 이어갈 의심 신호가 없다. 고쳐 쓰지 않고 버린다 — 신뢰도는
      // 낮음에서 다시 시작해 작업자의 직접 확인을 받는다.
      const recovered = recoverGrinderFormDraft({
        fields: EMPTY_GRINDER_FORM_FIELDS,
        photo: null,
        ocr: { ...GRINDER_OCR, ...patch },
        analysisSource: 'server',
      });
      expect(recovered?.ocr).toBeNull();
    },
  );

  it.each(EVERY_SPINDLE_THREAD)(
    '목록에 있는 스핀들 규격은 그대로 살린다 — %s',
    (spindleThread) => {
      const recovered = recoverGrinderFormDraft({
        fields: { ...EMPTY_GRINDER_FORM_FIELDS, spindleThread },
        photo: null,
        ocr: { ...GRINDER_OCR, spindleThread },
        analysisSource: 'server',
      });
      expect(recovered?.fields.spindleThread).toBe(spindleThread);
      expect(recovered?.ocr).toEqual({ ...GRINDER_OCR, spindleThread });
    },
  );

  it.each(EVERY_GUARD_TYPE)(
    '목록에 있는 덮개 종류는 그대로 살린다 — %s',
    (guardType) => {
      const recovered = recoverGrinderFormDraft({
        fields: { ...EMPTY_GRINDER_FORM_FIELDS, guardType },
        photo: null,
        ocr: { ...GRINDER_OCR, guardType },
        analysisSource: 'server',
      });
      expect(recovered?.fields.guardType).toBe(guardType);
      expect(recovered?.ocr).toEqual({ ...GRINDER_OCR, guardType });
    },
  );

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

describe('recoverGrinderFormDraft — 통째로 버린 OCR 원본의 흔적', () => {
  // 명판 OCR은 형태가 어긋나면 통째로 버린다. 조용히 버리면 작업자는 신뢰도가 왜
  // 낮음으로 떨어졌는지, 확정한 기록에 AI 판독이 왜 없는지 알 수 없다. 버렸다는
  // 흔적을 남겨 화면이 알리게 한다. 명판 OCR에는 이어갈 의심 신호가 없어 흔적은
  // dropped뿐이다.
  const draftWithOcr = (ocr: unknown, extra: Record<string, unknown> = {}) => ({
    slot: 'grinder',
    schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
    savedAt: '2026-09-17T00:00:00.000Z',
    fields: { ...EMPTY_GRINDER_FORM_FIELDS, noLoadRPM: '11000' },
    photo: null,
    ocr,
    analysisSource: 'server',
    ...extra,
  });

  it.each([
    ['숫자 자리에 문자열', { ...GRINDER_OCR, noLoadRPM: '11000' }],
    ['원문이 문자열이 아님', { ...GRINDER_OCR, rawText: null }],
    ['목록에 없는 신뢰도', { ...GRINDER_OCR, confidence: 'certain' }],
    ['목록에 없는 스핀들', { ...GRINDER_OCR, spindleThread: 'M99' }],
    ['객체가 아님', 'garbage'],
    ['배열', [GRINDER_OCR]],
  ])(
    '형태가 어긋난 OCR 원본을 버리면 버렸다는 흔적을 남긴다 — %s',
    (_name, ocr) => {
      const recovered = recoverGrinderFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toBeNull();
      expect(recovered?.droppedOcr).toBe('dropped');
      // 입력칸의 값은 OCR과 따로 저장돼 있다. 그대로 살린다.
      expect(recovered?.fields.noLoadRPM).toBe('11000');
    },
  );

  it.each([
    ['null — 직접 입력한 draft', null],
    ['빠진 값', undefined],
  ])(
    '저장된 OCR이 없었으면 흔적도 없다 — 없던 일을 알리지 않는다 — %s',
    (_name, ocr) => {
      const recovered = recoverGrinderFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toBeNull();
      expect(recovered?.droppedOcr).toBeNull();
    },
  );

  it('온전한 OCR 원본에는 흔적이 없다', () => {
    const recovered = recoverGrinderFormDraft(draftWithOcr(GRINDER_OCR));

    expect(recovered?.ocr).toEqual(GRINDER_OCR);
    expect(recovered?.droppedOcr).toBeNull();
  });

  it.each([
    ['지금 버린 OCR', draftWithOcr({ ...GRINDER_OCR, rawText: null })],
    ['다시 저장된 흔적', draftWithOcr(null, { droppedOcr: 'dropped' })],
  ])(
    'OCR을 버려도 저장된 출처(server)는 바꿔 적지 않는다 — 제한 대조는 흔적이 정한다 — %s',
    (_name, draft) => {
      // 버린 판독으로 확정한 점검은 제한 대조로 나간다. 그 근거는 이 흔적이고,
      // 출처를 local_ocr·manual로 바꿔 적어서가 아니다 — 서버 분석을 거친 것은
      // 사실이라, 바꿔 적으면 확인 화면이 「이 기기에서 읽었다」·「서버로 분석하지
      // 못했다」는 사실과 다른 배지를 띄운다.
      const recovered = recoverGrinderFormDraft(draft);

      expect(recovered?.droppedOcr).toBe('dropped');
      expect(recovered?.analysisSource).toBe('server');
    },
  );

  it('이 버전이 다시 저장한 흔적은 그대로 되살린다 — 새로고침으로 알림이 사라지지 않는다', () => {
    // 한 번 복구된 뒤 화면이 다시 저장한 draft다. ocr은 이미 null이라, 흔적이 없으면
    // 처음부터 OCR이 없던 draft(직접 입력)와 구분할 수 없다.
    const recovered = recoverGrinderFormDraft(
      draftWithOcr(null, { droppedOcr: 'dropped' }),
    );

    expect(recovered?.droppedOcr).toBe('dropped');
  });

  it('되살린 OCR이 있으면 저장된 흔적은 받지 않는다 — 없던 일을 알리지 않는다', () => {
    // 이 버전은 OCR을 버렸을 때만 흔적을 저장하고, 그때 ocr은 null이다. OCR이
    // 온전한데 흔적이 붙은 draft는 앱이 쓰는 모양이 아니다 — 화면이 판독을
    // 보여주면서 복구하지 못했다고 말하게 두지 않는다.
    const recovered = recoverGrinderFormDraft(
      draftWithOcr(GRINDER_OCR, { droppedOcr: 'dropped' }),
    );

    expect(recovered?.ocr).toEqual(GRINDER_OCR);
    expect(recovered?.droppedOcr).toBeNull();
  });

  it.each([
    // 명판 OCR에는 외관 의심이 없다. 숫돌 쪽 값이 섞여 들어와도 받지 않는다.
    ['숫돌 쪽 흔적 값', 'suspected'],
    ['불리언', true],
    ['대소문자가 다른 값', 'DROPPED'],
  ])('목록에 없는 흔적 값은 믿지 않는다 — %s', (_name, droppedOcr) => {
    const recovered = recoverGrinderFormDraft(
      draftWithOcr(null, { droppedOcr }),
    );

    expect(recovered?.droppedOcr).toBeNull();
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

  // 숫돌 종류는 확인 화면의 선택칸과 규칙엔진으로 그대로 들어간다. 지금 WheelType에
  // 없는 문자열 — 나중에 종류 이름이 바뀌었거나 값이 손상된 경우다 — 을 그대로
  // 살리면 선택칸에는 맞는 선택지가 없고 엔진은 모르는 종류를 받는다.
  describe('숫돌 종류 허용 목록', () => {
    const FIELDS = {
      maxRPM: '12200',
      diameter: '125',
      thickness: '1.6',
      purpose: 'cutting',
      expiry: '04/2027',
      accessoryName: '',
    };
    /** 숫돌 종류만 바꿔 가며 만든 확인 화면 draft. 나머지 값은 온전하다 */
    const draftWithType = (wheelType: unknown) => ({
      slot: 'wheel',
      schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: { ...FIELDS, wheelType },
      photo: null,
      ocr: null,
      analysisSource: 'server',
    });

    it.each([
      ['이름이 바뀌었거나 없어진 종류', 'resin_wheel'],
      ['철자 하나가 다른 값', 'flap_disk'],
      ['대소문자가 다른 값', 'FLAP_DISC'],
      ['앞뒤에 공백이 붙은 값', ' flap_disc '],
      ['빈 문자열', ''],
      // 종류별 표가 일반 객체라, 표에서 찾으면 "있는 값"으로 보이는 이름이다.
      ['객체 기본 속성과 같은 이름', 'constructor'],
    ])(
      '목록에 없는 숫돌 종류는 unknown으로 되돌린다 — %s',
      (_name, wheelType) => {
        const recovered = recoverWheelFormDraft(draftWithType(wheelType));

        // 비슷해 보여도 다른 종류로 추정해 바꾸지 않는다. 모르는 것은 모르는 것으로 둔다.
        // 어긋난 것은 종류뿐이므로 나머지 입력은 그대로 살린다.
        expect(recovered?.fields).toEqual({ ...FIELDS, wheelType: 'unknown' });
      },
    );

    it.each([
      ['숫자', 42],
      ['null', null],
      ['객체', { type: 'flap_disc' }],
    ])(
      '문자열이 아닌 숫돌 종류도 unknown으로 되돌린다 — %s',
      (_name, wheelType) => {
        const recovered = recoverWheelFormDraft(draftWithType(wheelType));

        expect(recovered?.fields).toEqual({ ...FIELDS, wheelType: 'unknown' });
      },
    );

    it.each(EVERY_WHEEL_TYPE)(
      '목록에 있는 숫돌 종류는 그대로 살린다 — %s',
      (wheelType) => {
        const recovered = recoverWheelFormDraft(draftWithType(wheelType));

        expect(recovered?.fields).toEqual({ ...FIELDS, wheelType });
      },
    );
  });

  // 용도도 확인 화면의 선택칸(절단용·연삭용·모르겠음)과 규칙엔진의 작업 목적 일치
  // 규칙으로 그대로 들어간다. 목록에 없는 문자열을 살리면 선택칸에는 맞는 선택지가
  // 없어 첫 선택지(절단용)를 고른 것처럼 보이는데, 엔진은 모르는 용도를 받아 근거
  // 없는 용도 불일치(부적합)를 낸다.
  describe('숫돌 용도 허용 목록', () => {
    const FIELDS = {
      maxRPM: '12200',
      diameter: '125',
      thickness: '1.6',
      expiry: '04/2027',
      wheelType: 'bonded_abrasive',
      accessoryName: '',
    };
    /** 용도만 바꿔 가며 만든 확인 화면 draft. 나머지 값은 온전하다 */
    const draftWithPurpose = (purpose: unknown) => ({
      slot: 'wheel',
      schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: { ...FIELDS, purpose },
      photo: null,
      ocr: null,
      analysisSource: 'server',
    });

    it.each([
      ['목록에 없는 용도', 'polishing'],
      ['철자 하나가 다른 값', 'cuting'],
      ['대소문자가 다른 값', 'CUTTING'],
      ['앞뒤에 공백이 붙은 값', ' cutting '],
      ['빈 문자열', ''],
      ['객체 기본 속성과 같은 이름', 'constructor'],
    ])('목록에 없는 용도는 unknown으로 되돌린다 — %s', (_name, purpose) => {
      const recovered = recoverWheelFormDraft(draftWithPurpose(purpose));

      // 절단용·연삭용 어느 쪽으로도 추정하지 않는다. 용도는 작업자가 라벨을 보고
      // 다시 고른다. 어긋난 것은 용도뿐이므로 나머지 입력은 그대로 살린다.
      expect(recovered?.fields).toEqual({ ...FIELDS, purpose: 'unknown' });
    });

    it.each([
      ['숫자', 42],
      ['null', null],
      ['객체', { purpose: 'cutting' }],
    ])('문자열이 아닌 용도도 unknown으로 되돌린다 — %s', (_name, purpose) => {
      const recovered = recoverWheelFormDraft(draftWithPurpose(purpose));

      expect(recovered?.fields).toEqual({ ...FIELDS, purpose: 'unknown' });
    });

    it.each(EVERY_WHEEL_PURPOSE)(
      '목록에 있는 용도는 그대로 살린다 — %s',
      (purpose) => {
        const recovered = recoverWheelFormDraft(draftWithPurpose(purpose));

        expect(recovered?.fields).toEqual({ ...FIELDS, purpose });
      },
    );
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

describe('recoverWheelFormDraft — OCR 원본의 종류·용도·외관 값', () => {
  // 확인 화면 draft의 ocr은 AI가 라벨 사진에서 읽은 값이다. 화면은 여기서 AI 제안
  // 종류·외관 의심·원본 표시(markings)·신뢰도를 읽고, 확정하면 기록의 OCR 원본
  // (wheelOcr)으로 남긴다.
  //
  // 종류·용도·외관 값이 지금 목록에 없으면(이름이 바뀐 값·손상된 값) 그 값만
  // unknown으로 읽는다. OCR을 통째로 버리면 그 판독이 올린 외관 의심과 표기 일치
  // 검사의 근거(markings)가 함께 사라진다 — 의심을 덜어내는 방향은 이 앱에 넣지
  // 않는다(docs/safety-boundaries.md). 대신 그렇게 읽은 OCR에는 손댔다는 표시를
  // 붙여, 화면이 그것을 모델이 읽은 원본으로 기록하지 않게 한다.

  /** 외관 의심·원본 표시·낮은 신뢰도까지 든 OCR 원본 */
  const SUSPECTED_OCR: WheelSpec = {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'suspected',
    markings: {
      labeledRPM: 12200,
      peripheralSpeedMps: 80,
      boreDiameter: 22.23,
      expiryRaw: '04/2027',
    },
    rpmSource: 'label',
    expiry: { year: 2027, month: 4 },
    rawText: 'MAX 12200 RPM 80 m/s',
    confidence: 'low',
  };

  const draftWithOcr = (ocr: unknown, extra: Record<string, unknown> = {}) => ({
    slot: 'wheel',
    schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
    savedAt: '2026-09-17T00:00:00.000Z',
    fields: EMPTY_WHEEL_FORM_FIELDS,
    photo: null,
    ocr,
    analysisSource: 'server',
    ...extra,
  });

  it('목록에 있는 값뿐이면 그대로 살린다 — 손댔다는 표시가 없다', () => {
    const recovered = recoverWheelFormDraft(draftWithOcr(SUSPECTED_OCR));

    expect(recovered?.ocr).toEqual(SUSPECTED_OCR);
    expect(recovered?.ocrAltered).toBe(false);
  });

  describe.each(['wheelType', 'purpose', 'visibleDamage'] as const)(
    '%s',
    (field) => {
      it.each([
        ['이름이 바뀌었거나 없어진 값', 'resin_wheel'],
        ['대소문자가 다른 값', 'UNKNOWN'],
        ['앞뒤에 공백이 붙은 값', ' unknown '],
        ['빈 문자열', ''],
        // 종류별 표가 일반 객체라, 표에서 찾으면 "있는 값"으로 보이는 이름이다.
        ['객체 기본 속성과 같은 이름', 'constructor'],
        ['숫자', 42],
        ['null', null],
        ['빠진 값', undefined],
      ])(
        '목록에 없는 값은 그 값만 unknown으로 읽고, 손댔다고 표시한다 — %s',
        (_name, value) => {
          const recovered = recoverWheelFormDraft(
            draftWithOcr({ ...SUSPECTED_OCR, [field]: value }),
          );

          // 비슷한 값으로 추정해 바꾸지 않는다. 나머지 판독은 그대로다.
          expect(recovered?.ocr).toEqual({
            ...SUSPECTED_OCR,
            [field]: 'unknown',
          });
          expect(recovered?.ocrAltered).toBe(true);
        },
      );
    },
  );

  it('종류·용도를 읽지 못해도 그 OCR이 올린 외관 의심·원본 표시·신뢰도는 그대로 남는다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr({
        ...SUSPECTED_OCR,
        wheelType: 'resin_wheel',
        purpose: 'polishing',
      }),
    );

    // 의심을 덜어내지 않는다 — Gate의 손상 경고와 규칙엔진의 외관 손상 항목이 본다.
    expect(recovered?.ocr?.visibleDamage).toBe('suspected');
    // 표기 일치 검사(rpm 표기와 m/s 표기의 어긋남)의 근거다.
    expect(recovered?.ocr?.markings).toEqual(SUSPECTED_OCR.markings);
    // 낮은 신뢰도는 코드가 올리지 않는다.
    expect(recovered?.ocr?.confidence).toBe('low');
    expect(recovered?.ocr?.maxRPM).toBe(12200);
    expect(recovered?.ocr?.rpmSource).toBe('label');
    expect(recovered?.ocr?.rawText).toBe('MAX 12200 RPM 80 m/s');
  });

  it.each([
    [
      '원본 표시 — 숫자 자리에 객체',
      'markings',
      { labeledRPM: {}, peripheralSpeedMps: 80, boreDiameter: null },
    ],
    // 일부만 고쳐 살리지 않는다. 원본 표시는 확정하면 기록에 "라벨에 인쇄된
    // 그대로"로 남는다 — 빠진 자리를 null로 메워 넣으면 고친 원본이 된다.
    ['원본 표시 — 빠진 자리', 'markings', { labeledRPM: 12200 }],
    ['원본 표시 — 객체가 아님', 'markings', 'x'],
    ['회전속도 출처 — 목록에 없는 값', 'rpmSource', 'guess'],
    ['유효기한 — 빈 객체', 'expiry', {}],
    ['유효기한 — 문자열', 'expiry', '01/2020'],
    ['유효기한 직접 확인 — 목록에 없는 값', 'expiryReview', 'checked_ok'],
    ['부속품 이름 — 숫자', 'accessoryName', 42],
  ])(
    '없어도 되는 필드가 어긋나면 그 필드만 빼고, 손댔다고 표시한다 — %s',
    (_name, field, value) => {
      const recovered = recoverWheelFormDraft(
        draftWithOcr({ ...SUSPECTED_OCR, [field]: value }),
      );

      const expected: Record<string, unknown> = { ...SUSPECTED_OCR };
      delete expected[field];
      expect(recovered?.ocr).toEqual(expected);
      expect(recovered?.ocr).not.toHaveProperty(field);
      // 그 OCR이 올린 외관 의심은 그대로다.
      expect(recovered?.ocr?.visibleDamage).toBe('suspected');
      expect(recovered?.ocrAltered).toBe(true);
    },
  );

  it('외관 값을 읽지 못하면 unknown이다 — 「보이지 않음」으로도 「의심」으로도 채우지 않는다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr({ ...WHEEL_OCR, visibleDamage: 'cracked' }),
    );

    // none_visible로 채우면 보지 않은 것을 본 것처럼 남기고, suspected로 채우면
    // 모델이 내지 않은 경고를 지어낸다.
    expect(recovered?.ocr?.visibleDamage).toBe('unknown');
    expect(recovered?.ocrAltered).toBe(true);
  });

  it.each([
    ['숫자 자리에 문자열', { ...SUSPECTED_OCR, maxRPM: '12200' }],
    ['원문이 문자열이 아님', { ...SUSPECTED_OCR, rawText: null }],
    ['목록에 없는 신뢰도', { ...SUSPECTED_OCR, confidence: 'certain' }],
    ['객체가 아님', 'garbage'],
  ])(
    '숫자·원문·신뢰도의 형태가 어긋난 OCR 원본은 통째로 버린다 — %s',
    (_name, ocr) => {
      const recovered = recoverWheelFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toBeNull();
      expect(recovered?.ocrAltered).toBe(false);
    },
  );

  it('손댔다는 표시는 다시 저장된 draft에서도 이어진다 — 새로고침으로 원본으로 둔갑하지 않는다', () => {
    // 한 번 복구된 뒤 화면이 다시 저장한 draft다. ocr은 이미 unknown으로 바뀌어
    // 있어 목록 검사만으로는 처음부터 unknown이던 원본과 구분할 수 없다.
    const resaved = { ...SUSPECTED_OCR, wheelType: 'unknown' };
    const recovered = recoverWheelFormDraft(
      draftWithOcr(resaved, { ocrAltered: true }),
    );

    expect(recovered?.ocr).toEqual(resaved);
    expect(recovered?.ocrAltered).toBe(true);
  });

  it.each([
    ['문자열', 'true'],
    ['숫자', 1],
    ['false', false],
  ])('표시 값이 true가 아니면 표시로 치지 않는다 — %s', (_name, flag) => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr(SUSPECTED_OCR, { ocrAltered: flag }),
    );

    expect(recovered?.ocrAltered).toBe(false);
  });

  it('OCR이 없으면 표시도 없다 — 기록할 원본 자체가 없다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr(null, { ocrAltered: true }),
    );

    expect(recovered?.ocr).toBeNull();
    expect(recovered?.ocrAltered).toBe(false);
  });

  it.each(EVERY_WHEEL_TYPE)(
    '목록에 있는 종류는 그대로 살린다 — %s',
    (wheelType) => {
      const ocr = { ...WHEEL_OCR, wheelType };
      const recovered = recoverWheelFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toEqual(ocr);
      expect(recovered?.ocrAltered).toBe(false);
    },
  );

  it.each(EVERY_WHEEL_PURPOSE)(
    '목록에 있는 용도는 그대로 살린다 — %s',
    (purpose) => {
      const ocr = { ...WHEEL_OCR, purpose };
      const recovered = recoverWheelFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toEqual(ocr);
      expect(recovered?.ocrAltered).toBe(false);
    },
  );

  it.each(EVERY_VISIBLE_DAMAGE)(
    '목록에 있는 외관 값은 그대로 살린다 — %s',
    (visibleDamage) => {
      const ocr = { ...WHEEL_OCR, visibleDamage };
      const recovered = recoverWheelFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toEqual(ocr);
      expect(recovered?.ocrAltered).toBe(false);
    },
  );
});

describe('recoverWheelFormDraft — 통째로 버린 OCR 원본의 흔적', () => {
  // 숫자·원문·신뢰도가 어긋난 OCR은 살릴 뼈대가 없어 통째로 버린다. 그때 그 판독이
  // 올린 외관 의심까지 함께 버리면, 앱이 스스로 올린 경고가 새로고침 한 번에 조용히
  // 사라진다 — 의심을 덜어내는 방향은 이 앱에 넣지 않는다(docs/safety-boundaries.md).
  //
  // 판독 자체는 되살리지 않고 흔적만 남긴다. 버렸다는 사실(화면이 알린다)과, 그
  // OCR이 의심했다는 사실(이어간다)이다. 이전 버전의 다각도 확인 흔적과 같은 방식이다.

  /** 외관 의심이 든 OCR 원본 */
  const SUSPECTED_OCR: WheelSpec = {
    ...WHEEL_OCR,
    wheelType: 'bonded_abrasive',
    visibleDamage: 'suspected',
    confidence: 'low',
  };

  const FIELDS = {
    ...EMPTY_WHEEL_FORM_FIELDS,
    maxRPM: '12200',
    diameter: '125',
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
  };

  const draftWithOcr = (ocr: unknown, extra: Record<string, unknown> = {}) => ({
    slot: 'wheel',
    schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
    savedAt: '2026-09-17T00:00:00.000Z',
    fields: FIELDS,
    photo: new Blob(['label']),
    ocr,
    analysisSource: 'server',
    ...extra,
  });

  /** 숫자·원문·신뢰도 가운데 하나가 어긋나 OCR을 살릴 수 없게 만드는 값 */
  const UNSALVAGEABLE: Array<[string, Record<string, unknown>]> = [
    ['숫자 자리에 문자열', { maxRPM: '12200' }],
    ['원문이 문자열이 아님', { rawText: null }],
    ['목록에 없는 신뢰도', { confidence: 'certain' }],
  ];

  it.each(UNSALVAGEABLE)(
    '버린 OCR이 외관 손상을 의심했으면 의심을 이어간다 — %s',
    (_name, patch) => {
      const recovered = recoverWheelFormDraft(
        draftWithOcr({ ...SUSPECTED_OCR, ...patch }),
      );

      // 판독 자체는 되살리지 않는다.
      expect(recovered?.ocr).toBeNull();
      expect(recovered?.ocrAltered).toBe(false);
      expect(recovered?.droppedOcr).toBe('suspected');
    },
  );

  it.each(UNSALVAGEABLE)(
    '의심하지 않았던 OCR을 버리면 버렸다는 흔적만 남긴다 — %s',
    (_name, patch) => {
      const recovered = recoverWheelFormDraft(
        draftWithOcr({ ...WHEEL_OCR, ...patch }),
      );

      expect(recovered?.ocr).toBeNull();
      expect(recovered?.droppedOcr).toBe('dropped');
    },
  );

  it.each([
    ['모름', 'unknown'],
    // 목록에 없는 외관 값이다. 비슷해 보여도 의심으로 올리지 않는다.
    ['목록에 없는 값', 'cracked'],
    ['대소문자가 다른 값', 'SUSPECTED'],
    ['앞뒤에 공백이 붙은 값', ' suspected '],
    ['불리언', true],
    ['객체', { status: 'suspected' }],
    ['배열', ['suspected']],
    ['null', null],
    ['빠진 값', undefined],
  ])(
    '버린 OCR의 외관 값이 정확히 「의심」이 아니면 의심을 지어내지 않는다 — %s',
    (_name, visibleDamage) => {
      const recovered = recoverWheelFormDraft(
        draftWithOcr({ ...SUSPECTED_OCR, rawText: null, visibleDamage }),
      );

      expect(recovered?.ocr).toBeNull();
      // 버렸다는 것은 알린다. 모델이 내지 않은 경고는 만들지 않는다.
      expect(recovered?.droppedOcr).toBe('dropped');
    },
  );

  it('남은 값이 거의 없는 객체여도 의심은 의심이다 — 형태가 어긋났다고 의심을 지우지 않는다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr({ visibleDamage: 'suspected' }),
    );

    expect(recovered?.ocr).toBeNull();
    expect(recovered?.droppedOcr).toBe('suspected');
  });

  it.each([
    ['문자열', 'garbage'],
    ['숫자', 42],
    // 배열은 OCR이 아니다. 안에 든 값을 뒤져 의심을 찾지 않는다.
    ['배열', [SUSPECTED_OCR]],
  ])(
    '객체가 아닌 OCR은 버렸다는 흔적만 남긴다 — 읽을 의심이 없다 — %s',
    (_name, ocr) => {
      const recovered = recoverWheelFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toBeNull();
      expect(recovered?.droppedOcr).toBe('dropped');
    },
  );

  it.each([
    ['null — 직접 입력한 draft', null],
    ['빠진 값', undefined],
  ])(
    '저장된 OCR이 없었으면 흔적도 없다 — 없던 일을 알리지 않는다 — %s',
    (_name, ocr) => {
      const recovered = recoverWheelFormDraft(draftWithOcr(ocr));

      expect(recovered?.ocr).toBeNull();
      expect(recovered?.droppedOcr).toBeNull();
    },
  );

  it('온전한 OCR과 일부만 모름으로 읽은 OCR에는 흔적이 없다 — 의심은 그 OCR 안에 그대로 있다', () => {
    const intact = recoverWheelFormDraft(draftWithOcr(SUSPECTED_OCR));
    expect(intact?.ocr?.visibleDamage).toBe('suspected');
    expect(intact?.droppedOcr).toBeNull();

    const altered = recoverWheelFormDraft(
      draftWithOcr({ ...SUSPECTED_OCR, wheelType: 'resin_wheel' }),
    );
    expect(altered?.ocr?.visibleDamage).toBe('suspected');
    expect(altered?.ocrAltered).toBe(true);
    expect(altered?.droppedOcr).toBeNull();
  });

  it('OCR을 버려도 입력칸의 값·사진·출처는 그대로 살린다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr({ ...SUSPECTED_OCR, rawText: null }),
    );

    expect(recovered?.fields).toEqual(FIELDS);
    expect(recovered?.photo).toBeInstanceOf(Blob);
    expect(recovered?.analysisSource).toBe('server');
  });

  it.each([
    ['지금 버린 OCR', draftWithOcr({ ...WHEEL_OCR, rawText: null })],
    ['다시 저장된 흔적', draftWithOcr(null, { droppedOcr: 'dropped' })],
  ])(
    'OCR을 버려도 저장된 출처(server)는 바꿔 적지 않는다 — 제한 대조는 흔적이 정한다 — %s',
    (_name, draft) => {
      // 버린 판독으로 확정한 점검은 제한 대조로 나간다. 그 근거는 이 흔적이고,
      // 출처를 local_ocr·manual로 바꿔 적어서가 아니다 — 서버 분석을 거친 것은
      // 사실이라, 바꿔 적으면 확인 화면이 「이 기기에서 읽었다」·「서버로 분석하지
      // 못했다」는 사실과 다른 배지를 띄운다.
      const recovered = recoverWheelFormDraft(draft);

      expect(recovered?.droppedOcr).toBe('dropped');
      expect(recovered?.analysisSource).toBe('server');
    },
  );

  it('이 버전이 다시 저장한 흔적은 그대로 되살린다 — 새로고침으로 의심이 사라지지 않는다', () => {
    // 한 번 복구된 뒤 화면이 다시 저장한 draft다. ocr은 이미 null이라, 흔적이 없으면
    // 처음부터 OCR이 없던 draft(직접 입력)와 구분할 수 없다.
    expect(
      recoverWheelFormDraft(draftWithOcr(null, { droppedOcr: 'suspected' }))
        ?.droppedOcr,
    ).toBe('suspected');
    expect(
      recoverWheelFormDraft(draftWithOcr(null, { droppedOcr: 'dropped' }))
        ?.droppedOcr,
    ).toBe('dropped');
  });

  it.each([
    ['목록에 없는 값', 'cleared'],
    ['불리언', true],
    ['대소문자가 다른 값', 'SUSPECTED'],
  ])('목록에 없는 흔적 값은 믿지 않는다 — %s', (_name, droppedOcr) => {
    const recovered = recoverWheelFormDraft(draftWithOcr(null, { droppedOcr }));

    expect(recovered?.droppedOcr).toBeNull();
  });

  it('저장된 흔적과 지금 버린 OCR 가운데 한쪽이라도 의심이면 의심이다 — 의심을 덜어내지 않는다', () => {
    // 저장된 흔적은 의심인데, 지금 버린 OCR은 의심하지 않았다.
    expect(
      recoverWheelFormDraft(
        draftWithOcr(
          { ...WHEEL_OCR, rawText: null },
          { droppedOcr: 'suspected' },
        ),
      )?.droppedOcr,
    ).toBe('suspected');
    // 저장된 흔적은 버림뿐인데, 지금 버린 OCR은 의심했다.
    expect(
      recoverWheelFormDraft(
        draftWithOcr(
          { ...SUSPECTED_OCR, rawText: null },
          { droppedOcr: 'dropped' },
        ),
      )?.droppedOcr,
    ).toBe('suspected');
  });

  it('되살린 OCR이 있으면 저장된 「버림」 흔적은 받지 않는다 — 없던 일을 알리지 않는다', () => {
    // 이 버전은 OCR을 버렸을 때만 흔적을 저장하고, 그때 ocr은 null이다. OCR이
    // 있는데 흔적이 붙은 draft는 앱이 쓰는 모양이 아니다 — 화면이 판독을
    // 보여주면서 복구하지 못했다고 말하게 두지 않는다.
    expect(
      recoverWheelFormDraft(draftWithOcr(WHEEL_OCR, { droppedOcr: 'dropped' }))
        ?.droppedOcr,
    ).toBeNull();
    // 일부만 모름으로 읽은 OCR도 되살린 OCR이다.
    expect(
      recoverWheelFormDraft(
        draftWithOcr(
          { ...WHEEL_OCR, wheelType: 'resin_wheel' },
          { droppedOcr: 'dropped' },
        ),
      )?.droppedOcr,
    ).toBeNull();
  });

  it('저장된 「의심」 흔적은 되살린 OCR이 있어도 지우지 않는다 — 의심을 덜어내지 않는다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr(WHEEL_OCR, { droppedOcr: 'suspected' }),
    );

    // 되살린 OCR은 손대지 않는다. 의심은 흔적으로만 이어간다.
    expect(recovered?.ocr).toEqual(WHEEL_OCR);
    expect(recovered?.droppedOcr).toBe('suspected');
  });

  it('이전 버전의 다각도 확인 흔적과 따로 남는다 — 한쪽이 다른 쪽을 덮지 않는다', () => {
    const recovered = recoverWheelFormDraft(
      draftWithOcr(
        { ...WHEEL_OCR, rawText: null },
        { legacyExam: 'suspected' },
      ),
    );

    expect(recovered?.legacyExam).toBe('suspected');
    expect(recovered?.droppedOcr).toBe('dropped');
  });
});

describe('recoverWheelFormDraft — 이전 버전의 다각도 외관 확인 흔적', () => {
  // 다각도 외관 확인(뒷면·가장자리·중심구멍 사진 + AI 확인)은 2026-10-03에 점검
  // 흐름에서 뺐다. 그 전에 저장된 확인 화면 draft의 모양을 그대로 흉내 낸다.
  const photos = () => ({
    back: new Blob(['back']),
    edge: new Blob(['edge']),
    bore: new Blob(['bore']),
  });
  const result = (status: string) => ({
    status,
    findings: [],
    photoQuality: [],
    model: 'claude-x',
    promptVersion: 'v1',
    analyzedAt: '2026-09-17T00:00:00.000Z',
  });
  const legacyDraft = (exam: unknown, extra: Record<string, unknown> = {}) => ({
    fields: {
      ...EMPTY_WHEEL_FORM_FIELDS,
      maxRPM: '12200',
      wheelType: 'bonded_abrasive',
    },
    photo: new Blob(['label'], { type: 'image/jpeg' }),
    ocr: null,
    analysisSource: 'server',
    exam,
    ...extra,
  });
  const EMPTY_SLOTS = { back: null, edge: null, bore: null };

  it('추가 사진·AI 결과는 되살리지 않고 버렸다는 흔적만 남긴다 — 입력값은 그대로 살린다', () => {
    const recovered = recoverWheelFormDraft(
      legacyDraft({
        photos: photos(),
        metrics: EMPTY_SLOTS,
        exam: result('not_observed'),
        notRunReason: null,
      }),
    );

    expect(recovered).not.toHaveProperty('exam');
    expect(recovered?.legacyExam).toBe('dropped');
    expect(recovered?.fields.maxRPM).toBe('12200');
    expect(recovered?.fields.wheelType).toBe('bonded_abrasive');
    expect(recovered?.photo).toBeInstanceOf(Blob);
    expect(recovered?.analysisSource).toBe('server');
  });

  it('그 확인이 외관 이상을 의심했으면 의심을 이어간다', () => {
    const recovered = recoverWheelFormDraft(
      legacyDraft({
        photos: photos(),
        metrics: EMPTY_SLOTS,
        exam: result('suspected'),
        notRunReason: null,
      }),
    );
    expect(recovered?.legacyExam).toBe('suspected');
  });

  it('사진이 빠졌어도 의심은 의심이다 — 사진이 모자란다고 의심을 지우지 않는다', () => {
    const recovered = recoverWheelFormDraft(
      legacyDraft({
        photos: { ...photos(), bore: null },
        metrics: EMPTY_SLOTS,
        exam: result('suspected'),
        notRunReason: null,
      }),
    );
    expect(recovered?.legacyExam).toBe('suspected');
  });

  it.each([
    [
      '사진만 넣고 아직 확인을 돌리지 않았다',
      { photos: photos(), exam: null, notRunReason: null },
    ],
    [
      '사진 한 장만 넣었다',
      {
        photos: { ...EMPTY_SLOTS, back: new Blob(['b']) },
        exam: null,
        notRunReason: null,
      },
    ],
    [
      'AI가 판단하지 못했다',
      { photos: photos(), exam: result('unassessable'), notRunReason: null },
    ],
    [
      'AI 확인이 실패했다',
      { photos: EMPTY_SLOTS, exam: null, notRunReason: 'network_error' },
    ],
  ])('%s — 버렸다는 흔적만 남긴다(의심으로 올리지 않는다)', (_name, exam) => {
    const recovered = recoverWheelFormDraft(
      legacyDraft({ metrics: EMPTY_SLOTS, ...exam }),
    );
    expect(recovered?.legacyExam).toBe('dropped');
  });

  it('그 확인을 쓰지 않았던 draft(빈 exam)에는 흔적이 없다 — 없던 일을 알리지 않는다', () => {
    // 그 확인을 요구하지 않던 종류의 draft에도 빈 exam이 들어 있었다.
    const recovered = recoverWheelFormDraft(
      legacyDraft({
        photos: EMPTY_SLOTS,
        metrics: EMPTY_SLOTS,
        exam: null,
        notRunReason: null,
      }),
    );
    expect(recovered?.legacyExam).toBeNull();
  });

  it('exam이 없는 draft(이 버전이 저장한 것)와 형태가 어긋난 exam에는 흔적이 없다', () => {
    expect(
      recoverWheelFormDraft(legacyDraft(undefined))?.legacyExam,
    ).toBeNull();
    expect(
      recoverWheelFormDraft(legacyDraft('garbage'))?.legacyExam,
    ).toBeNull();
  });

  it('이 버전이 이어받아 다시 저장한 흔적은 그대로 되살린다 — 새로고침으로 의심이 사라지지 않는다', () => {
    expect(
      recoverWheelFormDraft(legacyDraft(undefined, { legacyExam: 'suspected' }))
        ?.legacyExam,
    ).toBe('suspected');
    expect(
      recoverWheelFormDraft(legacyDraft(undefined, { legacyExam: 'dropped' }))
        ?.legacyExam,
    ).toBe('dropped');
  });

  it('목록에 없는 흔적 값은 믿지 않는다', () => {
    expect(
      recoverWheelFormDraft(legacyDraft(undefined, { legacyExam: 'cleared' }))
        ?.legacyExam,
    ).toBeNull();
    expect(
      recoverWheelFormDraft(legacyDraft(undefined, { legacyExam: true }))
        ?.legacyExam,
    ).toBeNull();
  });
});
