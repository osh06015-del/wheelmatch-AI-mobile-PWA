// 진행 중 점검(draft)을 저장할 형태로 만들고, 읽어 온 draft에서 믿을 수 있는
// 값만 골라 되살린다.
//
// 이 파일은 저장소를 모른다(순수 함수). IndexedDB 읽기·쓰기는 draftStore.ts가 한다.
//
// 지키는 것.
//   · 최종 기록(InspectionRecord)과 섞지 않는다. draft는 판정 결과를 담지 않는다 —
//     이어하면 지금 규칙엔진으로 다시 대조한다. 저장된 최종 기록은 다시 계산하지 않는다.
//   · 형태가 어긋난 값은 추정해 채우지 않고 버린다. 버린 것이 있으면 경고한다.
//   · 사진과 함께 있어야 뜻이 있는 값(다각도 확인 결과)은 사진이 없으면 버린다.
//   · 진행 중이던 시험운전은 되살리지 않는다 — 앱이 닫혀 있던 동안 작업자가
//     기계를 지켜봤는지 알 수 없다.

import { profileRef, conditionItemsFor } from '@/lib/rules/profiles';
import type {
  AccessoryProfileRef,
  GrinderSpec,
  WheelSpec,
} from '@/lib/rules/types';
import { isGrinderConditionComplete } from '@/lib/safety/grinderCondition';
import { isWheelConditionComplete } from '@/lib/safety/wheelCondition';
import {
  NO_OFFLINE_SLOTS,
  type InspectionSnapshot,
  type OfflineSlots,
} from '@/lib/state/inspection';
import { wheelExamRequired } from '@/lib/vision/wheelExamSafety';

/** draft 형태를 바꾸면 올린다. 다른 버전은 형태를 하나하나 확인해 가능한 값만 살린다 */
export const DRAFT_SCHEMA_VERSION = 1;

/** 진행 중 점검은 하나뿐이다 */
export const DRAFT_ID = 'current';

export type DraftPhotoSlot =
  'grinder' | 'wheel' | 'wheelBack' | 'wheelEdge' | 'wheelBore';

const PHOTO_FIELD: Readonly<Record<DraftPhotoSlot, keyof InspectionSnapshot>> =
  {
    grinder: 'grinderImage',
    wheel: 'wheelImage',
    wheelBack: 'wheelBackImage',
    wheelEdge: 'wheelEdgeImage',
    wheelBore: 'wheelBoreImage',
  };

const PHOTO_SLOTS = Object.keys(PHOTO_FIELD) as DraftPhotoSlot[];

/** 사진을 뺀 상태. 사진 Blob은 photos에 따로 둔다 */
export type DraftState = Omit<
  InspectionSnapshot,
  | 'grinderImage'
  | 'wheelImage'
  | 'wheelBackImage'
  | 'wheelEdgeImage'
  | 'wheelBoreImage'
>;

export interface InspectionDraft {
  id: typeof DRAFT_ID;
  schemaVersion: number;
  savedAt: string;
  /** 저장 당시 적용한 Profile. 기록용이다 — 이어하면 지금 Profile로 다시 대조한다 */
  profile: AccessoryProfileRef | null;
  state: DraftState;
  /** 최적화(축소)를 마친 사진. 원본은 저장하지 않는다 */
  photos: Partial<Record<DraftPhotoSlot, Blob>>;
  /** 저장 당시 사진이 있던 자리. 복구 때 빠진 사진을 알아보는 기준이다 */
  photoSlots: DraftPhotoSlot[];
  /** 저장 공간이 모자라 사진 없이 저장했는가 */
  photosOmitted: boolean;
}

export type DraftWarning =
  | 'schema' // 형태가 달라 일부 값을 버렸다
  | 'photos' // 사진 일부를 되살리지 못했다
  | 'exam' // 다각도 확인 사진이 없어 숫돌 단계를 버렸다
  | 'trialRun' // 진행 중이던 시험운전을 버렸다
  | 'unreadable'; // 읽을 수 없는 draft다

/** 점검이 진행 중인가. 작업을 고르지 않은 상태는 저장할 것이 없다 */
export function hasInspectionInProgress(snapshot: InspectionSnapshot): boolean {
  return snapshot.declaredPurpose !== null;
}

/** 지금 상태를 draft로 만든다. 사진은 Blob 그대로 옮긴다(이미 축소된 사진이다) */
export function buildDraft(
  snapshot: InspectionSnapshot,
  now: Date,
): InspectionDraft {
  const photos: Partial<Record<DraftPhotoSlot, Blob>> = {};
  for (const slot of PHOTO_SLOTS) {
    const blob = snapshot[PHOTO_FIELD[slot]];
    if (blob instanceof Blob) photos[slot] = blob;
  }
  const {
    /* eslint-disable @typescript-eslint/no-unused-vars -- 사진 필드를 state에서 빼는 목적의 구조분해다. */
    grinderImage,
    wheelImage,
    wheelBackImage,
    wheelEdgeImage,
    wheelBoreImage,
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ...state
  } = snapshot;
  return {
    id: DRAFT_ID,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    savedAt: now.toISOString(),
    profile: snapshot.wheel ? profileRef(snapshot.wheel.wheelType) : null,
    state,
    photos,
    photoSlots: Object.keys(photos) as DraftPhotoSlot[],
    photosOmitted: false,
  };
}

