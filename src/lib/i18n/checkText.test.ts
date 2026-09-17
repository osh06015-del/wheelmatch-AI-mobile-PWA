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
  WheelSpec,
  WheelType,
  WorkPurpose,
} from '@/lib/rules/types';
import {
  checkReasonText,
  checkValueText,
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
