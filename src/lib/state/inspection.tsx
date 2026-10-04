'use client';

// 촬영 화면과 결과 화면 사이에서 규격 값을 옮기는 저장소.
//
// 값(JSON)은 sessionStorage에도 함께 저장한다. 현장에서 화면이 새로고침되거나
// 앱이 잠깐 백그라운드로 내려가도 촬영을 처음부터 다시 하지 않게 하기 위해서다.
// 이미지 Blob은 메모리에만 둔다. sessionStorage에 담을 수 없고, 저장 시점에만 쓰인다.
//
// React 상태 대신 모듈 저장소 + useSyncExternalStore를 쓴다.
// sessionStorage는 React 바깥의 시스템이라, effect에서 setState로 끌어오면
// hydration 시점에 값이 한 박자 늦게 들어와 잘못된 화면 전환을 유발한다.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  isValidCaptureQualityCheck,
  isValidCaptureQualityMetrics,
  isValidGrinderCondition,
  isValidGrinderSpec,
  isValidOcrTelemetry,
  isValidWheelCondition,
  isValidWheelSpec,
  isValidWorkConditions,
} from '@/lib/backup/recordSanitize';
import {
  withAcceptedReanalysis,
  withReanalysisSuspicion,
} from '@/lib/ocr/confirm';
import {
  isTrialRunProgress,
  type TrialRunProgress,
} from '@/lib/safety/trialRun';
import type {
  AnalysisLimitCause,
  AnalysisLimitCauses,
  AnalysisMode,
  CaptureQualityCheck,
  CaptureQualityMetrics,
  GrinderCondition,
  GrinderSpec,
  OcrTelemetry,
  SafetyChecklist,
  TrialRun,
  WheelCondition,
  WheelSpec,
  WorkConditions,
  WorkPurpose,
} from '@/lib/rules/types';

const GRINDER_KEY = 'wheelmatch.grinder';
const WHEEL_KEY = 'wheelmatch.wheel';
const PURPOSE_KEY = 'wheelmatch.purpose';
const STARTED_KEY = 'wheelmatch.startedAt';
const GRINDER_OCR_KEY = 'wheelmatch.grinderOcr';
const WHEEL_OCR_KEY = 'wheelmatch.wheelOcr';
const GRINDER_CONDITION_KEY = 'wheelmatch.grinderCondition';
const WHEEL_CONDITION_KEY = 'wheelmatch.wheelCondition';
const TRIAL_RUN_KEY = 'wheelmatch.trialRun';
const GRINDER_CAPTURE_METRICS_KEY = 'wheelmatch.grinderCaptureMetrics';
const WHEEL_CAPTURE_METRICS_KEY = 'wheelmatch.wheelCaptureMetrics';
const GRINDER_OCR_TELEMETRY_KEY = 'wheelmatch.grinderOcrTelemetry';
const WHEEL_OCR_TELEMETRY_KEY = 'wheelmatch.wheelOcrTelemetry';
const CAPTURE_CHECKS_KEY = 'wheelmatch.captureChecks';
const WORK_CONDITIONS_KEY = 'wheelmatch.workConditions';
const OFFLINE_SLOTS_KEY = 'wheelmatch.offlineSlots';

/** 판독 단계. 명판과 숫돌 라벨 둘이다 */
export type OfflineSlot = 'grinder' | 'wheel';

const OFFLINE_SLOT_NAMES: readonly OfflineSlot[] = ['grinder', 'wheel'];

/**
 * 어느 단계를 서버 판독의 뒷받침 없이(제한 대조) 확정했는가. 세 경우다 —
 * 서버에 닿지 못해 작업자가 직접 입력했거나, 기기 안 OCR로만 읽었거나, 확인 화면
 * draft에 저장된 서버 판독을 읽을 수 없어 통째로 버린 채 확정했다
 * (formDraftModel.ts의 DroppedOcrTrace). 저장된 이 표시 자체를 읽지 못했을 때도
 * 두 단계 모두 제한으로 본다(readOfflineSlots).
 *
 * 한 단계라도 true면 이 점검 전체가 offline_limited다(analysisModeOf). 단계별로
 * 두는 이유: 명판을 다시 찍어 온라인으로 읽으면 명판 쪽만 풀려야 하고, 숫돌을
 * 다시 찍었다고 제한으로 확정한 명판 값이 풀리면 안 된다.
 *
 * 이름의 Offline은 처음 만들 때의 한 경우에서 왔다. 기기가 오프라인이었다는 뜻이
 * 아니다 — sessionStorage와 진행 중 점검 draft에 저장된 이름이라 그대로 둔다.
 */
export interface OfflineSlots {
  grinder: boolean;
  wheel: boolean;
  /**
   * 제한된 단계의 까닭. **제한 여부는 위의 두 값만 정한다** — 이 값은 기록과 화면이
   * 사실대로 말하기 위한 것이고 판정에는 쓰지 않는다. 까닭이 없거나 어긋나도 제한은
   * 그대로다.
   *
   * 제한되지 않은 단계의 까닭은 두지 않는다. 제한됐는데 까닭이 없으면 unknown으로
   * 읽는다(limitCausesOf) — 까닭을 적기 전에 저장된 표시와 읽지 못한 표시가 그렇다.
   * 남길 까닭이 하나도 없으면 이 칸 자체를 두지 않아, 저장되는 모양이 까닭을 적기
   * 전과 같다.
   */
  causes?: AnalysisLimitCauses;
}

export const NO_OFFLINE_SLOTS: OfflineSlots = { grinder: false, wheel: false };

