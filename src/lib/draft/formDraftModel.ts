// 확인 화면("다음"을 누르기 전) 입력값의 draft.
//
// InspectionDraft(진행 중 점검 복구, draftModel.ts)와 다른 것을 저장한다.
// 그 draft의 grinder/wheel은 proceed()를 눌러야 확정된다 — 그 전까지 화면에
// 입력 중인 값은 여기가 아니면 어디에도 남지 않는다.
//
// 복원해도 사용자 최종 확인(userConfirmed)이나 Gate 완료를 대신하지 않는다.
// 입력칸만 되돌리고, 확인은 다시 받는다 — 값을 지어내지 않는 것과 같은 원칙이다.

import { isGrinderSpec, isWheelSpec } from './draftModel';
import { WHEEL_TYPES } from '@/lib/backup/recordSanitize';
import type {
  GrinderSpec,
  GuardType,
  SpindleThread,
  WheelSpec,
  WheelType,
} from '@/lib/rules/types';

export const FORM_DRAFT_SCHEMA_VERSION = 1;

/** 자동 저장 간격. DraftRecovery의 DRAFT_SAVE_DELAY_MS와 같은 값이다. */
export const FORM_DRAFT_SAVE_DELAY_MS = 1000;

export type ScanFormSlot = 'grinder' | 'wheel';

/**
 * 이 값을 어떻게 얻었는가. 셋 다 서버 대조 없이 읽힌 값이라 제한 판정
 * (offline_limited)으로 대조되지만, 화면 문구는 서로 다르다 — 작업자가
 * 다시 확인해야 할 대상이 다르기 때문이다(직접 입력한 값 vs 기기가 읽었지만
 * 검증 못 한 값).
 *
 *   - server:    서버 분석을 거쳤다(정상 경로)
 *   - local_ocr: 기기 안 OCR(Tesseract)로 읽었거나 그때 기기가 오프라인이었다
 *   - manual:    서버에 닿지 못해 작업자가 명판·라벨을 보고 직접 입력했다
 */
export type AnalysisSource = 'server' | 'local_ocr' | 'manual';

const ANALYSIS_SOURCES: readonly AnalysisSource[] = [
  'server',
  'local_ocr',
  'manual',
];

const isAnalysisSource = (value: unknown): value is AnalysisSource =>
  typeof value === 'string' &&
  (ANALYSIS_SOURCES as readonly string[]).includes(value);

/**
 * 저장된 draft에서 출처를 되살린다.
 *
 * analysisSource가 없는 구버전 draft는 `offline` 불리언만 있었다. 그 시절
 * 코드는 로컬 OCR과 서버 실패를 구분하지 않고 `offline`에 합쳐 썼던 적이
 * 있어(fix(audit) 이전), `offline === false`가 실제로 온라인이었다고
 * 확정할 수 없다. 확정할 수 없으면 온라인으로 승격하지 않고 보수적으로
 * local_ocr(제한 판정)로 둔다. `offline === true`는 모든 버전에서 항상
 * 작업자의 직접 입력이었으므로 그대로 manual로 옮긴다.
 */
function pickAnalysisSource(raw: Record<string, unknown>): AnalysisSource {
  if (isAnalysisSource(raw.analysisSource)) return raw.analysisSource;
  return raw.offline === true ? 'manual' : 'local_ocr';
}

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
  /** 선택칸에서 고른 종류. 자유 입력이 아니라 선택지 값이라 종류로 좁혀 둔다 */
  wheelType: WheelType;
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
  analysisSource: AnalysisSource;
}

/**
 * 이전 버전(다각도 외관 확인이 있던 시기, 2026-10-03 이전)이 이 draft에 남긴 흔적.
 *
 * 추가 사진과 AI 결과 자체는 되살리지 않는다 — 그 단계가 이제 없고 받을 화면도
 * 없다. 남기는 것은 두 가지뿐이다.
 *
 *   dropped   — 그 확인의 사진·결과를 버렸다. 화면이 버렸다고 알린다
 *   suspected — 버렸고, 그 확인은 외관 이상을 **의심했다**. 의심은 이어간다
 *
 * 의심까지 버리면 앱이 스스로 올린 경고가 새 버전으로 넘어오며 조용히 사라진다.
 * 의심을 덜어내는 방향은 이 앱에 넣지 않는다(docs/safety-boundaries.md).
 */
export type LegacyExamTrace = 'dropped' | 'suspected';

/**
 * 숫돌 확인 화면 입력 draft.
 *
 * 다각도 외관 확인을 빼기 전에 저장된 draft에는 `exam`(추가 사진 세 장과 AI
 * 확인 결과)이 함께 들어 있을 수 있다. 되살리지 않고 흔적만 읽는다
 * (recoverWheelFormDraft).
 */
