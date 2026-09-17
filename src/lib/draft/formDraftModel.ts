// 확인 화면("다음"을 누르기 전) 입력값의 draft.
//
// InspectionDraft(진행 중 점검 복구, draftModel.ts)와 다른 것을 저장한다.
// 그 draft의 grinder/wheel은 proceed()를 눌러야 확정된다 — 그 전까지 화면에
// 입력 중인 값은 여기가 아니면 어디에도 남지 않는다.
//
// 복원해도 사용자 최종 확인(userConfirmed)이나 Gate 완료를 대신하지 않는다.
// 입력칸만 되돌리고, 확인은 다시 받는다 — 값을 지어내지 않는 것과 같은 원칙이다.

import { isGrinderSpec, isWheelSpec } from './draftModel';
import { wheelExamRequired } from '@/lib/vision/wheelExamSafety';
import type {
  CaptureQualityMetrics,
  GrinderSpec,
  GuardType,
  SpindleThread,
  WheelExamNotRunReason,
  WheelExamResult,
  WheelSpec,
  WheelType,
} from '@/lib/rules/types';

export const FORM_DRAFT_SCHEMA_VERSION = 1;

/** 자동 저장 간격. DraftRecovery의 DRAFT_SAVE_DELAY_MS와 같은 값이다. */
export const FORM_DRAFT_SAVE_DELAY_MS = 1000;

export type ScanFormSlot = 'grinder' | 'wheel';

export interface GrinderFormFields {
  model: string;
  noLoadRPM: string;
  maxWheelDiameter: string;
  /** GrinderMountingInputs의 값. Profile 확인(스핀들·덮개)도 같은 화면의 입력이다 */
  spindleThread: SpindleThread;
  guardType: GuardType;
  guardSize: string;
}

export interface WheelFormFields {
  maxRPM: string;
  diameter: string;
  thickness: string;
  purpose: string;
  expiry: string;
  wheelType: string;
  accessoryName: string;
}

export const EMPTY_GRINDER_FORM_FIELDS: GrinderFormFields = {
  model: '',
  noLoadRPM: '',
  maxWheelDiameter: '',
  spindleThread: 'unknown',
  guardType: 'unknown',
  guardSize: '',
};

export const EMPTY_WHEEL_FORM_FIELDS: WheelFormFields = {
  maxRPM: '',
  diameter: '',
  thickness: '',
  purpose: 'unknown',
  expiry: '',
  wheelType: 'unknown',
  accessoryName: '',
};

export interface GrinderFormDraft {
  slot: 'grinder';
  schemaVersion: number;
  savedAt: string;
  fields: GrinderFormFields;
  /** 최적화(축소)를 마친 명판 사진. 촬영하지 않았으면 null */
  photo: Blob | null;
  ocr: GrinderSpec | null;
  /** 서버에 닿지 못해 직접 입력 중인가(오프라인 제한 대조) */
  offline: boolean;
}

/** 앞면(라벨 사진) 외에 다각도 확인에서 작업자가 더 찍는 세 자리 */
export type ExamView = 'back' | 'edge' | 'bore';

type ExamSlotValues<T> = { back: T; edge: T; bore: T };

export interface WheelExamDraft {
  photos: ExamSlotValues<Blob | null>;
  metrics: ExamSlotValues<CaptureQualityMetrics | null>;
  /** AI 다각도 확인 원본 결과 */
  exam: WheelExamResult | null;
  /** AI 확인을 하지 못한 채 진행했던 사유. exam과 둘 중 하나만 채워진다 */
  notRunReason: WheelExamNotRunReason | null;
}

export const EMPTY_WHEEL_EXAM_DRAFT: WheelExamDraft = {
  photos: { back: null, edge: null, bore: null },
  metrics: { back: null, edge: null, bore: null },
  exam: null,
  notRunReason: null,
};

export interface WheelFormDraft {
  slot: 'wheel';
  schemaVersion: number;
  savedAt: string;
  fields: WheelFormFields;
  photo: Blob | null;
  ocr: WheelSpec | null;
  offline: boolean;
  /** 다각도 확인(WheelExamPanel) 진행 상태. 이 필드가 없는 구버전 draft도 있다 */
  exam: WheelExamDraft;
}

export type ScanFormDraft = GrinderFormDraft | WheelFormDraft;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const SPINDLES: readonly SpindleThread[] = [
  'unknown',
  'M14',
  'M10',
  '5/8-11',
  'other',
];
const GUARDS: readonly GuardType[] = [
  'unknown',
  'grinding',
  'cutting',
  'none',
  'other',
];

const isSpindleThread = (value: unknown): value is SpindleThread =>
  isString(value) && (SPINDLES as readonly string[]).includes(value);

const isGuardType = (value: unknown): value is GuardType =>
  isString(value) && (GUARDS as readonly string[]).includes(value);

const NOT_RUN_REASONS: readonly WheelExamNotRunReason[] = [
  'network_error',
  'api_error',
  'offline',
  'user_manual_continue',
];

