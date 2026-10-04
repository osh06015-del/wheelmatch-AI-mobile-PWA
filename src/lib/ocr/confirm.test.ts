// 확인 화면을 지나는 동안 라벨 원본 표시가 살아남는지 고정한다.
//
// 여기서 값이 새면 규칙엔진의 표기 일치·장착 규격 검사가 항목 자체를 만들지
// 않는다. 화면에는 아무 흔적도 남지 않고 판정만 조용히 통과한다.
// 실제로 그렇게 새고 있었으므로, 이 파일은 회귀 방지용이다.

import { describe, expect, it } from 'vitest';
import {
  confirmedValueAgreement,
  confirmedWheelSpec,
  markingConflicts,
  markingsNotFromOcr,
  wheelTypeDiffersFromSuggestion,
  withAcceptedReanalysis,
  withReanalysisSuspicion,
  type ConfirmedWheelFields,
} from './confirm';
import { normalizeExpiry } from './parser';
import { isValidWheelSpec } from '@/lib/backup/recordSanitize';
import { RULE, matchSpecs } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import { BONDED_ABRASIVE_PROFILE, profileFor } from '@/lib/rules/profiles';

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
        priorDamageSources: ['legacy_exam'],
      });
      expect(spec.visibleDamage).toBe('suspected');
    }
  });

  it.each(['legacy_exam', 'dropped_ocr', 'carried'] as const)(
    '이어받은 의심(%s)은 어느 흔적에서 왔든 의심으로 남긴다',
    (source) => {
      // 출처로 받게 바꾸면서 어느 하나가 의심을 만들지 못하게 되면, 그 흔적이
      // 이어 오던 경고가 확정하는 순간 사라진다.
      const ocr = ocrWheel({ visibleDamage: 'none_visible' });
      const spec = confirmedWheelSpec(ocr, {
        ...untouched(ocr),
        priorDamageSources: [source],
      });
      expect(spec.visibleDamage).toBe('suspected');
    },
  );

  it.each([[[]], [undefined]] as const)(
    '이전 의심이 없다는 값(%j)은 라벨 사진의 의심을 지우지 못한다',
    (priorDamageSources) => {
      // 이 방향이 깨지면 "새 버전으로 넘어왔더니 경고가 사라지는" 앱이 된다.
      const ocr = ocrWheel({ visibleDamage: 'suspected' });
      const spec = confirmedWheelSpec(ocr, {
        ...untouched(ocr),
        priorDamageSources,
      });
      expect(spec.visibleDamage).toBe('suspected');
    },
  );

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
// 외관 의심의 출처
//
// 이어받은 의심도 확정값을 'suspected'로 만든다. 그런데 엔진의 사유 문장은 어느
// 경우든 "사진에서 … 보이는 부분이 있습니다"이고, 기록에 남는 사진과 OCR 원본은 그
// 의심을 담고 있지 않을 수 있다. 출처가 확정값에 함께 남아야 결과 화면과 기록이
// 어디서 온 의심인지 말할 수 있다.
// ─────────────────────────────────────────────────────────────

