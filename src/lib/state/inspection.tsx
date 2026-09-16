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
import type { TrialRunProgress } from '@/lib/safety/trialRun';
import type {
  CaptureQualityCheck,
  CaptureQualityMetrics,
  CaptureSlot,
  GrinderCondition,
  GrinderSpec,
  OcrTelemetry,
  WheelCondition,
  WheelExamNotRun,
  WheelExamResult,
  WheelSpec,
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

/** 다각도 확인에서 작업자가 더 찍는 세 자리. */
type ExamSlotValues<T> = { back: T; edge: T; bore: T };

/** 촬영 자리별 사진 상태 확인 기록. 한 번도 찍지 않은 자리는 없다. */
export type CaptureChecks = Partial<Record<CaptureSlot, CaptureQualityCheck>>;

/**
 * sessionStorage에는 명판·라벨 자리만 남긴다.
 *
 * 다각도 확인 자리는 사진(Blob)과 수명을 같이 한다 — 새로고침으로 사진이
 * 사라졌는데 그 사진의 상태 기록만 남으면, 없는 사진에 대한 기록이 저장된다.
 */
function persistCaptureChecks(checks: CaptureChecks): void {
  const kept: CaptureChecks = {
    ...(checks.grinder ? { grinder: checks.grinder } : {}),
    ...(checks.wheel ? { wheel: checks.wheel } : {}),
  };
  writeStored(CAPTURE_CHECKS_KEY, kept);
}

interface InspectionState {
  /** 작업자가 시작할 때 고른 오늘의 작업 */
  declaredPurpose: WorkPurpose | null;
  /** 점검을 시작한 시각(epoch ms). 작업을 고른 순간이다. */
  startedAt: number | null;
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
  grinderImage: Blob | null;
  wheelImage: Blob | null;
  /**
   * 다각도 외관 확인 사진. 앞면은 wheelImage(라벨 사진)를 그대로 쓴다.
   *
   * Blob은 sessionStorage에 담을 수 없어 **메모리에만** 둔다. 화면 이동
   * (촬영 → 결과 → 이력)에서는 이 모듈이 살아 있어 사진이 유지되고,
   * 새로고침하면 사라진다 — 기존 wheelImage와 같은 성질이다. 사라졌을 때
   * 조용히 넘어가지 않도록, 분석 결과(wheelExam)는 사진과 함께 비운다.
   */
  wheelBackImage: Blob | null;
  wheelEdgeImage: Blob | null;
  wheelBoreImage: Blob | null;
  /**
   * 다각도 외관 확인의 AI 원본 결과. 판정에 직접 쓰지 않는다 —
   * 의심을 더하는 경로(mergeVisibleDamage)와 기록에만 쓴다.
   */
  wheelExam: WheelExamResult | null;
  /**
   * 다각도 확인을 하지 못한 채 진행한 사유. wheelExam과 둘 중 하나만 채워진다.
   * 작업자가 직접점검 진행을 확인해야만 만들어진다.
   */
  wheelExamNotRun: WheelExamNotRun | null;
  /** 이상 징후 경고를 작업자가 확인했는가 */
  wheelExamAcknowledged: boolean;
  /**
   * 촬영·OCR의 검증용 원시 측정값. 판정에 쓰지 않는다 — CaptureQualityMetrics·
   * OcrTelemetry 참고. 값 수집이 실패해도 점검 흐름과 무관하므로 null일 수 있다.
   */
  grinderCaptureMetrics: CaptureQualityMetrics | null;
  wheelCaptureMetrics: CaptureQualityMetrics | null;
  grinderOcrTelemetry: OcrTelemetry | null;
  wheelOcrTelemetry: OcrTelemetry | null;
  /**
   * 촬영 직후 사진 상태 경고와 재촬영 여부(검증용). 판정·Gate에 쓰지 않는다.
   * 다각도 확인 자리는 메모리에만 둔다(persistCaptureChecks).
   */
  captureChecks: CaptureChecks;
  /** 다각도 확인 사진의 원시 측정값. 사진과 수명을 같이 해 메모리에만 둔다 */
  wheelExamCaptureMetrics: ExamSlotValues<CaptureQualityMetrics | null> | null;
  /** 서버 렌더 결과에서는 false. 브라우저 값이 반영된 뒤에만 true가 된다. */
  hydrated: boolean;
}

/** 서버 렌더와 hydration에 쓰는 고정 스냅샷. 절대 바뀌지 않는다. */
const SERVER_SNAPSHOT: InspectionState = {
  declaredPurpose: null,
  startedAt: null,
  grinder: null,
  wheel: null,
  grinderOcr: null,
  wheelOcr: null,
  grinderCondition: null,
  wheelCondition: null,
  trialRun: null,
  grinderImage: null,
  wheelImage: null,
  wheelBackImage: null,
  wheelEdgeImage: null,
  wheelBoreImage: null,
  wheelExam: null,
  wheelExamNotRun: null,
  wheelExamAcknowledged: false,
  grinderCaptureMetrics: null,
  wheelCaptureMetrics: null,
  grinderOcrTelemetry: null,
  wheelOcrTelemetry: null,
  captureChecks: {},
  wheelExamCaptureMetrics: null,
  hydrated: false,
};

function readStored<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 치명적이지 않다. 메모리 상태만으로도 흐름은 이어진다.
  }
}

