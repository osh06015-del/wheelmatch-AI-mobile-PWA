// 서버 재분석 판독 기록(ReanalysisRecord)을 다루는 순수 함수.
//
// 이 기록이 지키는 것은 하나다 — 서버가 다시 읽어 온 판독과 그 판독에 작업자가 한
// 일을, 받아들였든 아니든 **버리지 않는다.** 버리면 그 판독이 올린 외관 의심만
// 확정값에 남고, 의심이 어디서 왔는지 기록으로 되짚을 수 없다.

import { describe, expect, it } from 'vitest';

import {
  MAX_REANALYSES,
  appendReanalysis,
  canReanalyze,
  compareReanalysis,
  indexOfReanalysis,
  readByAcceptedReanalysis,
  reanalysisRecordOf,
  sameValue,
  summarizeReanalyses,
  withAcceptedAt,
  withDamageRecheck,
  withoutWheelReanalysis,
} from './reanalysis';
import type {
  GrinderSpec,
  OcrTelemetry,
  ReanalysisRecord,
  WheelSpec,
} from '@/lib/rules/types';

const GRINDER_AI: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: 'AI',
  confidence: 'high',
};

const WHEEL_AI: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: 'AI',
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

/** 숫돌 라벨만 다시 읽은 판독 한 줄 */
function wheelRecord(overrides: Partial<ReanalysisRecord> = {}) {
  return {
    analyzedAt: T1,
    grinderOcr: null,
    grinderOcrTelemetry: null,
    wheelOcr: WHEEL_AI,
    wheelOcrTelemetry: TELEMETRY,
    acceptedAt: null,
    damageRecheck: null,
    ...overrides,
  } satisfies ReanalysisRecord;
}

describe('reanalysisRecordOf — 도착한 판독을 기록 한 줄로 만든다', () => {
  it('다시 읽은 단계만 채우고, 받아들인 시각과 손상 답은 비워 둔다', () => {
    expect(
      reanalysisRecordOf(
        { wheelOcr: WHEEL_AI, wheelOcrTelemetry: TELEMETRY },
        T1,
      ),
    ).toEqual({
      analyzedAt: T1,
      grinderOcr: null,
      grinderOcrTelemetry: null,
      wheelOcr: WHEEL_AI,
      wheelOcrTelemetry: TELEMETRY,
      acceptedAt: null,
      damageRecheck: null,
    });
  });

  it('명판과 숫돌을 함께 읽었으면 둘 다 남긴다', () => {
    const record = reanalysisRecordOf(
      {
        grinderOcr: GRINDER_AI,
        grinderOcrTelemetry: TELEMETRY,
        wheelOcr: WHEEL_AI,
        wheelOcrTelemetry: TELEMETRY,
      },
      T1,
    );
    expect(record?.grinderOcr).toEqual(GRINDER_AI);
    expect(record?.wheelOcr).toEqual(WHEEL_AI);
  });

  it('메타데이터를 받지 못했으면 null로 둔다 — 값을 지어내지 않는다', () => {
    const record = reanalysisRecordOf({ grinderOcr: GRINDER_AI }, T1);
    expect(record?.grinderOcr).toEqual(GRINDER_AI);
    expect(record?.grinderOcrTelemetry).toBeNull();
  });

  it('다시 읽지 않은 단계의 메타데이터는 남기지 않는다', () => {
    // 판독이 없는 단계에 메타데이터만 남으면 무엇에 대한 측정값인지 알 수 없다.
    const record = reanalysisRecordOf(
      { grinderOcr: GRINDER_AI, wheelOcrTelemetry: TELEMETRY },
      T1,
    );
    expect(record?.wheelOcr).toBeNull();
    expect(record?.wheelOcrTelemetry).toBeNull();
  });

  it('다시 읽은 단계가 하나도 없으면 기록을 만들지 않는다', () => {
    expect(reanalysisRecordOf({}, T1)).toBeNull();
  });
});

