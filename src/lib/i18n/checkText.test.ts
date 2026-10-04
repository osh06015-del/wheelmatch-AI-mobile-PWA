// 검사 항목 사유·값 번역 테스트.
//
// 한국어 문구가 규칙엔진 문장과 한 글자라도 다르면, 같은 점검을 두고 화면과
// 기록이 다른 말을 한다. 그래서 엔진이 낼 수 있는 조합을 넓게 돌려 전부 대조한다.
// 다른 언어는 한국어가 한 글자도 섞이지 않는지, 자리표시자가 남지 않는지 본다.

import { describe, expect, it } from 'vitest';

import { matchSpecs, RULE } from '@/lib/rules/engine';
import { BONDED_ABRASIVE_PROFILE, profileFor } from '@/lib/rules/profiles';
import type {
  CheckItem,
  GrinderSpec,
  ReasonCode,
  VisibleDamageSource,
  WheelSpec,
  WheelType,
  WorkPurpose,
} from '@/lib/rules/types';
import {
  checkReasonText,
  checkValueText,
  damageSourceNotes,
  REASON_MESSAGE_KEY,
} from './checkText';
import { LOCALES } from './index';

const HANGUL = /[가-힣]/;

function grinder(overrides: Partial<GrinderSpec> = {}): GrinderSpec {
  return {
    model: 'GWS 750-125',
    noLoadRPM: 11000,
    maxWheelDiameter: 125,
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

function wheel(overrides: Partial<WheelSpec> = {}): WheelSpec {
  return {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    expiry: { year: 2027, month: 4 },
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

const WHEEL_TYPES: WheelType[] = [
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
  'unknown',
];

// 분기마다 적어도 한 번씩 걸리게 고른 입력들이다.
const GRINDERS: GrinderSpec[] = [
  grinder(),
  grinder({ noLoadRPM: null }),
  grinder({ maxWheelDiameter: null }),
  grinder({ noLoadRPM: 1100 }), // 가장자리 속도가 상식 밖으로 낮다
  grinder({ confidence: 'low' }),
  grinder({ confidence: 'medium' }),
  // 덮개 조건의 세 분기(없음·숫돌보다 작음·직접 확인)
  grinder({ guardType: 'none' }),
  grinder({ guardType: 'grinding', guardSize: 100 }),
  grinder({ guardType: 'grinding', guardSize: 125 }),
];

const WHEELS: WheelSpec[] = [
  wheel(),
  wheel({ maxRPM: 8500 }),
  wheel({ maxRPM: null }),
  wheel({ diameter: 150 }),
  wheel({ diameter: null }),
  wheel({ purpose: 'grinding' }),
  wheel({ purpose: 'unknown' }),
  ...WHEEL_TYPES.map((wheelType) => wheel({ wheelType })),
  // 절단 전용 Profile인데 라벨은 연삭용 — 연삭 작업이면 Profile 어긋남
  wheel({ wheelType: 'bonded_cutting', purpose: 'grinding' }),
  wheel({ visibleDamage: 'suspected' }),
  wheel({ expiry: null }),
  wheel({ expiry: null, expiryReview: 'not_found' }),
  wheel({ expiry: null, expiryReview: 'unreadable' }),
  wheel({ expiry: { year: 2020, month: 1 } }),
  wheel({ maxRPM: 122000 }), // 가장자리 속도가 상식 밖으로 높다
  wheel({ confidence: 'low' }),
  wheel({
    markings: {
      labeledRPM: 12200,
      peripheralSpeedMps: 80,
      boreDiameter: 22.23,
    },
  }),
  wheel({
    markings: { labeledRPM: 12200, peripheralSpeedMps: 40, boreDiameter: null },
  }),
];

const PURPOSES: Array<WorkPurpose | null> = [null, 'cutting', 'grinding'];
const TODAYS: Array<string | null> = [null, '2026-09-08'];

const MODES = ['online', 'offline_limited'] as const;

const CHECKS: CheckItem[] = GRINDERS.flatMap((g) =>
  WHEELS.flatMap((w) =>
    PURPOSES.flatMap((declaredPurpose) =>
      TODAYS.flatMap((today) =>
        MODES.flatMap(
          (analysisMode) =>
            matchSpecs(g, w, {
              // 화면처럼 종류에 맞는 Profile을 넘긴다. 없으면 null.
              profile: profileFor(w.wheelType),
              declaredPurpose,
              today,
              analysisMode,
            }).checks,
        ),
      ),
    ),
  ),
);

function checkOf(g: GrinderSpec, w: WheelSpec, rule: string): CheckItem {
  const found = matchSpecs(g, w, {
    profile: BONDED_ABRASIVE_PROFILE,
    declaredPurpose: 'cutting',
    today: '2026-09-08',
  }).checks.find((check) => check.rule === rule);
  if (!found) throw new Error(`항목 없음: ${rule}`);
  return found;
}

describe('사유 코드', () => {
  it('엔진이 내는 모든 항목에 사유 코드가 붙는다', () => {
    expect(CHECKS.filter((check) => check.detail === undefined)).toEqual([]);
  });

  it('문구만 있고 엔진이 한 번도 내지 않는 코드가 없다', () => {
    // 쓰이지 않는 코드가 남으면 번역이 실제보다 많이 된 것처럼 보인다.
    const seen = new Set(CHECKS.map((check) => check.detail?.code));
    const unused = (Object.keys(REASON_MESSAGE_KEY) as ReasonCode[]).filter(
      (code) => !seen.has(code),
    );
    expect(unused).toEqual([]);
  });
});

describe('한국어 — 규칙엔진 문장과 글자까지 같다', () => {
  it('사유', () => {
    const drift = CHECKS.filter(
      (check) => checkReasonText(check, 'ko') !== check.reason,
    ).map((check) => ({
      code: check.detail?.code,
      engine: check.reason,
      screen: checkReasonText(check, 'ko'),
    }));
    expect(drift).toEqual([]);
  });

  it('값 — 신뢰도 말고는 엔진 값과 같다', () => {
    const drift = CHECKS.filter((check) => check.rule !== RULE.CONFIDENCE)
      .map((check) => ({ check, shown: checkValueText(check, 'ko') }))
      .filter(
        ({ check, shown }) =>
          shown.grinder !== check.grinderValue ||
          shown.wheel !== check.wheelValue,
      );
    expect(drift).toEqual([]);
  });

  it('신뢰도는 high·low 코드 대신 낱말로 적는다', () => {
    const check = checkOf(
      grinder({ confidence: 'low' }),
      wheel(),
      RULE.CONFIDENCE,
    );
    expect(checkValueText(check, 'ko')).toEqual({
      grinder: '낮음',
      wheel: '높음',
    });
  });

  it('조사를 앞 낱말에 맞춘다 — 은(는)이 그대로 남지 않는다', () => {
    const cup = checkOf(
      grinder(),
      wheel({ wheelType: 'cup_wheel' }),
      RULE.WHEEL_TYPE,
    );
    const flap = checkOf(
      grinder(),
      wheel({ wheelType: 'flap_disc' }),
      RULE.WHEEL_TYPE,
    );
    expect(checkReasonText(cup, 'ko')).toMatch(/^컵휠은 /);
    expect(checkReasonText(flap, 'ko')).toMatch(/^플랩디스크는 /);
  });
});

describe.each(LOCALES.filter(({ code }) => code !== 'ko'))(
  '$label — 한국어가 섞이지 않는다',
  ({ code }) => {
    it('사유와 값에 한글이 없다', () => {
      const leaked = CHECKS.flatMap((check) => {
        const shown = checkValueText(check, code);
        return [checkReasonText(check, code), shown.grinder, shown.wheel];
      }).filter((text): text is string => text !== null && HANGUL.test(text));
      expect([...new Set(leaked)]).toEqual([]);
    });

    it('자리표시자와 조사 표시가 남지 않는다', () => {
      const broken = CHECKS.map((check) => checkReasonText(check, code)).filter(
        (text) => /\{\w+\}|\(는\)/.test(text),
      );
      expect([...new Set(broken)]).toEqual([]);
    });
  },
);

describe('영어 사유', () => {
  it('RPM 위반에는 두 값이 들어간다', () => {
    const check = checkOf(grinder(), wheel({ maxRPM: 8500 }), RULE.RPM_SAFETY);
    expect(checkReasonText(check, 'en')).toBe(
      'The wheel max operating speed (8500rpm) is lower than the grinder no-load speed (11000rpm). The wheel can break and fly apart.',
    );
  });

  it('작업 목적 불일치에는 오늘 작업과 숫돌 용도를 번역해 넣는다', () => {
    const check = checkOf(
      grinder(),
      wheel({ purpose: 'grinding' }),
      RULE.WORK_PURPOSE,
    );
    expect(checkReasonText(check, 'en')).toBe(
      "Today's job: Cutting. This wheel: Grinding wheel. A wheel made for a different job can break under side loads.",
    );
    expect(checkValueText(check, 'en')).toEqual({
      grinder: 'Cutting',
      wheel: 'Grinding wheel',
    });
  });
});

describe('옛 기록', () => {
  it('사유 코드가 없으면 한국어 사유를 그대로 보여준다 — 빈 칸을 띄우지 않는다', () => {
    const legacy: CheckItem = {
      rule: RULE.RPM_SAFETY,
      passed: true,
      reason: '숫돌이 더 빠릅니다.',
      grinderValue: '11000rpm',
      wheelValue: '12200rpm',
    };
    expect(checkReasonText(legacy, 'en')).toBe('숫돌이 더 빠릅니다.');
    expect(checkValueText(legacy, 'en')).toEqual({
      grinder: '11000rpm',
      wheel: '12200rpm',
    });
  });

  it('모르는 사유 코드도 한국어 사유로 되돌린다', () => {
    // 새 버전 앱이 저장한 기록을 옛 버전 앱이 읽는 경우다.
    const future = {
      rule: '새 규칙',
      passed: null,
      reason: '새 규칙의 사유',
      grinderValue: null,
      wheelValue: null,
      detail: { code: 'future.rule' },
    } as unknown as CheckItem;
    expect(checkReasonText(future, 'zh')).toBe('새 규칙의 사유');
  });
});

// ─────────────────────────────────────────────────────────────
// 외관 손상 의심의 출처 문장
//
// 엔진의 사유 문장은 의심이 어디서 왔든 "사진에서 깨짐·균열로 보이는 부분이
// 있습니다"다. 이어받은 의심이면 이 점검의 사진과 OCR 원본은 그 의심을 담고 있지
// 않다 — 사유 아래에 출처를 붙여 밝힌다. 의심을 덜어내는 말은 넣지 않는다.
// ─────────────────────────────────────────────────────────────

describe('외관 손상 의심의 출처 문장', () => {
  /** 의심으로 확정된 숫돌과, 그 숫돌로 엔진이 낸 외관 손상 항목 */
  function suspected(sources: WheelSpec['visibleDamageSources']) {
    const spec = wheel({
      visibleDamage: 'suspected',
      ...(sources ? { visibleDamageSources: sources } : {}),
    });
    return { spec, check: checkOf(grinder(), spec, RULE.VISIBLE_DAMAGE) };
  }

  const notesFor = (
    sources: WheelSpec['visibleDamageSources'],
    locale: Parameters<typeof damageSourceNotes>[2] = 'ko',
  ) => {
    const { spec, check } = suspected(sources);
    return damageSourceNotes(check, spec, locale);
  };

  const CARRIED_ONLY =
    '이 의심은 라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인에서 이어받은 것입니다. 이 점검에 쓴 라벨 사진의 판독에서 나온 것이 아닙니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.';
  const CARRIED_ALSO =
    '라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인에서도 AI의 손상 의심이 있었습니다. 그 의심도 지우지 않고 이어갑니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.';
  const LEGACY_ALSO =
    '이전 버전에서 넣은 추가 사진(뒷면·가장자리·중심구멍)의 AI 외관 확인에서도 손상 의심이 있었습니다. 그 사진과 확인 결과는 이 점검 기록에 없지만, 의심은 지우지 않고 이어갑니다. 실물을 직접 확인하세요.';
  const DROPPED_ALSO =
    '읽을 수 없어 복구하지 못한 AI 판독에서도 손상 의심이 있었습니다. 그 판독은 이 점검 기록에 없지만, 의심은 지우지 않고 이어갑니다. 실물을 직접 확인하세요.';

  /** 이어받은 출처. 문장이 있는 출처 전부다 */
  const INHERITED = ['legacy_exam', 'dropped_ocr', 'carried'] as const;
  /** 이 점검의 라벨 사진을 읽은 판독. 엔진 문장이 그대로 말하므로 문장이 없다 */
  const PHOTO_READINGS = ['label_photo', 'reanalysis'] as const;

  it('엔진의 사유 문장은 출처와 무관하게 그대로다', () => {
    // 출처는 문장을 더할 뿐이다. 엔진이 낸 사유를 바꾸거나 가리지 않는다.
    const { check } = suspected(['carried']);
    expect(checkReasonText(check, 'ko')).toBe(
      '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.',
    );
  });

  describe('출처가 하나뿐일 때 — 그 출처가 의심의 전부다', () => {
    it('다시 찍기 전의 확인에서 이어받은 의심 — 이 사진의 판독이 아니라는 것과 다른 숫돌일 수 있음을 알린다', () => {
      expect(notesFor(['carried'])).toEqual([CARRIED_ONLY]);
    });

    it('이전 버전의 추가 사진 확인에서 이어받은 의심 — 그 사진이 기록에 없어도 의심은 그대로임을 알린다', () => {
      expect(notesFor(['legacy_exam'])).toEqual([
        '이 의심은 이전 버전에서 넣은 추가 사진(뒷면·가장자리·중심구멍)의 AI 외관 확인에서 이어받은 것입니다. 그 사진과 확인 결과는 이 점검 기록에 없지만, 의심은 지우지 않고 이어갑니다. 실물을 직접 확인하세요.',
      ]);
    });

    it('읽을 수 없어 버린 판독의 의심 — 이 사진을 읽은 판독이었고, 기록에 없어도 의심은 그대로임을 알린다', () => {
      expect(notesFor(['dropped_ocr'])).toEqual([
        '이 의심은 이 점검의 라벨 사진을 읽었던 AI 판독이 올린 것입니다. 저장된 그 판독을 읽을 수 없어 복구하지 못했고 이 점검 기록에도 없지만, 의심은 지우지 않고 이어갑니다. 실물을 직접 확인하세요.',
      ]);
    });

    it.each(PHOTO_READINGS)(
      '이 점검의 라벨 사진을 읽은 판독(%s)뿐이면 붙이지 않는다 — 엔진 문장이 그대로 말한다',
      (source) => {
        expect(notesFor([source])).toEqual([]);
      },
    );

    it('같은 출처가 두 번 적힌 값은 하나로 본다 — 같은 문장을 두 번 보이지 않는다', () => {
      // 손으로 고친 백업처럼 앱이 쓰지 않는 모양이다. 화면이 문장을 key로 쓰므로
      // 겹치면 React가 같은 key 둘을 받는다.
      expect(notesFor(['carried', 'carried'])).toEqual([CARRIED_ONLY]);
    });
  });

  describe('다른 출처도 있을 때 — 이어받은 출처의 문장을 빼지 않는다', () => {
    it.each(PHOTO_READINGS)(
      '이 사진의 판독(%s)도 의심했으면 「…에서도」로 바꿔 말한다 — 다른 숫돌일 수 있다는 안내는 남는다',
      (photoReading) => {
        // 빼면 결과 화면에서 서버 재분석이 의심을 더하는 순간, 보이던 출처 문장이
        // 사라진다. 앱이 보여 주던 경고를 앱이 줄이는 방향이다.
        expect(notesFor(['carried', photoReading])).toEqual([CARRIED_ALSO]);
        expect(notesFor([photoReading, 'carried'])).toEqual([CARRIED_ALSO]);
      },
    );

    it('이 사진의 판독도 의심했으면 「이 사진의 판독에서 나온 것이 아닙니다」를 말하지 않는다', () => {
      // 그 문장은 이제 거짓이다.
      for (const photoReading of PHOTO_READINGS) {
        for (const note of notesFor(['carried', photoReading])) {
          expect(note).not.toContain('나온 것이 아닙니다');
        }
      }
    });

    it('여러 곳에서 이어받았으면 적힌 순서대로 모두 알린다 — 어느 하나가 전부라고 말하지 않는다', () => {
      expect(notesFor(['legacy_exam', 'dropped_ocr'])).toEqual([
        LEGACY_ALSO,
        DROPPED_ALSO,
      ]);
      expect(notesFor(['label_photo', 'legacy_exam', 'dropped_ocr'])).toEqual([
        LEGACY_ALSO,
        DROPPED_ALSO,
      ]);
    });

    it('지금 목록에 없는 출처가 섞여 있으면 단정하지 않는다 — 아는 출처는 「…에서도」로 보인다', () => {
      // 다른 버전의 앱이 저장한 기록이다(이력은 저장소에서 바로 읽는다). 모르는
      // 출처가 이 사진의 판독이었을 수도 있어, "이 사진의 판독에서 나온 것이
      // 아닙니다"를 말할 수 없다. 객체가 원래 가진 이름(toString 등)이 문구 키로
      // 쓰이지도 않아야 한다.
      const stored = [
        'future_source',
        'toString',
        '__proto__',
        'carried',
      ] as unknown as WheelSpec['visibleDamageSources'];

      expect(notesFor(stored)).toEqual([CARRIED_ALSO]);
    });

    it('지금 목록에 없는 출처뿐이면 붙이지 않는다', () => {
      const stored = ['future_source'] as unknown as NonNullable<
        WheelSpec['visibleDamageSources']
      >;
      expect(notesFor(stored)).toEqual([]);
    });
  });

  it('이어받은 출처의 문장은 어느 것이든 실물 확인으로 끝난다 — 근거가 사라진 경고처럼 읽히지 않게', () => {
    // 출처가 기록에 없다는 말로 끝나면 위 사유 문장의 "사용하지 말고"를 무르는
    // 것으로 읽힌다. 다시 찍어야만 지워지는 흔적(이전 버전 확인·버린 판독)은 이
    // 숫돌에 대한 의심이라 더 그렇다.
    for (const source of INHERITED) {
      const [only] = notesFor([source]);
      const [also] = notesFor(['label_photo', source]);

      expect(only.endsWith('실물을 직접 확인하세요.')).toBe(true);
      expect(also.endsWith('실물을 직접 확인하세요.')).toBe(true);
      expect(only).not.toBe(also);
    }
  });

  it('출처가 기록되지 않은 의심(이 표시가 생기기 전의 기록)에는 붙이지 않는다 — 추정하지 않는다', () => {
    expect(notesFor(undefined)).toEqual([]);
    // 빈 목록도 같다. 출처에 대해 아는 것이 없다.
    expect(notesFor([])).toEqual([]);
  });

  it('의심이 아닌 숫돌에는 출처가 적혀 있어도 붙이지 않는다', () => {
    const spec = wheel({
      visibleDamage: 'none_visible',
      visibleDamageSources: ['carried'],
    });
    const check = checkOf(grinder(), spec, RULE.VISIBLE_DAMAGE);
    expect(damageSourceNotes(check, spec, 'ko')).toEqual([]);
  });

  it('외관 손상이 아닌 항목에는 붙이지 않는다', () => {
    const { spec } = suspected(['carried']);
    const others = matchSpecs(grinder(), spec, {
      profile: BONDED_ABRASIVE_PROFILE,
      declaredPurpose: 'cutting',
      today: '2026-09-08',
    }).checks.filter((check) => check.rule !== RULE.VISIBLE_DAMAGE);

    expect(others.length).toBeGreaterThan(0);
    expect(
      others.flatMap((check) => damageSourceNotes(check, spec, 'ko')),
    ).toEqual([]);
  });

  it('숫돌 규격을 넘기지 않으면 붙이지 않는다', () => {
    const { check } = suspected(['carried']);
    expect(damageSourceNotes(check, undefined, 'ko')).toEqual([]);
  });

  it('출처 타입의 값마다 문장을 붙일지가 정해져 있다', () => {
    // 출처를 더하면 타입 검사가 문구 표(DAMAGE_SOURCE_NOTE)를 채우게 막는다. 여기서는
    // 이 점검의 사진을 읽은 판독 둘만 문장이 없다는 것을 고정한다.
    const withNote: Record<VisibleDamageSource, boolean> = {
      label_photo: false,
      reanalysis: false,
      legacy_exam: true,
      dropped_ocr: true,
      carried: true,
    };
    for (const [source, expected] of Object.entries(withNote)) {
      expect(notesFor([source as VisibleDamageSource]).length > 0).toBe(
        expected,
      );
    }
  });

  describe.each(LOCALES.filter(({ code }) => code !== 'ko'))(
    '$label',
    ({ code }) => {
      it('출처마다 두 문장이 모두 있고, 한글과 자리표시자가 남지 않는다', () => {
        const notes = INHERITED.flatMap((source) => [
          ...notesFor([source], code),
          ...notesFor(['label_photo', source], code),
        ]);

        expect(notes).toHaveLength(6);
        expect(new Set(notes).size).toBe(6);
        for (const note of notes) {
          expect(note).not.toMatch(HANGUL);
          expect(note).not.toMatch(/\{\w+\}/);
          // 문구 키가 그대로 새어 나오지 않는다(번역이 빠지면 키가 보인다).
          expect(note).not.toContain('damageSource.');
        }
      });
    },
  );
});
