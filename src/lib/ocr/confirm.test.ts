// 확인 화면을 지나는 동안 라벨 원본 표시가 살아남는지 고정한다.
//
// 여기서 값이 새면 규칙엔진의 표기 일치·장착 규격 검사가 항목 자체를 만들지
// 않는다. 화면에는 아무 흔적도 남지 않고 판정만 조용히 통과한다.
// 실제로 그렇게 새고 있었으므로, 이 파일은 회귀 방지용이다.

import { describe, expect, it } from 'vitest';
import { confirmedWheelSpec, type ConfirmedWheelFields } from './confirm';
import { RULE, matchSpecs } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

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
      expiryText: '',
      userConfirmed: true,
    });

    expect(spec.markings).toBeUndefined();
    expect(spec.rpmSource).toBe('user');
    expect(spec.expiry).toBeNull();

    const rules = matchSpecs(grinder(), spec, { today: TODAY }).checks.map(
      (c) => c.rule,
    );
    expect(rules).not.toContain(RULE.UNIT_CONSISTENCY);
    expect(rules).not.toContain(RULE.MOUNTING_SPEC);
  });

  it('사진에서 판별한 종류와 손상은 숫자를 고쳐도 그대로 이어간다', () => {
    const ocr = ocrWheel({ wheelType: 'diamond', visibleDamage: 'suspected' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr, { maxRPM: 9000 }));

    expect(spec.wheelType).toBe('diamond');
    expect(spec.visibleDamage).toBe('suspected');
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
    expect(matchSpecs(grinder(), spec, { today: TODAY }).verdict).toBe(
      'UNDETERMINED',
    );
  });

  it('사용자가 모호한 형식을 넣으면 값을 지어내지 않는다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { expiryText: '2027년 4월쯤' }),
    );

    expect(spec.expiry).toBeNull();
    expect(matchSpecs(grinder(), spec, { today: TODAY }).verdict).toBe(
      'UNDETERMINED',
    );
  });

  it('사용자가 지난 기한을 확정하면 부적합으로 간다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(
      ocr,
      untouched(ocr, { expiryText: '04/2023', userConfirmed: true }),
    );
    const result = matchSpecs(grinder(), spec, { today: TODAY });

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
// 확인 화면 → 규칙엔진: 검사가 "실제 결과"에 나타나는지
//
// 규칙 함수를 따로 부르는 것으로는 부족하다. 확인 화면을 통과한 spec으로
// matchSpecs를 돌렸을 때 항목이 생기는지를 봐야 이번 회귀를 잡는다.
// ─────────────────────────────────────────────────────────────

describe('확인 화면을 통과한 값으로 실제 판정하기', () => {
  it('표기 일치 검사가 결과에 실제로 나타난다', () => {
    const ocr = ocrWheel();
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const check = matchSpecs(grinder(), spec, { today: TODAY }).checks.find(
      (c) => c.rule === RULE.UNIT_CONSISTENCY,
    );

    // 이전에는 markings가 새어나가 이 항목이 아예 만들어지지 않았다.
    expect(check).toBeDefined();
    expect(check?.passed).toBe(true);
  });

  it('원주속도 표기와 환산 rpm이 모순되면 적합으로 나오지 않는다', () => {
    // Φ125 12,200rpm은 약 80m/s다. 라벨의 8m/s와 10배 어긋난다.
    // 어느 쪽을 잘못 읽었는지 알 수 없으므로 통과시키지 않는다.
    const ocr = ocrWheel({}, { peripheralSpeedMps: 8 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const result = matchSpecs(grinder(), spec, { today: TODAY });

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
    const result = matchSpecs(grinder(), spec, { today: TODAY });

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
    const check = matchSpecs(grinder(), spec, { today: TODAY }).checks.find(
      (c) => c.rule === RULE.MOUNTING_SPEC,
    );

    expect(check).toBeDefined();
    expect(check?.wheelValue).toBe('내경 Φ22.23mm');
    expect(check?.advisory).toBe(true);
    expect(check?.reason).toContain('직접 확인');
  });

  it('숫돌 외경이 그라인더 허용 최대 지름을 넘으면 적합으로 나오지 않는다', () => {
    const ocr = ocrWheel({ diameter: 180 });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const result = matchSpecs(grinder(), spec, { today: TODAY });

    expect(
      result.checks.find((c) => c.rule === RULE.DIAMETER_FIT)?.passed,
    ).toBe(false);
    expect(result.verdict).toBe('INCOMPATIBLE');
  });

  it('값을 읽지 못하면 예전처럼 판정불가로 남는다', () => {
    const ocr = ocrWheel({ maxRPM: null }, { labeledRPM: null });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(matchSpecs(grinder(), spec, { today: TODAY }).verdict).toBe(
      'UNDETERMINED',
    );
  });

  it('용도가 모호하면 오늘 작업과 대조할 수 없어 판정불가로 남는다', () => {
    const ocr = ocrWheel({ purpose: 'unknown' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));
    const result = matchSpecs(grinder(), spec, {
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
      matchSpecs(grinder(), spec, { declaredPurpose: 'cutting', today: TODAY })
        .verdict,
    ).toBe('COMPATIBLE');
  });
});
