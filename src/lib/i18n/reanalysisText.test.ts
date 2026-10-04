// 서버 재분석 판독을 화면·기록 문서가 말하는 문장.
//
// 엔진의 사유 문장(「확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한
// 값으로만 대조했습니다」)은 재분석을 받았어도 받아들이지 않았으면 그대로다 — 대조는
// 실제로 그 값으로만 했다. 그 문장은 서버가 이 사진을 다시 읽었는지를 말하지
// 않으므로, 받았다는 사실과 결과에 반영한 것을 여기 문장으로 덧붙인다. 문구가 조용히
// 바뀌지 않도록 전체를 고정한다.

import { describe, expect, it } from 'vitest';

import {
  lowConfidencePhotoKeys,
  markingConflictRowText,
  reanalysisCompareRows,
  reanalysisDetailText,
  reanalysisSummaryText,
  reanalysisValuesAgree,
} from './reanalysisText';
import { translate, type Translate } from '@/lib/i18n';
import { WHEEL_PURPOSE_LABEL } from '@/lib/i18n/checkText';
import { formatDateTime } from '@/lib/record/datetime';
import type {
  GrinderSpec,
  OcrTelemetry,
  ReanalysisRecord,
  WheelSpec,
} from '@/lib/rules/types';

const t: Translate = (key, params) => translate('ko', key, params);

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'unknown',
  rawText: '',
  confidence: 'high',
};

const TELEMETRY: OcrTelemetry = {
  engine: 'claude',
  model: 'claude-x',
  inputTokens: 1500,
  outputTokens: 120,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  durationMs: 2100,
};

const T1 = '2026-10-04T05:12:03.000Z';
const T2 = '2026-10-04T05:12:31.000Z';
const T3 = '2026-10-04T05:12:40.000Z';

function reading(overrides: Partial<ReanalysisRecord> = {}): ReanalysisRecord {
  return {
    analyzedAt: T1,
    grinderOcr: null,
    grinderOcrTelemetry: null,
    wheelOcr: { ...WHEEL, visibleDamage: 'none_visible', rawText: 'AI' },
    wheelOcrTelemetry: TELEMETRY,
    acceptedAt: null,
    damageRecheck: null,
    ...overrides,
  };
}

const NOT_ACCEPTED_ONCE =
  '서버 재분석 판독 1건 가운데 받아들인 것은 없습니다. AI가 읽은 회전속도·지름은 규격 대조에 쓰지 않았습니다.';
const ACCEPTED_ONCE =
  '서버 재분석 판독 1건 가운데 1건을 받아들였습니다. AI가 읽은 회전속도·지름이 작업자가 확정한 값과 같음을 확인하고 숫돌 라벨 단계의 제한 대조를 푼 것입니다. 작업자가 확정한 값은 AI 값으로 바꾸지 않았습니다.';
const DAMAGE =
  '재분석한 AI가 사진에서 손상 징후를 의심했고, 그 경고는 결과의 외관 손상 항목에 반영했습니다.';