/** 단계 중 하나라도 제한으로 확정했으면 점검 전체가 제한 대조다. */
export function analysisModeOf(slots: OfflineSlots): AnalysisMode {
  return slots.grinder || slots.wheel ? 'offline_limited' : 'online';
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 남겨 둘 수 있는 까닭. unknown은 「까닭 없음」과 같아 따로 적지 않는다 */
const RECORDED_LIMIT_CAUSES = [
  'manual',
  'local_ocr',
  'dropped_ocr',
] as const satisfies readonly AnalysisLimitCause[];

const isRecordedLimitCause = (
  value: unknown,
): value is (typeof RECORDED_LIMIT_CAUSES)[number] =>
  (RECORDED_LIMIT_CAUSES as readonly unknown[]).includes(value);

/**
 * 단계별 표시와 까닭을 한 모양으로 만든다. 표시를 만드는 곳은 모두 이 함수를 거친다.
 *
 * 까닭은 제한된 단계의 것만, 목록에 있는 값만 남긴다. 풀린 단계의 까닭이 남아
 * 있으면 그 단계를 다시 제한으로 확정할 때 이전 사진의 까닭이 따라온다.
 */
function offlineSlotsOf(
  flags: Record<OfflineSlot, boolean>,
  causes: Partial<Record<OfflineSlot, unknown>> = {},
): OfflineSlots {
  const kept: AnalysisLimitCauses = {};
  for (const slot of OFFLINE_SLOT_NAMES) {
    const cause = causes[slot];
    if (flags[slot] && isRecordedLimitCause(cause)) kept[slot] = cause;
  }
  const slots: OfflineSlots = { grinder: flags.grinder, wheel: flags.wheel };
  if (Object.keys(kept).length > 0) slots.causes = kept;
  return slots;
}

/** 한 단계의 표시를 바꾼다. 그 단계의 까닭은 새로 적거나(cause) 지운다 */
function withOfflineSlot(
  slots: OfflineSlots,
  slot: OfflineSlot,
  offline: boolean,
  cause?: AnalysisLimitCause | null,
): OfflineSlots {
  return offlineSlotsOf(
    { grinder: slots.grinder, wheel: slots.wheel, [slot]: offline },
    { ...slots.causes, [slot]: cause },
  );
}

/**
 * 제한된 단계와 그 까닭. 제한되지 않은 단계는 넣지 않는다.
 *
 * 까닭이 남아 있지 않은 단계는 unknown이다. 추정해 채우지 않는다 — 확정한 값만
 * 보면 직접 입력과 버린 판독이 구분되지 않는다.
 *
 * 이 값이 그대로 기록에 저장된다. 목록에 없는 값이 섞여 나가면 백업 정리
 * (recordSanitize.ts)가 그 기록을 통째로 무효로 본다 — 그래서 여기서도 한 번 더
 * 걸러 unknown으로 낸다.
 */
export function limitCausesOf(slots: OfflineSlots): AnalysisLimitCauses {
  const causes: AnalysisLimitCauses = {};
  for (const slot of OFFLINE_SLOT_NAMES) {
    if (!slots[slot]) continue;
    const cause = slots.causes?.[slot];
    causes[slot] = isRecordedLimitCause(cause) ? cause : 'unknown';
  }
  return causes;
}

/**
 * 확인 화면의 상태에서 기록에 남길 까닭 하나를 고른다. 적을 까닭이 없으면 null이다.
 *
 * **제한 여부는 이 함수가 정하지 않는다.** 확인 화면은 제한 여부를 따로 넘긴다
 * (setOfflineSlot의 둘째 인자) — 이 함수가 틀려도, null을 내도 제한은 풀리지 않는다.
 * 제한됐는데 까닭이 null이면 unknown으로 읽힌다(limitCausesOf).
 *
 * 둘이 겹치면 출처가 먼저다(직접 입력 → 기기 안 OCR → 버린 판독). 기기 안 OCR로
 * 읽은 판독이 버려진 draft는 local_ocr로 남는다 — 출처는 바꿔 적지 않는다
 * (formDraftModel.ts의 AnalysisSource). 버린 판독이 까닭이 되는 것은 서버로 읽은
 * 판독을 버렸을 때뿐이다.
 *
 * **모르면 적지 않는다.** 확인 화면의 localOnly는 제한을 지키려고 넓게 잡은
 * 묶음이라, 기기 안 OCR로 읽은 값 말고도 읽을 때 기기가 오프라인으로 보고된 값과
 * 출처가 남지 않은 draft의 값이 들어 있다. 뒤의 둘은 서버가 읽은 값일 수 있다.
 * 그래서 엔진이 확인된 경우에만 local_ocr을 낸다. 확인되지 않았으면 버린 판독도
 * 까닭으로 내지 않는다 — 그 판독이 서버 판독이었는지부터 모른다.
 */
export function limitCauseFor(flags: {
  /** 서버에 닿지 못해 직접 입력했다 */
  manual: boolean;
  /** 서버 판독이 아닌 것으로 보고 제한한 값이다(넓게 잡은 묶음) */
  localOnly: boolean;
  /** 그 가운데 기기 안 OCR 엔진이 읽은 것이 확인됐다. localOnly일 때만 뜻이 있다 */
  localOcrConfirmed: boolean;
  /** 저장된 판독을 통째로 버려 화면에 판독이 없다 */
  ocrDropped: boolean;
}): AnalysisLimitCause | null {
  if (flags.manual) return 'manual';
  if (flags.localOnly) return flags.localOcrConfirmed ? 'local_ocr' : null;
  if (flags.ocrDropped) return 'dropped_ocr';
  return null;
}

/**
 * 저장된 제한 표시를 읽는다. draft 복구(lib/draft/draftModel.ts)와 새로고침
 * 복원이 같이 쓴다.
 *
 * 저장된 적이 없으면(undefined) 아직 제한으로 확정한 단계가 없는 것이다. 값이
 * 있는데 읽지 못하면 더 엄격한 쪽(두 단계 모두 제한)으로 본다 — 모르는 것을
 * 온라인으로 추정하면 적합이 근거 없이 열린다.
 *
 * 까닭은 따로 본다. 표시가 온전하면 까닭이 어긋나도 표시를 버리지 않고 까닭만
 * 버린다(unknown으로 읽힌다) — 판정에 쓰지 않는 값 때문에 온전한 표시까지
 * 「읽지 못함」으로 만들 이유가 없다. 표시를 읽지 못했으면 함께 적힌 까닭도 믿지
 * 않는다. 그 단계가 정말 제한됐는지부터 모르는 것이다.
 */
export function readOfflineSlots(value: unknown): {
  slots: OfflineSlots;
  /** 값이 있는데 읽지 못했는가 */
  unreadable: boolean;
} {
  if (value === undefined)
    return { slots: NO_OFFLINE_SLOTS, unreadable: false };
  if (
    isObject(value) &&
    typeof value.grinder === 'boolean' &&
    typeof value.wheel === 'boolean'
  ) {
    return {
      slots: offlineSlotsOf(
        { grinder: value.grinder, wheel: value.wheel },
        isObject(value.causes) ? value.causes : {},
      ),
      unreadable: false,
    };
  }
  return { slots: { grinder: true, wheel: true }, unreadable: true };
}

/**
 * 촬영 자리별 사진 상태 확인 기록. 한 번도 찍지 않은 자리는 없다.
 *
 * 진행 중 점검이 찍는 자리는 명판과 라벨 둘뿐이다. 저장된 기록의 타입
 * (CaptureSlot)에는 다각도 확인 자리도 있지만, 그것은 이전 기록을 읽기 위한 것이다.
 */
export type CaptureChecks = Partial<
  Record<'grinder' | 'wheel', CaptureQualityCheck>
>;

const CAPTURE_CHECK_SLOTS = Object.keys({
  grinder: true,
  wheel: true,
} satisfies Record<keyof CaptureChecks, true>) as (keyof CaptureChecks)[];

/**
 * 저장된 사진 상태 확인 기록에서 명판·라벨 자리의 온전한 기록만 남긴다. draft
 * 복구와 새로고침 복원이 같이 쓴다.
 *
 * 그 밖의 자리(이전 버전의 다각도 확인)는 보지 않는다 — 그 사진이 지금 점검에
 * 없는데 기록만 남기면 없는 사진에 대한 기록이 저장된다. 어긋난 자리는 그 자리만
 * 버린다. 한 자리 때문에 다른 자리의 기록까지 버릴 이유가 없다.
 */
export function pickCaptureChecks(raw: unknown): {
  checks: CaptureChecks;
  /** 값이 있는데 형태가 어긋나 버린 자리가 있는가 */
  dropped: boolean;
} {
  if (raw === undefined || raw === null) return { checks: {}, dropped: false };
  if (!isObject(raw)) return { checks: {}, dropped: true };
  const checks: CaptureChecks = {};
  let dropped = false;
  for (const slot of CAPTURE_CHECK_SLOTS) {
    const value = raw[slot];
    if (value === undefined || value === null) continue;
    if (isValidCaptureQualityCheck(value)) checks[slot] = value;
    else dropped = true;
  }
  return { checks, dropped };
}

/** 시작 시각(epoch ms)으로 쓸 수 있는 값인가. draft 복구도 이 검사를 쓴다 */
export const isStartedAt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

interface InspectionState {
  /** 작업자가 시작할 때 고른 오늘의 작업 */
  declaredPurpose: WorkPurpose | null;
  /** 점검을 시작한 시각(epoch ms). 작업을 고른 순간이다. */
  startedAt: number | null;
  /**
   * 작업자가 고른 재료·건식/습식. 고르지 않았으면 null이다 — 화면·기록에서는
   * unknown으로 읽는다. 규격 판정에는 들어가지 않는다(profileConditions).
   */
  workConditions: WorkConditions | null;
  grinder: GrinderSpec | null;
  wheel: WheelSpec | null;
  /**
   * 사용자가 손대기 전의 OCR 결과.
   *
   * 최종 값만 남기면 "AI가 처음에 뭐라고 읽었는지"가 사라져 인식률을 잴 수 없다.
   * 연구용 지표(정정률)를 뽑으려면 둘 다 있어야 한다. 판정에는 쓰지 않는다.
   */
  grinderOcr: GrinderSpec | null;
  wheelOcr: WheelSpec | null;
  /** 작업자가 직접 답한 그라인더 장비 상태. AI가 채우지 않는다. */
  grinderCondition: GrinderCondition | null;
  /** 작업자가 직접 답한 숫돌 상태 확인. AI가 채우지 않는다. */
  wheelCondition: WheelCondition | null;
  /** 진행 중인 시험운전. 절대 종료시각을 들고 있어 새로고침에도 이어진다. */
  trialRun: TrialRunProgress | null;
  /**
   * 명판·라벨 사진. Blob은 sessionStorage에 담을 수 없어 **메모리에만** 둔다.
   * 화면 이동(촬영 → 결과 → 이력)에서는 이 모듈이 살아 있어 유지되고,
   * 새로고침하면 사라진다.
   */
  grinderImage: Blob | null;
  wheelImage: Blob | null;
  /**
   * 촬영·OCR의 검증용 원시 측정값. 판정에 쓰지 않는다 — CaptureQualityMetrics·
   * OcrTelemetry 참고. 값 수집이 실패해도 점검 흐름과 무관하므로 null일 수 있다.
   */
  grinderCaptureMetrics: CaptureQualityMetrics | null;
  wheelCaptureMetrics: CaptureQualityMetrics | null;
  grinderOcrTelemetry: OcrTelemetry | null;
  wheelOcrTelemetry: OcrTelemetry | null;
  /** 촬영 직후 사진 상태 경고와 재촬영 여부(검증용). 판정·Gate에 쓰지 않는다. */
  captureChecks: CaptureChecks;
  /** 제한 대조로 확정한 단계와 그 까닭. sessionStorage에 남는다 */
  offlineSlots: OfflineSlots;
  /**
   * 결과 화면의 작업 전 체크리스트. 아직 누르지 않았으면 null.
   *
   * 메모리에만 둔다 — 새로고침 뒤에는 이전처럼 다시 누르게 하고, 진행 중 점검
   * 복구(draft)를 사용자가 "이어하기"로 고른 경우에만 되살린다.
   */
  checklist: SafetyChecklist | null;
  /** 마친 시험운전 기록. 같은 이유로 메모리에만 둔다 */
  trialRunRecord: TrialRun | null;
  /** 서버 렌더 결과에서는 false. 브라우저 값이 반영된 뒤에만 true가 된다. */
  hydrated: boolean;
  /**
   * 새로고침 때 sessionStorage에서 읽은 값 가운데 형태가 어긋나 버린 것이 있는가.
   *
   * 버리면 작업자는 이유 없이 앞 단계로 돌아가게 된다. 화면(DraftRecovery)이 이
   * 표시를 보고 한 번 알린다. 점검을 새로 시작하거나(reset) draft로 복구하면
   * (restore) 꺼진다 — 그 뒤의 상태는 버린 값과 무관하다.
   */
  droppedOnReload: boolean;
}

/**
 * 진행 중 점검 복구(draft)가 저장·복원하는 전체 상태. hydrated와 droppedOnReload는
 * 화면 상태라 뺀다.
 */
export type InspectionSnapshot = Omit<
  InspectionState,
  'hydrated' | 'droppedOnReload'
>;

/**
 * 앞 단계가 없으면 뒤 단계의 값은 근거가 없다 — 함께 버린다.
 *
 * 명판이 없으면 그 기계에 대한 장비 상태 확인도, 그 기계를 기준으로 한 숫돌 단계도
 * 남길 수 없다. 숫돌이 없으면 숫돌 단계와 그 뒤(결과 화면)의 값을 버린다.
 * setGrinder·setWheel이 값을 바꿀 때 지우는 것과 같은 범위다. draft 복구와
 * 새로고침 복원이 같이 쓴다.
 */
export function dropOrphanedSteps(
  snapshot: InspectionSnapshot,
): InspectionSnapshot {
  if (snapshot.grinder !== null && snapshot.wheel !== null) return snapshot;
  const { grinder: grinderCheck } = snapshot.captureChecks;
  return {
    ...snapshot,
    grinderCondition:
      snapshot.grinder === null ? null : snapshot.grinderCondition,
    wheel: null,
    wheelOcr: null,
    wheelCondition: null,
    wheelImage: null,
    wheelCaptureMetrics: null,
    wheelOcrTelemetry: null,
    trialRun: null,
    checklist: null,
    trialRunRecord: null,
    offlineSlots: withOfflineSlot(snapshot.offlineSlots, 'wheel', false),
    captureChecks: grinderCheck ? { grinder: grinderCheck } : {},
  };
}

/** 서버 렌더와 hydration에 쓰는 고정 스냅샷. 절대 바뀌지 않는다. */
const SERVER_SNAPSHOT: InspectionState = {
  declaredPurpose: null,
  startedAt: null,
  workConditions: null,
  grinder: null,
  wheel: null,
  grinderOcr: null,
  wheelOcr: null,
  grinderCondition: null,
  wheelCondition: null,
  trialRun: null,
  grinderImage: null,
  wheelImage: null,
  grinderCaptureMetrics: null,
  wheelCaptureMetrics: null,
  grinderOcrTelemetry: null,
  wheelOcrTelemetry: null,
  captureChecks: {},
  offlineSlots: NO_OFFLINE_SLOTS,
  checklist: null,
  trialRunRecord: null,
  hydrated: false,
  droppedOnReload: false,
};

/** 값이 있는데 JSON으로 읽히지 않는다. 어떤 검사도 통과하지 못하는 값이다. */
const UNREADABLE = Symbol('unreadable');

/**
 * 저장된 값을 타입 없이(unknown) 읽는다. 저장된 적이 없으면 undefined다 —
 * 읽지 못한 것(UNREADABLE)과 가른다. 둘을 같게 보면 깨진 제한 표시가
 * "제한으로 확정한 단계 없음"으로 읽힌다.
 */
function readStored(key: string): unknown {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch {
    // 저장소를 쓸 수 없는 환경이다. 저장된 것이 없는 것과 같다.
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return UNREADABLE;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 치명적이지 않다. 메모리 상태만으로도 흐름은 이어진다.
  }
}

/**
 * 새로고침용 저장(sessionStorage)을 이 상태에 맞춘다. 없는 값(null)은 키를 지운다.
 * 사진과, 메모리에만 두는 값(체크리스트·마친 시험운전)은 쓰지 않는다.
 */
function persistSnapshot(snapshot: InspectionSnapshot): void {
  const stored: Array<[string, unknown]> = [
    [PURPOSE_KEY, snapshot.declaredPurpose],
    [STARTED_KEY, snapshot.startedAt],
    [WORK_CONDITIONS_KEY, snapshot.workConditions],
    [GRINDER_KEY, snapshot.grinder],
    [WHEEL_KEY, snapshot.wheel],
    [GRINDER_OCR_KEY, snapshot.grinderOcr],
    [WHEEL_OCR_KEY, snapshot.wheelOcr],
    [GRINDER_CONDITION_KEY, snapshot.grinderCondition],
    [WHEEL_CONDITION_KEY, snapshot.wheelCondition],
    [TRIAL_RUN_KEY, snapshot.trialRun],
    [GRINDER_CAPTURE_METRICS_KEY, snapshot.grinderCaptureMetrics],
    [WHEEL_CAPTURE_METRICS_KEY, snapshot.wheelCaptureMetrics],
    [GRINDER_OCR_TELEMETRY_KEY, snapshot.grinderOcrTelemetry],
    [WHEEL_OCR_TELEMETRY_KEY, snapshot.wheelOcrTelemetry],
    [OFFLINE_SLOTS_KEY, snapshot.offlineSlots],
  ];
  for (const [key, value] of stored) {
    if (value === null) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // 메모리 상태가 기준이다. 저장을 맞추지 못해도 흐름은 이어진다.
      }
    } else {
      writeStored(key, value);
    }
  }
  writeStored(CAPTURE_CHECKS_KEY, snapshot.captureChecks);
}

