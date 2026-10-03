// 확인 화면("다음"을 누르기 전) 입력값의 draft.
//
// InspectionDraft(진행 중 점검 복구, draftModel.ts)와 다른 것을 저장한다.
// 그 draft의 grinder/wheel은 proceed()를 눌러야 확정된다 — 그 전까지 화면에
// 입력 중인 값은 여기가 아니면 어디에도 남지 않는다.
//
// 복원해도 사용자 최종 확인(userConfirmed)이나 Gate 완료를 대신하지 않는다.
// 입력칸만 되돌리고, 확인은 다시 받는다 — 값을 지어내지 않는 것과 같은 원칙이다.

import {
  isGrinderSpec,
  isGuardType,
  isSpindleThread,
  isWheelPurpose,
  isWheelSpec,
  isWheelType,
} from './draftModel';
import type {
  GrinderSpec,
  GuardType,
  SpindleThread,
  WheelPurpose,
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
  /** 선택칸에서 고른 용도. 종류와 같은 이유로 좁혀 둔다 */
  purpose: WheelPurpose;
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
  /**
   * 이 ocr이 모델이 읽은 그대로가 아닌가 — 저장된 값 가운데 지금 기준에 맞지 않는
   * 필드를 모름으로 두고 읽은 OCR이다(recoverWheelOcr). 그런 경우에만 있다.
   *
   * 다시 저장할 때 빠뜨리면 안 된다. 다시 저장된 ocr은 이미 모름으로 바뀌어 있어,
   * 한 번 더 새로고침하면 처음부터 그렇게 읽힌 원본과 구분할 수 없다.
   */
  ocrAltered?: true;
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
  /**
   * ocr이 모델이 읽은 그대로가 아닌가(WheelFormDraft.ocrAltered). true면 화면과
   * 규격 대조에는 쓰되 기록의 OCR 원본(wheelOcr)으로는 남기지 않는다.
   */
  ocrAltered: boolean;
  analysisSource: AnalysisSource;
  /** 이전 버전의 다각도 외관 확인이 남긴 흔적. 없으면 null */
  legacyExam: LegacyExamTrace | null;
}

/** 숫돌 OCR에서 읽지 못하면 OCR 전체를 믿을 수 없는 값 */
type EssentialOcrKey =
  'maxRPM' | 'diameter' | 'thickness' | 'rawText' | 'confidence';

/**
 * 숫돌 OCR에서 읽지 못해도 규격이 성립하는 필드. 종류·용도·외관은 unknown으로
 * 둘 수 있고, 나머지는 없어도 되는 필드다.
 *
 * 값(true)은 쓰지 않는다. 목록이 아니라 표로 둔 것은 키를 타입으로 잠그기
 * 위해서다 — WheelSpec에 필드를 더하면 여기에도 넣어야 타입 검사를 통과한다.
 * 빠뜨리면 그 필드가 손댄 OCR에서 조용히 사라지는데, 새 필드가 의심 신호라면
 * 의심을 덜어내는 셈이 된다.
 */
const RESTORABLE_OCR_FIELDS: Record<
  Exclude<keyof WheelSpec, EssentialOcrKey>,
  true
> = {
  purpose: true,
  wheelType: true,
  visibleDamage: true,
  markings: true,
  rpmSource: true,
  expiry: true,
  expiryReview: true,
  accessoryName: true,
};