export interface DraftRecovery {
  /** 되살린 상태. 읽을 수 없으면 null */
  snapshot: InspectionSnapshot | null;
  warnings: DraftWarning[];
  savedAt: string | null;
  /** 이어할 수 있는가. 아니면 삭제만 고를 수 있다 */
  resumable: boolean;
}

type Guard<T> = (value: unknown) => value is T;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

const isConfidence = (value: unknown): boolean =>
  value === 'high' || value === 'medium' || value === 'low';

const isGrinderSpec: Guard<GrinderSpec> = (value): value is GrinderSpec =>
  isObject(value) &&
  isNumberOrNull(value.noLoadRPM) &&
  isNumberOrNull(value.maxWheelDiameter) &&
  (value.model === null || typeof value.model === 'string') &&
  typeof value.rawText === 'string' &&
  isConfidence(value.confidence);

const isWheelSpec: Guard<WheelSpec> = (value): value is WheelSpec =>
  isObject(value) &&
  isNumberOrNull(value.maxRPM) &&
  isNumberOrNull(value.diameter) &&
  isNumberOrNull(value.thickness) &&
  typeof value.purpose === 'string' &&
  typeof value.wheelType === 'string' &&
  typeof value.visibleDamage === 'string' &&
  typeof value.rawText === 'string' &&
  isConfidence(value.confidence);

/** 모든 값이 true·false·null인 객체(작업자가 직접 답한 Gate·체크리스트) */
const isAnswerMap = (value: unknown): boolean =>
  isObject(value) &&
  Object.values(value).every(
    (answer) => answer === null || typeof answer === 'boolean',
  );

const isPlainObject = (value: unknown): boolean => isObject(value);

const isOfflineSlots: Guard<OfflineSlots> = (value): value is OfflineSlots =>
  isObject(value) &&
  typeof value.grinder === 'boolean' &&
  typeof value.wheel === 'boolean';

/**
 * 읽어 온 draft에서 믿을 수 있는 값만 골라 되살린다.
 *
 * 저장소의 draft는 고치지 않는다 — 사용자가 "이어하기"나 "삭제"를 고르기 전까지
 * 그대로 남아야 한다.
 */