describe('appendReanalysis — 받은 순서대로 전부 남긴다', () => {
  it('끝에 붙이고 앞선 판독을 지우지 않는다', () => {
    const first = wheelRecord({
      wheelOcr: { ...WHEEL_AI, visibleDamage: 'suspected' },
    });
    const second = wheelRecord({ analyzedAt: T2 });
    // 둘째 판독이 의심하지 않아도 첫 판독은 남는다. 확정값의 의심이 첫 판독에서
    // 왔다는 것을 되짚을 수 있어야 한다.
    expect(appendReanalysis([first], second)).toEqual([first, second]);
  });

  it('원래 목록을 바꾸지 않는다', () => {
    const list = [wheelRecord()];
    appendReanalysis(list, wheelRecord({ analyzedAt: T2 }));
    expect(list).toHaveLength(1);
  });

  it('목록이 없던 점검(이 기록이 생기기 전 버전에서 시작)은 여기서부터 남긴다', () => {
    expect(appendReanalysis(null, wheelRecord())).toEqual([wheelRecord()]);
  });

  it('상한에 닿으면 더 붙이지 않는다 — 앞선 판독을 밀어내지도 않는다', () => {
    const full = Array.from({ length: MAX_REANALYSES }, (_, index) =>
      wheelRecord({ analyzedAt: new Date(index * 1000).toISOString() }),
    );
    const next = appendReanalysis(full, wheelRecord({ analyzedAt: T3 }));
    expect(next).toHaveLength(MAX_REANALYSES);
    expect(next[0]).toEqual(full[0]);
    expect(next.at(-1)).toEqual(full.at(-1));
  });
});

describe('canReanalyze — 남길 자리가 있을 때만 다시 분석한다', () => {
  it('상한 전까지는 할 수 있다', () => {
    expect(canReanalyze(null)).toBe(true);
    expect(canReanalyze([])).toBe(true);
    expect(
      canReanalyze(
        Array.from({ length: MAX_REANALYSES - 1 }, () => wheelRecord()),
      ),
    ).toBe(true);
  });

  it('상한에 닿으면 할 수 없다 — 남기지 못할 판독은 받지 않는다', () => {
    expect(
      canReanalyze(Array.from({ length: MAX_REANALYSES }, () => wheelRecord())),
    ).toBe(false);
  });
});

describe('withoutWheelReanalysis — 숫돌을 다시 확정했을 때', () => {
  // 새 사진은 새 숫돌일 수 있다. 이전 숫돌 사진의 판독과 그때 받은 손상 답은 이
  // 점검의 숫돌에 대한 것이 아니다. 명판 쪽은 그대로다(setWheel이 명판 쪽 값을
  // 건드리지 않는 것과 같다).

  it('숫돌 판독·메타데이터·손상 답을 빼고 명판 판독은 남긴다', () => {
    const both = wheelRecord({
      grinderOcr: GRINDER_AI,
      grinderOcrTelemetry: TELEMETRY,
      damageRecheck: { damageFree: true, answeredAt: T2 },
    });
    expect(withoutWheelReanalysis([both])).toEqual([
      {
        analyzedAt: T1,
        grinderOcr: GRINDER_AI,
        grinderOcrTelemetry: TELEMETRY,
        wheelOcr: null,
        wheelOcrTelemetry: null,
        acceptedAt: null,
        damageRecheck: null,
      },
    ]);
  });

  it('숫돌만 읽은 판독은 통째로 뺀다', () => {
    expect(withoutWheelReanalysis([wheelRecord()])).toEqual([]);
  });

  it('명판 판독을 받아들인 시각은 그대로 둔다', () => {
    // 명판이 온라인 대조로 바뀐 것은 이 판독을 받아들였기 때문이다. 숫돌을 다시
    // 찍었다고 그 사실이 사라지지 않는다.
    const accepted = wheelRecord({
      grinderOcr: GRINDER_AI,
      grinderOcrTelemetry: TELEMETRY,
      acceptedAt: T3,
    });
    expect(withoutWheelReanalysis([accepted])?.[0]?.acceptedAt).toBe(T3);
  });

  it('목록이 없으면(알 수 없음) 없는 채로 둔다 — 빈 목록으로 바꾸지 않는다', () => {
    // 빈 목록은 "재분석을 하지 않았다"는 뜻이다. 모르는 것을 그렇게 적지 않는다.
    expect(withoutWheelReanalysis(null)).toBeNull();
  });
});