describe('confirmedWheelSpec — 외관 의심의 출처', () => {
  it('라벨 사진의 판독이 의심했으면 출처는 라벨 사진이다', () => {
    const ocr = ocrWheel({ visibleDamage: 'suspected' });
    const spec = confirmedWheelSpec(ocr, untouched(ocr));

    expect(spec.visibleDamageSources).toEqual(['label_photo']);
  });

  it.each(['none_visible', 'unknown'] as const)(
    '의심이 없으면(%s) 출처 칸을 만들지 않는다',
    (fromLabel) => {
      // 빈 목록도 남기지 않는다. 칸이 있으면 의심이라는 뜻으로 읽는다.
      const ocr = ocrWheel({ visibleDamage: fromLabel });
      const spec = confirmedWheelSpec(ocr, untouched(ocr));

      expect(spec.visibleDamage).toBe(fromLabel);
      expect('visibleDamageSources' in spec).toBe(false);
    },
  );

  it.each(['legacy_exam', 'dropped_ocr', 'carried'] as const)(
    '이어받은 의심(%s)만 있으면 출처에 라벨 사진을 적지 않는다',
    (source) => {
      // 이 사진의 판독은 의심하지 않았다. 여기에 label_photo가 섞이면 결과 화면이
      // 출처 문장을 붙이지 않아, 이어받은 의심이 "이 사진에서 보인 것"으로 읽힌다.
      for (const fromLabel of ['none_visible', 'unknown'] as const) {
        const ocr = ocrWheel({ visibleDamage: fromLabel });
        const spec = confirmedWheelSpec(ocr, {
          ...untouched(ocr),
          priorDamageSources: [source],
        });

        expect(spec.visibleDamage).toBe('suspected');
        expect(spec.visibleDamageSources).toEqual([source]);
      }
    },
  );

  it('라벨 사진의 판독도 의심했으면 둘 다 적는다 — 라벨 사진이 먼저다', () => {
    const ocr = ocrWheel({ visibleDamage: 'suspected' });
    const spec = confirmedWheelSpec(ocr, {
      ...untouched(ocr),
      priorDamageSources: ['carried'],
    });

    expect(spec.visibleDamageSources).toEqual(['label_photo', 'carried']);
  });

  it('여러 흔적에서 이어받았으면 넘겨받은 순서대로 모두 적고, 같은 출처는 한 번만 적는다', () => {
    const ocr = ocrWheel({ visibleDamage: 'none_visible' });
    const spec = confirmedWheelSpec(ocr, {
      ...untouched(ocr),
      priorDamageSources: ['legacy_exam', 'dropped_ocr', 'legacy_exam'],
    });

    expect(spec.visibleDamageSources).toEqual(['legacy_exam', 'dropped_ocr']);
  });

  it('사진 판독 없이(직접 입력) 확정해도 이어받은 의심과 출처는 남는다', () => {
    // 라벨을 다시 찍으려다 서버에 닿지 못해 직접 입력으로 넘어간 경우다.
    const spec = confirmedWheelSpec(null, {
      maxRPM: 13300,
      diameter: 100,
      thickness: 1,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      expiryText: '',
      userConfirmed: true,
      priorDamageSources: ['carried'],
    });

    expect(spec.visibleDamage).toBe('suspected');
    expect(spec.visibleDamageSources).toEqual(['carried']);
  });

  it('출처는 판정을 바꾸지 않는다 — 같은 의심이면 어디서 왔든 같은 결과다', () => {
    const judge = (spec: WheelSpec) => {
      const result = matchSpecs(grinder(), spec, {
        declaredPurpose: 'cutting',
        profile: BONDED_ABRASIVE_PROFILE,
        today: TODAY,
      });
      return {
        verdict: result.verdict,
        checks: result.checks.map(({ rule, passed, reason, detail }) => ({
          rule,
          passed,
          reason,
          detail,
        })),
      };
    };
    const suspectedByLabel = ocrWheel({ visibleDamage: 'suspected' });
    const fromLabel = confirmedWheelSpec(
      suspectedByLabel,
      untouched(suspectedByLabel, { userConfirmed: true }),
    );
    const clean = ocrWheel({ visibleDamage: 'none_visible' });
    const inherited = confirmedWheelSpec(clean, {
      ...untouched(clean, { userConfirmed: true }),
      priorDamageSources: ['carried'],
    });

    expect(fromLabel.visibleDamageSources).not.toEqual(
      inherited.visibleDamageSources,
    );
    expect(judge(inherited)).toEqual(judge(fromLabel));
    // 외관 손상은 경고일 뿐이라 적합을 막지 않는다. 출처를 적어도 그대로다.
    expect(judge(inherited).verdict).toBe('COMPATIBLE');
  });

  it('출처가 붙은 확정값은 새로고침·복구·백업의 규격 검사를 통과한다', () => {
    // 검사(isValidWheelSpec)에 걸리면 새로고침 한 번에 숫돌 단계가 통째로 버려지고
    // 이어받은 의심이 숫돌과 함께 사라진다.
    const ocr = ocrWheel({ visibleDamage: 'suspected' });
    const spec = confirmedWheelSpec(ocr, {
      ...untouched(ocr),
      priorDamageSources: ['legacy_exam', 'dropped_ocr', 'carried'],
    });
    const stored: unknown = JSON.parse(JSON.stringify(spec));

    expect(isValidWheelSpec(stored)).toBe(true);
    expect((stored as WheelSpec).visibleDamageSources).toEqual([
      'label_photo',
      'legacy_exam',
      'dropped_ocr',
      'carried',
    ]);
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

  /**
   * 받아들일 수 있는 재분석으로 바꾼 확정값.
   *
   * 표기가 충돌하면 withAcceptedReanalysis는 null을 낸다. 충돌이 없다고 보고 쓴
   * 테스트가 null을 조용히 지나가지 않게 여기서 멈춘다.
   */
  function accepted(wheel: WheelSpec, reanalyzed: WheelSpec): WheelSpec {
    const next = withAcceptedReanalysis(wheel, reanalyzed);
    if (next === null) {
      throw new Error('표기가 충돌해 받아들일 수 없는 재분석이다');
    }
    return next;
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

      expect(next).toEqual({
        ...wheel,
        visibleDamage: 'suspected',
        visibleDamageSources: ['reanalysis'],
      });
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
          priorDamageSources: ['dropped_ocr'],
        });
        const reanalyzed = ocrWheel({ visibleDamage: fromReanalysis });

        expect(withReanalysisSuspicion(wheel, reanalyzed).visibleDamage).toBe(
          'suspected',
        );
        expect(accepted(wheel, reanalyzed).visibleDamage).toBe('suspected');
      },
    );

    it.each(['none_visible', 'unknown'] as const)(
      '재분석의 판독이 %s 이면 이어받은 의심의 출처도 그대로다',
      (fromReanalysis) => {
        const wheel = confirmedWheelSpec(null, {
          ...TYPED,
          priorDamageSources: ['dropped_ocr'],
        });

        // 의심하지 않은 재분석은 출처에 끼지 않는다. 같은 객체가 돌아온다.
        expect(
          withReanalysisSuspicion(
            wheel,
            ocrWheel({ visibleDamage: fromReanalysis }),
          ),
        ).toBe(wheel);
      },
    );

    it('이어받은 의심만 있던 숫돌을 재분석도 의심하면 출처에 재분석을 더한다', () => {
      // 재분석은 이 점검의 라벨 사진을 본 판독이다. "이 사진의 판독도 의심했다"가
      // 새로 생긴 사실이라, 이어받은 출처를 지우지 않고 뒤에 잇는다.
      const wheel = confirmedWheelSpec(null, {
        ...TYPED,
        priorDamageSources: ['carried'],
      });
      const reanalyzed = ocrWheel({ visibleDamage: 'suspected' });
      const next = withReanalysisSuspicion(wheel, reanalyzed);

      expect(next).toEqual({
        ...wheel,
        visibleDamageSources: ['carried', 'reanalysis'],
      });
      // 넘겨받은 확정값은 고치지 않는다.
      expect(wheel.visibleDamageSources).toEqual(['carried']);
      // 이미 적혀 있으면 다시 적지 않는다. 같은 객체가 돌아온다 — 저장소가 같은
      // 값을 되풀이해 쓰지 않는다.
      expect(withReanalysisSuspicion(next, reanalyzed)).toBe(next);
    });

    it('의심이 아닌데 출처가 남아 있던 확정값은 재분석 하나로 새로 적는다 — 남은 출처를 의심의 근거로 되살리지 않는다', () => {
      // 앱이 쓰는 모양이 아니다(의심이 아니면 출처 칸이 없다). 저장된 값이 의심이
      // 아니었던 출처를 이으면, 의심이 아니던 것을 의심으로 만든 셈이 된다.
      const wheel: WheelSpec = {
        ...typedWheel(),
        visibleDamage: 'none_visible',
        visibleDamageSources: ['carried'],
      };
      const next = withReanalysisSuspicion(
        wheel,
        ocrWheel({ visibleDamage: 'suspected' }),
      );

      expect(next.visibleDamage).toBe('suspected');
      expect(next.visibleDamageSources).toEqual(['reanalysis']);
    });

    it('출처 없이 의심인 확정값은 재분석이 의심해도 그대로 둔다', () => {
      // 출처 표시가 생기기 전에 확정된 값이다(앱이 갱신된 뒤 이어진 점검). 재분석만
      // 적으면 그것이 유일한 출처인 것처럼 읽힌다. 출처 미기록으로 남긴다.
      const wheel: WheelSpec = { ...typedWheel(), visibleDamage: 'suspected' };

      expect(
        withReanalysisSuspicion(
          wheel,
          ocrWheel({ visibleDamage: 'suspected' }),
        ),
      ).toBe(wheel);
    });
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
      const next = accepted(wheel, reanalyzed);

      expect(next).toEqual({
        ...wheel,
        visibleDamage: 'suspected',
        visibleDamageSources: ['reanalysis'],
        markings: reanalyzed.markings,
      });
      expect(next.rpmSource).toBe('user');
      expect(next.confidence).toBe('high');
    });

    it('옮겨 온 원본 표시는 OCR 원본과 객체를 공유하지 않는다', () => {
      const reanalyzed = ocrWheel();
      const next = accepted(typedWheel(), reanalyzed);

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
        expect(isValidWheelSpec(stored(accepted(wheel, reanalyzed)))).toBe(
          true,
        );
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
      const viaReanalysis = accepted(typedWheel(), reanalyzed);
      const onlineFromStart = confirmedWheelSpec(reanalyzed, TYPED);

      expect(outcome(viaReanalysis)).toEqual(outcome(onlineFromStart));
    });

    it('표기가 서로 어긋난 판독으로 전환하면 적합이 아니라 판정불가다', () => {
      const next = accepted(
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
      const next = accepted(wheel, ocrWheel());

      expect(judge(wheel).verdict).toBe('UNDETERMINED');
      expect(
        judge(next).checks.find((c) => c.rule === RULE.UNIT_CONSISTENCY)
          ?.passed,
      ).toBe(true);
      expect(judge(next).verdict).toBe('UNDETERMINED');
    });
  });

  describe('로컬 OCR이 읽어 둔 표기 — 빈 자리만 채운다', () => {
    it('로컬 OCR이 올린 표기 불일치는 서버가 그 칸을 읽지 못했으면 그대로 남는다', () => {
      // 서버가 읽지 못한 칸은 기권이다. 로컬이 올린 어긋남을 지울 근거가 못 된다.
      const wheel = localOcrWheel({ peripheralSpeedMps: 8 });
      expect(judge(wheel).verdict).toBe('UNDETERMINED');

      const next = accepted(wheel, ocrWheel({}, { peripheralSpeedMps: null }));

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

      const next = accepted(wheel, ocrWheel({}, { peripheralSpeedMps: 8 }));

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
      const next = accepted(wheel, ocrWheel({}, { expiryRaw: '01/2030' }));

      expect(next.markings).toEqual({
        ...wheel.markings,
        expiryRaw: '01/2030',
      });
      // 원문은 판정에 쓰이지 않는다. 판정에 쓰이는 유효기한은 작업자가 확정한 값이다.
      expect(next.expiry).toEqual(wheel.expiry);
      expect(outcome(next)).toEqual(outcome(wheel));
    });

    it('유효기한 원문은 서로 달라도 표기 충돌이 아니고, 이미 있는 원문은 덮지 않는다', () => {
      // 원문은 판정에 쓰이지 않는다. 판정에 쓰이는 유효기한은 작업자가 확정한 값이고,
      // 그 값이 재분석 판독과 다른지는 confirmedValueAgreement가 본다.
      const wheel = localOcrWheel({});
      const reanalyzed = ocrWheel({}, { expiryRaw: '01/2030' });

      expect(markingConflicts(wheel, reanalyzed)).toEqual([]);
      // 채울 빈 자리가 없다. 같은 객체가 돌아온다.
      expect(withAcceptedReanalysis(wheel, reanalyzed)).toBe(wheel);
    });

    it('재분석도 유효기한 원문을 읽지 못했으면 없는 칸을 만들지 않는다', () => {
      const wheel = localOcrWheel({ expiryRaw: null });

      expect(
        withAcceptedReanalysis(wheel, ocrWheel({}, { expiryRaw: null })),
      ).toBe(wheel);
    });
  });

  describe('표기 충돌 — 두 판독이 같은 칸을 다르게 읽으면 받아들이지 않는다', () => {
    // 빈 자리만 채우면, 두 판독이 같은 칸을 **다르게** 읽었을 때 로컬 표기가 조용히
    // 이긴다. 값이 있고 다른 것은 충돌이고 어느 쪽이 맞는지 앱은 모른다
    // (safety-critical.md 3번). 값이 없는 것은 기권이라 충돌이 아니다(vision-ocr.md).

    /** 로컬 OCR로 읽은 숫돌을 확정할 때 작업자가 넣은 값 */
    const LOCAL_FIELDS = untouched(ocrWheel(), {
      wheelType: 'bonded_abrasive',
      userConfirmed: true,
    });

    it('서버가 m/s 표기를 다르게 읽으면 받아들이지 않는다 — 받아들이면 재분석 경로만 적합이 된다', () => {
      // 라벨 Φ125 / 12,200rpm / 80m/s. 로컬 OCR은 그대로 읽었고 서버는 m/s를 30으로
      // 읽었다. 회전속도와 지름은 서로 같아, 그 둘만 견주면 전환이 열린다.
      const wheel = localOcrWheel({});
      const reanalyzed = ocrWheel({}, { peripheralSpeedMps: 30 });

      expect(markingConflicts(wheel, reanalyzed)).toEqual([
        { key: 'peripheralSpeedMps', confirmed: 80, reanalyzed: 30 },
      ]);
      expect(withAcceptedReanalysis(wheel, reanalyzed)).toBeNull();

      // 왜 받아들이지 않는가. 같은 사진을 처음부터 서버로 읽었다면 표기 불일치로
      // 판정불가였다. 로컬 표기를 남긴 채 온라인 대조로 바꾸면 그 판독이 판정에서
      // 빠져 적합이 된다.
      expect(judge(confirmedWheelSpec(reanalyzed, LOCAL_FIELDS)).verdict).toBe(
        'UNDETERMINED',
      );
      expect(judge(wheel).verdict).toBe('COMPATIBLE');
    });

    it.each([
      [
        '회전속도 표기',
        { labeledRPM: 13300 },
        { key: 'labeledRPM', confirmed: 12200, reanalyzed: 13300 },
      ],
      [
        '원주속도 표기',
        { peripheralSpeedMps: 63 },
        { key: 'peripheralSpeedMps', confirmed: 80, reanalyzed: 63 },
      ],
      [
        '내경',
        { boreDiameter: 16 },
        { key: 'boreDiameter', confirmed: 22.23, reanalyzed: 16 },
      ],
    ] as const)('%s 한 칸만 달라도 충돌이다', (_name, differing, conflict) => {
      const wheel = localOcrWheel({});
      const reanalyzed = ocrWheel({}, differing);

      expect(markingConflicts(wheel, reanalyzed)).toEqual([conflict]);
      expect(withAcceptedReanalysis(wheel, reanalyzed)).toBeNull();
    });

    it('여러 칸이 다르면 다른 칸을 모두 알린다', () => {
      expect(
        markingConflicts(
          localOcrWheel({}),
          ocrWheel(
            {},
            { labeledRPM: 13300, peripheralSpeedMps: 63, boreDiameter: 16 },
          ),
        ),
      ).toEqual([
        { key: 'labeledRPM', confirmed: 12200, reanalyzed: 13300 },
        { key: 'peripheralSpeedMps', confirmed: 80, reanalyzed: 63 },
        { key: 'boreDiameter', confirmed: 22.23, reanalyzed: 16 },
      ]);
    });

    it('값이 없는 칸은 기권이다 — 어느 쪽이 못 읽었든 충돌이 아니다', () => {
      const NOTHING_READ = {
        labeledRPM: null,
        peripheralSpeedMps: null,
        boreDiameter: null,
      };

      // 서버가 못 읽었다.
      expect(
        markingConflicts(localOcrWheel({}), ocrWheel({}, NOTHING_READ)),
      ).toEqual([]);
      // 로컬 OCR이 못 읽었다.
      expect(markingConflicts(localOcrWheel(NOTHING_READ), ocrWheel())).toEqual(
        [],
      );
    });

    it('두 판독이 같게 읽었으면 충돌이 아니다', () => {
      const wheel = localOcrWheel({});

      expect(markingConflicts(wheel, ocrWheel())).toEqual([]);
      // 채울 빈 자리도 없다. 같은 객체가 돌아온다.
      expect(withAcceptedReanalysis(wheel, ocrWheel())).toBe(wheel);
    });

    it('원본 표시가 없는 쪽이 있으면 견줄 것이 없다', () => {
      // 직접 입력한 확정값에는 원본 표시가 없다.
      expect(markingConflicts(typedWheel(), ocrWheel())).toEqual([]);

      // 서버가 스키마에 맞는 응답을 못 주면 표시 없이 온다(route.ts의 emptySpec).
      const noMarkings = ocrWheel();
      delete noMarkings.markings;
      expect(markingConflicts(localOcrWheel({}), noMarkings)).toEqual([]);
    });

    it('충돌로 받아들이지 않아도 재분석이 올린 외관 의심은 따로 남는다', () => {
      // 의심은 전환과 무관하게 더한다(withReanalysisSuspicion). 충돌이 그 길을 막지 않는다.
      const wheel = localOcrWheel({});
      const reanalyzed = ocrWheel(
        { visibleDamage: 'suspected' },
        { peripheralSpeedMps: 30 },
      );

      expect(withAcceptedReanalysis(wheel, reanalyzed)).toBeNull();
      expect(withReanalysisSuspicion(wheel, reanalyzed).visibleDamage).toBe(
        'suspected',
      );
    });

    it('충돌이 없는 모든 조합에서 — 서버가 읽은 칸을 모두 담고, 처음부터 온라인으로 읽은 점검보다 느슨하게 판정되지 않는다', () => {
      // rpm·m/s 표기를 각각 「못 읽음 / 맞게 읽음 / 틀리게 읽음」으로 두 판독에 돌린다.
      const RPM = [null, 12200, 1220];
      const MPS = [null, 80, 30];
      let acceptedCount = 0;
      let refusedCount = 0;

      for (const localRpm of RPM) {
        for (const localMps of MPS) {
          for (const serverRpm of RPM) {
            for (const serverMps of MPS) {
              const name = `로컬 {${localRpm}, ${localMps}} / 서버 {${serverRpm}, ${serverMps}}`;
              const wheel = localOcrWheel({
                labeledRPM: localRpm,
                peripheralSpeedMps: localMps,
              });
              const reanalyzed = ocrWheel(
                {},
                { labeledRPM: serverRpm, peripheralSpeedMps: serverMps },
              );
              const differs = (a: number | null, b: number | null) =>
                a !== null && b !== null && a !== b;
              const next = withAcceptedReanalysis(wheel, reanalyzed);

              if (
                differs(localRpm, serverRpm) ||
                differs(localMps, serverMps)
              ) {
                expect(next, name).toBeNull();
                refusedCount += 1;
                continue;
              }
              if (next === null) {
                throw new Error(`${name}: 충돌이 없는데 받아들이지 않았다`);
              }
              acceptedCount += 1;

              // 서버가 읽은 칸은 그대로 들어 있고, 로컬이 읽어 둔 칸은 지워지지 않았다.
              expect(next.markings?.labeledRPM, name).toBe(
                serverRpm ?? localRpm,
              );
              expect(next.markings?.peripheralSpeedMps, name).toBe(
                serverMps ?? localMps,
              );

              // 온라인 경로가 적합이 아니면 재분석 경로도 적합이 아니다.
              const online = judge(
                confirmedWheelSpec(reanalyzed, LOCAL_FIELDS),
              ).verdict;
              if (online !== 'COMPATIBLE') {
                expect(judge(next).verdict, name).not.toBe('COMPATIBLE');
              }
            }
          }
        }
      }

      // 3×3×3×3가지를 실제로 돌았다. 칸마다 9쌍 중 2쌍이 충돌이다 — 7×7 = 49가지가 남는다.
      expect(acceptedCount).toBe(49);
      expect(refusedCount).toBe(32);
    });
  });

  describe('작업자가 확정한 용도·유효기한·종류 — 재분석 판독과 견준다', () => {
    // 처음부터 온라인이었다면 AI가 읽은 값이 확인 화면의 기본값으로 들어가고, 작업자가
    // 그 값을 보면서 일부러 고쳐야 바뀐다. 재분석은 확정 뒤에 오므로 AI 값이 판정에
    // 들어갈 길이 없다. 그래서 다르면 전환을 열지 않는다(OfflineReanalysisPanel) —
    // 회전속도·지름과 같은 이유다. 한쪽에 견줄 값이 없으면 기권이고, 다름이 아니다.

    const confirmed = (fields: Partial<ConfirmedWheelFields> = {}) =>
      confirmedWheelSpec(null, { ...TYPED, ...fields });

    /** 유효기한 표기를 raw로 읽은 서버 판독. 정규화는 route.ts와 같은 함수가 한다 */
    const aiExpiry = (raw: string | null) =>
      ocrWheel({ expiry: normalizeExpiry(raw) }, { expiryRaw: raw });

    /** 종류에 맞는 Profile로 판정한다. 결과 화면과 같다 */
    const judgeByType = (spec: WheelSpec) =>
      matchSpecs(grinder(), spec, {
        profile: profileFor(spec.wheelType),
        declaredPurpose: 'cutting',
        today: TODAY,
      }).verdict;

    /** 작업자가 확인 화면에서 고를 수 있는 종류. 모르겠음(unknown)은 따로 본다 */
    const SELECTABLE = [
      'bonded_abrasive',
      'bonded_cutting',
      'bonded_grinding',
      'bonded_combination',
      'bonded_cup',
      'flap_disc',
      'cup_wheel',
      'diamond',
      'diamond_continuous',
      'diamond_turbo',
      'diamond_segmented',
      'diamond_cup',
      'tuck_pointing',
      'wire_brush',
      'fibre_disc',
      'nonwoven_disc',
      'polishing_pad',
      'other',
    ] as const;

    it('세 값이 모두 재분석 판독과 같으면 같음이다', () => {
      expect(confirmedValueAgreement(confirmed(), ocrWheel())).toEqual({
        purpose: 'same',
        expiry: 'same',
        wheelType: 'same',
      });
    });

    it.each([
      ['cutting', 'cutting', 'same'],
      ['cutting', 'grinding', 'differs'],
      ['grinding', 'cutting', 'differs'],
      // 어느 한쪽이 용도를 모르면 견줄 값이 없다.
      ['cutting', 'unknown', 'abstained'],
      ['unknown', 'cutting', 'abstained'],
      ['unknown', 'unknown', 'abstained'],
    ] as const)('용도 — 작업자 %s / AI %s → %s', (worker, ai, expected) => {
      expect(
        confirmedValueAgreement(
          confirmed({ purpose: worker }),
          ocrWheel({ purpose: ai }),
        ).purpose,
      ).toBe(expected);
    });

    it.each([
      ['bonded_abrasive', 'bonded_abrasive', 'same'],
      // 세부 형식을 고른 것은 AI의 굵은 분류를 좁힌 것이지 어긋난 것이 아니다.
      ['bonded_cutting', 'bonded_abrasive', 'same'],
      ['diamond_segmented', 'diamond', 'same'],
      ['bonded_abrasive', 'diamond', 'differs'],
      ['flap_disc', 'bonded_abrasive', 'differs'],
      ['bonded_abrasive', 'other', 'differs'],
      // 어느 한쪽이 종류를 모르면 견줄 값이 없다.
      ['bonded_abrasive', 'unknown', 'abstained'],
      ['unknown', 'bonded_abrasive', 'abstained'],
    ] as const)('종류 — 작업자 %s / AI %s → %s', (worker, ai, expected) => {
      expect(
        confirmedValueAgreement(
          confirmed({ wheelType: worker }),
          ocrWheel({ wheelType: ai }),
        ).wheelType,
      ).toBe(expected);
    });

    it('종류의 다름은 확인 화면이 직접 확인을 요구하는 기준과 같다', () => {
      // 기준이 둘이면 갈라진다. 양쪽 다 종류를 말한 모든 조합에서 같은 답을 낸다.
      const AI_CLASSES = [
        'bonded_abrasive',
        'flap_disc',
        'cup_wheel',
        'diamond',
        'wire_brush',
        'other',
      ] as const;

      for (const ai of AI_CLASSES) {
        for (const worker of SELECTABLE) {
          const reanalyzed = ocrWheel({ wheelType: ai });
          expect(
            confirmedValueAgreement(
              confirmed({ wheelType: worker }),
              reanalyzed,
            ).wheelType,
            `작업자 ${worker} / AI ${ai}`,
          ).toBe(
            wheelTypeDiffersFromSuggestion(reanalyzed, worker)
              ? 'differs'
              : 'same',
          );
        }
      }
    });

    it.each([
      ['같은 달', 'same', { expiryText: '04/2027' }, '04/2027'],
      ['다른 달', 'differs', { expiryText: '04/2027' }, '04/2023'],
      ['AI가 기한을 읽지 못함', 'abstained', { expiryText: '04/2027' }, null],
      [
        'AI가 읽은 표기가 모호함(두 자리 연도)',
        'abstained',
        { expiryText: '04/2027' },
        '04/23',
      ],
      // 「찾지 못함」·「읽기 어려움」은 작업자의 답이다. AI가 날짜를 읽었다면 그
      // 답과 어긋난다 — 답 그대로 전환하면 AI가 읽은 기한이 판정에서 빠진다.
      [
        '작업자는 표시를 찾지 못했다고 답했는데 AI는 날짜를 읽음',
        'differs',
        { expiryText: '', expiryReview: 'not_found' },
        '04/2023',
      ],
      [
        '작업자는 읽기 어렵다고 답했는데 AI는 날짜를 읽음',
        'differs',
        { expiryText: '', expiryReview: 'unreadable' },
        '04/2023',
      ],
      // 날짜도 답도 없으면 견줄 값이 없다. 그 확정값은 어차피 판정불가로 남는다.
      [
        '작업자가 날짜를 비워 둠',
        'abstained',
        { expiryText: '', expiryReview: 'marked' },
        '04/2023',
      ],
      [
        '작업자가 넣은 날짜가 모호함(두 자리 연도)',
        'abstained',
        { expiryText: '04/27', expiryReview: 'marked' },
        '04/2023',
      ],
      [
        '작업자도 AI도 기한을 찾지 못함',
        'abstained',
        { expiryText: '', expiryReview: 'not_found' },
        null,
      ],
    ] as const)('유효기한 — %s → %s', (_name, expected, fields, aiRaw) => {
      expect(
        confirmedValueAgreement(confirmed(fields), aiExpiry(aiRaw)).expiry,
      ).toBe(expected);
    });

    describe('확정값 쪽에 견줄 값이 없어 기권한 경우 — 전환돼도 느슨해지지 않는다', () => {
      // 기권은 전환을 막지 않는다. 그래도 느슨해지지 않는 까닭은 값이 없는 확정값이
      // 규칙엔진에서 이미 적합에 이르지 못하기 때문인데, 그 근거는 종류별 Profile
      // 구성에 기대고 있다(profiles.ts). 아래가 깨지면 — 예를 들어 유효기한을 보지
      // 않으면서 적합까지 낼 수 있는 종류가 생기면 — confirm.ts의 기권을 다시 봐야 한다.
      const EVERY_TYPE = [...SELECTABLE, 'unknown'] as const;

      it('유효기한에 날짜도 답도 없는 확정값은 어느 종류에서도 적합이 아니다', () => {
        // AI는 날짜를 읽었다. 확정값에는 날짜가 없고 「찾지 못함」·「읽기 어려움」
        // 답도 없다.
        const reanalyzed = aiExpiry('04/2023');

        for (const wheelType of EVERY_TYPE) {
          for (const expiryReview of ['marked', undefined] as const) {
            const name = `${wheelType} / ${expiryReview ?? '답 없음'}`;
            const wheel = confirmed({
              wheelType,
              expiryText: '',
              expiryReview,
            });

            expect(
              confirmedValueAgreement(wheel, reanalyzed).expiry,
              name,
            ).toBe('abstained');
            expect(judgeByType(accepted(wheel, reanalyzed)), name).not.toBe(
              'COMPATIBLE',
            );
          }
        }
      });

      it('종류를 모르겠음으로 둔 확정값은 적합이 아니다', () => {
        // AI는 일반 결합숫돌로 보았다.
        const wheel = confirmed({ wheelType: 'unknown' });
        const reanalyzed = ocrWheel();

        expect(confirmedValueAgreement(wheel, reanalyzed).wheelType).toBe(
          'abstained',
        );
        expect(judgeByType(accepted(wheel, reanalyzed))).not.toBe('COMPATIBLE');
      });

      it('용도를 모르겠음으로 둔 확정값이 적합인 종류는, 어느 용도로 대조해도 적합이다', () => {
        // 용도를 라벨로 대조하는 종류에서는 모르겠음이 판정불가라 여기 오지 않는다.
        // 용도를 대조하지 않는 종류만 남고, 그 종류는 AI가 읽은 용도가 판정에
        // 들어가도 결과가 같다 — AI의 용도를 견주지 않아서 얻는 적합은 없다.
        const reached: string[] = [];

        for (const wheelType of EVERY_TYPE) {
          const withUnknown = judgeByType(
            confirmed({ wheelType, purpose: 'unknown' }),
          );
          if (withUnknown !== 'COMPATIBLE') continue;
          reached.push(wheelType);

          for (const purpose of ['cutting', 'grinding'] as const) {
            expect(
              judgeByType(confirmed({ wheelType, purpose })),
              `${wheelType} / ${purpose}`,
            ).toBe('COMPATIBLE');
          }
        }

        // 일반 결합숫돌은 용도를 라벨로 대조한다. 모르겠음으로는 적합이 안 된다.
        expect(reached).not.toContain('bonded_abrasive');
      });
    });

    describe('다른데도 전환하면 처음부터 온라인으로 읽은 점검보다 느슨해진다', () => {
      // 아래 세 경우가 실제로 그랬다. 재분석은 작업자가 확정한 값을 바꾸지 않으므로
      // (바꾸면 어느 쪽이 맞는지 모르는 값을 앱이 고르는 것이다), 전환을 막는 것
      // 말고는 AI가 다르게 읽었다는 사실을 판정에 반영할 길이 없다.

      it('용도 — AI는 연삭용으로 읽었는데 오늘 작업은 절단이다', () => {
        const wheel = confirmed();
        const reanalyzed = ocrWheel({ purpose: 'grinding' });

        expect(confirmedValueAgreement(wheel, reanalyzed).purpose).toBe(
          'differs',
        );
        // 전환하면 작업자가 넣은 절단용으로 적합이다.
        expect(judgeByType(accepted(wheel, reanalyzed))).toBe('COMPATIBLE');
        // 처음부터 온라인이면 AI가 읽은 용도가 기본값이라 작업 목적 불일치다.
        expect(
          judgeByType(confirmedWheelSpec(reanalyzed, untouched(reanalyzed))),
        ).toBe('INCOMPATIBLE');
      });

      it('유효기한 — 작업자는 표시를 찾지 못했는데 AI는 지난 기한을 읽었다', () => {
        const wheel = confirmed({ expiryText: '', expiryReview: 'not_found' });
        const reanalyzed = aiExpiry('04/2023');

        expect(confirmedValueAgreement(wheel, reanalyzed).expiry).toBe(
          'differs',
        );
        // 전환하면 기한 미확인 경고만 남고 적합이다.
        expect(judgeByType(accepted(wheel, reanalyzed))).toBe('COMPATIBLE');
        // 처음부터 온라인이면 「표시를 찾지 못함」을 골라도 AI가 읽은 날짜는 지워지지
        // 않아(확인 화면의 onReview) 만료로 부적합이다.
        expect(
          judgeByType(
            confirmedWheelSpec(
              reanalyzed,
              untouched(reanalyzed, { expiryReview: 'not_found' }),
            ),
          ),
        ).toBe('INCOMPATIBLE');
      });

      it('종류 — AI는 다이아몬드 휠로 보았다', () => {
        const wheel = confirmed();
        const reanalyzed = ocrWheel({ wheelType: 'diamond' });

        expect(confirmedValueAgreement(wheel, reanalyzed).wheelType).toBe(
          'differs',
        );
        // 전환하면 작업자가 고른 일반 결합숫돌의 규칙으로 적합이다.
        expect(judgeByType(accepted(wheel, reanalyzed))).toBe('COMPATIBLE');
        // 처음부터 온라인이면 AI 제안이 기본값이라 이 앱이 대조하지 않는 종류다.
        expect(
          judgeByType(confirmedWheelSpec(reanalyzed, untouched(reanalyzed))),
        ).toBe('UNDETERMINED');
      });
    });
  });

  describe('판정에 쓴 표기 중 기록된 OCR 원본과 다른 값', () => {
    // 판정 근거 화면이 이 함수로 「판정에 쓴 표기 가운데 기록된 OCR 원본과 다른
    // 칸」을 찾아 따로 보인다. 견주는 OCR 원본이 무엇인지는 기록의 모양에 달렸다.
    //
    //   재분석 판독 칸이 있는 기록 — OCR 원본 자리는 확정할 때의 판독(로컬 OCR)
    //     그대로다. 받아들인 재분석 판독이 채운 빈 자리가 원본과 다른 칸이 된다.
    //   그 칸이 생기기 전의 기록 — 전환하면 OCR 원본 자리에 서버 판독이 들어갔다.
    //     확정값에 남은 로컬 표기가 원본과 다른 칸이 된다.

    it('받아들인 재분석 판독이 채운 칸은 확정할 때의 OCR 원본과 다르다', () => {
      // 지금 저장되는 기록. 로컬 OCR은 rpm 표기만 읽었고 서버가 m/s와 내경을 더 읽었다.
      const local = localOcrWheel({
        peripheralSpeedMps: null,
        boreDiameter: null,
      });
      const next = accepted(local, ocrWheel());

      // OCR 원본은 로컬 판독이다 — 그 표기는 확정할 때 확정값으로 그대로 넘어왔다.
      expect(markingsNotFromOcr(next, local)).toEqual([
        { key: 'peripheralSpeedMps', used: 80, ocr: null },
        { key: 'boreDiameter', used: 22.23, ocr: null },
      ]);
    });

    it('확정할 때의 판독이 읽어 둔 표기는 그 OCR 원본에 그대로 있다', () => {
      // 지금 저장되는 기록. 로컬 OCR이 80m/s를 60으로 잘못 읽었고 서버는 그 칸을
      // 읽지 못했다. 판정을 막는 60은 OCR 원본(로컬 판독)에 있어 다른 칸이 없다.
      const local = localOcrWheel({ peripheralSpeedMps: 60 });
      const next = accepted(local, ocrWheel({}, { peripheralSpeedMps: null }));

      expect(judge(next).verdict).toBe('UNDETERMINED');
      expect(markingsNotFromOcr(next, local)).toEqual([]);
    });

    it('서버가 읽지 못한 칸에 남은 로컬 표기를 찾는다', () => {
      // 재분석 판독 칸이 생기기 전의 기록 — OCR 원본 자리가 서버 판독이다.
      // 로컬 OCR이 80m/s를 60으로 잘못 읽었고, 서버는 m/s 표기를 읽지 못했다.
      const reanalyzed = ocrWheel({}, { peripheralSpeedMps: null });
      const next = accepted(
        localOcrWheel({ peripheralSpeedMps: 60 }),
        reanalyzed,
      );

      // 판정을 막는 60m/s는 서버 판독 어디에도 없다.
      expect(judge(next).verdict).toBe('UNDETERMINED');
      expect(markingsNotFromOcr(next, reanalyzed)).toEqual([
        { key: 'peripheralSpeedMps', used: 60, ocr: null },
      ]);
    });

    it('확정값의 표기가 OCR 원본에서 온 것이면 없다', () => {
      const ocr = ocrWheel();

      expect(
        markingsNotFromOcr(confirmedWheelSpec(ocr, untouched(ocr)), ocr),
      ).toEqual([]);
      // 직접 입력한 숫돌을 재분석해 채운 표기는 모두 그 OCR 원본에서 왔다.
      expect(markingsNotFromOcr(accepted(typedWheel(), ocr), ocr)).toEqual([]);
    });

    it('OCR 원본과 다른 표기로 대조한 이전 기록도 그 칸을 알린다', () => {
      // 표기 충돌을 막기 전에 전환한 점검에는 로컬 표기와 서버 표기가 다른 채 남아 있다.
      expect(
        markingsNotFromOcr(
          localOcrWheel({}),
          ocrWheel({}, { peripheralSpeedMps: 30 }),
        ),
      ).toEqual([{ key: 'peripheralSpeedMps', used: 80, ocr: 30 }]);
    });

    it('OCR 원본에 표시가 통째로 없으면 확정값의 표기가 모두 해당한다', () => {
      const noMarkings = ocrWheel();
      delete noMarkings.markings;

      expect(markingsNotFromOcr(localOcrWheel({}), noMarkings)).toEqual([
        { key: 'labeledRPM', used: 12200, ocr: null },
        { key: 'peripheralSpeedMps', used: 80, ocr: null },
        { key: 'boreDiameter', used: 22.23, ocr: null },
      ]);
    });

    it('확정값에 없는 칸과 유효기한 원문은 알리지 않는다', () => {
      // 확정값이 비워 둔 칸은 판정에 쓰이지 않았다. 유효기한 원문도 판정에 쓰이지 않는다.
      expect(
        markingsNotFromOcr(
          localOcrWheel({ peripheralSpeedMps: null, expiryRaw: '01/2030' }),
          ocrWheel(),
        ),
      ).toEqual([]);
      expect(markingsNotFromOcr(typedWheel(), ocrWheel())).toEqual([]);
    });
  });
});
