// 규격 요약·숫돌 조건·여유율 문구 테스트.
//
// 한국어 문장은 이 파일로 옮기기 전(requirement.ts가 직접 만들던 때)과 글자까지
// 같아야 한다. 다른 언어에는 한국어 단위·낱말이 섞이면 안 된다.

import { describe, expect, it } from 'vitest';

import { margins, wheelRequirements } from '@/lib/rules/requirement';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import {
  formatGrinderSummary,
  formatMargin,
  formatRequirement,
} from './format';
import { LOCALES, translate, type Translate } from './index';

const ko: Translate = (key, params) => translate('ko', key, params);

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
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

describe('formatGrinderSummary', () => {
  it('모델·등급·회전속도를 한 줄로 묶는다', () => {
    expect(formatGrinderSummary(grinder(), ko)).toBe(
      'GWS 750-125 · 5인치급 (최대 Φ125mm) · 11,000rpm',
    );
  });

  it('값이 없는 항목은 빼고 만든다', () => {
    expect(
      formatGrinderSummary(
        grinder({ model: null, maxWheelDiameter: null }),
        ko,
      ),
    ).toBe('11,000rpm');
  });

  it('흔치 않은 규격이어도 지름은 반드시 보여준다', () => {
    expect(formatGrinderSummary(grinder({ maxWheelDiameter: 137 }), ko)).toBe(
      'GWS 750-125 · 최대 Φ137mm · 11,000rpm',
    );
  });

  it('아무 값도 없으면 읽지 못했다고 알린다', () => {
    const empty = grinder({
      model: null,
      noLoadRPM: null,
      maxWheelDiameter: null,
    });
    expect(formatGrinderSummary(empty, ko)).toBe('명판 값을 읽지 못했습니다');
  });

  it('4.5인치급처럼 소수가 들어간 등급도 그대로 적는다', () => {
    expect(
      formatGrinderSummary(grinder({ model: null, maxWheelDiameter: 115 }), ko),
    ).toBe('4.5인치급 (최대 Φ115mm) · 11,000rpm');
  });
});

describe('formatRequirement', () => {
  it('명판 값을 뒤집어 조건을 만든다', () => {
    const texts = wheelRequirements(grinder(), 'grinding').map((item) =>
      formatRequirement(item, ko),
    );
    expect(texts.map((text) => text.label)).toEqual([
      '용도',
      '지름',
      '최고사용회전속도',
    ]);
    expect(texts.map((text) => text.condition)).toEqual([
      '연삭용',
      'Φ125mm 이하',
      '11,000rpm 이상',
    ]);
  });

  it('작업을 고르지 않으면 용도 조건을 세우지 않는다', () => {
    const [purpose] = wheelRequirements(grinder(), null).map((item) =>
      formatRequirement(item, ko),
    );
    expect(purpose.condition).toBeNull();
    expect(purpose.unknownReason).toBe(
      '작업을 고르지 않아 용도를 정할 수 없습니다.',
    );
  });

  it('명판을 읽지 못한 항목은 이유를 적는다', () => {
    const texts = wheelRequirements(
      grinder({ noLoadRPM: null, maxWheelDiameter: null }),
      'cutting',
    ).map((item) => formatRequirement(item, ko));
    expect(texts.map((text) => text.condition)).toEqual(['절단용', null, null]);
    expect(texts[1].unknownReason).toBe(
      '명판에서 허용 최대 지름을 읽지 못했습니다.',
    );
    expect(texts[2].unknownReason).toBe(
      '명판에서 무부하 회전속도를 읽지 못했습니다.',
    );
  });
});

describe('formatMargin', () => {
  it('여유가 있으면 +로 표시한다', () => {
    expect(formatMargin(10.9, ko)).toBe('여유 +10.9%');
  });

  it('모자라면 부족으로 표시한다', () => {
    expect(formatMargin(-22.7, ko)).toBe('부족 -22.7%');
  });

  it('0%는 통과지만 여유가 없다고 알린다', () => {
    expect(formatMargin(0, ko)).toBe('여유 없음 (0%)');
  });

  it('계산할 수 없으면 문구를 만들지 않는다', () => {
    expect(formatMargin(null, ko)).toBeNull();
  });

  it('결과 화면의 여유율 묶음을 그대로 적는다', () => {
    const gap = margins(grinder(), wheel({ maxRPM: 8500 }));
    expect(formatMargin(gap.rpm, ko)).toBe('부족 -22.7%');
    expect(formatMargin(gap.diameter, ko)).toBe('여유 없음 (0%)');
  });
});

describe.each(LOCALES.filter(({ code }) => code !== 'ko'))(
  '$label — 한국어 단위·낱말이 섞이지 않는다',
  ({ code }) => {
    const t: Translate = (key, params) => translate(code, key, params);

    it('요약·조건·여유율', () => {
      const texts = [
        formatGrinderSummary(grinder(), t),
        formatGrinderSummary(grinder({ maxWheelDiameter: 137 }), t),
        formatGrinderSummary(
          grinder({ model: null, noLoadRPM: null, maxWheelDiameter: null }),
          t,
        ),
        ...[
          ...wheelRequirements(grinder(), 'cutting'),
          ...wheelRequirements(
            grinder({ noLoadRPM: null, maxWheelDiameter: null }),
            null,
          ),
        ].flatMap((item) => {
          const text = formatRequirement(item, t);
          return [text.label, text.condition ?? '', text.unknownReason];
        }),
        formatMargin(10.9, t),
        formatMargin(-22.7, t),
        formatMargin(0, t),
      ];
      expect(texts.filter((text) => text && /[가-힣]/.test(text))).toEqual([]);
    });
  },
);