describe('indexOfReanalysis — 화면이 들고 있는 판독의 기록을 찾는다', () => {
  it('같은 판독 객체로 남긴 기록을 찾는다', () => {
    const reading = { wheelOcr: WHEEL_AI, wheelOcrTelemetry: TELEMETRY };
    const list = [
      wheelRecord({ wheelOcr: { ...WHEEL_AI } }),
      reanalysisRecordOf(reading, T2) as ReanalysisRecord,
    ];
    expect(indexOfReanalysis(list, reading)).toBe(1);
  });

  it('값이 같아도 다른 판독이면 찾지 않는다', () => {
    // 같은 사진을 두 번 읽으면 값이 같은 판독이 둘 생긴다. 받아들인 시각과 손상
    // 답은 화면에 떠 있는 그 판독의 기록에만 적혀야 한다.
    const list = [wheelRecord({ wheelOcr: { ...WHEEL_AI } })];
    expect(indexOfReanalysis(list, { wheelOcr: { ...WHEEL_AI } })).toBe(-1);
  });

  it('명판까지 함께 읽은 판독은 두 단계가 모두 같아야 한다', () => {
    const reading = { grinderOcr: GRINDER_AI, wheelOcr: WHEEL_AI };
    const list = [reanalysisRecordOf(reading, T1) as ReanalysisRecord];
    expect(indexOfReanalysis(list, reading)).toBe(0);
    expect(indexOfReanalysis(list, { wheelOcr: WHEEL_AI })).toBe(-1);
  });

  it('목록이 없거나 비었으면 찾지 못한다', () => {
    expect(indexOfReanalysis(null, { wheelOcr: WHEEL_AI })).toBe(-1);
    expect(indexOfReanalysis([], { wheelOcr: WHEEL_AI })).toBe(-1);
  });
});

describe('withAcceptedAt · withDamageRecheck — 그 판독에 작업자가 한 일', () => {
  it('받아들인 시각을 그 판독에만 적는다', () => {
    const list = [wheelRecord(), wheelRecord({ analyzedAt: T2 })];
    const next = withAcceptedAt(list, 1, T3);
    expect(next[0].acceptedAt).toBeNull();
    expect(next[1].acceptedAt).toBe(T3);
    // 원래 목록은 그대로다.
    expect(list[1].acceptedAt).toBeNull();
  });

  it('다시 받은 손상 답과 시각을 그 판독에 적는다', () => {
    const next = withDamageRecheck([wheelRecord()], 0, true, T2);
    expect(next[0].damageRecheck).toEqual({ damageFree: true, answeredAt: T2 });
  });

  it('「문제 있음」도 그대로 적는다', () => {
    const next = withDamageRecheck([wheelRecord()], 0, false, T2);
    expect(next[0].damageRecheck).toEqual({
      damageFree: false,
      answeredAt: T2,
    });
  });

  it('답을 바꾸면 마지막 답이 남는다', () => {
    const once = withDamageRecheck([wheelRecord()], 0, true, T2);
    const twice = withDamageRecheck(once, 0, false, T3);
    expect(twice[0].damageRecheck).toEqual({
      damageFree: false,
      answeredAt: T3,
    });
  });

  it('없는 자리를 가리키면 아무것도 바꾸지 않는다', () => {
    const list = [wheelRecord()];
    expect(withAcceptedAt(list, 3, T3)).toEqual(list);
    expect(withDamageRecheck(list, -1, true, T2)).toEqual(list);
  });
});

