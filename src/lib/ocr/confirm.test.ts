// 확인 화면을 지나는 동안 라벨 원본 표시가 살아남는지 고정한다.
//
// 여기서 값이 새면 규칙엔진의 표기 일치·장착 규격 검사가 항목 자체를 만들지
// 않는다. 화면에는 아무 흔적도 남지 않고 판정만 조용히 통과한다.
// 실제로 그렇게 새고 있었으므로, 이 파일은 회귀 방지용이다.

import { describe, expect, it } from 'vitest';
import {
  confirmedWheelSpec,
  wheelTypeDiffersFromSuggestion,
  withAcceptedReanalysis,
  withReanalysisSuspicion,
  type ConfirmedWheelFields,
} from './confirm';
import { isValidWheelSpec } from '@/lib/backup/recordSanitize';
import { RULE, matchSpecs } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import { BONDED_ABRASIVE_PROFILE } from '@/lib/rules/profiles';

/** 기준일을 고정한다. 엔진은 시계를 읽지 않으므로 결과가 흔들리지 않는다. */
const TODAY = '2026-09-08';

function grinder(overrides: Partial<GrinderSpec> = {}): GrinderSpec {
  return {
    model: 'GWS 750-125',
    noLoadRPM: 11000,
    maxWheelDiameter: 125,
    rawText: 'BOSCH GWS 750-125 11000 r/min max 125mm',
    confidence: 'high',
    ...overrides,
  };
}

/** route.ts가 돌려주는 모양 그대로. markings가 붙어 있는 것이 핵심이다. */
function ocrWheel(
  overrides: Partial<WheelSpec> = {},
  markings: Partial<NonNullable<WheelSpec['markings']>> = {},
): WheelSpec {
  return {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    markings: {
      labeledRPM: 12200,
      peripheralSpeedMps: 80,
      boreDiameter: 22.23,
      expiryRaw: '04/2027',
      ...markings,
    },
    rpmSource: 'label',
    expiry: { year: 2027, month: 4 },
    rawText: '최고사용회전속도 12200RPM 80m/s 125×1.6×22.23 절단용 04/2027',
    confidence: 'high',
    ...overrides,
  };
}

/** 사용자가 아무것도 고치지 않고 그대로 확인한 경우 */
function untouched(
  ocr: WheelSpec,
  overrides: Partial<ConfirmedWheelFields> = {},
): ConfirmedWheelFields {
  return {
    maxRPM: ocr.maxRPM,
    diameter: ocr.diameter,
    thickness: ocr.thickness,
    purpose: ocr.purpose,
    wheelType: ocr.wheelType,
    expiryText: ocr.markings?.expiryRaw ?? '',
    userConfirmed: false,
    ...overrides,
  };
}

