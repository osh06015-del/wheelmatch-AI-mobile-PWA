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
import type { GrinderSpec, WheelSpec, WorkPurpose } from '@/lib/rules/types';

const GRINDER_KEY = 'wheelmatch.grinder';
const WHEEL_KEY = 'wheelmatch.wheel';
const PURPOSE_KEY = 'wheelmatch.purpose';
const STARTED_KEY = 'wheelmatch.startedAt';
const GRINDER_OCR_KEY = 'wheelmatch.grinderOcr';
const WHEEL_OCR_KEY = 'wheelmatch.wheelOcr';

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
  grinderImage: Blob | null;
  wheelImage: Blob | null;
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
  grinderImage: null,
  wheelImage: null,
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
    grinderImage: null,
    wheelImage: null,
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
  ) => void;
  setWheel: (
    spec: WheelSpec,
    image?: Blob | null,
    ocr?: WheelSpec | null,
  ) => void;
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
    (spec: GrinderSpec, image?: Blob | null, ocr?: GrinderSpec | null) => {
      writeStored(GRINDER_KEY, spec);
      if (ocr !== undefined) writeStored(GRINDER_OCR_KEY, ocr);
      setState({
        grinder: spec,
        ...(image === undefined ? {} : { grinderImage: image }),
        ...(ocr === undefined ? {} : { grinderOcr: ocr }),
      });
    },
    [],
  );

  const setWheel = useCallback(
    (spec: WheelSpec, image?: Blob | null, ocr?: WheelSpec | null) => {
      writeStored(WHEEL_KEY, spec);
      if (ocr !== undefined) writeStored(WHEEL_OCR_KEY, ocr);
      setState({
        wheel: spec,
        ...(image === undefined ? {} : { wheelImage: image }),
        ...(ocr === undefined ? {} : { wheelOcr: ocr }),
      });
    },
    [],
  );

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(PURPOSE_KEY);
      window.sessionStorage.removeItem(STARTED_KEY);
      window.sessionStorage.removeItem(GRINDER_KEY);
      window.sessionStorage.removeItem(WHEEL_KEY);
      window.sessionStorage.removeItem(GRINDER_OCR_KEY);
      window.sessionStorage.removeItem(WHEEL_OCR_KEY);
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
      grinderImage: null,
      wheelImage: null,
    });
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      hydrating: !snapshot.hydrated,
      setPurpose,
      setGrinder,
      setWheel,
      reset,
    }),
    [snapshot, setPurpose, setGrinder, setWheel, reset],
  );
}