describe('summarizeReanalyses — 화면·문서가 한 줄로 말할 것', () => {
  it('재분석이 없으면 말할 것이 없다', () => {
    expect(summarizeReanalyses([])).toBeNull();
    // 칸이 없는 기록(알 수 없음)에도 말을 지어내지 않는다.
    expect(summarizeReanalyses(undefined)).toBeNull();
    expect(summarizeReanalyses(null)).toBeNull();
  });

  it('받았지만 받아들이지 않은 판독', () => {
    expect(summarizeReanalyses([wheelRecord()])).toEqual({
      count: 1,
      accepted: 0,
      acceptedSteps: { grinder: false, wheel: false },
      damageSuspected: false,
      damageRecheck: null,
    });
  });

  it('여러 번 받았으면 그 수를 그대로 센다', () => {
    expect(
      summarizeReanalyses([wheelRecord(), wheelRecord({ analyzedAt: T2 })])
        ?.count,
    ).toBe(2);
  });

  it('받은 수와 받아들인 수를 따로 센다 — 일부만 받아들인 기록이 있다', () => {
    // 값이 달라 막힌 판독 둘과 받아들인 판독 하나. 셋 다 일치한 것처럼 세지 않는다.
    const summary = summarizeReanalyses([
      wheelRecord({ wheelOcr: { ...WHEEL_AI, maxRPM: 13300 } }),
      wheelRecord({ analyzedAt: T2, wheelOcr: { ...WHEEL_AI, diameter: 115 } }),
      wheelRecord({ analyzedAt: T3, acceptedAt: T3 }),
    ]);
    expect(summary?.count).toBe(3);
    expect(summary?.accepted).toBe(1);
  });

  it('받아들인 판독이 다시 읽은 단계를 말한다', () => {
    expect(
      summarizeReanalyses([wheelRecord({ acceptedAt: T3 })])?.acceptedSteps,
    ).toEqual({ grinder: false, wheel: true });
    expect(
      summarizeReanalyses([
        wheelRecord({ grinderOcr: GRINDER_AI, acceptedAt: T3 }),
      ])?.acceptedSteps,
    ).toEqual({ grinder: true, wheel: true });
  });

  it('받아들이지 않은 판독의 단계는 받아들인 단계로 세지 않는다', () => {
    expect(
      summarizeReanalyses([
        wheelRecord({ grinderOcr: GRINDER_AI }),
        wheelRecord({ analyzedAt: T2, acceptedAt: T3 }),
      ])?.acceptedSteps,
    ).toEqual({ grinder: false, wheel: true });
  });

  it('전환한 뒤 숫돌만 다시 확정한 기록은 명판 단계만 받아들인 것으로 남는다', () => {
    // 명판·숫돌을 함께 받아들였다가 숫돌을 다시 확정하면 숫돌 판독은 빠진다. 그
    // 점검은 다시 제한 대조일 수 있다 — 요약이 "점검을 온라인으로 바꿨다"고 말하면
    // 안 되는 이유다. 남은 사실은 명판 판독을 받아들였다는 것뿐이다.
    const accepted = wheelRecord({ grinderOcr: GRINDER_AI, acceptedAt: T3 });
    const summary = summarizeReanalyses(withoutWheelReanalysis([accepted]));
    expect(summary?.accepted).toBe(1);
    expect(summary?.acceptedSteps).toEqual({ grinder: true, wheel: false });
  });

  it('어느 판독이든 외관 손상을 의심했으면 의심이 있었던 것이다', () => {
    // 뒤의 판독이 의심하지 않았다고 앞선 의심이 없던 일이 되지 않는다.
    expect(
      summarizeReanalyses([
        wheelRecord({ wheelOcr: { ...WHEEL_AI, visibleDamage: 'suspected' } }),
        wheelRecord({ analyzedAt: T2 }),
      ])?.damageSuspected,
    ).toBe(true);
  });

  it('명판만 다시 읽은 판독은 외관 의심과 무관하다', () => {
    expect(
      summarizeReanalyses([
        wheelRecord({ grinderOcr: GRINDER_AI, wheelOcr: null }),
      ])?.damageSuspected,
    ).toBe(false);
  });

  it('손상 재확인은 마지막으로 받은 답을 말한다', () => {
    expect(
      summarizeReanalyses([
        wheelRecord({ damageRecheck: { damageFree: false, answeredAt: T1 } }),
        wheelRecord({
          analyzedAt: T2,
          damageRecheck: { damageFree: true, answeredAt: T3 },
        }),
      ])?.damageRecheck,
    ).toBe(true);
    expect(
      summarizeReanalyses([
        wheelRecord({ damageRecheck: { damageFree: true, answeredAt: T1 } }),
        wheelRecord({ analyzedAt: T2 }),
      ])?.damageRecheck,
    ).toBe(true);
  });
});