export function recoverDraft(raw: unknown): DraftRecovery {
  if (!isObject(raw) || !isObject(raw.state)) {
    return {
      snapshot: null,
      warnings: ['unreadable'],
      savedAt: null,
      resumable: false,
    };
  }

  const warnings = new Set<DraftWarning>();
  if (raw.schemaVersion !== DRAFT_SCHEMA_VERSION) warnings.add('schema');
  const source = raw.state;

  /** 값이 있는데 형태가 어긋나면 버리고 경고한다. 없던 값은 경고하지 않는다 */
  function pick<T>(
    key: string,
    guard: (value: unknown) => boolean,
    fallback: T,
  ): T {
    const value = source[key];
    if (value === undefined || value === null) return fallback;
    // 형태 검사를 통과한 값만 그 타입으로 쓴다(검사는 guard가 한다).
    if (guard(value)) return value as T;
    warnings.add('schema');
    return fallback;
  }

  const declaredPurpose =
    source.declaredPurpose === 'cutting' ||
    source.declaredPurpose === 'grinding'
      ? source.declaredPurpose
      : null;
  if (declaredPurpose === null) {
    return {
      snapshot: null,
      warnings: ['unreadable'],
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : null,
      resumable: false,
    };
  }

  const snapshot: InspectionSnapshot = {
    declaredPurpose,
    startedAt: pick(
      'startedAt',
      (v): v is number => typeof v === 'number',
      null,
    ),
    workConditions: pick('workConditions', isPlainObject, null),
    grinder: pick('grinder', isGrinderSpec, null),
    wheel: pick('wheel', isWheelSpec, null),
    grinderOcr: pick('grinderOcr', isGrinderSpec, null),
    wheelOcr: pick('wheelOcr', isWheelSpec, null),
    grinderCondition: pick('grinderCondition', isAnswerMap, null),
    wheelCondition: pick('wheelCondition', isAnswerMap, null),
    trialRun: null,
    grinderImage: null,
    wheelImage: null,
    wheelBackImage: null,
    wheelEdgeImage: null,
    wheelBoreImage: null,
    wheelExam: pick('wheelExam', isPlainObject, null),
    wheelExamNotRun: pick('wheelExamNotRun', isPlainObject, null),
    wheelExamAcknowledged: source.wheelExamAcknowledged === true,
    grinderCaptureMetrics: pick('grinderCaptureMetrics', isPlainObject, null),
    wheelCaptureMetrics: pick('wheelCaptureMetrics', isPlainObject, null),
    grinderOcrTelemetry: pick('grinderOcrTelemetry', isPlainObject, null),
    wheelOcrTelemetry: pick('wheelOcrTelemetry', isPlainObject, null),
    captureChecks: pick('captureChecks', isPlainObject, {}),
    wheelExamCaptureMetrics: pick(
      'wheelExamCaptureMetrics',
      isPlainObject,
      null,
    ),
    // 오프라인 여부를 읽지 못하면 더 엄격한 쪽(오프라인)으로 본다 — 모르는 것을
    // 온라인으로 추정하면 적합이 근거 없이 열린다.
    offlineSlots:
      source.offlineSlots === undefined
        ? NO_OFFLINE_SLOTS
        : isOfflineSlots(source.offlineSlots)
          ? source.offlineSlots
          : (warnings.add('schema'), { grinder: true, wheel: true }),
    checklist: pick('checklist', isAnswerMap, null),
    trialRunRecord: pick('trialRunRecord', isPlainObject, null),
  };

  // 진행 중이던 시험운전 — 되살리지 않는다(맨 위 설명).
  if (source.trialRun !== undefined && source.trialRun !== null) {
    warnings.add('trialRun');
  }

  // 사진. Blob이 아닌 값은 사진이 아니다.
  const photos = isObject(raw.photos) ? raw.photos : {};
  const expected: DraftPhotoSlot[] = Array.isArray(raw.photoSlots)
    ? raw.photoSlots.filter((slot): slot is DraftPhotoSlot =>
        PHOTO_SLOTS.includes(slot as DraftPhotoSlot),
      )
    : [];
  for (const slot of PHOTO_SLOTS) {
    const blob = photos[slot];
    if (blob instanceof Blob) {
      (snapshot as unknown as Record<string, unknown>)[PHOTO_FIELD[slot]] =
        blob;
    } else if (expected.includes(slot)) {
      warnings.add('photos');
    }
  }
  if (raw.photosOmitted === true && expected.length > 0) warnings.add('photos');

  // 앞 단계가 없으면 뒤 단계는 근거가 없다.
  if (snapshot.grinder === null) {
    snapshot.grinderCondition = null;
    dropWheelStep(snapshot);
  }

  // 다각도 확인을 요구하는 종류인데 그 사진이 없으면 확인 결과만 남기지 않는다.
  // 결과만 되살리면 사진 없이 확인된 것처럼 보인다 — 숫돌 단계를 다시 하게 한다.
  if (
    snapshot.wheel !== null &&
    wheelExamRequired(snapshot.wheel.wheelType) &&
    (snapshot.wheelBackImage === null ||
      snapshot.wheelEdgeImage === null ||
      snapshot.wheelBoreImage === null)
  ) {
    warnings.add('exam');
    dropWheelStep(snapshot);
  }
  if (snapshot.wheel === null) dropWheelStep(snapshot);

  return {
    snapshot,
    warnings: [...warnings],
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : null,
    resumable: true,
  };
}

/** 숫돌 단계와 그 뒤(결과 화면)의 값을 버린다. 명판 쪽은 그대로 둔다 */
function dropWheelStep(snapshot: InspectionSnapshot): void {
  snapshot.wheel = null;
  snapshot.wheelOcr = null;
  snapshot.wheelCondition = null;
  snapshot.wheelImage = null;
  snapshot.wheelBackImage = null;
  snapshot.wheelEdgeImage = null;
  snapshot.wheelBoreImage = null;
  snapshot.wheelExam = null;
  snapshot.wheelExamNotRun = null;
  snapshot.wheelExamAcknowledged = false;
  snapshot.wheelCaptureMetrics = null;
  snapshot.wheelOcrTelemetry = null;
  snapshot.wheelExamCaptureMetrics = null;
  snapshot.checklist = null;
  snapshot.trialRunRecord = null;
  snapshot.offlineSlots = { ...snapshot.offlineSlots, wheel: false };
  const { grinder } = snapshot.captureChecks;
  snapshot.captureChecks = grinder ? { grinder } : {};
}

/** 되살린 상태에서 이어갈 화면. 끝까지 마친 단계의 다음 화면이다 */
export function resumePathFor(snapshot: InspectionSnapshot): string {
  const grinderDone =
    snapshot.grinder !== null &&
    isGrinderConditionComplete(snapshot.grinderCondition);
  if (
    grinderDone &&
    snapshot.wheel !== null &&
    isWheelConditionComplete(
      snapshot.wheelCondition,
      conditionItemsFor(snapshot.wheel.wheelType),
    )
  ) {
    return '/result';
  }
  if (grinderDone) return '/scan/wheel';
  return '/scan/grinder';
}