describe('confirmedWheelSpec — 원본 표시 보존', () => {
  it('사용자가 고치지 않으면 markings와 rpmSource가 그대로 넘어온다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.markings).toEqual({
      labeledRPM: 12200,
      peripheralSpeedMps: 80,
      boreDiameter: 22.23,
      expiryRaw: '04/2027',
    });
    expect(spec.rpmSource).toBe('label');
    expect(spec.expiry).toEqual({ year: 2027, month: 4 });
  });

  it('m/s에서 환산한 출처도 그대로 이어간다', () => {
    const ocr = ocrWheel(
      { maxRPM: 12223, rpmSource: 'converted' },
      {
        labeledRPM: null,
      },
    );
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.rpmSource).toBe('converted');
    expect(spec.markings?.peripheralSpeedMps).toBe(80);
  });

  it('사용자가 회전속도를 고쳐도 라벨 원본 표시는 덮어쓰지 않는다', () => {
    // 라벨에 무엇이 인쇄돼 있었는지는 사용자가 확인한 값이 아니다.
    // 따라 바꾸면 라벨의 모순이 사라져 표기 일치 검사가 무력해진다.
    const ocr = ocrWheel({ maxRPM: 1220 }, { labeledRPM: 1220 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { maxRPM: 12200 }));

    expect(spec.maxRPM).toBe(12200);
    expect(spec.markings?.labeledRPM).toBe(1220);
    expect(spec.markings?.peripheralSpeedMps).toBe(80);
  });

  it('markings는 OCR 원본과 같은 객체를 공유하지 않는다', () => {
    // 참조를 공유하면 최종값과 OCR 원본이 사실상 한 객체가 된다.
    // 둘은 따로 남아야 인식률·정정률을 잴 수 있다 (safety-critical.md 2번).
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.markings).toEqual(ocr.markings);
    expect(spec.markings).not.toBe(ocr.markings);
  });

  it('사용자가 값을 고치면 출처가 user로 바뀐다', () => {
    const ocr = ocrWheel({ maxRPM: 1220 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { maxRPM: 12200 }));

    expect(spec.rpmSource).toBe('user');
  });

  it('회전속도를 비우면 출처를 남기지 않는다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { maxRPM: null }));

    expect(spec.maxRPM).toBeNull();
    expect(spec.rpmSource).toBeUndefined();
  });

  it('OCR 없이 사람이 직접 넣은 값에는 원본 표시가 없다', () => {
    // 대조할 라벨 원본이 없으므로 표기 검사 항목 자체가 생기지 않는다.
    // 없는 근거를 있는 것처럼 만들지 않는다.
    const spec = confirmedWheelSpec(null, {
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      expiryText: '',
      userConfirmed: true,
    });

    expect(spec.markings).toBeUndefined();
    expect(spec.rpmSource).toBe('user');
    expect(spec.expiry).toBeNull();

    const rules = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    }).checks.map((c) => c.rule);
    expect(rules).not.toContain(RULE.UNIT_CONSISTENCY);
    expect(rules).not.toContain(RULE.MOUNTING_SPEC);
  });

  it('사진에서 판별한 외관 손상은 숫자를 고쳐도 그대로 이어간다', () => {
    const ocr = ocrWheel({ visibleDamage: 'suspected' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { maxRPM: 9000 }));

    expect(spec.visibleDamage).toBe('suspected');
  });

  it('라벨 사진의 외관 판독값을 바꾸지 않고 그대로 옮긴다', () => {
    const ocr = ocrWheel({ visibleDamage: 'none_visible' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.visibleDamage).toBe('none_visible');
  });

  it('이미 올라와 있던 외관 의심은 라벨 사진의 판독이 무엇이든 의심으로 남긴다', () => {
    // 다각도 외관 확인이 있던 이전 버전의 draft가 의심이었던 경우다.
    for (const fromLabel of ['none_visible', 'unknown', 'suspected'] as const) {
      const ocr = ocrWheel({ visibleDamage: fromLabel });
      const spec = confirmedWheelSpec(ocr, {
        ...untouched(ocr),
        priorDamageSuspected: true,
      });
      expect(spec.visibleDamage).toBe('suspected');
    }
  });

  it('이전 의심이 없다는 값은 라벨 사진의 의심을 지우지 못한다', () => {
    // 이 방향이 깨지면 "새 버전으로 넘어왔더니 경고가 사라지는" 앱이 된다.
    const ocr = ocrWheel({ visibleDamage: 'suspected' });
    const spec = confirmedWheelSpec(ocr, {
      ...untouched(ocr),
      priorDamageSuspected: false,
    });
    expect(spec.visibleDamage).toBe('suspected');
  });

  it('사진 판독이 없으면(직접 입력) 외관은 unknown이다 — 보이지 않았다고 적지 않는다', () => {
    const spec = confirmedWheelSpec(null, {
      maxRPM: 13300,
      diameter: 100,
      thickness: 1,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      expiryText: '',
      userConfirmed: true,
    });

    expect(spec.visibleDamage).toBe('unknown');
  });

  it('사용자가 유효기한을 고쳐도 라벨 원문은 그대로 남는다', () => {
    // OCR이 04/2023으로 읽었는데 사용자가 라벨을 다시 보고 04/2027로 고친 경우.
    // 정규화 값만 바뀌고, 모델이 무엇을 읽었는지는 증거로 남는다.
    const ocr = ocrWheel(
      { expiry: { year: 2023, month: 4 } },
      {
        expiryRaw: '04/2023',
      },
    );
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { expiryText: '04/2027' }),
    );

    expect(spec.expiry).toEqual({ year: 2027, month: 4 });
    expect(spec.markings?.expiryRaw).toBe('04/2023');
    expect(ocr.expiry).toEqual({ year: 2023, month: 4 });
  });

  it('사용자가 유효기한을 비우면 판정불가 경로로 돌아간다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { expiryText: '' }));

    expect(spec.expiry).toBeNull();
    // 라벨에 무엇이 찍혀 있었는지는 그대로 남는다.
    expect(spec.markings?.expiryRaw).toBe('04/2027');
    expect(
      matchSpecs(grinder(), spec, {
        declaredPurpose: 'cutting',
        profile: BONDED_ABRASIVE_PROFILE,
        today: TODAY,
      }).verdict,
    ).toBe('UNDETERMINED');
  });

  it('사용자가 모호한 형식을 넣으면 값을 지어내지 않는다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { expiryText: '2027년 4월쯤' }),
    );

    expect(spec.expiry).toBeNull();
    expect(
      matchSpecs(grinder(), spec, {
        declaredPurpose: 'cutting',
        profile: BONDED_ABRASIVE_PROFILE,
        today: TODAY,
      }).verdict,
    ).toBe('UNDETERMINED');
  });

  it('사용자가 지난 기한을 확정하면 부적합으로 간다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { expiryText: '04/2023', userConfirmed: true }),
    );
    const result = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });

    expect(result.checks.find((c) => c.rule === RULE.EXPIRY)?.passed).toBe(
      false,
    );
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('확인 토글을 켜야만 신뢰도가 올라간다', () => {
    const ocr = ocrWheel({ confidence: 'low' });

    expect(confirmedWheelSpec(ocr, untouched(ocr)).confidence).toBe('low');
    expect(
      confirmedWheelSpec(ocr, untouched(ocr, { userConfirmed: true }))
        .confidence,
    ).toBe('high');
  });
});