const isNotRunReason = (value: unknown): value is WheelExamNotRunReason =>
  isString(value) && (NOT_RUN_REASONS as readonly string[]).includes(value);

/** 값이 있는데 형태가 어긋나면 기본값으로 되돌린다. 없던 값은 기본값을 그대로 쓴다 */
function pickString(value: unknown, fallback: string): string {
  return isString(value) ? value : fallback;
}

export interface GrinderFormRecovery {
  fields: GrinderFormFields;
  photo: Blob | null;
  ocr: GrinderSpec | null;
  offline: boolean;
}

export interface WheelFormRecovery {
  fields: WheelFormFields;
  photo: Blob | null;
  ocr: WheelSpec | null;
  offline: boolean;
  exam: WheelExamDraft;
}

/**
 * 저장된 다각도 확인 draft에서 믿을 수 있는 값만 골라 되살린다.
 *
 * 지금 종류(wheelType)가 다각도 확인을 요구하지 않으면(wheelExamRequired)
 * 저장된 값이 있어도 되살리지 않는다 — 종류가 바뀐 뒤에도 이전 종류의 확인
 * 결과가 남아 있으면 안 된다. 사진 세 장 중 하나라도 없으면(손상 포함) AI
 * 분석 결과도 함께 버린다 — 사진 없이 확인된 것처럼 남기지 않는다.
 */
export function recoverWheelExamDraft(
  raw: unknown,
  wheelType: string,
): WheelExamDraft {
  if (!wheelExamRequired(wheelType as WheelType)) return EMPTY_WHEEL_EXAM_DRAFT;
  if (!isObject(raw)) return EMPTY_WHEEL_EXAM_DRAFT;

  const rawPhotos = isObject(raw.photos) ? raw.photos : {};
  const rawMetrics = isObject(raw.metrics) ? raw.metrics : {};

  const photos: ExamSlotValues<Blob | null> = {
    back: rawPhotos.back instanceof Blob ? rawPhotos.back : null,
    edge: rawPhotos.edge instanceof Blob ? rawPhotos.edge : null,
    bore: rawPhotos.bore instanceof Blob ? rawPhotos.bore : null,
  };
  const metrics: ExamSlotValues<CaptureQualityMetrics | null> = {
    back: isObject(rawMetrics.back)
      ? (rawMetrics.back as unknown as CaptureQualityMetrics)
      : null,
    edge: isObject(rawMetrics.edge)
      ? (rawMetrics.edge as unknown as CaptureQualityMetrics)
      : null,
    bore: isObject(rawMetrics.bore)
      ? (rawMetrics.bore as unknown as CaptureQualityMetrics)
      : null,
  };

  // 세 장이 모두 있어야 분석 결과가 그 사진들을 보고 낸 것이라고 믿을 수 있다.
  const photosComplete =
    photos.back !== null && photos.edge !== null && photos.bore !== null;

  return {
    photos,
    metrics,
    exam:
      photosComplete && isObject(raw.exam)
        ? (raw.exam as unknown as WheelExamResult)
        : null,
    notRunReason: isNotRunReason(raw.notRunReason) ? raw.notRunReason : null,
  };
}

/** 읽어 온 그라인더 확인 화면 draft에서 믿을 수 있는 값만 골라 되살린다 */
export function recoverGrinderFormDraft(
  raw: unknown,
): GrinderFormRecovery | null {
  if (!isObject(raw) || !isObject(raw.fields)) return null;
  const f = raw.fields;
  return {
    fields: {
      model: pickString(f.model, ''),
      noLoadRPM: pickString(f.noLoadRPM, ''),
      maxWheelDiameter: pickString(f.maxWheelDiameter, ''),
      spindleThread: isSpindleThread(f.spindleThread)
        ? f.spindleThread
        : 'unknown',
      guardType: isGuardType(f.guardType) ? f.guardType : 'unknown',
      guardSize: pickString(f.guardSize, ''),
    },
    photo: raw.photo instanceof Blob ? raw.photo : null,
    ocr: isGrinderSpec(raw.ocr) ? raw.ocr : null,
    offline: raw.offline === true,
  };
}

/** 읽어 온 숫돌 확인 화면 draft에서 믿을 수 있는 값만 골라 되살린다 */
export function recoverWheelFormDraft(raw: unknown): WheelFormRecovery | null {
  if (!isObject(raw) || !isObject(raw.fields)) return null;
  const f = raw.fields;
  const wheelType = pickString(f.wheelType, 'unknown');
  return {
    fields: {
      maxRPM: pickString(f.maxRPM, ''),
      diameter: pickString(f.diameter, ''),
      thickness: pickString(f.thickness, ''),
      purpose: pickString(f.purpose, 'unknown'),
      expiry: pickString(f.expiry, ''),
      wheelType,
      accessoryName: pickString(f.accessoryName, ''),
    },
    photo: raw.photo instanceof Blob ? raw.photo : null,
    ocr: isWheelSpec(raw.ocr) ? raw.ocr : null,
    offline: raw.offline === true,
    exam: recoverWheelExamDraft(raw.exam, wheelType),
  };
}