describe('reanalysisSummaryText — 한눈에 보이는 요약', () => {
  it('재분석이 없거나 알 수 없는 기록에는 아무 말도 하지 않는다', () => {
    expect(reanalysisSummaryText([], t)).toEqual([]);
    expect(reanalysisSummaryText(undefined, t)).toEqual([]);
    expect(reanalysisSummaryText(null, t)).toEqual([]);
  });

  it('받아들인 판독이 없으면 AI가 읽은 회전속도·지름을 대조에 쓰지 않았다고 말한다', () => {
    // "AI 값을 쓰지 않았다"고 뭉뚱그리지 않는다. 바로 뒤에 "AI의 경고는 반영했다"가
    // 올 수 있어, 무엇을 쓰지 않았는지 좁혀 말해야 서로 반대로 읽히지 않는다.
    expect(reanalysisSummaryText([reading()], t)).toEqual([NOT_ACCEPTED_ONCE]);
  });

  it('남아 있는 판독 수를 그대로 적는다', () => {
    expect(
      reanalysisSummaryText(
        [reading(), reading({ analyzedAt: T2 }), reading({ analyzedAt: T3 })],
        t,
      )[0],
    ).toBe(
      '서버 재분석 판독 3건 가운데 받아들인 것은 없습니다. AI가 읽은 회전속도·지름은 규격 대조에 쓰지 않았습니다.',
    );
  });

  it('여러 번 받아 일부만 받아들였으면 받은 수와 받아들인 수를 따로 말한다', () => {
    // "3회 받았고 같음을 확인해 …"라고 쓰면 세 판독이 모두 일치한 것처럼 읽힌다.
    expect(
      reanalysisSummaryText(
        [
          reading({ wheelOcr: { ...WHEEL, maxRPM: 13300 } }),
          reading({ analyzedAt: T2, wheelOcr: { ...WHEEL, diameter: 115 } }),
          reading({ analyzedAt: T3, acceptedAt: T3 }),
        ],
        t,
      )[0],
    ).toBe(
      '서버 재분석 판독 3건 가운데 1건을 받아들였습니다. AI가 읽은 회전속도·지름이 작업자가 확정한 값과 같음을 확인하고 숫돌 라벨 단계의 제한 대조를 푼 것입니다. 작업자가 확정한 값은 AI 값으로 바꾸지 않았습니다.',
    );
  });

  it('명판과 숫돌을 함께 받아들였으면 두 단계를 모두 말한다', () => {
    expect(
      reanalysisSummaryText(
        [
          reading({
            grinderOcr: GRINDER,
            grinderOcrTelemetry: TELEMETRY,
            acceptedAt: T3,
          }),
        ],
        t,
      )[0],
    ).toBe(
      '서버 재분석 판독 1건 가운데 1건을 받아들였습니다. AI가 읽은 회전속도·지름이 작업자가 확정한 값과 같음을 확인하고 그라인더 명판·숫돌 라벨 단계의 제한 대조를 푼 것입니다. 작업자가 확정한 값은 AI 값으로 바꾸지 않았습니다.',
    );
  });

  it('전환한 뒤 숫돌만 다시 확정한 기록에는 명판 단계만 바꿨다고 말한다 — 점검 전체가 온라인이 됐다고 하지 않는다', () => {
    // 그 점검은 다시 제한 대조일 수 있다(새 숫돌을 서버 판독 없이 확정). 요약이
    // 「온라인 대조로 바꿨습니다」로 끝나면 제한 대조 기록이 실제보다 검증된 것처럼
    // 읽힌다. 숫돌 판독은 이전 숫돌의 것이라 기록에서 빠져 있다.
    const [line] = reanalysisSummaryText(
      [
        reading({
          grinderOcr: GRINDER,
          grinderOcrTelemetry: TELEMETRY,
          wheelOcr: null,
          wheelOcrTelemetry: null,
          acceptedAt: T3,
        }),
      ],
      t,
    );
    expect(line).toBe(
      '서버 재분석 판독 1건 가운데 1건을 받아들였습니다. AI가 읽은 회전속도·지름이 작업자가 확정한 값과 같음을 확인하고 그라인더 명판 단계의 제한 대조를 푼 것입니다. 작업자가 확정한 값은 AI 값으로 바꾸지 않았습니다.',
    );
    expect(line).not.toContain('숫돌 라벨');
  });

  it('재분석한 AI가 의심했으면 그 경고를 결과에 반영했다고 말한다', () => {
    expect(
      reanalysisSummaryText(
        [reading({ wheelOcr: { ...WHEEL, visibleDamage: 'suspected' } })],
        t,
      ),
    ).toEqual([NOT_ACCEPTED_ONCE, DAMAGE]);
  });

  it('전환했으면 무엇을 확인해 바꿨는지, 다시 받은 답까지 말한다', () => {
    expect(
      reanalysisSummaryText(
        [
          reading({
            wheelOcr: { ...WHEEL, visibleDamage: 'suspected' },
            acceptedAt: T3,
            damageRecheck: { damageFree: true, answeredAt: T2 },
          }),
        ],
        t,
      ),
    ).toEqual([
      ACCEPTED_ONCE,
      DAMAGE,
      'AI 경고를 본 뒤 숫돌 손상 항목(깨짐·갈라짐)을 다시 물었고, 작업자가 「확인함」으로 답했습니다.',
    ]);
  });

  it('「문제 있음」으로 답한 기록을 「확인함」으로 바꿔 말하지 않는다', () => {
    expect(
      reanalysisSummaryText(
        [
          reading({
            wheelOcr: { ...WHEEL, visibleDamage: 'suspected' },
            damageRecheck: { damageFree: false, answeredAt: T2 },
          }),
        ],
        t,
      ).at(-1),
    ).toBe(
      'AI 경고를 본 뒤 숫돌 손상 항목(깨짐·갈라짐)을 다시 물었고, 작업자가 「문제 있음」으로 답했습니다.',
    );
  });
});