const isWorkPurpose = (value: unknown): value is WorkPurpose =>
  value === 'cutting' || value === 'grinding';

/**
 * sessionStorage에 남은 값으로 상태를 되살린다(새로고침·PWA 업데이트 뒤).
 *
 * 타입 선언은 브라우저 저장값을 검증하지 않는다. 탭을 연 채 앱이 업데이트되면
 * 이전 버전이 쓴 값을 새 버전이 읽고, 되살린 규격은 결과 화면에서 곧바로
 * 규칙엔진으로 들어간다. 엔진은 그 값이 타입대로라고 믿는다 — 검사 없이 넘기면
 *   · 목록에 없는 종류 — 엔진이 예외를 던져 결과 화면이 죽는다
 *   · 목록에 없는 용도 — 근거 없는 용도 불일치(부적합)가 된다
 *   · {year, month}가 아닌 유효기한 — 유효기한 규칙을 통과해 적합이 나온다
 *
 * 그래서 값마다 draft 복구와 같은 기준(recordSanitize.ts)으로 검사하고, 어긋난
 * 값은 비슷한 값으로 고치지 않고 버린다. 버린 것이 확정한 규격이면 그 단계와 뒤
 * 단계를 다시 하게 되고(dropOrphanedSteps → 화면 가드), 작업자의 상태 확인이면 그
 * 확인을 다시 하게 된다. OCR 원본·측정값은 그것만 사라진다.
 */
