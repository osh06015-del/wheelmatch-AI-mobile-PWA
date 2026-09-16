// 이력 화면의 필터. IndexedDB 기록은 건드리지 않는다.
//
// 여기서 하는 일은 이미 읽어 온 기록 배열을 걸러 보여주는 것뿐이다.
// 순수 함수로 두는 이유는 두 가지다.
//   1. 필터가 저장소에 손대지 않는다는 것을 코드 형태로 보장한다
//      (인자로 받은 기록을 읽기만 하고, db 모듈을 아예 import하지 않는다).
//   2. 화면 없이도 필터 조건 하나하나를 테스트할 수 있다.
//
// 값이 비어 있는 조건(null)은 "전체"를 뜻한다. 기본값은 아무것도 거르지 않는다.

import { toDateOnly } from '@/lib/rules/engine';
import type {
  InspectionRecord,
  TrialRunOutcome,
  Verdict,
  WheelType,
  WorkPurpose,
} from '@/lib/rules/types';

/** 시험운전을 하지 않은 기록(부적합·판정불가, 또는 이 기능 도입 전 기록)을 고르는 값 */
export const TRIAL_RUN_NONE = 'none' as const;

export interface HistoryFilterState {
  /** null이면 절단·연삭 모두 */
  purpose: WorkPurpose | null;
  /** null이면 적합·부적합·판정불가 모두 */
  verdict: Verdict | null;
  /** YYYY-MM-DD. null이면 하한 없음 */
  dateFrom: string | null;
  /** YYYY-MM-DD. null이면 상한 없음 */
  dateTo: string | null;
  /** null이면 모든 종류 */
  wheelType: WheelType | null;
  /** null이면 전체. TRIAL_RUN_NONE이면 시험운전 자체가 없는 기록만 */
  trialRunOutcome: TrialRunOutcome | typeof TRIAL_RUN_NONE | null;
}

/** 아무것도 거르지 않는 시작 상태. */
export const EMPTY_HISTORY_FILTER: HistoryFilterState = {
  purpose: null,
  verdict: null,
  dateFrom: null,
  dateTo: null,
  wheelType: null,
  trialRunOutcome: null,
};

/** 필터 중 하나라도 걸려 있는지. 초기화 버튼을 보여줄지 정하는 데 쓴다. */
export function isFilterActive(filter: HistoryFilterState): boolean {
  return Object.values(filter).some((value) => value !== null);
}

/** createdAt(ISO 문자열)을 YYYY-MM-DD로 줄인다. 기록에 남은 로컬 날짜 그대로다. */
function recordDateOnly(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return toDateOnly(date);
}

function matchesDateRange(
  createdAt: string,
  dateFrom: string | null,
  dateTo: string | null,
): boolean {
  if (dateFrom === null && dateTo === null) return true;
  const day = recordDateOnly(createdAt);
  // 날짜를 읽지 못한 기록은 날짜로 거르지 않는다 — 있지도 않은 값으로
  // "범위 밖"이라 단정하지 않는다.
  if (day === null) return true;
  if (dateFrom !== null && day < dateFrom) return false;
  if (dateTo !== null && day > dateTo) return false;
  return true;
}

function matchesTrialRun(
  record: InspectionRecord,
  wanted: HistoryFilterState['trialRunOutcome'],
): boolean {
  if (wanted === null) return true;
  if (wanted === TRIAL_RUN_NONE) return record.trialRun === undefined;
  return record.trialRun?.outcome === wanted;
}

/** 한 기록이 필터 조건을 모두 만족하는지. */
export function matchesFilter(
  record: InspectionRecord,
  filter: HistoryFilterState,
): boolean {
  if (filter.purpose !== null && record.declaredPurpose !== filter.purpose) {
    return false;
  }
  if (filter.verdict !== null && record.result.verdict !== filter.verdict) {
    return false;
  }
  if (
    filter.wheelType !== null &&
    record.wheel.wheelType !== filter.wheelType
  ) {
    return false;
  }
  if (!matchesTrialRun(record, filter.trialRunOutcome)) return false;
  if (!matchesDateRange(record.createdAt, filter.dateFrom, filter.dateTo)) {
    return false;
  }
  return true;
}

/**
 * 기록 목록을 필터로 거른다.
 *
 * 읽기만 한다 — db 모듈을 import하지 않고, 넘겨받은 배열이나 그 안의 기록을
 * 고치지 않는다. 호출자가 IndexedDB에서 읽어 온 배열을 그대로 다시 걸러 쓴다.
 */
export function filterRecords(
  records: readonly InspectionRecord[],
  filter: HistoryFilterState,
): InspectionRecord[] {
  return records.filter((record) => matchesFilter(record, filter));
}