describe('reanalysisDetailText — 판독마다의 내역', () => {
  it('없는 기록에는 내역도 없다', () => {
    expect(reanalysisDetailText(undefined, GRINDER, WHEEL, t, 'ko')).toEqual(
      [],
    );
    expect(reanalysisDetailText([], GRINDER, WHEEL, t, 'ko')).toEqual([]);
  });

  it('도착 시각·모델과 함께, AI 값을 확정값과 나란히 적는다', () => {
    const [detail] = reanalysisDetailText(
      [
        reading({
          wheelOcr: { ...WHEEL, maxRPM: 13300, visibleDamage: 'suspected' },
        }),
      ],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );

    expect(detail.heading).toBe(
      `재분석 1 · ${formatDateTime(T1)} · 모델 claude-x`,
    );
    expect(detail.lines).toEqual([
      '최고사용회전속도: 확정한 값 12200rpm / AI 값 13300rpm · 다름',
      '지름: 확정한 값 Φ125mm / AI 값 Φ125mm · 같음',
      '용도: 확정한 값 절단용 / AI 값 절단용 · 같음',
      // 양쪽 다 기한이 없다. 견줄 값이 없는 것이지 같은 것이 아니다.
      '유효기한: 확정한 값 — / AI 값 — · 견줄 값 없음',
      '숫돌 종류: 확정한 값 일반 결합숫돌 / AI 값 일반 결합숫돌 · 같음',
      'AI 외관 판독: 손상 징후 의심',
      '제한 대조: 풀지 않음',
    ]);
  });

  it('받아들인 시각과 다시 받은 손상 답을 시각과 함께 적는다', () => {
    const [detail] = reanalysisDetailText(
      [
        reading({
          acceptedAt: T3,
          damageRecheck: { damageFree: true, answeredAt: T2 },
        }),
      ],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );

    expect(detail.lines.slice(-2)).toEqual([
      `제한 대조: 이 판독을 확인하고 풂 (${formatDateTime(T3)})`,
      `손상 항목 다시 확인: 「확인함」 (${formatDateTime(T2)})`,
    ]);
  });

  it('명판을 함께 읽었으면 명판 값을 먼저 적는다', () => {
    const [detail] = reanalysisDetailText(
      [
        reading({
          grinderOcr: { ...GRINDER, noLoadRPM: 13000 },
          grinderOcrTelemetry: TELEMETRY,
        }),
      ],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );

    expect(detail.lines.slice(0, 2)).toEqual([
      '무부하 회전속도: 확정한 값 11000rpm / AI 값 13000rpm · 다름',
      '허용 숫돌 최대 지름: 확정한 값 Φ125mm / AI 값 Φ125mm · 같음',
    ]);
  });

  it('명판만 읽은 판독에는 외관 판독을 적지 않는다', () => {
    const [detail] = reanalysisDetailText(
      [
        reading({
          grinderOcr: GRINDER,
          grinderOcrTelemetry: TELEMETRY,
          wheelOcr: null,
          wheelOcrTelemetry: null,
        }),
      ],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );

    expect(detail.lines).toEqual([
      '무부하 회전속도: 확정한 값 11000rpm / AI 값 11000rpm · 같음',
      '허용 숫돌 최대 지름: 확정한 값 Φ125mm / AI 값 Φ125mm · 같음',
      '제한 대조: 풀지 않음',
    ]);
  });

  it('AI가 읽지 못한 값은 —로 적고 같다고 하지 않는다', () => {
    const [detail] = reanalysisDetailText(
      [reading({ wheelOcr: { ...WHEEL, maxRPM: null } })],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );

    expect(detail.lines[0]).toBe(
      '최고사용회전속도: 확정한 값 12200rpm / AI 값 — · 다름',
    );
  });

  it('회전속도·지름이 같아도 용도·유효기한·종류가 달랐으면 그 줄이 다름으로 남는다', () => {
    // 이 줄이 없으면 기록은 「같음, 같음 … 풀지 않음」으로만 보여, 작업자가 취소한
    // 것인지 값이 달라 막힌 것인지 알 수 없다.
    const confirmed: WheelSpec = { ...WHEEL, expiryReview: 'not_found' };
    const [detail] = reanalysisDetailText(
      [
        reading({
          wheelOcr: {
            ...WHEEL,
            purpose: 'grinding',
            wheelType: 'diamond',
            expiry: { year: 2023, month: 4 },
            visibleDamage: 'none_visible',
          },
        }),
      ],
      GRINDER,
      confirmed,
      t,
      'ko',
    );

    expect(detail.lines).toEqual([
      '최고사용회전속도: 확정한 값 12200rpm / AI 값 12200rpm · 같음',
      '지름: 확정한 값 Φ125mm / AI 값 Φ125mm · 같음',
      '용도: 확정한 값 절단용 / AI 값 연삭용 · 다름',
      // 작업자의 답(표시를 찾지 못함)과 AI가 읽은 날짜는 서로 다른 말이다.
      '유효기한: 확정한 값 표시를 찾지 못함 / AI 값 04/2023 · 다름',
      '숫돌 종류: 확정한 값 일반 결합숫돌 / AI 값 다이아몬드 휠 · 다름',
      'AI 외관 판독: 사진에서 손상 징후를 찾지 못함 — 손상이 없다는 뜻이 아닙니다',
      '제한 대조: 풀지 않음',
    ]);
  });

  it('낮은 신뢰도로 읽은 사진을 비교표 뒤에 적는다 — 값이 모두 같아도 풀리지 않는 까닭이다', () => {
    const [detail] = reanalysisDetailText(
      [
        reading({
          grinderOcr: { ...GRINDER, confidence: 'low' },
          grinderOcrTelemetry: TELEMETRY,
          wheelOcr: { ...WHEEL, confidence: 'low' },
        }),
      ],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );

    expect(detail.lines.slice(7)).toEqual([
      '그라인더 명판: AI 인식 신뢰도 낮음',
      '숫돌 라벨: AI 인식 신뢰도 낮음',
      'AI 외관 판독: 판별하지 못함',
      '제한 대조: 풀지 않음',
    ]);
  });

  it('신뢰도가 보통·높음이면 신뢰도 줄을 만들지 않는다', () => {
    const [detail] = reanalysisDetailText(
      [reading({ wheelOcr: { ...WHEEL, confidence: 'medium' } })],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(detail.lines.join('\n')).not.toContain('신뢰도');
  });

  describe('라벨 원본 표기의 충돌', () => {
    // 그때 견준 상대는 확정값에 실려 있던 표기 — 확정할 때의 판독(기록의 OCR 원본)이
    // 읽은 것이다. 저장된 확정값이 아니라 OCR 원본과 견줘야 그때의 충돌이 나온다.

    /** 기기 안 OCR이 읽은 원본 — rpm 표기와 내경만 읽었다 */
    const ORIGINAL: WheelSpec = {
      ...WHEEL,
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: null,
        boreDiameter: 22.23,
        expiryRaw: null,
      },
      rawText: 'local',
    };
    const reread = (markings: Partial<NonNullable<WheelSpec['markings']>>) =>
      reading({
        wheelOcr: {
          ...WHEEL,
          markings: { ...ORIGINAL.markings!, ...markings },
        },
      });

    it('OCR 원본과 다르게 읽은 칸을 「앞선 판독 / AI 값」으로 적는다', () => {
      const [detail] = reanalysisDetailText(
        [reread({ labeledRPM: 13300, boreDiameter: 16 })],
        GRINDER,
        { ...WHEEL, markings: { ...ORIGINAL.markings! } },
        t,
        'ko',
        ORIGINAL,
      );

      // 비교표 다섯 줄 뒤, 외관 판독 앞에 온다.
      expect(detail.lines.slice(5)).toEqual([
        '회전속도 표기: 앞선 판독 12200rpm / AI 값 13300rpm · 다름',
        '내경 표기: 앞선 판독 Φ22.23mm / AI 값 Φ16mm · 다름',
        'AI 외관 판독: 판별하지 못함',
        '제한 대조: 풀지 않음',
      ]);
    });

    it('한쪽이 읽지 못한 칸은 충돌이 아니다', () => {
      const [detail] = reanalysisDetailText(
        // 원본이 못 읽은 m/s를 서버가 읽었고, 원본이 읽은 내경을 서버가 못 읽었다.
        [reread({ peripheralSpeedMps: 80, boreDiameter: null })],
        GRINDER,
        { ...WHEEL, markings: { ...ORIGINAL.markings! } },
        t,
        'ko',
        ORIGINAL,
      );
      expect(detail.lines.join('\n')).not.toContain('표기');
    });

    it('뒤에 받아들인 판독이 채운 칸과 견주지 않는다 — 그때 없던 충돌을 지어내지 않는다', () => {
      // 첫 판독은 m/s를 30으로 읽었고(그때 확정값의 m/s는 비어 있어 충돌이 아니다)
      // 받아들이지 않았다. 둘째 판독은 80으로 읽었고 받아들여 빈 자리를 채웠다.
      // 저장된 확정값(80)과 견주면 첫 판독에 없던 충돌이 생겨 보인다.
      const filled: WheelSpec = {
        ...WHEEL,
        markings: { ...ORIGINAL.markings!, peripheralSpeedMps: 80 },
      };
      const [first, second] = reanalysisDetailText(
        [
          reread({ peripheralSpeedMps: 30 }),
          {
            ...reread({ peripheralSpeedMps: 80 }),
            analyzedAt: T2,
            acceptedAt: T3,
          },
        ],
        GRINDER,
        filled,
        t,
        'ko',
        ORIGINAL,
      );

      expect(first.lines.join('\n')).not.toContain('표기');
      expect(second.lines.join('\n')).not.toContain('표기');
    });

    it('OCR 원본이 없는 기록에는 이 줄을 만들지 않는다 — 견줄 원본이 없다', () => {
      // 직접 입력, 버린 판독, 일부 값만 모름으로 읽은 판독. 저장된 확정값의 표기와
      // 견주면 위와 같은 까닭으로 틀릴 수 있다.
      const confirmed: WheelSpec = {
        ...WHEEL,
        markings: { ...ORIGINAL.markings! },
      };
      for (const wheelOcr of [undefined, null]) {
        const [detail] = reanalysisDetailText(
          [reread({ labeledRPM: 13300 })],
          GRINDER,
          confirmed,
          t,
          'ko',
          wheelOcr,
        );
        expect(detail.lines.join('\n')).not.toContain('표기');
        expect(detail.lines.at(-1)).toBe('제한 대조: 풀지 않음');
      }
    });

    it('명판만 읽은 판독에는 만들지 않는다', () => {
      const [detail] = reanalysisDetailText(
        [
          reading({
            grinderOcr: GRINDER,
            grinderOcrTelemetry: TELEMETRY,
            wheelOcr: null,
            wheelOcrTelemetry: null,
          }),
        ],
        GRINDER,
        WHEEL,
        t,
        'ko',
        ORIGINAL,
      );
      expect(detail.lines.join('\n')).not.toContain('표기');
    });
  });

  it('사진에서 찾지 못한 것을 「손상 없음」으로 적지 않는다', () => {
    const [notSeen] = reanalysisDetailText(
      [reading({ wheelOcr: { ...WHEEL, visibleDamage: 'none_visible' } })],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(notSeen.lines).toContain(
      'AI 외관 판독: 사진에서 손상 징후를 찾지 못함 — 손상이 없다는 뜻이 아닙니다',
    );

    const [unknown] = reanalysisDetailText(
      [reading({ wheelOcr: { ...WHEEL, visibleDamage: 'unknown' } })],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(unknown.lines).toContain('AI 외관 판독: 판별하지 못함');
  });

  it('모델을 알 수 없으면 미기록으로 적는다 — 지어내지 않는다', () => {
    const [detail] = reanalysisDetailText(
      [reading({ wheelOcrTelemetry: null })],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(detail.heading).toBe(
      `재분석 1 · ${formatDateTime(T1)} · 모델 미기록`,
    );
  });

  it('여러 번 받았으면 받은 순서대로 번호를 붙인다', () => {
    const details = reanalysisDetailText(
      [reading(), reading({ analyzedAt: T2 })],
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(details.map((detail) => detail.heading)).toEqual([
      `재분석 1 · ${formatDateTime(T1)} · 모델 claude-x`,
      `재분석 2 · ${formatDateTime(T2)} · 모델 claude-x`,
    ]);
  });
});

describe('reanalysisCompareRows — 판독과 확정값의 비교표', () => {
  const AI_WHEEL: WheelSpec = {
    ...WHEEL,
    visibleDamage: 'none_visible',
    rawText: 'AI',
  };

  it('명판만 읽은 판독에는 숫돌 쪽 줄이 없다', () => {
    const rows = reanalysisCompareRows(
      { grinderOcr: GRINDER },
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(rows.map((row) => row.key)).toEqual([
      'noLoadRPM',
      'maxWheelDiameter',
    ]);
  });

  it('숫돌 라벨을 읽은 판독에는 회전속도·지름 뒤에 용도·유효기한·종류가 온다', () => {
    const rows = reanalysisCompareRows(
      { wheelOcr: AI_WHEEL },
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(rows.map((row) => [row.key, row.status])).toEqual([
      ['maxRPM', 'same'],
      ['diameter', 'same'],
      ['purpose', 'same'],
      ['expiry', 'abstained'],
      ['wheelType', 'same'],
    ]);
  });

  it('AI가 읽지 못한 회전속도·지름은 기권이 아니라 다름이다', () => {
    // 기권으로 넘기면 서버가 확인해 주지 않은 값으로 제한 대조가 풀린다.
    const rows = reanalysisCompareRows(
      { wheelOcr: { ...AI_WHEEL, maxRPM: null } },
      GRINDER,
      WHEEL,
      t,
      'ko',
    );
    expect(rows[0]).toMatchObject({
      key: 'maxRPM',
      ai: '—',
      status: 'differs',
    });
  });

  it('용도·종류의 이름은 고른 언어로 적는다', () => {
    const en: Translate = (key, params) => translate('en', key, params);
    const rows = reanalysisCompareRows(
      { wheelOcr: AI_WHEEL },
      GRINDER,
      WHEEL,
      en,
      'en',
    );
    const purpose = rows.find((row) => row.key === 'purpose');
    expect(purpose?.worker).toBe(en(WHEEL_PURPOSE_LABEL.cutting));
    expect(purpose?.label).toBe(en('field.purpose'));
  });

  describe('reanalysisValuesAgree — 다른 값이 없어야 제한 대조를 풀 수 있다', () => {
    const rowsOf = (wheelOcr: WheelSpec) =>
      reanalysisCompareRows({ wheelOcr }, GRINDER, WHEEL, t, 'ko');

    it('다른 값이 없으면 참이다 — 견줄 값이 없는 줄(기권)은 막지 않는다', () => {
      const rows = rowsOf(AI_WHEEL);
      expect(rows.some((row) => row.status === 'abstained')).toBe(true);
      expect(reanalysisValuesAgree(rows)).toBe(true);
    });

    it('회전속도·지름 가운데 하나라도 다르면 거짓이다', () => {
      expect(
        reanalysisValuesAgree(rowsOf({ ...AI_WHEEL, diameter: 115 })),
      ).toBe(false);
    });

    it('용도가 다르면 거짓이다', () => {
      expect(
        reanalysisValuesAgree(rowsOf({ ...AI_WHEEL, purpose: 'grinding' })),
      ).toBe(false);
    });

    it('견줄 줄이 하나도 없으면 거짓이다 — 아무것도 확인하지 않고 풀리면 안 된다', () => {
      expect(
        reanalysisValuesAgree(
          reanalysisCompareRows({}, GRINDER, WHEEL, t, 'ko'),
        ),
      ).toBe(false);
    });
  });
});

describe('lowConfidencePhotoKeys — 낮은 신뢰도로 읽은 사진', () => {
  it('낮음만 고른다. 명판이 먼저다', () => {
    expect(
      lowConfidencePhotoKeys({
        grinderOcr: { ...GRINDER, confidence: 'low' },
        wheelOcr: { ...WHEEL, confidence: 'low' },
      }),
    ).toEqual(['history.grinderPhoto', 'history.wheelPhoto']);
    expect(
      lowConfidencePhotoKeys({
        grinderOcr: { ...GRINDER, confidence: 'medium' },
        wheelOcr: { ...WHEEL, confidence: 'high' },
      }),
    ).toEqual([]);
  });

  it('다시 읽지 않은 단계는 세지 않는다', () => {
    expect(lowConfidencePhotoKeys(reading({ wheelOcr: null }))).toEqual([]);
  });
});

describe('markingConflictRowText — 다르게 읽은 표기 한 줄', () => {
  const conflict = {
    key: 'peripheralSpeedMps' as const,
    confirmed: 80,
    reanalyzed: 30,
  };

  it('기기 안 OCR이 읽었다고 남아 있을 때만 「기기 판독」이라고 적는다', () => {
    expect(
      markingConflictRowText(conflict, 'offline.compareMarkingRow', t),
    ).toBe('원주속도 표기: 기기 판독 80m/s / AI 값 30m/s · 다름');
  });

  it('모르면 「앞선 판독」이라고 적는다', () => {
    expect(
      markingConflictRowText(conflict, 'offline.compareMarkingRowUnknown', t),
    ).toBe('원주속도 표기: 앞선 판독 80m/s / AI 값 30m/s · 다름');
  });

  it('칸마다 제 단위로 적는다', () => {
    expect(
      markingConflictRowText(
        { key: 'boreDiameter', confirmed: 22.23, reanalyzed: 16 },
        'offline.compareMarkingRowUnknown',
        t,
      ),
    ).toBe('내경 표기: 앞선 판독 Φ22.23mm / AI 값 Φ16mm · 다름');
  });
});