/**
 * 저장된 OCR 원본을 되살린다.
 *
 * 기준에 맞으면 그대로다. 맞지 않으면 통째로 버리지 않고, 읽지 못해도 되는 필드
 * (RESTORABLE_OCR_FIELDS) 가운데 **어긋난 것만** 모름으로 둔다 — 종류·용도·외관은
 * unknown, 없어도 되는 필드는 뺀다. 통째로 버리면 그 판독이 올린 외관 의심과 원본
 * 표시(markings — 표기 일치 검사의 근거), 신뢰도가 함께 사라진다. 의심을 덜어내는
 * 방향은 이 앱에 넣지 않는다(docs/safety-boundaries.md).
 *
 * 비슷한 값으로 추정하지 않는다. 외관 값도 unknown이다 — none_visible로 채우면
 * 보지 않은 것을 본 것처럼 남기고, suspected로 채우면 모델이 내지 않은 경고를
 * 지어낸다. 원본 표시는 일부만 고쳐 살리지 않고 덩어리째 본다 — 확정하면 기록에
 * "라벨에 인쇄된 그대로"로 남는 값이라, 빈 자리를 null로 메우면 고친 원본이 된다.
 *
 * 그렇게 읽은 OCR은 더 이상 모델이 읽은 그대로가 아니다. altered로 알려서 화면이
 * 그것을 기록의 OCR 원본으로 남기지 않게 한다 — 고친 값을 원본 자리에 적지 않는다
 * (.claude/rules/safety-critical.md 2번).
 *
 * 숫자·원문·신뢰도가 어긋난 OCR은 예전처럼 통째로 버린다. 이 경우에는 그 OCR이
 * 올린 외관 의심도 함께 사라진다 — 이어갈 길을 아직 만들지 않았다(남은 틈이다).
 */
function recoverWheelOcr(raw: unknown): {
  ocr: WheelSpec | null;
  altered: boolean;
} {
  if (isWheelSpec(raw)) return { ocr: raw, altered: false };
  if (!isObject(raw)) return { ocr: null, altered: false };

  // 읽지 못해도 되는 필드를 모두 모름으로 둔 뼈대. 이것조차 기준에 맞지 않으면
  // 숫자·원문·신뢰도가 어긋난 것이다.
  const skeleton = {
    maxRPM: raw.maxRPM,
    diameter: raw.diameter,
    thickness: raw.thickness,
    purpose: 'unknown',
    wheelType: 'unknown',
    visibleDamage: 'unknown',
    rawText: raw.rawText,
    confidence: raw.confidence,
  };
  if (!isWheelSpec(skeleton)) return { ocr: null, altered: false };

  // 저장된 값을 하나씩 되돌려 본다. 되돌려도 기준에 맞는 값만 남는다. 필드마다
  // 검사 규칙을 여기 다시 적지 않고 규격 전체의 기준(isWheelSpec) 하나로 본다.
  let ocr: WheelSpec = skeleton;
  for (const key of Object.keys(RESTORABLE_OCR_FIELDS)) {
    if (raw[key] === undefined) continue;
    const restored = { ...ocr, [key]: raw[key] };
    if (isWheelSpec(restored)) ocr = restored;
  }
  return { ocr, altered: true };
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
  const { ocr, altered } = recoverWheelOcr(raw.ocr);
  return {
    fields: {
      maxRPM: pickString(f.maxRPM, ''),
      diameter: pickString(f.diameter, ''),
      thickness: pickString(f.thickness, ''),
      // 지금 목록에 없는 용도·종류(이름이 바뀐 값·손상된 값)를 그대로 살리면
      // 선택칸에는 맞는 선택지가 없어 화면이 다른 값을 고른 것처럼 보이고 —
      // 용도 칸은 첫 선택지인 절단용이 고른 것처럼 보인다 — 규칙엔진은 모르는
      // 값을 받는다. 비슷한 값으로 추정해 바꾸지 않고 unknown으로 둔다 — 작업자가
      // 라벨과 실물을 보고 다시 고른다.
      purpose: isWheelPurpose(f.purpose) ? f.purpose : 'unknown',
      expiry: pickString(f.expiry, ''),
      wheelType: isWheelType(f.wheelType) ? f.wheelType : 'unknown',
      accessoryName: pickString(f.accessoryName, ''),
    },
    photo: raw.photo instanceof Blob ? raw.photo : null,
    ocr,
    // 이 버전이 다시 저장한 표시도 이어받는다(WheelFormDraft.ocrAltered).
    // OCR이 없으면 기록할 원본 자체가 없으므로 표시도 없다.
    ocrAltered: ocr !== null && (altered || raw.ocrAltered === true),
    analysisSource: pickAnalysisSource(raw),
    legacyExam: recoverLegacyExam(raw),
  };
}