function initialClientState(): InspectionState {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT;
  return {
    declaredPurpose: readStored<WorkPurpose>(PURPOSE_KEY),
    startedAt: readStored<number>(STARTED_KEY),
    grinder: readStored<GrinderSpec>(GRINDER_KEY),
    wheel: readStored<WheelSpec>(WHEEL_KEY),
    grinderOcr: readStored<GrinderSpec>(GRINDER_OCR_KEY),
    wheelOcr: readStored<WheelSpec>(WHEEL_OCR_KEY),
    grinderCondition: readStored<GrinderCondition>(GRINDER_CONDITION_KEY),
    wheelCondition: readStored<WheelCondition>(WHEEL_CONDITION_KEY),
    trialRun: readStored<TrialRunProgress>(TRIAL_RUN_KEY),
    grinderImage: null,
    wheelImage: null,
    // 사진은 Blob이라 sessionStorage에 담을 수 없고 새로고침을 넘지 못한다.
    // 분석 결과와 작업자 확인만 남기면 "사진 없이 확인된 결과"가 되므로 함께
    // 버린다 — 새로고침 뒤에는 화면이 다시 찍게 만든다.
    wheelBackImage: null,
    wheelEdgeImage: null,
    wheelBoreImage: null,
    wheelExam: null,
    wheelExamNotRun: null,
    wheelExamAcknowledged: false,
    grinderCaptureMetrics: readStored<CaptureQualityMetrics>(
      GRINDER_CAPTURE_METRICS_KEY,
    ),
    wheelCaptureMetrics: readStored<CaptureQualityMetrics>(
      WHEEL_CAPTURE_METRICS_KEY,
    ),
    grinderOcrTelemetry: readStored<OcrTelemetry>(GRINDER_OCR_TELEMETRY_KEY),
    wheelOcrTelemetry: readStored<OcrTelemetry>(WHEEL_OCR_TELEMETRY_KEY),
    captureChecks: readStored<CaptureChecks>(CAPTURE_CHECKS_KEY) ?? {},
    wheelExamCaptureMetrics: null,
    hydrated: true,
  };
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
  setPurpose: (purpose: WorkPurpose) => void;
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
  /**
   * 다각도 외관 확인 결과와 사진.
   *
   * setWheel의 인자로 더 밀어 넣지 않고 따로 둔다 — 다각도 확인은 숫돌 규격과
   * 성격이 다르고, 인자를 계속 늘리면 어느 자리가 무엇인지 알 수 없게 된다.
   */
  setWheelExam: (input: {
    exam: WheelExamResult | null;
    /** 확인하지 못한 채 진행한 경우의 사유. exam과 둘 중 하나만 채운다 */
    notRun?: WheelExamNotRun | null;
    photos: { back: Blob | null; edge: Blob | null; bore: Blob | null };
    acknowledged: boolean;
    /** 세 사진의 상태 확인 기록. 넘기지 않으면 없는 것으로 둔다 */
    captureChecks?: ExamSlotValues<CaptureQualityCheck | null>;
    /** 세 사진의 원시 측정값 */
    captureMetrics?: ExamSlotValues<CaptureQualityMetrics | null>;
  }) => void;
  setTrialRun: (progress: TrialRunProgress | null) => void;
  reset: () => void;
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
  const setPurpose = useCallback((purpose: WorkPurpose) => {
    const startedAt = Date.now();
    writeStored(PURPOSE_KEY, purpose);
    writeStored(STARTED_KEY, startedAt);
    setState({ declaredPurpose: purpose, startedAt });
  }, []);

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
      } catch {
        // 메모리 상태는 아래에서 반드시 지운다.
      }
      setState({
        grinder: spec,
        captureChecks: {},
        wheelExamCaptureMetrics: null,
        grinderCondition: null,
        wheel: null,
        wheelOcr: null,
        wheelCondition: null,
        wheelImage: null,
        trialRun: null,
        wheelCaptureMetrics: null,
        wheelOcrTelemetry: null,
        wheelBackImage: null,
        wheelEdgeImage: null,
        wheelBoreImage: null,
        wheelExam: null,
        wheelExamNotRun: null,
        wheelExamAcknowledged: false,
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
      // 사진 상태 기록은 명판 것만 남긴다. 라벨·다각도 자리는 이전 숫돌의 사진에
      // 대한 기록이다. 이번 라벨 사진의 기록은 setCaptureCheck('wheel')가 넣는다.
      const kept: CaptureChecks = state.captureChecks.grinder
        ? { grinder: state.captureChecks.grinder }
        : {};
      persistCaptureChecks(kept);
      setState({
        wheel: spec,
        wheelCondition: null,
        trialRun: null,
        captureChecks: kept,
        wheelExamCaptureMetrics: null,
        // 다각도 확인은 그 숫돌을 보고 한 것이다. 숫돌이 바뀌면 이어 쓰지 않는다.
        // 새 숫돌의 확인 결과는 곧바로 이어지는 setWheelExam이 넣는다.
        wheelBackImage: null,
        wheelEdgeImage: null,
        wheelBoreImage: null,
        wheelExam: null,
        wheelExamNotRun: null,
        wheelExamAcknowledged: false,
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
      persistCaptureChecks(next);
      setState({ captureChecks: next });
    },
    [],
  );

  /**
   * 다각도 외관 확인 결과와 사진.
   *
   * sessionStorage에 남기지 않는다. 사진(Blob)을 담을 수 없는데 결과만 남기면
   * 새로고침 뒤에 "사진 없이 확인된 결과"가 되어, 다시 찍지 않고도 통과한
   * 것처럼 보인다. 결과는 사진과 수명을 같이 한다.
   */
  const setWheelExam = useCallback(
    (input: {
      exam: WheelExamResult | null;
      notRun?: WheelExamNotRun | null;
      photos: { back: Blob | null; edge: Blob | null; bore: Blob | null };
      acknowledged: boolean;
      captureChecks?: ExamSlotValues<CaptureQualityCheck | null>;
      captureMetrics?: ExamSlotValues<CaptureQualityMetrics | null>;
    }) => {
      // 다각도 자리의 기록은 통째로 바꾼다. 이전 사진의 기록이 섞여 남지 않게.
      const labelChecks: CaptureChecks = {
        ...(state.captureChecks.grinder
          ? { grinder: state.captureChecks.grinder }
          : {}),
        ...(state.captureChecks.wheel
          ? { wheel: state.captureChecks.wheel }
          : {}),
      };
      const checks = input.captureChecks;
      setState({
        captureChecks: {
          ...labelChecks,
          ...(checks?.back ? { wheelBack: checks.back } : {}),
          ...(checks?.edge ? { wheelEdge: checks.edge } : {}),
          ...(checks?.bore ? { wheelBore: checks.bore } : {}),
        },
        wheelExamCaptureMetrics: input.captureMetrics ?? null,
        wheelExam: input.exam,
        wheelExamNotRun: input.notRun ?? null,
        wheelExamAcknowledged: input.acknowledged,
        wheelBackImage: input.photos.back,
        wheelEdgeImage: input.photos.edge,
        wheelBoreImage: input.photos.bore,
      });
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

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(PURPOSE_KEY);
      window.sessionStorage.removeItem(STARTED_KEY);
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
    } catch {
      // 무시한다.
    }
    setState({
      declaredPurpose: null,
      startedAt: null,
      grinder: null,
      wheel: null,
      grinderOcr: null,
      wheelOcr: null,
      grinderCondition: null,
      wheelCondition: null,
      trialRun: null,
      grinderImage: null,
      wheelImage: null,
      wheelBackImage: null,
      wheelEdgeImage: null,
      wheelBoreImage: null,
      wheelExam: null,
      wheelExamNotRun: null,
      wheelExamAcknowledged: false,
      grinderCaptureMetrics: null,
      wheelCaptureMetrics: null,
      grinderOcrTelemetry: null,
      wheelOcrTelemetry: null,
      captureChecks: {},
      wheelExamCaptureMetrics: null,
    });
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      hydrating: !snapshot.hydrated,
      setPurpose,
      setGrinder,
      setWheel,
      setGrinderCondition,
      setWheelCondition,
      setCaptureCheck,
      setWheelExam,
      setTrialRun,
      reset,
    }),
    [
      snapshot,
      setPurpose,
      setGrinder,
      setWheel,
      setGrinderCondition,
      setWheelCondition,
      setCaptureCheck,
      setWheelExam,
      setTrialRun,
      reset,
    ],
  );
}
