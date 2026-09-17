// 이력 필터 순수 함수 테스트.
//
// 가장 중요한 것: 이 파일은 db 모듈을 import하지 않는다. 아래 테스트는 필터
// 함수가 읽기만 하고 기록을 고치지 않는지도 함께 본다.

import { describe, expect, it } from 'vitest';

import {
  EMPTY_HISTORY_FILTER,
  TRIAL_RUN_NONE,
  filterRecords,
  isFilterActive,
  matchesFilter,
  type HistoryFilterState,
} from './historyFilter';
import type {
  GrinderSpec,
  InspectionRecord,
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

function record(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: 1,
    grinder: GRINDER,
    wheel: WHEEL,
    result: {
      verdict: 'COMPATIBLE',
      checks: [],
      timestamp: '2026-09-16T00:00:00.000Z',
    },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    declaredPurpose: 'cutting',
    createdAt: '2026-09-16T05:00:00.000Z',
    ...overrides,
  };
}

describe('EMPTY_HISTORY_FILTER — 아무것도 거르지 않는다', () => {
  it('모든 필드가 null이다', () => {
    expect(Object.values(EMPTY_HISTORY_FILTER).every((v) => v === null)).toBe(
      true,
    );
  });

  it('어떤 기록이든 통과시킨다', () => {
    expect(matchesFilter(record(), EMPTY_HISTORY_FILTER)).toBe(true);
    expect(
      matchesFilter(record({ declaredPurpose: null }), EMPTY_HISTORY_FILTER),
    ).toBe(true);
  });
});

describe('isFilterActive', () => {
  it('빈 필터는 활성 상태가 아니다', () => {
    expect(isFilterActive(EMPTY_HISTORY_FILTER)).toBe(false);
  });

  it('필드 하나만 채워도 활성 상태다', () => {
    expect(
      isFilterActive({ ...EMPTY_HISTORY_FILTER, purpose: 'cutting' }),
    ).toBe(true);
  });
});

describe('절단/연삭 필터', () => {
  it('선언한 작업이 일치하는 기록만 남긴다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      purpose: 'grinding',
    };
    expect(matchesFilter(record({ declaredPurpose: 'cutting' }), filter)).toBe(
      false,
    );
    expect(matchesFilter(record({ declaredPurpose: 'grinding' }), filter)).toBe(
      true,
    );
  });

  it('작업을 고르지 않은 옛 기록은 걸러진다 — null은 일치가 아니다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      purpose: 'cutting',
    };
    expect(matchesFilter(record({ declaredPurpose: null }), filter)).toBe(
      false,
    );
  });
});

describe('적합/부적합/판정불가 필터', () => {
  it('판정이 일치하는 기록만 남긴다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      verdict: 'INCOMPATIBLE',
    };
    const compatible = record({
      result: { verdict: 'COMPATIBLE', checks: [], timestamp: '' },
    });
    const incompatible = record({
      result: { verdict: 'INCOMPATIBLE', checks: [], timestamp: '' },
    });
    expect(matchesFilter(compatible, filter)).toBe(false);
    expect(matchesFilter(incompatible, filter)).toBe(true);
  });
});

describe('숫돌 종류 필터', () => {
  it('종류가 일치하는 기록만 남긴다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      wheelType: 'flap_disc',
    };
    expect(
      matchesFilter(
        record({ wheel: { ...WHEEL, wheelType: 'bonded_abrasive' } }),
        filter,
      ),
    ).toBe(false);
    expect(
      matchesFilter(
        record({ wheel: { ...WHEEL, wheelType: 'flap_disc' } }),
        filter,
      ),
    ).toBe(true);
  });
});

describe('판정 범위(scope) 필터', () => {
  it('scope가 일치하는 기록만 남긴다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      scope: 'limited',
    };
    const full = record({
      accessoryProfile: {
        type: 'bonded_abrasive',
        version: 'v1',
        scope: 'full',
      },
    });
    const limited = record({
      accessoryProfile: { type: 'flap_disc', version: 'v1', scope: 'limited' },
    });
    expect(matchesFilter(full, filter)).toBe(false);
    expect(matchesFilter(limited, filter)).toBe(true);
  });

  it('scope를 저장하지 않은 기록(도입 전)은 걸러진다 — 있는 것으로 단정하지 않는다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      scope: 'full',
    };
    expect(matchesFilter(record({ accessoryProfile: undefined }), filter)).toBe(
      false,
    );
  });
});