function initialClientState(): InspectionState {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT;

  let dropped = false;

  /**
   * 값이 있는데 형태가 어긋나면 버린다. 저장된 적이 없는 값(undefined)과 앱이
   * "없음"으로 남긴 값(null — 고르지 않은 작업 조건, 받지 못한 OCR 원본·측정값)은
   * 어긋난 값이 아니다.
   */
  function pick<T>(
    key: string,
    guard: (value: unknown) => value is T,
  ): T | null {
    const value = readStored(key);
    if (value === undefined || value === null) return null;
    if (guard(value)) return value;
    dropped = true;
    return null;
  }

  const offline = readOfflineSlots(readStored(OFFLINE_SLOTS_KEY));
  if (offline.unreadable) dropped = true;
  const captureChecks = pickCaptureChecks(readStored(CAPTURE_CHECKS_KEY));
  if (captureChecks.dropped) dropped = true;

  const snapshot = dropOrphanedSteps({
    // 지원하는 작업만 복원해야 손상된 값이 화면의 작업 선택 완료 조건(null 여부)을
    // 통과하지 않는다.
    declaredPurpose: pick(PURPOSE_KEY, isWorkPurpose),
    startedAt: pick(STARTED_KEY, isStartedAt),
    workConditions: pick(WORK_CONDITIONS_KEY, isValidWorkConditions),
    grinder: pick(GRINDER_KEY, isValidGrinderSpec),
    wheel: pick(WHEEL_KEY, isValidWheelSpec),
    grinderOcr: pick(GRINDER_OCR_KEY, isValidGrinderSpec),
    wheelOcr: pick(WHEEL_OCR_KEY, isValidWheelSpec),
    grinderCondition: pick(GRINDER_CONDITION_KEY, isValidGrinderCondition),
    wheelCondition: pick(WHEEL_CONDITION_KEY, isValidWheelCondition),
    // 종료시각을 읽지 못하는 타이머는 끝난 것으로 계산된다. 법정 시간과 맞는
    // 값만 이어간다(isTrialRunProgress).
    trialRun: pick(TRIAL_RUN_KEY, isTrialRunProgress),
    // 사진은 Blob이라 sessionStorage에 담을 수 없고 새로고침을 넘지 못한다.
    grinderImage: null,
    wheelImage: null,
    grinderCaptureMetrics: pick(
      GRINDER_CAPTURE_METRICS_KEY,
      isValidCaptureQualityMetrics,
    ),
    wheelCaptureMetrics: pick(
      WHEEL_CAPTURE_METRICS_KEY,
      isValidCaptureQualityMetrics,
    ),
    grinderOcrTelemetry: pick(GRINDER_OCR_TELEMETRY_KEY, isValidOcrTelemetry),
    wheelOcrTelemetry: pick(WHEEL_OCR_TELEMETRY_KEY, isValidOcrTelemetry),
    captureChecks: captureChecks.checks,
    offlineSlots: offline.slots,
    checklist: null,
    trialRunRecord: null,
  });

  // 버린 값이 있으면 새로고침용 저장도 되살린 상태에 맞춘다. 어긋난 값을 남겨
  // 두면 새로고침할 때마다 같은 값을 다시 버리고 다시 알린다. 읽지 못한 제한
  // 표시는 여기서 두 단계 모두 제한으로 적힌다 — 지우기만 하면 다음 새로고침에
  // "표시 없음"(온라인)으로 읽혀 제한이 풀린다.
  if (dropped) persistSnapshot(snapshot);

  return { ...snapshot, hydrated: true, droppedOnReload: dropped };
}