describe('compareReanalysis — 판독과 확정값을 견준다', () => {
  // 결과 화면이 전환을 열어 줄지 정할 때와, 기록이 그때의 「같음/다름」을 다시 보여줄
  // 때 같은 함수를 쓴다. 따로 계산하면 기록이 화면과 다른 말을 할 수 있다.
  const GRINDER: GrinderSpec = { ...GRINDER_AI, rawText: '' };
  const WHEEL: WheelSpec = {
    ...WHEEL_AI,
    visibleDamage: 'unknown',
    rawText: '',
  };

  it('다시 읽은 단계의 회전속도와 지름만 견준다', () => {
    expect(compareReanalysis({ wheelOcr: WHEEL_AI }, GRINDER, WHEEL)).toEqual([
      { field: 'maxRPM', worker: 12200, ai: 12200 },
      { field: 'diameter', worker: 125, ai: 125 },
    ]);
    expect(
      compareReanalysis({ grinderOcr: GRINDER_AI }, GRINDER, WHEEL),
    ).toEqual([
      { field: 'noLoadRPM', worker: 11000, ai: 11000 },
      { field: 'maxWheelDiameter', worker: 125, ai: 125 },
    ]);
  });

  it('명판과 숫돌을 함께 읽었으면 명판이 먼저다', () => {
    expect(
      compareReanalysis(
        { grinderOcr: GRINDER_AI, wheelOcr: WHEEL_AI },
        GRINDER,
        WHEEL,
      ).map((row) => row.field),
    ).toEqual(['noLoadRPM', 'maxWheelDiameter', 'maxRPM', 'diameter']);
  });

  it('남긴 기록(다시 읽지 않은 단계가 null)도 같은 식으로 견준다', () => {
    expect(
      compareReanalysis(wheelRecord(), GRINDER, WHEEL).map((row) => row.field),
    ).toEqual(['maxRPM', 'diameter']);
  });

  it('값이 같을 때만 같다 — AI가 읽지 못한 값은 같다고 보지 않는다', () => {
    expect(sameValue({ field: 'maxRPM', worker: 12200, ai: 12200 })).toBe(true);
    expect(sameValue({ field: 'maxRPM', worker: 12200, ai: 13300 })).toBe(
      false,
    );
    expect(sameValue({ field: 'maxRPM', worker: 12200, ai: null })).toBe(false);
    // 둘 다 비어 있어도 같다고 보지 않는다. 확인한 값이 없다.
    expect(sameValue({ field: 'maxRPM', worker: null, ai: null })).toBe(false);
  });

  // 「다른 값이 없어야 제한 대조를 풀 수 있다」는 비교표 전체(용도·유효기한·종류
  // 포함)를 보는 규칙이라 lib/i18n/reanalysisText.test.ts에 있다.
});

describe('readByAcceptedReanalysis — 확정값의 표기가 받아들인 판독에서 왔는가', () => {
  const MARKINGS = {
    labeledRPM: 12200,
    peripheralSpeedMps: 80,
    boreDiameter: 22.23,
    expiryRaw: null,
  };
  const accepted = (overrides: Partial<ReanalysisRecord> = {}) =>
    wheelRecord({
      wheelOcr: { ...WHEEL_AI, markings: MARKINGS },
      acceptedAt: '2026-10-04T05:12:40.000Z',
      ...overrides,
    });

  it('모든 칸이 받아들인 판독이 읽은 값과 같으면 참이다', () => {
    expect(
      readByAcceptedReanalysis(
        [accepted()],
        [
          { key: 'peripheralSpeedMps', used: 80 },
          { key: 'boreDiameter', used: 22.23 },
        ],
      ),
    ).toBe(true);
  });

  it('받아들이지 않은 판독은 보지 않는다 — 그 표기는 확정값으로 옮긴 적이 없다', () => {
    expect(
      readByAcceptedReanalysis(
        [accepted({ acceptedAt: null })],
        [{ key: 'peripheralSpeedMps', used: 80 }],
      ),
    ).toBe(false);
  });

  it('한 칸이라도 값이 다르거나 그 판독이 읽지 못했으면 거짓이다', () => {
    expect(
      readByAcceptedReanalysis(
        [accepted()],
        [
          { key: 'peripheralSpeedMps', used: 80 },
          { key: 'boreDiameter', used: 16 },
        ],
      ),
    ).toBe(false);
    expect(
      readByAcceptedReanalysis(
        [
          accepted({
            wheelOcr: {
              ...WHEEL_AI,
              markings: { ...MARKINGS, peripheralSpeedMps: null },
            },
          }),
        ],
        [{ key: 'peripheralSpeedMps', used: 80 }],
      ),
    ).toBe(false);
  });

  it('명판만 읽은 판독과 표기가 없는 판독은 설명이 되지 못한다', () => {
    expect(
      readByAcceptedReanalysis(
        [accepted({ wheelOcr: null }), accepted({ wheelOcr: WHEEL_AI })],
        [{ key: 'labeledRPM', used: 12200 }],
      ),
    ).toBe(false);
  });

  it('재분석 판독 칸이 없는 기록, 빈 목록, 견줄 칸이 없는 경우는 거짓이다', () => {
    const one = [{ key: 'labeledRPM' as const, used: 12200 }];
    expect(readByAcceptedReanalysis(undefined, one)).toBe(false);
    expect(readByAcceptedReanalysis(null, one)).toBe(false);
    expect(readByAcceptedReanalysis([], one)).toBe(false);
    // 다른 칸이 없으면 물을 것이 없다. 「모두 설명된다」로 읽지 않는다.
    expect(readByAcceptedReanalysis([accepted()], [])).toBe(false);
  });
});