// ─────────────────────────────────────────────────────────────
// 숫돌 종류 — AI 제안과 작업자의 최종 선택
//
// 종류는 이 앱의 회전속도·지름 규칙이 성립하는지를 정한다. AI가 사진으로 본
// 값은 제안일 뿐이고, 작업자가 실물을 보고 고른 값이 규칙엔진으로 간다.
// ─────────────────────────────────────────────────────────────

describe('confirmedWheelSpec — 숫돌 종류는 작업자가 고른다', () => {
  it('AI가 일반 결합숫돌로 읽고 작업자가 그대로 두면 결합숫돌로 대조한다', () => {
    const ocr = ocrWheel({ wheelType: 'bonded_abrasive' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.wheelType).toBe('bonded_abrasive');
    expect(
      matchSpecs(grinder(), spec, {
        profile: BONDED_ABRASIVE_PROFILE,
        declaredPurpose: 'cutting',
        today: TODAY,
      }).verdict,
    ).toBe('COMPATIBLE');
  });

  it('AI가 플랩디스크로 읽고 작업자가 그대로 두면 판정불가로 막힌다', () => {
    const ocr = ocrWheel({ wheelType: 'flap_disc' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.wheelType).toBe('flap_disc');
    expect(
      matchSpecs(grinder(), spec, {
        profile: BONDED_ABRASIVE_PROFILE,
        declaredPurpose: 'cutting',
        today: TODAY,
      }).verdict,
    ).toBe('UNDETERMINED');
  });

  it('작업자가 다른 종류를 고르면 그 값이 최종값이 되고 OCR 원본은 그대로 남는다', () => {
    // 최종값만 남기면 모델이 종류를 잘못 봤는지 되짚을 수 없다.
    const ocr = ocrWheel({ wheelType: 'flap_disc' });
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { wheelType: 'bonded_abrasive', userConfirmed: true }),
    );

    expect(spec.wheelType).toBe('bonded_abrasive');
    expect(ocr.wheelType).toBe('flap_disc');
  });

  it('Tesseract가 종류를 모르겠음으로 남겨도 작업자가 일반 결합숫돌을 고르면 대조가 이어진다', () => {
    // 글자만 읽는 경로는 숫돌의 생김새를 볼 수 없어 항상 unknown이다. 작업자가
    // 실물을 보고 고르고 직접 확인까지 해야 규격 대조로 이어진다.
    const ocr = ocrWheel({ wheelType: 'unknown', confidence: 'low' });
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { wheelType: 'bonded_abrasive', userConfirmed: true }),
    );

    expect(spec.wheelType).toBe('bonded_abrasive');
    expect(spec.confidence).toBe('high');
    expect(ocr.wheelType).toBe('unknown');
    expect(
      matchSpecs(grinder(), spec, {
        profile: BONDED_ABRASIVE_PROFILE,
        declaredPurpose: 'cutting',
        today: TODAY,
      }).verdict,
    ).toBe('COMPATIBLE');
  });

  it('작업자가 모르겠음으로 두면 규격이 다 맞아도 적합으로 끝나지 않는다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { wheelType: 'unknown', userConfirmed: true }),
    );

    expect(
      matchSpecs(grinder(), spec, {
        profile: BONDED_ABRASIVE_PROFILE,
        declaredPurpose: 'cutting',
        today: TODAY,
      }).verdict,
    ).toBe('UNDETERMINED');
  });
});