let state: InspectionState = initialClientState();
const listeners = new Set<() => void>();

function setState(next: Partial<InspectionState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 스냅샷은 참조가 안정적이어야 한다. 변경이 있을 때만 새 객체를 만든다. */
function getSnapshot(): InspectionState {
  return state;
}

function getServerSnapshot(): InspectionState {
  return SERVER_SNAPSHOT;
}

export interface InspectionStore extends InspectionState {
  /** 브라우저 값이 아직 반영되지 않은 렌더인지 여부 */
  hydrating: boolean;
  /**
   * 작업을 고른다. 이 순간이 점검 시작이다.
   *
   * @param conditions 재료·건식/습식. 넘기지 않으면 고르지 않은 것(null)으로 둔다.
   */
  setPurpose: (purpose: WorkPurpose, conditions?: WorkConditions) => void;
  setGrinder: (
    spec: GrinderSpec,
    image?: Blob | null,
    ocr?: GrinderSpec | null,
    captureMetrics?: CaptureQualityMetrics | null,
    ocrTelemetry?: OcrTelemetry | null,
  ) => void;
  setWheel: (
    spec: WheelSpec,
    image?: Blob | null,
    ocr?: WheelSpec | null,
    captureMetrics?: CaptureQualityMetrics | null,
    ocrTelemetry?: OcrTelemetry | null,
  ) => void;
  setGrinderCondition: (condition: GrinderCondition) => void;
  setWheelCondition: (condition: WheelCondition) => void;
  /**
   * 명판·라벨 사진의 상태 확인 기록. setGrinder/setWheel 뒤에 부른다 —
   * 그 둘이 이전 기록을 지우기 때문이다(장비 상태 확인과 같은 순서).
   */
  setCaptureCheck: (
    slot: 'grinder' | 'wheel',
    check: CaptureQualityCheck | null,
  ) => void;
  setTrialRun: (progress: TrialRunProgress | null) => void;
  /**
   * 이 단계를 제한 대조로 확정했는지. setGrinder/setWheel 뒤에 부른다 —
   * 그 둘이 해당 단계의 표시를 지우기 때문이다.
   *
   * @param offline 제한 여부. 이 값만 판정에 닿는다.
   * @param cause 제한된 까닭. 기록과 화면에 적을 사실이고 판정에는 쓰지 않는다.
   *   넘기지 않으면 까닭 없이 표시만 남는다(unknown으로 읽힌다). offline이
   *   false면 버린다.
   */
  setOfflineSlot: (
    slot: OfflineSlot,
    offline: boolean,
    cause?: AnalysisLimitCause | null,
  ) => void;
  /**
   * 서버 재분석 결과가 도착했다. 전환을 받아들이기 전에, 받아들이지 않더라도 부른다.
   *
   * AI가 숫돌 사진에서 외관 손상을 의심했으면 그 의심만 숫돌 확정값에 더한다.
   * 값이 달라 전환이 막히거나 작업자가 취소해 AI 값을 버려도, 앱이 올린 경고는
   * 버리지 않는다. 의심하지 않았으면 아무것도 바꾸지 않는다.
   *
   * @param analyzedWheelImage 서버로 보낸 라벨 사진. 지금 확정된 숫돌의 사진과
   *   다르면 아무것도 하지 않는다 — 응답을 기다리는 사이 작업자가 숫돌을 다시
   *   찍은 것이고, 이 결과는 그 숫돌을 본 것이 아니다.
   */
  keepReanalysisSuspicion: (
    input: ReanalysisInput,
    analyzedWheelImage: Blob | null,
  ) => void;
  /**
   * 사용자가 서버 재분석 결과를 확인하고 제한 대조를 푼다(판독 경로가 online이 된다).
   *
   * 작업자가 확인 화면에서 확정한 값은 건드리지 않는다. AI 값은 OCR 원본 자리에
   * 넣고, 넣은 단계의 제한 표시만 푼다.
   *
   * 숫돌 확정값에서 옮기는 것은 OCR이 실어 오던 두 칸뿐이다 — 외관 의심과 원본
   * 표시의 빈 자리(withAcceptedReanalysis). 확인 화면에 없어 작업자가 확정한 적이
   * 없는 값이고, 판정은 확정값만 보므로 옮기지 않으면 처음부터 온라인으로 읽은
   * 점검보다 느슨하게 대조하게 된다.
   *
   * 확정값에 이미 실려 있던 표기(로컬 OCR이 읽은 것)를 서버가 다르게 읽었으면
   * 아무것도 하지 않는다 — 오프라인 표시도 OCR 원본 자리도 그대로 남는다. 빈
   * 자리만 채우는 규칙으로는 그 충돌에서 로컬 표기가 조용히 이기기 때문이다.
   */
  applyReanalysis: (input: ReanalysisInput) => void;
  setChecklist: (checklist: SafetyChecklist | null) => void;
  setTrialRunRecord: (record: TrialRun | null) => void;
  /** 진행 중 점검 복구에서 사용자가 "이어하기"를 고른 경우에만 부른다 */
  restore: (snapshot: InspectionSnapshot) => void;
  /** 판독 경로. offlineSlots에서 파생한다 */
  analysisMode: AnalysisMode;
  reset: () => void;
}

/** 서버 재분석으로 받은 AI 값. 다시 분석한 단계만 채운다 */
export interface ReanalysisInput {
  grinderOcr?: GrinderSpec;
  grinderOcrTelemetry?: OcrTelemetry | null;
  wheelOcr?: WheelSpec;
  wheelOcrTelemetry?: OcrTelemetry | null;
}

/**
 * 저장소 상태 그대로. 값이 바뀔 때만 참조가 바뀐다 — 진행 중 점검 자동 저장이
 * "무엇이든 바뀌면 저장"을 이 참조 하나로 판단한다.
 */
export function useInspectionState(): Readonly<
  InspectionSnapshot & { hydrated: boolean; droppedOnReload: boolean }
> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useInspection(): InspectionStore {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // 작업을 고르는 것이 곧 점검 시작이다. 여기서 시계를 켠다.
  // 되돌아와 다시 고르면 처음부터 다시 잰다 — 중간에 그만둔 시도까지
  // 합산하면 "한 건에 걸린 시간"이 아니게 된다.
  const setPurpose = useCallback(
    (purpose: WorkPurpose, conditions?: WorkConditions) => {
      const startedAt = Date.now();
      writeStored(PURPOSE_KEY, purpose);
      writeStored(STARTED_KEY, startedAt);
      writeStored(WORK_CONDITIONS_KEY, conditions ?? null);
      setState({
        declaredPurpose: purpose,
        startedAt,
        workConditions: conditions ?? null,
      });
    },
    [],
  );

  const setGrinder = useCallback(
    (
      spec: GrinderSpec,
      image?: Blob | null,
      ocr?: GrinderSpec | null,
      captureMetrics?: CaptureQualityMetrics | null,
      ocrTelemetry?: OcrTelemetry | null,
    ) => {
      writeStored(GRINDER_KEY, spec);
      if (ocr !== undefined) writeStored(GRINDER_OCR_KEY, ocr);
      if (captureMetrics !== undefined)
        writeStored(GRINDER_CAPTURE_METRICS_KEY, captureMetrics);
      if (ocrTelemetry !== undefined)
        writeStored(GRINDER_OCR_TELEMETRY_KEY, ocrTelemetry);
      // 그라인더가 바뀌면 그 뒤의 모든 것이 근거를 잃는다.
      //
      // 직접 확인한 장비 상태는 그 기계에 대한 답이고, 숫돌 규격 대조는
      // 그 기계의 회전속도·허용 지름을 기준으로 한 것이다. 기계가 달라지면
      // 둘 다 다시 해야 한다. 남겨두면 다른 기계의 확인이 그대로 통과한다.
      try {
        window.sessionStorage.removeItem(GRINDER_CONDITION_KEY);
        window.sessionStorage.removeItem(WHEEL_KEY);
        window.sessionStorage.removeItem(WHEEL_OCR_KEY);
        window.sessionStorage.removeItem(WHEEL_CONDITION_KEY);
        window.sessionStorage.removeItem(TRIAL_RUN_KEY);
        window.sessionStorage.removeItem(WHEEL_CAPTURE_METRICS_KEY);
        window.sessionStorage.removeItem(WHEEL_OCR_TELEMETRY_KEY);
        // 사진 상태 기록도 모두 지운다. 이번 명판 사진의 기록은 곧바로 이어지는
        // setCaptureCheck('grinder')가 넣는다.
        window.sessionStorage.removeItem(CAPTURE_CHECKS_KEY);
        window.sessionStorage.removeItem(OFFLINE_SLOTS_KEY);
      } catch {
        // 메모리 상태는 아래에서 반드시 지운다.
      }
      setState({
        grinder: spec,
        // 이번 명판이 제한 대조인지는 곧바로 이어지는 setOfflineSlot이 정한다.
        offlineSlots: NO_OFFLINE_SLOTS,
        checklist: null,
        trialRunRecord: null,
        captureChecks: {},
        grinderCondition: null,
        wheel: null,
        wheelOcr: null,
        wheelCondition: null,
        wheelImage: null,
        trialRun: null,
        wheelCaptureMetrics: null,
        wheelOcrTelemetry: null,
        ...(image === undefined ? {} : { grinderImage: image }),
        ...(ocr === undefined ? {} : { grinderOcr: ocr }),
        ...(captureMetrics === undefined
          ? {}
          : { grinderCaptureMetrics: captureMetrics }),
        ...(ocrTelemetry === undefined
          ? {}
          : { grinderOcrTelemetry: ocrTelemetry }),
      });
    },
    [],
  );

  const setWheel = useCallback(
    (
      spec: WheelSpec,
      image?: Blob | null,
      ocr?: WheelSpec | null,
      captureMetrics?: CaptureQualityMetrics | null,
      ocrTelemetry?: OcrTelemetry | null,
    ) => {
      writeStored(WHEEL_KEY, spec);
      if (ocr !== undefined) writeStored(WHEEL_OCR_KEY, ocr);
      if (captureMetrics !== undefined)
        writeStored(WHEEL_CAPTURE_METRICS_KEY, captureMetrics);
      if (ocrTelemetry !== undefined)
        writeStored(WHEEL_OCR_TELEMETRY_KEY, ocrTelemetry);
      // 숫돌이 바뀌면 이전 숫돌에 대한 직접 확인도, 그 숫돌로 돌린
      // 시험운전도 재사용할 수 없다.
      try {
        window.sessionStorage.removeItem(WHEEL_CONDITION_KEY);
        window.sessionStorage.removeItem(TRIAL_RUN_KEY);
      } catch {
        // 메모리 상태는 아래에서 반드시 지운다.
      }
      // 사진 상태 기록은 명판 것만 남긴다. 라벨 자리는 이전 숫돌의 사진에 대한
      // 기록이다. 이번 라벨 사진의 기록은 setCaptureCheck('wheel')가 넣는다.
      const kept: CaptureChecks = state.captureChecks.grinder
        ? { grinder: state.captureChecks.grinder }
        : {};
      writeStored(CAPTURE_CHECKS_KEY, kept);
      // 숫돌 쪽 제한 표시와 까닭만 지운다. 명판을 제한으로 확정했다는 사실은 남는다.
      const offlineSlots = withOfflineSlot(state.offlineSlots, 'wheel', false);
      writeStored(OFFLINE_SLOTS_KEY, offlineSlots);
      setState({
        wheel: spec,
        offlineSlots,
        checklist: null,
        trialRunRecord: null,
        wheelCondition: null,
        trialRun: null,
        captureChecks: kept,
        ...(image === undefined ? {} : { wheelImage: image }),
        ...(ocr === undefined ? {} : { wheelOcr: ocr }),
        ...(captureMetrics === undefined
          ? {}
          : { wheelCaptureMetrics: captureMetrics }),
        ...(ocrTelemetry === undefined
          ? {}
          : { wheelOcrTelemetry: ocrTelemetry }),
      });
    },
    [],
  );

  const setGrinderCondition = useCallback((condition: GrinderCondition) => {
    writeStored(GRINDER_CONDITION_KEY, condition);
    setState({ grinderCondition: condition });
  }, []);

  const setWheelCondition = useCallback((condition: WheelCondition) => {
    writeStored(WHEEL_CONDITION_KEY, condition);
    setState({ wheelCondition: condition });
  }, []);

  const setCaptureCheck = useCallback(
    (slot: 'grinder' | 'wheel', check: CaptureQualityCheck | null) => {
      const next: CaptureChecks = { ...state.captureChecks };
      if (check) next[slot] = check;
      else delete next[slot];
      writeStored(CAPTURE_CHECKS_KEY, next);
      setState({ captureChecks: next });
    },
    [],
  );

  /** 시험운전 시작·종료. null을 넣으면 진행 중인 것을 버린다. */
  const setTrialRun = useCallback((progress: TrialRunProgress | null) => {
    if (progress) writeStored(TRIAL_RUN_KEY, progress);
    else {
      try {
        window.sessionStorage.removeItem(TRIAL_RUN_KEY);
      } catch {
        // 메모리 상태는 아래에서 지운다.
      }
    }
    setState({ trialRun: progress });
  }, []);

  const setOfflineSlot = useCallback(
    (
      slot: OfflineSlot,
      offline: boolean,
      cause?: AnalysisLimitCause | null,
    ) => {
      const offlineSlots = withOfflineSlot(
        state.offlineSlots,
        slot,
        offline,
        cause,
      );
      writeStored(OFFLINE_SLOTS_KEY, offlineSlots);
      setState({ offlineSlots });
    },
    [],
  );

  const keepReanalysisSuspicion = useCallback(
    (input: ReanalysisInput, analyzedWheelImage: Blob | null) => {
      if (!input.wheelOcr || !state.wheel) return;
      // 서버 응답은 늦게 올 수 있다(연결이 나쁜 현장이 이 기능이 쓰이는 곳이다).
      // 그 사이 숫돌을 다시 찍었다면 지금 확정된 숫돌은 다른 사진의 것이고, 거기에
      // 이 결과의 의심을 얹으면 AI가 보지 않은 숫돌에 의심을 지어내는 것이 된다.
      if (state.wheelImage !== analyzedWheelImage) return;
      const wheel = withReanalysisSuspicion(state.wheel, input.wheelOcr);
      // 더할 의심이 없으면 같은 객체가 돌아온다. 저장소를 건드리지 않는다.
      if (wheel === state.wheel) return;
      writeStored(WHEEL_KEY, wheel);
      setState({ wheel });
    },
    [],
  );

  const applyReanalysis = useCallback((input: ReanalysisInput) => {
    // 숫돌 확정값부터 만든다. 숫돌을 다시 분석하지 않았거나 확정한 숫돌이 없으면
    // 바꿀 것이 없다(undefined).
    const acceptedWheel =
      input.wheelOcr && state.wheel
        ? withAcceptedReanalysis(state.wheel, input.wheelOcr)
        : undefined;
    // 확정값에 실린 표기와 서버가 읽은 표기가 같은 칸에서 다르면 받아들일 수 없다
    // (null). 아무것도 쓰지 않고 그만둔다 — 함께 다시 분석한 명판도 풀지 않는다. 한
    // 번의 재분석은 통째로 받아들이거나 받아들이지 않는다. 화면이 전환 버튼을 막지만
    // 버튼만 막으면 다른 경로로 불렸을 때 샌다.
    if (acceptedWheel === null) return;

    // 다시 분석한 단계의 제한만 푼다. 풀린 단계의 까닭도 함께 지운다.
    let offlineSlots = state.offlineSlots;
    if (input.grinderOcr)
      offlineSlots = withOfflineSlot(offlineSlots, 'grinder', false);
    if (input.wheelOcr)
      offlineSlots = withOfflineSlot(offlineSlots, 'wheel', false);
    const next: Partial<InspectionState> = { offlineSlots };
    if (input.grinderOcr) {
      next.grinderOcr = input.grinderOcr;
      next.grinderOcrTelemetry = input.grinderOcrTelemetry ?? null;
      writeStored(GRINDER_OCR_KEY, input.grinderOcr);
      writeStored(GRINDER_OCR_TELEMETRY_KEY, next.grinderOcrTelemetry);
    }
    if (input.wheelOcr) {
      next.wheelOcr = input.wheelOcr;
      next.wheelOcrTelemetry = input.wheelOcrTelemetry ?? null;
      writeStored(WHEEL_OCR_KEY, input.wheelOcr);
      writeStored(WHEEL_OCR_TELEMETRY_KEY, next.wheelOcrTelemetry);
      // 온라인 대조로 바뀌면 판정은 확정값만 본다. AI가 올린 외관 의심과 읽어 온
      // 원본 표시를 여기서 옮기지 않으면 판정에서 통째로 빠진다. 작업자가 확정한
      // 값은 그대로 둔다. 옮길 것이 없으면 같은 객체라 저장소를 건드리지 않는다.
      if (acceptedWheel !== undefined && acceptedWheel !== state.wheel) {
        next.wheel = acceptedWheel;
        writeStored(WHEEL_KEY, acceptedWheel);
      }
    }
    writeStored(OFFLINE_SLOTS_KEY, offlineSlots);
    setState(next);
  }, []);

  const setChecklist = useCallback((checklist: SafetyChecklist | null) => {
    setState({ checklist });
  }, []);

  const setTrialRunRecord = useCallback((record: TrialRun | null) => {
    setState({ trialRunRecord: record });
  }, []);

  const restore = useCallback((snapshot: InspectionSnapshot) => {
    // 새로고침을 넘어가는 값은 sessionStorage에도 다시 쓴다 — 복구 뒤 한 번 더
    // 새로고침해도 복구한 상태가 기준이 되게 한다. 사진은 메모리에만 둔다.
    persistSnapshot(snapshot);
    // 상태가 draft에서 되살린 값으로 바뀐다. 새로고침 때 버린 값에 대한 알림은
    // 더 맞지 않는다 — 이 뒤의 경고는 draft 복구가 낸다.
    setState({ ...snapshot, droppedOnReload: false });
  }, []);

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(PURPOSE_KEY);
      window.sessionStorage.removeItem(STARTED_KEY);
      window.sessionStorage.removeItem(WORK_CONDITIONS_KEY);
      window.sessionStorage.removeItem(GRINDER_KEY);
      window.sessionStorage.removeItem(WHEEL_KEY);
      window.sessionStorage.removeItem(GRINDER_OCR_KEY);
      window.sessionStorage.removeItem(WHEEL_OCR_KEY);
      window.sessionStorage.removeItem(GRINDER_CONDITION_KEY);
      window.sessionStorage.removeItem(WHEEL_CONDITION_KEY);
      window.sessionStorage.removeItem(TRIAL_RUN_KEY);
      window.sessionStorage.removeItem(GRINDER_CAPTURE_METRICS_KEY);
      window.sessionStorage.removeItem(WHEEL_CAPTURE_METRICS_KEY);
      window.sessionStorage.removeItem(GRINDER_OCR_TELEMETRY_KEY);
      window.sessionStorage.removeItem(WHEEL_OCR_TELEMETRY_KEY);
      window.sessionStorage.removeItem(CAPTURE_CHECKS_KEY);
      window.sessionStorage.removeItem(OFFLINE_SLOTS_KEY);
    } catch {
      // 무시한다.
    }
    setState({
      declaredPurpose: null,
      startedAt: null,
      workConditions: null,
      grinder: null,
      wheel: null,
      grinderOcr: null,
      wheelOcr: null,
      grinderCondition: null,
      wheelCondition: null,
      trialRun: null,
      grinderImage: null,
      wheelImage: null,
      grinderCaptureMetrics: null,
      wheelCaptureMetrics: null,
      grinderOcrTelemetry: null,
      wheelOcrTelemetry: null,
      captureChecks: {},
      offlineSlots: NO_OFFLINE_SLOTS,
      checklist: null,
      trialRunRecord: null,
      droppedOnReload: false,
    });
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      hydrating: !snapshot.hydrated,
      analysisMode: analysisModeOf(snapshot.offlineSlots),
      setOfflineSlot,
      keepReanalysisSuspicion,
      applyReanalysis,
      setChecklist,
      setTrialRunRecord,
      restore,
      setPurpose,
      setGrinder,
      setWheel,
      setGrinderCondition,
      setWheelCondition,
      setCaptureCheck,
      setTrialRun,
      reset,
    }),
    [
      snapshot,
      setOfflineSlot,
      keepReanalysisSuspicion,
      applyReanalysis,
      setChecklist,
      setTrialRunRecord,
      restore,
      setPurpose,
      setGrinder,
      setWheel,
      setGrinderCondition,
      setWheelCondition,
      setCaptureCheck,
      setTrialRun,
      reset,
    ],
  );
}