export interface WheelFormDraft {
  slot: 'wheel';
  schemaVersion: number;
  savedAt: string;
  fields: WheelFormFields;
  photo: Blob | null;
  ocr: WheelSpec | null;
  analysisSource: AnalysisSource;
  /**
   * 이전 버전 draft에서 이어받은 흔적. 그런 draft에서 이어진 경우에만 있다 —
   * 다시 저장할 때 빠뜨리면 한 번 더 새로고침하는 것만으로 의심이 사라진다.
   */
  legacyExam?: LegacyExamTrace;
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

/**
 * 숫돌 종류의 허용 목록. 여기 따로 적지 않고 백업 정리(recordSanitize.ts)가 쓰는
 * 목록을 그대로 쓴다 — 종류가 늘거나 이름이 바뀔 때 고칠 곳이 하나여야 한다.
 *
 * 목록에 WheelType이 아닌 값이 섞이면 이 대입에서 타입 검사가 막는다. 반대로
 * 목록에서 빠진 종류는 타입 검사가 잡지 못해 formDraftModel.test.ts가 WheelType
 * 전체를 돌려 잡는다.
 */
const WHEELS: readonly WheelType[] = WHEEL_TYPES;

const isWheelType = (value: unknown): value is WheelType =>
  isString(value) && (WHEELS as readonly string[]).includes(value);

/** 값이 있는데 형태가 어긋나면 기본값으로 되돌린다. 없던 값은 기본값을 그대로 쓴다 */
function pickString(value: unknown, fallback: string): string {
  return isString(value) ? value : fallback;
}

export interface GrinderFormRecovery {
  fields: GrinderFormFields;
  photo: Blob | null;
  ocr: GrinderSpec | null;
  analysisSource: AnalysisSource;
}

export interface WheelFormRecovery {
  fields: WheelFormFields;
  photo: Blob | null;
  ocr: WheelSpec | null;
  analysisSource: AnalysisSource;
  /** 이전 버전의 다각도 외관 확인이 남긴 흔적. 없으면 null */
  legacyExam: LegacyExamTrace | null;
}

/**
 * 이전 버전의 다각도 외관 확인이 이 draft에 남긴 흔적을 읽는다.
 *
 * 그 확인을 요구하지 않던 종류의 draft에도 빈 `exam`(사진·결과가 모두 null)이
 * 들어 있었다. 쓴 흔적이 없으면 버린 것도 없으므로 null이다 — 없던 일을 있던
 * 것처럼 알리지 않는다.
 */
function recoverLegacyExam(
  raw: Record<string, unknown>,
): LegacyExamTrace | null {
  // 이 버전이 이어받아 다시 저장한 표시. 목록에 있는 값만 믿는다.
  if (raw.legacyExam === 'dropped' || raw.legacyExam === 'suspected') {
    return raw.legacyExam;
  }
  const exam = raw.exam;
  if (!isObject(exam)) return null;

  const result = isObject(exam.exam) ? exam.exam : null;
  // 사진이 빠졌어도 의심은 의심이다. 이전 버전은 사진이 모자라면 결과를 버렸지만,
  // 그것은 "확인을 마쳤다"로 치지 않기 위해서였다 — 의심을 지우려던 것이 아니다.
  if (result?.status === 'suspected') return 'suspected';

  const photos = isObject(exam.photos) ? Object.values(exam.photos) : [];
  const used =
    result !== null ||
    photos.some((photo) => photo !== null && photo !== undefined) ||
    (exam.notRunReason !== null && exam.notRunReason !== undefined);
  return used ? 'dropped' : null;
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
    analysisSource: pickAnalysisSource(raw),
  };
}

/** 읽어 온 숫돌 확인 화면 draft에서 믿을 수 있는 값만 골라 되살린다 */
export function recoverWheelFormDraft(raw: unknown): WheelFormRecovery | null {
  if (!isObject(raw) || !isObject(raw.fields)) return null;
  const f = raw.fields;
  return {
    fields: {
      maxRPM: pickString(f.maxRPM, ''),
      diameter: pickString(f.diameter, ''),
      thickness: pickString(f.thickness, ''),
      purpose: pickString(f.purpose, 'unknown'),
      expiry: pickString(f.expiry, ''),
      // 지금 종류 목록에 없는 값(이름이 바뀐 종류·손상된 값)을 그대로 살리면
      // 선택칸에는 맞는 선택지가 없어 화면이 다른 종류를 고른 것처럼 보이고,
      // 규칙엔진은 모르는 종류를 받는다. 비슷한 종류로 추정해 바꾸지 않고
      // unknown으로 둔다 — 종류는 작업자가 실물을 보고 다시 고른다.
      wheelType: isWheelType(f.wheelType) ? f.wheelType : 'unknown',
      accessoryName: pickString(f.accessoryName, ''),
    },
    photo: raw.photo instanceof Blob ? raw.photo : null,
    ocr: isWheelSpec(raw.ocr) ? raw.ocr : null,
    analysisSource: pickAnalysisSource(raw),
    legacyExam: recoverLegacyExam(raw),
  };
}