describe('wheelTypeDiffersFromSuggestion', () => {
  it('AI 제안과 같은 종류면 다르지 않다', () => {
    expect(
      wheelTypeDiffersFromSuggestion(
        ocrWheel({ wheelType: 'flap_disc' }),
        'flap_disc',
      ),
    ).toBe(false);
  });

  it('AI 제안과 다른 종류를 고르면 다르다', () => {
    expect(
      wheelTypeDiffersFromSuggestion(
        ocrWheel({ wheelType: 'flap_disc' }),
        'bonded_abrasive',
      ),
    ).toBe(true);
  });

  it('OCR이 없으면 모르겠음을 제안으로 보고 견준다', () => {
    // 제안이 없는데 결합숫돌을 고르면 사람이 직접 확인해야 한다.
    expect(wheelTypeDiffersFromSuggestion(null, 'bonded_abrasive')).toBe(true);
    expect(wheelTypeDiffersFromSuggestion(null, 'unknown')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 확인 화면 → 규칙엔진: 검사가 "실제 결과"에 나타나는지
//
// 규칙 함수를 따로 부르는 것으로는 부족하다. 확인 화면을 통과한 spec으로
// matchSpecs를 돌렸을 때 항목이 생기는지를 봐야 이번 회귀를 잡는다.
// ─────────────────────────────────────────────────────────────

describe('확인 화면을 통과한 값으로 실제 판정하기', () => {
  it('표기 일치 검사가 결과에 실제로 나타난다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const check = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    }).checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY);

    // 이전에는 markings가 새어나가 이 항목이 아예 만들어지지 않았다.
    expect(check).toBeDefined();
    expect(check?.passed).toBe(true);
  });

  it('원주속도 표기와 환산 rpm이 모순되면 적합으로 나오지 않는다', () => {
    // Φ125 12,200rpm은 약 80m/s다. 라벨의 8m/s와 10배 어긋난다.
    // 어느 쪽을 잘못 읽었는지 알 수 없으므로 통과시키지 않는다.
    const ocr = ocrWheel({}, { peripheralSpeedMps: 8 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const result = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });

    const check = result.checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY);
    expect(check?.passed).toBeNull();
    expect(check?.advisory).toBeUndefined(); // 경고가 아니라 차단이다
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('사용자가 회전속도를 고쳐도 라벨의 모순은 드러난다', () => {
    // 가장 위험한 경로다. 사용자가 숫자를 고치면서 라벨의 모순까지 함께
    // 지워지면, 오독된 라벨이 조용히 적합으로 통과한다.
    const ocr = ocrWheel({ maxRPM: 1220 }, { labeledRPM: 1220 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { maxRPM: 12200 }));
    const result = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });

    expect(result.checks.find((c) => c.rule === RULE.RPM_SAFETY)?.passed).toBe(
      true,
    );
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('장착 규격(내경) 항목이 결과에 나타나고, 값을 읽어도 판정하지 않는다', () => {
    // 이 앱에는 "내경 불일치 → 부적합" 규칙이 없다. 그라인더 명판에 축 규격이
    // 적히지 않아 대조할 상대가 없기 때문이다. 통용 규격(22.23mm 등)을
    // 기준으로 삼으면 규격 대조가 아니라 관행 추정이 된다.
    // 그래서 이 항목은 값을 보여주고 사용자에게 직접 확인을 요구하는 데서 멈춘다.
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const check = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    }).checks.find((c) => c.rule === RULE.MOUNTING_SPEC);

    expect(check).toBeDefined();
    expect(check?.wheelValue).toBe('내경 Φ22.23mm');
    expect(check?.advisory).toBe(true);
    expect(check?.reason).toContain('직접 확인');
  });

  it('숫돌 외경이 그라인더 허용 최대 지름을 넘으면 적합으로 나오지 않는다', () => {
    const ocr = ocrWheel({ diameter: 180 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const result = matchSpecs(grinder(), spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });

    expect(
      result.checks.find((c) => c.rule === RULE.DIAMETER_FIT)?.passed,
    ).toBe(false);
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('값을 읽지 못하면 예전처럼 판정불가로 남는다', () => {
    const ocr = ocrWheel({ maxRPM: null }, { labeledRPM: null });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(
      matchSpecs(grinder(), spec, {
        declaredPurpose: 'cutting',
        profile: BONDED_ABRASIVE_PROFILE,
        today: TODAY,
      }).verdict,
    ).toBe('UNDETERMINED');
  });

  it('용도가 모호하면 오늘 작업과 대조할 수 없어 판정불가로 남는다', () => {
    const ocr = ocrWheel({ purpose: 'unknown' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const result = matchSpecs(grinder(), spec, {
      profile: BONDED_ABRASIVE_PROFILE,
      declaredPurpose: 'cutting',
      today: TODAY,
    });

    expect(
      result.checks.find((c) => c.rule === RULE.WORK_PURPOSE)?.passed,
    ).toBeNull();
    expect(result.verdict).toBe('UNDETERMINED');
  });

  it('멀쩡한 조합은 계속 적합으로 나온다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(
      matchSpecs(grinder(), spec, {
        profile: BONDED_ABRASIVE_PROFILE,
        declaredPurpose: 'cutting',
        today: TODAY,
      }).verdict,
    ).toBe('COMPATIBLE');
  });
});

// ─────────────────────────────────────────────────────────────
// 서버 재분석 — 확정한 뒤에 도착한 OCR
//
// 서버 분석 없이 확정한 숫돌을 결과 화면에서 다시 분석하면 OCR이 확정보다 늦게
// 온다. 온라인 대조로 바뀐 뒤에도 판정은 확정값만 보므로, OCR이 실어 오던 두 칸
// (외관 손상·원본 표시)을 옮기지 않으면 같은 사진을 처음부터 온라인으로 읽었을
// 때보다 느슨하게 대조한다. 실제로 그렇게 빠져 있었다.
// ─────────────────────────────────────────────────────────────

describe('서버 재분석 뒤의 확정값', () => {
  /** 작업자가 라벨을 직접 보고 확인 화면에 넣은 값 */
  const TYPED: ConfirmedWheelFields = {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    expiryText: '04/2027',
    expiryReview: 'marked',
    userConfirmed: true,
  };

  /** 직접 입력으로 확정한 숫돌. 외관 판독도 원본 표시도 없다 */
  const typedWheel = () => confirmedWheelSpec(null, TYPED);

  /** 로컬 OCR(글자만 읽는다)로 읽고 작업자가 종류를 골라 확정한 숫돌 */
  function localOcrWheel(
    markings: Partial<NonNullable<WheelSpec['markings']>>,
  ): WheelSpec {
    const ocr = ocrWheel(
      { wheelType: 'unknown', visibleDamage: 'unknown' },
      markings,
    );
    return confirmedWheelSpec(
      ocr,
      untouched(ocr, { wheelType: 'bonded_abrasive', userConfirmed: true }),
    );
  }

  const judge = (spec: WheelSpec) =>
    matchSpecs(grinder(), spec, {
      profile: BONDED_ABRASIVE_PROFILE,
      declaredPurpose: 'cutting',
      today: TODAY,
    });

  /** 판정과 항목별 결과. 시각(timestamp)과 값 표시는 뺀다 */
  const outcome = (spec: WheelSpec) => {
    const result = judge(spec);
    return {
      verdict: result.verdict,
      checks: result.checks.map((check) => ({
        rule: check.rule,
        passed: check.passed,
        code: check.detail?.code,
      })),
    };
  };

  describe('외관 의심 — 전환과 무관하게 더한다', () => {
    it('재분석이 손상을 의심하면 확정값이 의심으로 바뀌고 다른 값은 그대로다', () => {
      const wheel = typedWheel();
      const next = withReanalysisSuspicion(
        wheel,
        ocrWheel({ visibleDamage: 'suspected' }),
      );

      expect(next).toEqual({ ...wheel, visibleDamage: 'suspected' });
      // 전환하지 않았으면 AI가 읽은 표시는 가져오지 않는다.
      expect(next.markings).toBeUndefined();
      expect(
        judge(next).checks.find((c) => c.rule === RULE.VISIBLE_DAMAGE)?.detail
          ?.code,
      ).toBe('visibleDamage.suspected');
    });

    it.each(['none_visible', 'unknown'] as const)(
      '재분석의 판독이 %s 이면 아무것도 바꾸지 않는다 — 의심을 지어내지 않는다',
      (fromReanalysis) => {
        const wheel = typedWheel();

        // 보이지 않았다는 판독으로 덮어쓰지도 않는다. 같은 객체가 돌아온다.
        expect(
          withReanalysisSuspicion(
            wheel,
            ocrWheel({ visibleDamage: fromReanalysis }),
          ),
        ).toBe(wheel);
      },
    );

    it.each(['none_visible', 'unknown', 'suspected'] as const)(
      '이미 올라와 있던 의심은 재분석의 판독이 %s 여도 지워지지 않는다',
      (fromReanalysis) => {
        const wheel = confirmedWheelSpec(null, {
          ...TYPED,
          priorDamageSuspected: true,
        });
        const reanalyzed = ocrWheel({ visibleDamage: fromReanalysis });

        expect(withReanalysisSuspicion(wheel, reanalyzed).visibleDamage).toBe(
          'suspected',
        );
        expect(withAcceptedReanalysis(wheel, reanalyzed).visibleDamage).toBe(
          'suspected',
        );
      },
    );
  });

  describe('전환을 받아들일 때 — 작업자가 확정한 값은 그대로다', () => {
    it('옮기는 것은 외관 의심과 원본 표시뿐이다', () => {
      const wheel = typedWheel();
      const reanalyzed = ocrWheel({
        visibleDamage: 'suspected',
        // 작업자 값과 다른 AI 값들. 전환이 열렸더라도 확정값을 덮지 않는다.
        thickness: 3,
        purpose: 'grinding',
        wheelType: 'flap_disc',
        expiry: { year: 2023, month: 4 },
        confidence: 'low',
        rawText: 'AI가 읽은 원문',
      });
      const next = withAcceptedReanalysis(wheel, reanalyzed);

      expect(next).toEqual({
        ...wheel,
        visibleDamage: 'suspected',
        markings: reanalyzed.markings,
      });
      expect(next.rpmSource).toBe('user');
      expect(next.confidence).toBe('high');
    });

    it('옮겨 온 원본 표시는 OCR 원본과 객체를 공유하지 않는다', () => {
      const reanalyzed = ocrWheel();
      const next = withAcceptedReanalysis(typedWheel(), reanalyzed);

      expect(next.markings).toEqual(reanalyzed.markings);
      expect(next.markings).not.toBe(reanalyzed.markings);
    });

    it('옮긴 확정값은 새로고침·복구의 규격 검사를 통과한다', () => {
      // 새로고침 복원(inspection.tsx)과 진행 중 점검 복구(draftModel.ts)는 저장된
      // 규격을 isValidWheelSpec으로 검사하고, 통과하지 못하면 숫돌 단계를 통째로
      // 버린다. 옮긴 값이 거기서 걸리면 화면을 한 번 새로고침한 것만으로 AI가 올린
      // 의심과 표시가 숫돌과 함께 사라진다.
      const reanalyzed = ocrWheel({ visibleDamage: 'suspected' });
      const confirmed = [
        typedWheel(),
        localOcrWheel({ peripheralSpeedMps: null, expiryRaw: null }),
      ];

      for (const wheel of confirmed) {
        // sessionStorage를 거치면 JSON 직렬화를 한 번 통과한다.
        const stored = (spec: WheelSpec): unknown =>
          JSON.parse(JSON.stringify(spec));

        expect(
          isValidWheelSpec(stored(withReanalysisSuspicion(wheel, reanalyzed))),
        ).toBe(true);
        expect(
          isValidWheelSpec(stored(withAcceptedReanalysis(wheel, reanalyzed))),
        ).toBe(true);
      }
    });

    it('재분석이 표시를 읽지 못했으면 확정값을 바꾸지 않는다', () => {
      // route.ts의 emptySpec — 스키마에 맞는 응답을 못 받으면 markings 없이 온다.
      const wheel = typedWheel();
      const reanalyzed = ocrWheel();
      delete reanalyzed.markings;

      expect(withAcceptedReanalysis(wheel, reanalyzed)).toBe(wheel);
    });
  });

  describe('전환을 받아들일 때 — 처음부터 온라인으로 읽은 점검과 같게 대조한다', () => {
    // 같은 라벨 사진을 처음부터 서버로 읽고 작업자가 같은 값으로 확정했다면
    // confirmedWheelSpec(ai, TYPED)가 규칙엔진으로 갔다. 재분석을 거친 확정값이
    // 그보다 느슨하게 판정되면 안 된다.
    const READINGS: Array<[string, WheelSpec]> = [
      ['멀쩡한 판독', ocrWheel()],
      ['외관 손상 의심', ocrWheel({ visibleDamage: 'suspected' })],
      ['rpm·m/s 표기가 서로 어긋남', ocrWheel({}, { peripheralSpeedMps: 8 })],
      ['내경을 읽지 못함', ocrWheel({}, { boreDiameter: null })],
      ['m/s 표기뿐', ocrWheel({}, { labeledRPM: null })],
      [
        '의심 + 표기 어긋남',
        ocrWheel({ visibleDamage: 'suspected' }, { peripheralSpeedMps: 8 }),
      ],
    ];

    it.each(READINGS)('%s', (_name, reanalyzed) => {
      const viaReanalysis = withAcceptedReanalysis(typedWheel(), reanalyzed);
      const onlineFromStart = confirmedWheelSpec(reanalyzed, TYPED);

      expect(outcome(viaReanalysis)).toEqual(outcome(onlineFromStart));
    });

    it('표기가 서로 어긋난 판독으로 전환하면 적합이 아니라 판정불가다', () => {
      const next = withAcceptedReanalysis(
        typedWheel(),
        ocrWheel({}, { peripheralSpeedMps: 8 }),
      );
      const result = judge(next);
      const check = result.checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY);

      // 옮기기 전에는 이 항목이 아예 없어 적합으로 통과했다.
      expect(judge(typedWheel()).verdict).toBe('COMPATIBLE');
      expect(check?.passed).toBeNull();
      expect(check?.advisory).toBeUndefined(); // 경고가 아니라 차단이다
      expect(result.verdict).toBe('UNDETERMINED');
    });

    it('표기가 맞는 판독을 옮겨도 판정이 올라가지 않는다', () => {
      // 표기 일치의 통과는 전체 판정을 올리는 근거가 못 된다. 다른 이유로
      // 판정불가인 확정값은 표시를 옮긴 뒤에도 판정불가다.
      const wheel = confirmedWheelSpec(null, { ...TYPED, purpose: 'unknown' });
      const next = withAcceptedReanalysis(wheel, ocrWheel());

      expect(judge(wheel).verdict).toBe('UNDETERMINED');
      expect(
        judge(next).checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY)
          ?.passed,
      ).toBe(true);
      expect(judge(next).verdict).toBe('UNDETERMINED');
    });
  });

  describe('로컬 OCR이 읽어 둔 표기 — 빈 자리만 채운다', () => {
    it('이미 있는 표기는 재분석이 다르게 읽어도 덮지 않는다', () => {
      const wheel = localOcrWheel({});
      const next = withAcceptedReanalysis(
        wheel,
        ocrWheel(
          {},
          {
            labeledRPM: 13300,
            peripheralSpeedMps: 63,
            boreDiameter: 16,
            expiryRaw: '01/2030',
          },
        ),
      );

      // 채울 빈 자리가 없다. 같은 객체가 돌아온다.
      expect(next).toBe(wheel);
    });

    it('로컬 OCR이 올린 표기 불일치는 재분석이 맞게 읽어도 사라지지 않는다', () => {
      // 덮어쓰면 재분석이 의심을 덜어내는 길이 된다.
      const wheel = localOcrWheel({ peripheralSpeedMps: 8 });
      expect(judge(wheel).verdict).toBe('UNDETERMINED');

      const next = withAcceptedReanalysis(wheel, ocrWheel());

      expect(next.markings?.peripheralSpeedMps).toBe(8);
      expect(
        judge(next).checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY)
          ?.passed,
      ).toBeNull();
      expect(judge(next).verdict).toBe('UNDETERMINED');
    });

    it('로컬 OCR이 읽지 못한 표기는 재분석이 읽은 값으로 채워 대조에 넣는다', () => {
      // 로컬 OCR은 rpm 표기만 읽었다. 서버는 m/s를 8로 읽었다 — 어긋난다.
      const wheel = localOcrWheel({
        peripheralSpeedMps: null,
        boreDiameter: null,
        expiryRaw: null,
      });
      expect(
        judge(wheel).checks.some((c) => c.rule === RULE.UNIT_CONSISTENCY),
      ).toBe(false);

      const next = withAcceptedReanalysis(
        wheel,
        ocrWheel({}, { peripheralSpeedMps: 8 }),
      );

      expect(next.markings).toEqual({
        labeledRPM: 12200,
        peripheralSpeedMps: 8,
        boreDiameter: 22.23,
        expiryRaw: '04/2027',
      });
      expect(
        judge(next).checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY)
          ?.passed,
      ).toBeNull();
      expect(judge(next).verdict).toBe('UNDETERMINED');
      // 작업자가 확정한 유효기한은 원문을 채워도 그대로다.
      expect(next.expiry).toEqual(wheel.expiry);
    });

    it('유효기한 원문만 비어 있으면 그 칸만 채운다', () => {
      const wheel = localOcrWheel({ expiryRaw: null });
      const next = withAcceptedReanalysis(
        wheel,
        ocrWheel({}, { labeledRPM: 13300, expiryRaw: '01/2030' }),
      );

      expect(next.markings).toEqual({
        ...wheel.markings,
        expiryRaw: '01/2030',
      });
      // 원문은 판정에 쓰이지 않는다. 판정에 쓰이는 유효기한은 작업자가 확정한 값이다.
      expect(next.expiry).toEqual(wheel.expiry);
      expect(outcome(next)).toEqual(outcome(wheel));
    });

    it('재분석도 유효기한 원문을 읽지 못했으면 없는 칸을 만들지 않는다', () => {
      const wheel = localOcrWheel({ expiryRaw: null });

      expect(
        withAcceptedReanalysis(wheel, ocrWheel({}, { expiryRaw: null })),
      ).toBe(wheel);
    });
  });
});
