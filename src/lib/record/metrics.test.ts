// 평가 지표 테스트.
//
// 네 지표가 서로 섞이지 않는지, 특히 false-safe가 다른 수치에 묻히지 않는지 본다.

import { describe, expect, it } from 'vitest';

import { evaluate, formatRate, type GroundTruth } from './metrics';
import type {
  GrinderSpec,
  InspectionRecord,
  Verdict,
  WheelSpec,
} from '@/lib/rules/types';

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
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

function record(
  id: number,
  verdict: Verdict,
  overrides: Partial<InspectionRecord> = {},
): InspectionRecord {
  return {
    id,
    grinder: GRINDER,
    wheel: WHEEL,
    grinderOcr: GRINDER,
    wheelOcr: WHEEL,
    result: { verdict, checks: [], timestamp: '2026-09-01T00:00:00.000Z' },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function truth(
  recordId: number,
  verdict: Verdict,
  overrides: Partial<GroundTruth> = {},
): GroundTruth {
  return {
    recordId,
    grinderRPM: 11000,
    grinderMaxDiameter: 125,
    wheelMaxRPM: 12200,
    wheelDiameter: 125,
    verdict,
    ...overrides,
  };
}

describe('false-safe', () => {
  it('실제 부적합인데 적합이라 한 건을 잡아낸다', () => {
    const report = evaluate(
      [record(1, 'COMPATIBLE')],
      [truth(1, 'INCOMPATIBLE')],
    );
    expect(report.falseSafe.count).toBe(1);
    expect(report.falseSafe.rate).toBe(1);
    expect(report.falseSafe.recordIds).toEqual([1]);
  });

  it('판정불가로 막은 것은 false-safe가 아니다', () => {
    // 막은 것은 놓친 것이 아니다. 설계된 동작이라 여기 넣으면 안 된다.
    const report = evaluate(
      [record(1, 'UNDETERMINED')],
      [truth(1, 'INCOMPATIBLE')],
    );
    expect(report.falseSafe.count).toBe(0);
    expect(report.unreadable.count).toBe(1);
  });

  it('맞게 부적합이라 한 것도 false-safe가 아니다', () => {
    const report = evaluate(
      [record(1, 'INCOMPATIBLE')],
      [truth(1, 'INCOMPATIBLE')],
    );
    expect(report.falseSafe.count).toBe(0);
  });

  it('어느 기록이었는지 id를 남긴다', () => {
    // 비율만 남기면 사례를 되짚을 수 없다. 개별 분석이 필요한 지표다.
    const report = evaluate(
      [record(1, 'COMPATIBLE'), record(7, 'COMPATIBLE')],
      [truth(1, 'COMPATIBLE'), truth(7, 'INCOMPATIBLE')],
    );
    expect(report.falseSafe.recordIds).toEqual([7]);
  });
});

describe('unreadable', () => {
  it('판정불가 비율을 따로 낸다', () => {
    const report = evaluate(
      [record(1, 'UNDETERMINED'), record(2, 'COMPATIBLE')],
      [truth(1, 'COMPATIBLE'), truth(2, 'COMPATIBLE')],
    );
    expect(report.unreadable.count).toBe(1);
    expect(report.unreadable.rate).toBe(0.5);
  });
});

describe('field accuracy', () => {
  it('원본값으로 잰다 — 사용자가 고친 값으로 재지 않는다', () => {
    // 최종값으로 재면 사람이 고친 것까지 모델이 맞힌 것으로 계산된다.
    const r = record(1, 'COMPATIBLE', {
      wheelOcr: { ...WHEEL, maxRPM: 1220 }, // 모델은 틀렸고
      wheel: { ...WHEEL, maxRPM: 12200 }, // 사람이 고쳤다
    });
    const report = evaluate([r], [truth(1, 'COMPATIBLE')]);
    const field = report.fieldAccuracy.fields.find(
      (f) => f.field === 'wheelMaxRPM',
    );
    expect(field?.wrong).toBe(1);
    expect(field?.correct).toBe(0);
  });

  it('못 읽은 것과 틀리게 읽은 것을 구분한다', () => {
    // 둘은 성격이 다르다. 못 읽으면 판정불가로 막히지만, 틀리게 읽으면 통과한다.
    const missed = record(1, 'COMPATIBLE', {
      wheelOcr: { ...WHEEL, maxRPM: null },
    });
    const wrong = record(2, 'COMPATIBLE', {
      wheelOcr: { ...WHEEL, maxRPM: 9999 },
    });
    const report = evaluate(
      [missed, wrong],
      [truth(1, 'COMPATIBLE'), truth(2, 'COMPATIBLE')],
    );
    const field = report.fieldAccuracy.fields.find(
      (f) => f.field === 'wheelMaxRPM',
    );
    expect(field?.missed).toBe(1);
    expect(field?.wrong).toBe(1);
  });

  it('라벨에 없던 값은 채점하지 않는다', () => {
    // 정답이 null이면 못 읽은 것이 아니다. 분모에 넣으면 점수가 왜곡된다.
    const report = evaluate(
      [record(1, 'COMPATIBLE', { wheelOcr: { ...WHEEL, diameter: null } })],
      [truth(1, 'COMPATIBLE', { wheelDiameter: null })],
    );
    const field = report.fieldAccuracy.fields.find(
      (f) => f.field === 'wheelDiameter',
    );
    expect(field).toEqual({
      field: 'wheelDiameter',
      correct: 0,
      missed: 0,
      wrong: 0,
    });
  });

  it('전부 맞으면 100%', () => {
    const report = evaluate(
      [record(1, 'COMPATIBLE')],
      [truth(1, 'COMPATIBLE')],
    );
    expect(report.fieldAccuracy.overall).toBe(1);
  });
});

describe('단위 정규화 오류', () => {
  it('m/s에서 환산한 기록만 본다', () => {
    // 라벨에 rpm이 적혀 있던 것은 환산하지 않았으므로 분모에 넣지 않는다.
    const fromLabel = record(1, 'COMPATIBLE', {
      wheelOcr: { ...WHEEL, rpmSource: 'label' },
    });
    const report = evaluate([fromLabel], [truth(1, 'COMPATIBLE')]);
    expect(report.unitNormalization.converted).toBe(0);
    expect(report.unitNormalization.rate).toBe(0);
  });

  it('환산 결과가 정답과 다르면 오류로 센다', () => {
    const converted = record(1, 'COMPATIBLE', {
      wheelOcr: { ...WHEEL, maxRPM: 12223, rpmSource: 'converted' },
    });
    const report = evaluate(
      [converted],
      [truth(1, 'COMPATIBLE', { wheelMaxRPM: 12200 })],
    );
    expect(report.unitNormalization.converted).toBe(1);
    expect(report.unitNormalization.wrong).toBe(1);
  });

  it('환산이 맞으면 오류가 아니다', () => {
    const converted = record(1, 'COMPATIBLE', {
      wheelOcr: { ...WHEEL, maxRPM: 12200, rpmSource: 'converted' },
    });
    const report = evaluate([converted], [truth(1, 'COMPATIBLE')]);
    expect(report.unitNormalization.wrong).toBe(0);
  });
});

describe('표본 처리', () => {
  it('정답이 없는 기록은 채점하지 않는다', () => {
    const report = evaluate(
      [record(1, 'COMPATIBLE'), record(2, 'COMPATIBLE')],
      [truth(1, 'COMPATIBLE')],
    );
    expect(report.scored).toBe(1);
  });

  it('표본이 없으면 비율을 0으로 둔다 — 나누지 않는다', () => {
    const report = evaluate([], []);
    expect(report.scored).toBe(0);
    expect(report.falseSafe.rate).toBe(0);
    expect(report.unreadable.rate).toBe(0);
    expect(report.fieldAccuracy.overall).toBe(0);
    expect(report.unitNormalization.rate).toBe(0);
  });

  it('저장 전 기록(id 없음)은 건너뛴다', () => {
    const unsaved = { ...record(1, 'COMPATIBLE'), id: undefined };
    expect(evaluate([unsaved], [truth(1, 'COMPATIBLE')]).scored).toBe(0);
  });

  it('원본값이 없는 옛 기록도 깨지지 않는다', () => {
    const old = record(1, 'COMPATIBLE', {
      grinderOcr: undefined,
      wheelOcr: undefined,
    });
    const report = evaluate([old], [truth(1, 'COMPATIBLE')]);
    expect(report.scored).toBe(1);
    expect(report.fieldAccuracy.overall).toBe(0); // 채점 대상 없음
  });
});

describe('formatRate', () => {
  it('소수점 한 자리까지만 쓴다', () => {
    // 20건 표본에 그보다 정밀한 자리는 뜻이 없다.
    expect(formatRate(0.0)).toBe('0.0%');
    expect(formatRate(0.05)).toBe('5.0%');
    expect(formatRate(1)).toBe('100.0%');
  });
});
