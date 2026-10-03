// 진행 중 점검(draft)을 저장할 형태로 만들고, 읽어 온 draft에서 믿을 수 있는
// 값만 골라 되살린다.
//
// 이 파일은 저장소를 모른다(순수 함수). IndexedDB 읽기·쓰기는 draftStore.ts가 한다.
//
// 지키는 것.
//   · 최종 기록(InspectionRecord)과 섞지 않는다. draft는 판정 결과를 담지 않는다 —
//     이어하면 지금 규칙엔진으로 다시 대조한다. 저장된 최종 기록은 다시 계산하지 않는다.
//   · 형태가 어긋난 값은 추정해 채우지 않고 버린다. 버린 것이 있으면 경고한다.
//   · 지금 점검 흐름에 없는 단계의 값(다각도 외관 확인 — 2026-10-03에 뺐다)은
//     되살리지 않는다. 받을 화면이 없는 값을 기록에 실어 보내지 않는다.
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
  type CaptureChecks,
  type InspectionSnapshot,
  type OfflineSlots,
} from '@/lib/state/inspection';

/** draft 형태를 바꾸면 올린다. 다른 버전은 형태를 하나하나 확인해 가능한 값만 살린다 */
export const DRAFT_SCHEMA_VERSION = 1;

/** 진행 중 점검은 하나뿐이다 */
export const DRAFT_ID = 'current';

export type DraftPhotoSlot = 'grinder' | 'wheel';

const PHOTO_FIELD: Readonly<
  Record<DraftPhotoSlot, 'grinderImage' | 'wheelImage'>
> = {
  grinder: 'grinderImage',
  wheel: 'wheelImage',
};

const PHOTO_SLOTS = Object.keys(PHOTO_FIELD) as DraftPhotoSlot[];

/**
 * 다각도 외관 확인이 있던 시기(2026-10-03 이전)의 draft에만 남아 있는 자리.
 * 지금은 받는 화면이 없어 되살리지 않는다 — 있었다는 것만 알아보고 경고한다.
 */
const LEGACY_EXAM_PHOTO_SLOTS: readonly string[] = [
  'wheelBack',
  'wheelEdge',
  'wheelBore',
];
const LEGACY_EXAM_STATE_KEYS: readonly string[] = [
  'wheelExam',
  'wheelExamNotRun',
];

/** 사진을 뺀 상태. 사진 Blob은 photos에 따로 둔다 */
export type DraftState = Omit<
  InspectionSnapshot,
  'grinderImage' | 'wheelImage'
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
  | 'exam' // 이전 버전의 다각도 확인(추가 사진·AI 결과)을 되살리지 않았다
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

/** formDraftModel.ts(확인 화면 입력 draft)도 이 두 guard를 그대로 쓴다 */
export const isGrinderSpec: Guard<GrinderSpec> = (
  value,
): value is GrinderSpec =>
  isObject(value) &&
  isNumberOrNull(value.noLoadRPM) &&
  isNumberOrNull(value.maxWheelDiameter) &&
  (value.model === null || typeof value.model === 'string') &&
  typeof value.rawText === 'string' &&
  isConfidence(value.confidence);

export const isWheelSpec: Guard<WheelSpec> = (value): value is WheelSpec =>
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

/**
 * 사진 상태 확인 기록에서 명판·라벨 자리만 남긴다.
 *
 * 이전 버전 draft에는 다각도 확인 자리(wheelBack·wheelEdge·wheelBore)의 기록이
 * 섞여 있을 수 있다. 그 사진은 되살리지 않으므로 기록만 남기면 없는 사진에 대한
 * 기록이 저장된다.
 */
function labelCaptureChecks(raw: Record<string, unknown>): CaptureChecks {
  const kept: Record<string, unknown> = {};
  for (const slot of PHOTO_SLOTS) {
    if (isObject(raw[slot])) kept[slot] = raw[slot];
  }
  return kept as CaptureChecks;
}

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

  const rawCaptureChecks = pick<Record<string, unknown>>(
    'captureChecks',
    isPlainObject,
    {},
  );

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
    grinderCaptureMetrics: pick('grinderCaptureMetrics', isPlainObject, null),
    wheelCaptureMetrics: pick('wheelCaptureMetrics', isPlainObject, null),
    grinderOcrTelemetry: pick('grinderOcrTelemetry', isPlainObject, null),
    wheelOcrTelemetry: pick('wheelOcrTelemetry', isPlainObject, null),
    captureChecks: labelCaptureChecks(rawCaptureChecks),
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
      snapshot[PHOTO_FIELD[slot]] = blob;
    } else if (expected.includes(slot)) {
      warnings.add('photos');
    }
  }
  if (raw.photosOmitted === true && expected.length > 0) warnings.add('photos');

  // 이전 버전의 다각도 외관 확인. 결과도 사진도 되살리지 않는다 — 그 단계가 이제
  // 없다. 다만 조용히 버리지는 않는다: 작업자는 찍어 둔 사진이 기록에 들어갈
  // 것으로 알고 있다. 숫돌 단계는 그대로 둔다(다시 하게 만들 이유가 없다).
  // 그 확인이 올린 외관 의심은 숫돌 규격(wheel.visibleDamage)에 이미 들어 있어
  // 그대로 이어진다 — 의심을 덜어내지 않는다.
  const savedSlots: unknown[] = Array.isArray(raw.photoSlots)
    ? raw.photoSlots
    : [];
  if (
    LEGACY_EXAM_STATE_KEYS.some(
      (key) => source[key] !== undefined && source[key] !== null,
    ) ||
    // 결과 없이 작업자의 확인 표시만 남은 경우. false는 그 확인이 없던 draft에도
    // 들어 있던 기본값이라 흔적으로 치지 않는다.
    source.wheelExamAcknowledged === true ||
    LEGACY_EXAM_PHOTO_SLOTS.some(
      (slot) =>
        (photos[slot] !== undefined && photos[slot] !== null) ||
        savedSlots.includes(slot) ||
        // labelCaptureChecks가 걸러낸 그 사진의 상태 기록
        (rawCaptureChecks[slot] !== undefined &&
          rawCaptureChecks[slot] !== null),
    )
  ) {
    warnings.add('exam');
  }

  // 앞 단계가 없으면 뒤 단계는 근거가 없다.
  if (snapshot.grinder === null) {
    snapshot.grinderCondition = null;
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
  snapshot.wheelCaptureMetrics = null;
  snapshot.wheelOcrTelemetry = null;
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