describe('Trial Run 결과 필터', () => {
  const trialRun = (outcome: 'normal' | 'abnormal') => ({
    wheelReplaced: false,
    requiredSeconds: 60,
    startedAt: '2026-09-16T05:00:00.000Z',
    finishedAt: '2026-09-16T05:01:00.000Z',
    elapsedSeconds: 61,
    outcome,
    findings: [] as never[],
    completed: true,
  });

  it('이상 없음/이상 있음으로 정확히 가른다', () => {
    const normalFilter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      trialRunOutcome: 'normal',
    };
    expect(
      matchesFilter(record({ trialRun: trialRun('normal') }), normalFilter),
    ).toBe(true);
    expect(
      matchesFilter(record({ trialRun: trialRun('abnormal') }), normalFilter),
    ).toBe(false);
  });

  it('TRIAL_RUN_NONE은 시험운전 자체가 없는 기록만 남긴다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      trialRunOutcome: TRIAL_RUN_NONE,
    };
    // 부적합·판정불가라 시험운전이 열리지 않은 기록, 또는 기능 도입 전 기록.
    expect(matchesFilter(record({ trialRun: undefined }), filter)).toBe(true);
    expect(
      matchesFilter(record({ trialRun: trialRun('normal') }), filter),
    ).toBe(false);
  });
});

describe('날짜 필터', () => {
  it('범위 안의 날짜만 남긴다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      dateFrom: '2026-09-10',
      dateTo: '2026-09-16',
    };
    // 자정 근처 시각은 실행 환경의 시간대에 따라 날짜가 넘어갈 수 있다.
    // toDateOnly가 로컬 날짜를 쓰므로(engine.ts), 정오 시각으로 경계에서
    // 충분히 떨어뜨려 어떤 시간대에서 돌려도 같은 결과가 나오게 한다.
    expect(
      matchesFilter(record({ createdAt: '2026-09-16T12:00:00.000Z' }), filter),
    ).toBe(true);
    expect(
      matchesFilter(record({ createdAt: '2026-09-09T12:00:00.000Z' }), filter),
    ).toBe(false);
    expect(
      matchesFilter(record({ createdAt: '2026-09-17T12:00:00.000Z' }), filter),
    ).toBe(false);
  });

  it('시작일만 있으면 그 날 이후만, 종료일만 있으면 그 날 이전만 남긴다', () => {
    const from: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      dateFrom: '2026-09-16',
    };
    expect(
      matchesFilter(record({ createdAt: '2026-09-15T12:00:00.000Z' }), from),
    ).toBe(false);
    expect(
      matchesFilter(record({ createdAt: '2026-09-16T12:00:00.000Z' }), from),
    ).toBe(true);

    const to: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      dateTo: '2026-09-16',
    };
    expect(
      matchesFilter(record({ createdAt: '2026-09-17T12:00:00.000Z' }), to),
    ).toBe(false);
  });

  it('createdAt을 읽지 못하는 기록은 날짜로 거르지 않는다', () => {
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      dateFrom: '2026-09-16',
      dateTo: '2026-09-16',
    };
    expect(matchesFilter(record({ createdAt: 'not-a-date' }), filter)).toBe(
      true,
    );
  });
});

describe('filterRecords — 여러 조건을 함께', () => {
  it('모든 조건을 동시에 만족해야 남는다', () => {
    const records = [
      record({ id: 1, declaredPurpose: 'cutting' }),
      record({
        id: 2,
        declaredPurpose: 'grinding',
        result: { verdict: 'INCOMPATIBLE', checks: [], timestamp: '' },
      }),
      record({
        id: 3,
        declaredPurpose: 'cutting',
        wheel: { ...WHEEL, wheelType: 'flap_disc' },
      }),
    ];
    const filter: HistoryFilterState = {
      ...EMPTY_HISTORY_FILTER,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
    };

    const result = filterRecords(records, filter);

    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it('입력 배열과 기록을 고치지 않는다', () => {
    const records = [record({ id: 1 }), record({ id: 2 })];
    const snapshot = JSON.parse(JSON.stringify(records));

    filterRecords(records, { ...EMPTY_HISTORY_FILTER, purpose: 'grinding' });

    expect(JSON.parse(JSON.stringify(records))).toEqual(snapshot);
    // 반환값은 같은 객체 참조를 담는다 — 복사해서 값을 바꿔치기하지 않는다.
    const kept = filterRecords(records, EMPTY_HISTORY_FILTER);
    expect(kept[0]).toBe(records[0]);
  });
});
