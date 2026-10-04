// 점검 기록(InspectionRecord, 사진 제외) 하나를 "허용된 필드만" 새 객체로
// 재구성한다. 백업 내보내기·가져오기 양쪽에서 이 함수 하나만 쓴다.
//
// 왜 필요한가: TypeScript 타입은 런타임 속성을 지우지 않는다. `raw as T`로
// 넘기면 원본 객체가 들고 있는 알려지지 않은 속성(API 키, system prompt,
// 원시 API 응답, __proto__ 등)이 그대로 실린다. 그래서 이 파일은 어디서도
// `{...raw}`나 구조분해 후 `...rest`를 쓰지 않는다 — 알려진 필드 이름을
// 하나씩 꺼내 새 객체 리터럴에만 담는다. 모르는 필드는 애초에 읽지 않으므로
// 결과에 나타날 수 없다.
//
// 이 파일은 순수 함수만 담는다(저장소를 모른다). 판정을 다시 계산하지
// 않는다 — 저장된 값을 그대로 옮겨 담을 뿐이다.

import type {
  AccessoryProfileRef,
  AnalysisLimitCauses,
  CaptureQualityCheck,
  CaptureQualityMetrics,
  CaptureSlot,
  CheckDetail,
  CheckItem,
  DamageRecheck,
  ExpiryMonth,
  GrinderCondition,
  GrinderSpec,
  MatchResult,
  OcrTelemetry,
  ProfileCondition,
  ReanalysisRecord,
  SafetyChecklist,
  TrialRun,
  WheelCondition,
  WheelExamFinding,
  WheelExamNotRun,
  WheelExamPhotoQuality,
  WheelExamResult,
  WheelMarkings,
  WheelSpec,
  WorkConditions,
} from '@/lib/rules/types';
import type { InspectionWithoutPhotos } from '@/lib/db';
import { MAX_REANALYSES } from '@/lib/record/reanalysis';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** OCR 원문처럼 원래 길 수 있는 문자열의 상한 */
const MAX_LONG_STRING = 20_000;
/** 그 외 문자열(모델명·사유 코드 등)의 상한 */
const MAX_STRING = 2_000;
/** checks·findings 같은 배열 항목 수 상한 */
const MAX_ARRAY = 200;

/** 어떤 깊이에서도 이 이름의 필드는 읽지도, 옮겨 담지도 않는다 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** 무효 판정 신호. 최상위 sanitizeInspectionRecord가 잡아 null로 바꾼다 */
class Invalid extends Error {}
function fail(): never {
  throw new Invalid();
}

function obj(value: unknown): Record<string, unknown> {
  if (!isObject(value)) fail();
  return value;
}

function str(value: unknown, maxLen = MAX_STRING): string {
  if (typeof value !== 'string' || value.length > maxLen) fail();
  return value;
}
function optStr(value: unknown, maxLen = MAX_STRING): string | undefined {
  return value === undefined ? undefined : str(value, maxLen);
}
function nullableStr(value: unknown, maxLen = MAX_STRING): string | null {
  return value === null ? null : str(value, maxLen);
}
function optNullableStr(
  value: unknown,
  maxLen = MAX_STRING,
): string | null | undefined {
  return value === undefined ? undefined : nullableStr(value, maxLen);
}

/** 유효한 날짜로 파싱되는 문자열만 통과시킨다("잘못된 날짜" 방어) */
function dateStr(value: unknown, maxLen = MAX_STRING): string {
  const s = str(value, maxLen);
  if (Number.isNaN(Date.parse(s))) fail();
  return s;
}

function num(value: unknown): number {
  // Number.isFinite는 NaN·Infinity를 거른다. JSON의 `1e400` 같은 표기가
  // Infinity로 파싱되는 경우("비정상 숫자")가 실제로 있다.
  if (typeof value !== 'number' || !Number.isFinite(value)) fail();
  return value;
}
function int(value: unknown): number {
  const n = num(value);
  if (!Number.isInteger(n)) fail();
  return n;
}
function nullableNum(value: unknown): number | null {
  return value === null ? null : num(value);
}
function optNullableNum(value: unknown): number | null | undefined {
  return value === undefined ? undefined : nullableNum(value);
}

function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') fail();
  return value;
}
function optBool(value: unknown): boolean | undefined {
  return value === undefined ? undefined : bool(value);
}
function nullableBool(value: unknown): boolean | null {
  return value === null ? null : bool(value);
}
function optNullableBool(value: unknown): boolean | null | undefined {
  return value === undefined ? undefined : nullableBool(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (
    typeof value !== 'string' ||
    !(allowed as readonly string[]).includes(value)
  ) {
    fail();
  }
  return value as T;
}
function optOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return value === undefined ? undefined : oneOf(value, allowed);
}

function arr(value: unknown, maxLen = MAX_ARRAY): unknown[] {
  if (!Array.isArray(value) || value.length > maxLen) fail();
  return value;
}

/** value가 undefined가 아닐 때만 target[key]를 채운다 — 없던 optional 필드를 만들지 않는다 */
function setOpt<T, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

// ── 허용값 목록. types.ts는 순수 타입만 담으므로(런타임 코드 금지) 여기 둔다 ──
//
// export한 목록은 draft 복구도 쓴다. lib/draft/draftModel.ts의 isWheelType 등이
// 이 목록으로, 확인 화면 draft(formDraftModel.ts)에 저장된 선택칸 값(스핀들·덮개·
// 용도·종류)을 검사한다. 같은 목록을 두 곳에 적으면 값을 더하거나 이름을 바꿀 때
// 한쪽만 고쳐져 갈라진다.

const CONFIDENCE = ['high', 'medium', 'low'] as const;
export const SPINDLE_THREADS = [
  'M14',
  'M10',
  '5/8-11',
  'other',
  'unknown',
] as const;
export const GUARD_TYPES = [
  'grinding',
  'cutting',
  'none',
  'other',
  'unknown',
] as const;
const WORK_MATERIALS = [
  'steel',
  'stainless',
  'non_ferrous',
  'stone_concrete',
  'other',
  'unknown',
] as const;
const COOLING_MODES = ['dry', 'wet', 'unknown'] as const;
export const WHEEL_PURPOSES = ['cutting', 'grinding', 'unknown'] as const;
export const WHEEL_TYPES = [
  'bonded_abrasive',
  'bonded_cutting',
  'bonded_grinding',
  'bonded_combination',
  'bonded_cup',
  'flap_disc',
  'cup_wheel',
  'diamond',
  'diamond_continuous',
  'diamond_turbo',
  'diamond_segmented',
  'diamond_cup',
  'tuck_pointing',
  'wire_brush',
  'fibre_disc',
  'nonwoven_disc',
  'polishing_pad',
  'other',
  'unknown',
] as const;
const VISIBLE_DAMAGE = ['suspected', 'none_visible', 'unknown'] as const;
const VISIBLE_DAMAGE_SOURCES = [
  'label_photo',
  'reanalysis',
  'legacy_exam',
  'dropped_ocr',
  'carried',
] as const;
const RPM_SOURCES = ['label', 'converted', 'user'] as const;
const VERDICTS = ['COMPATIBLE', 'INCOMPATIBLE', 'UNDETERMINED'] as const;
const WORK_PURPOSES = ['cutting', 'grinding'] as const;
const TRIAL_RUN_FINDINGS = [
  'vibration',
  'noise',
  'wobble',
  'wheelDamage',
  'equipment',
] as const;
const TRIAL_RUN_OUTCOMES = ['normal', 'abnormal'] as const;
const PROFILE_SCOPES = ['full', 'limited'] as const;
const PROFILE_CONDITION_KEYS = [
  'material',
  'cooling',
  'spindle',
  'guard',
  'guardSize',
  'rotation',
] as const;
const PROFILE_CONDITION_STATUSES = [
  'unknown',
  'manual_check',
  'conflict',
] as const;
const PROFILE_CONDITION_CODES = [
  'material.unknown',
  'material.unverified',
  'material.manualCheck',
  'material.notAllowed',
  'cooling.unknown',
  'cooling.unverified',
  'cooling.manualCheck',
  'cooling.notAllowed',
  'spindle.unknown',
  'spindle.manualCheck',
  'guard.unknown',
  'guard.missing',
  'guard.manualCheck',
  'guardSize.unknown',
  'guardSize.smallerThanWheel',
  'guardSize.manualCheck',
  'rotation.unverified',
  'rotation.followArrow',
] as const;
const REASON_CODES = [
  'requiredValues.ok',
  'requiredValues.missingGrinder',
  'requiredValues.missingWheel',
  'requiredValues.missingBoth',
  'rpmSafety.missing',
  'rpmSafety.fail',
  'rpmSafety.pass',
  'diameterFit.missing',
  'diameterFit.fail',
  'diameterFit.pass',
  'purpose.unknown',
  'purpose.recognized',
  'workPurpose.unknown',
  'workPurpose.mismatch',
  'workPurpose.match',
  'workPurpose.manualCheck',
  'workPurpose.profileMismatch',
  'workPurpose.notDeclared',
  'wheelType.unsupported',
  'wheelType.supported',
  'wheelType.supportedProfile',
  'visibleDamage.suspected',
  'visibleDamage.notVerifiable',
  'confidence.low',
  'confidence.ok',
  'unitConsistency.mismatch',
  'unitConsistency.match',
  'mountingSpec.missing',
  'mountingSpec.shown',
  'peripheralSpeed.oddGrinder',
  'peripheralSpeed.oddWheel',
  'peripheralSpeed.oddBoth',
  'peripheralSpeed.ok',
  'expiry.noToday',
  'expiry.unreadable',
  'expiry.expired',
  'expiry.valid',
  'expiry.noPolicy',
  'expiry.notFound',
  'expiry.manualUnreadable',
  'guard.missing',
  'guard.smallerThanWheel',
  'guard.manualCheck',
  'profileScope.limited',
  'analysisMode.offlineLimited',
] as const;
const ANALYSIS_MODES = ['online', 'offline_limited'] as const;
const ANALYSIS_LIMIT_CAUSES = [
  'manual',
  'local_ocr',
  'dropped_ocr',
  'unknown',
] as const;
const WHEEL_EXAM_STATUSES = [
  'suspected',
  'not_observed',
  'unassessable',
] as const;
const WHEEL_EXAM_FINDING_KINDS = [
  'crack',
  'chip',
  'edge_break',
  'bore_damage',
  'deformation',
  'contamination',
  'other',
] as const;
const WHEEL_EXAM_VIEWS = ['front', 'back', 'edge', 'bore'] as const;
const WHEEL_EXAM_PHOTO_ISSUES = [
  'blur',
  'glare',
  'darkness',
  'incomplete_view',
] as const;
const WHEEL_EXAM_NOT_RUN_REASONS = [
  'network_error',
  'api_error',
  'offline',
  'user_manual_continue',
] as const;
const CAPTURE_SLOTS = [
  'grinder',
  'wheel',
  'wheelBack',
  'wheelEdge',
  'wheelBore',
] as const;
const CAPTURE_QUALITY_WARNINGS = [
  'low_resolution',
  'blur',
  'too_dark',
  'overexposed',
] as const;
const OCR_ENGINES = ['claude', 'tesseract'] as const;

// ── 값 하나가 dynamic key를 갖는 유일한 자리(CheckDetail.params) ──

function sanitizeParams(
  raw: unknown,
): Readonly<Record<string, string | number>> | undefined {
  if (raw === undefined) return undefined;
  const r = obj(raw);
  const out: Record<string, string | number> = {};
  let count = 0;
  for (const key of Object.keys(r)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (count >= MAX_ARRAY) fail();
    const value = r[key];
    if (typeof value === 'string') {
      if (value.length > MAX_STRING) fail();
      out[key] = value;
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value)) fail();
      out[key] = value;
    } else {
      fail();
    }
    count += 1;
  }
  return out;
}

// ── 중첩 객체 재구성 ──

function sanitizeGrinderSpec(raw: unknown): GrinderSpec {
  const r = obj(raw);
  const result: GrinderSpec = {
    model: nullableStr(r.model),
    noLoadRPM: nullableNum(r.noLoadRPM),
    maxWheelDiameter: nullableNum(r.maxWheelDiameter),
    rawText: str(r.rawText, MAX_LONG_STRING),
    confidence: oneOf(r.confidence, CONFIDENCE),
  };
  setOpt(result, 'spindleThread', optOneOf(r.spindleThread, SPINDLE_THREADS));
  setOpt(result, 'guardType', optOneOf(r.guardType, GUARD_TYPES));
  setOpt(result, 'guardSize', optNullableNum(r.guardSize));
  return result;
}

function sanitizeWheelMarkings(raw: unknown): WheelMarkings {
  const r = obj(raw);
  const result: WheelMarkings = {
    labeledRPM: nullableNum(r.labeledRPM),
    peripheralSpeedMps: nullableNum(r.peripheralSpeedMps),
    boreDiameter: nullableNum(r.boreDiameter),
  };
  setOpt(result, 'expiryRaw', optNullableStr(r.expiryRaw));
  return result;
}

function sanitizeExpiryMonth(raw: unknown): ExpiryMonth {
  const r = obj(raw);
  const year = int(r.year);
  const month = int(r.month);
  if (month < 1 || month > 12) fail();
  return { year, month };
}

function sanitizeWheelSpec(raw: unknown): WheelSpec {
  const r = obj(raw);
  const result: WheelSpec = {
    maxRPM: nullableNum(r.maxRPM),
    diameter: nullableNum(r.diameter),
    thickness: nullableNum(r.thickness),
    purpose: oneOf(r.purpose, WHEEL_PURPOSES),
    wheelType: oneOf(r.wheelType, WHEEL_TYPES),
    visibleDamage: oneOf(r.visibleDamage, VISIBLE_DAMAGE),
    rawText: str(r.rawText, MAX_LONG_STRING),
    confidence: oneOf(r.confidence, CONFIDENCE),
  };
  // 외관 의심의 출처. 빠뜨리면 백업을 거친 기록에서 출처가 조용히 사라지고, 이어받은
  // 의심이 다시 "이 사진에서 보인 것"으로만 읽힌다.
  //
  // 값이 목록에 있는지만 본다. 같은 출처가 두 번 적혔거나, 목록이 비었거나, 의심이
  // 아닌데 출처가 남은 값은 무효로 하지 않는다 — 이 검사는 새로고침 복원도 함께
  // 쓰는데, 출처 표기가 어색하다고 규격을 버리면 의심이 적힌 숫돌 단계가 통째로
  // 사라진다. 그런 값은 읽는 쪽이 견딘다(i18n/checkText.ts, record/csv.ts).
  setOpt(
    result,
    'visibleDamageSources',
    r.visibleDamageSources === undefined
      ? undefined
      : arr(r.visibleDamageSources).map((source) =>
          oneOf(source, VISIBLE_DAMAGE_SOURCES),
        ),
  );
  setOpt(
    result,
    'markings',
    r.markings === undefined ? undefined : sanitizeWheelMarkings(r.markings),
  );
  setOpt(result, 'rpmSource', optOneOf(r.rpmSource, RPM_SOURCES));
  setOpt(
    result,
    'expiry',
    r.expiry === undefined
      ? undefined
      : r.expiry === null
        ? null
        : sanitizeExpiryMonth(r.expiry),
  );
  setOpt(result, 'accessoryName', optNullableStr(r.accessoryName));
  setOpt(
    result,
    'expiryReview',
    optOneOf(r.expiryReview, ['marked', 'not_found', 'unreadable'] as const),
  );
  return result;
}

/** 재구성이 무효 신호 없이 끝나는가 */
function passes(sanitize: () => unknown): boolean {
  try {
    sanitize();
    return true;
  } catch (error) {
    if (error instanceof Invalid) return false;
    throw error;
  }
}

// ── 규격 하나가 이 파일의 기준(타입·허용 목록·날짜 범위·길이)에 맞는가 ──
//
// draft 복구(lib/draft/draftModel.ts의 isGrinderSpec·isWheelSpec)와 새로고침 복원
// (lib/state/inspection.tsx)이 저장된 규격을 아래 두 함수로 검사한다. 기준을 그쪽에
// 따로 적으면 필드를 더할 때 한쪽만 고쳐져 갈라진다 — 복구는 통과시켰는데 여기서는
// 버리는 값이 생기고, 그 값이 규칙엔진으로 들어간다.

/** 그라인더 규격이 기준에 맞는가(스핀들·덮개 종류·덮개 크기 포함) */
export function isValidGrinderSpec(raw: unknown): raw is GrinderSpec {
  return passes(() => sanitizeGrinderSpec(raw));
}

/**
 * 숫돌 규격이 기준에 맞는가(유효기한·원본 표시 같은 선택 필드 포함).
 *
 * 복구가 선택 필드를 검사하지 않던 때에는 {year, month}가 아닌 유효기한이 그대로
 * 규칙엔진에 들어가 유효기한 규칙을 통과했고, 판정이 적합으로 나왔다.
 */
export function isValidWheelSpec(raw: unknown): raw is WheelSpec {
  return passes(() => sanitizeWheelSpec(raw));
}

function sanitizeCheckDetail(raw: unknown): CheckDetail {
  const r = obj(raw);
  const result: CheckDetail = { code: oneOf(r.code, REASON_CODES) };
  setOpt(result, 'params', sanitizeParams(r.params));
  return result;
}

function sanitizeCheckItem(raw: unknown): CheckItem {
  const r = obj(raw);
  const result: CheckItem = {
    rule: str(r.rule),
    passed: nullableBool(r.passed),
    reason: str(r.reason, MAX_LONG_STRING),
    grinderValue: nullableStr(r.grinderValue),
    wheelValue: nullableStr(r.wheelValue),
  };
  setOpt(
    result,
    'detail',
    r.detail === undefined ? undefined : sanitizeCheckDetail(r.detail),
  );
  setOpt(result, 'advisory', optBool(r.advisory));
  return result;
}

function sanitizeMatchResult(raw: unknown): MatchResult {
  const r = obj(raw);
  return {
    verdict: oneOf(r.verdict, VERDICTS),
    checks: arr(r.checks).map(sanitizeCheckItem),
    timestamp: dateStr(r.timestamp),
  };
}

function sanitizeSafetyChecklist(raw: unknown): SafetyChecklist {
  const r = obj(raw);
  const result: SafetyChecklist = {
    guardCover: nullableBool(r.guardCover),
    auxiliaryHandle: nullableBool(r.auxiliaryHandle),
    wheelDamage: nullableBool(r.wheelDamage),
    ppe: nullableBool(r.ppe),
  };
  setOpt(result, 'workpieceSecured', optNullableBool(r.workpieceSecured));
  setOpt(result, 'surroundingsClear', optNullableBool(r.surroundingsClear));
  setOpt(result, 'sparkDirection', optNullableBool(r.sparkDirection));
  return result;
}

function sanitizeGrinderCondition(raw: unknown): GrinderCondition {
  const r = obj(raw);
  return {
    cordAndPlugUndamaged: nullableBool(r.cordAndPlugUndamaged),
    bodyUndamaged: nullableBool(r.bodyUndamaged),
    guardSecure: nullableBool(r.guardSecure),
    auxiliaryHandleSecure: nullableBool(r.auxiliaryHandleSecure),
    spindleAssemblyUndamaged: nullableBool(r.spindleAssemblyUndamaged),
  };
}

function sanitizeWheelCondition(raw: unknown): WheelCondition {
  const r = obj(raw);
  const result: WheelCondition = {
    damageFree: nullableBool(r.damageFree),
    notDeformed: nullableBool(r.notDeformed),
    mountingAreaUndamaged: nullableBool(r.mountingAreaUndamaged),
    labelLegible: nullableBool(r.labelLegible),
    expiryValid: nullableBool(r.expiryValid),
  };
  setOpt(result, 'diamondRimIntact', optNullableBool(r.diamondRimIntact));
  setOpt(result, 'flapsIntact', optNullableBool(r.flapsIntact));
  setOpt(result, 'noDelamination', optNullableBool(r.noDelamination));
  setOpt(result, 'flapBackingIntact', optNullableBool(r.flapBackingIntact));
  setOpt(result, 'threadAdapterFit', optNullableBool(r.threadAdapterFit));
  setOpt(result, 'evenWear', optNullableBool(r.evenWear));
  setOpt(
    result,
    'dedicatedGuardFitted',
    optNullableBool(r.dedicatedGuardFitted),
  );
  setOpt(result, 'wiresIntact', optNullableBool(r.wiresIntact));
  setOpt(result, 'backingPadUndamaged', optNullableBool(r.backingPadUndamaged));
  return result;
}

function sanitizeTrialRun(raw: unknown): TrialRun {
  const r = obj(raw);
  return {
    wheelReplaced: bool(r.wheelReplaced),
    requiredSeconds: int(r.requiredSeconds),
    startedAt: dateStr(r.startedAt),
    finishedAt: dateStr(r.finishedAt),
    elapsedSeconds: num(r.elapsedSeconds),
    outcome: oneOf(r.outcome, TRIAL_RUN_OUTCOMES),
    findings: arr(r.findings).map((f) => oneOf(f, TRIAL_RUN_FINDINGS)),
    completed: bool(r.completed),
  };
}

function sanitizeWorkConditions(raw: unknown): WorkConditions {
  const r = obj(raw);
  return {
    material: oneOf(r.material, WORK_MATERIALS),
    cooling: oneOf(r.cooling, COOLING_MODES),
  };
}

function sanitizeAccessoryProfileRef(raw: unknown): AccessoryProfileRef {
  const r = obj(raw);
  const result: AccessoryProfileRef = {
    type: oneOf(r.type, WHEEL_TYPES),
    version: str(r.version),
  };
  setOpt(result, 'scope', optOneOf(r.scope, PROFILE_SCOPES));
  return result;
}

function sanitizeProfileCondition(raw: unknown): ProfileCondition {
  const r = obj(raw);
  return {
    key: oneOf(r.key, PROFILE_CONDITION_KEYS),
    status: oneOf(r.status, PROFILE_CONDITION_STATUSES),
    code: oneOf(r.code, PROFILE_CONDITION_CODES),
  };
}

function sanitizeCaptureQualityMetrics(raw: unknown): CaptureQualityMetrics {
  const r = obj(raw);
  return {
    originalWidth: nullableNum(r.originalWidth),
    originalHeight: nullableNum(r.originalHeight),
    originalBytes: nullableNum(r.originalBytes),
    uploadWidth: nullableNum(r.uploadWidth),
    uploadHeight: nullableNum(r.uploadHeight),
    uploadBytes: nullableNum(r.uploadBytes),
    meanBrightness: nullableNum(r.meanBrightness),
    contrast: nullableNum(r.contrast),
    darkPixelRatio: nullableNum(r.darkPixelRatio),
    brightPixelRatio: nullableNum(r.brightPixelRatio),
    blurMetric: nullableNum(r.blurMetric),
    optimizeMs: nullableNum(r.optimizeMs),
  };
}

function sanitizeCaptureQualityCheck(raw: unknown): CaptureQualityCheck {
  const r = obj(raw);
  return {
    checkVersion: str(r.checkVersion),
    warnings: arr(r.warnings).map((w) => oneOf(w, CAPTURE_QUALITY_WARNINGS)),
    usedDespiteWarning: bool(r.usedDespiteWarning),
    retakeCount: int(r.retakeCount),
  };
}

/** 알려진 촬영 자리(CAPTURE_SLOTS)만 옮긴다 — 그 외 키는 애초에 보지 않는다 */
function sanitizeCaptureChecks(
  raw: unknown,
): Partial<Record<CaptureSlot, CaptureQualityCheck>> {
  const r = obj(raw);
  const result: Partial<Record<CaptureSlot, CaptureQualityCheck>> = {};
  for (const slot of CAPTURE_SLOTS) {
    if (r[slot] !== undefined) {
      result[slot] = sanitizeCaptureQualityCheck(r[slot]);
    }
  }
  return result;
}

function sanitizeOcrTelemetry(raw: unknown): OcrTelemetry {
  const r = obj(raw);
  return {
    engine: oneOf(r.engine, OCR_ENGINES),
    model: nullableStr(r.model),
    inputTokens: nullableNum(r.inputTokens),
    outputTokens: nullableNum(r.outputTokens),
    cacheReadTokens: nullableNum(r.cacheReadTokens),
    cacheCreationTokens: nullableNum(r.cacheCreationTokens),
    durationMs: nullableNum(r.durationMs),
  };
}

/**
 * 제한 대조가 된 단계와 까닭. 명판·숫돌 두 단계만 옮겨 담는다.
 *
 * 다른 알려진 필드와 같이, 값이 있는데 목록에 없으면 기록 전체가 무효다. 없는
 * 단계를 채워 넣지 않는다 — 까닭을 남기기 전의 기록에는 이 값 자체가 없다.
 */
function sanitizeAnalysisLimitCauses(raw: unknown): AnalysisLimitCauses {
  const r = obj(raw);
  const result: AnalysisLimitCauses = {};
  setOpt(result, 'grinder', optOneOf(r.grinder, ANALYSIS_LIMIT_CAUSES));
  setOpt(result, 'wheel', optOneOf(r.wheel, ANALYSIS_LIMIT_CAUSES));
  return result;
}

function sanitizeDamageRecheck(raw: unknown): DamageRecheck {
  const r = obj(raw);
  return {
    damageFree: bool(r.damageFree),
    answeredAt: dateStr(r.answeredAt),
  };
}

/**
 * 서버 재분석 판독 하나. 일곱 칸이 **모두 있어야** 한다 — 다시 읽지 않은 단계와
 * 일어나지 않은 일은 null로 적혀 있다(types.ts의 ReanalysisRecord).
 *
 * 칸이 빠진 것을 null로 읽어 주지 않는다. 받아들인 시각이 잘려 나간 판독이
 * 「받아들이지 않음」으로, 손상 답이 잘려 나간 판독이 「묻지 않음」으로 읽히게 된다.
 */
function sanitizeReanalysisRecord(raw: unknown): ReanalysisRecord {
  const r = obj(raw);
  return {
    analyzedAt: dateStr(r.analyzedAt),
    grinderOcr:
      r.grinderOcr === null ? null : sanitizeGrinderSpec(r.grinderOcr),
    grinderOcrTelemetry:
      r.grinderOcrTelemetry === null
        ? null
        : sanitizeOcrTelemetry(r.grinderOcrTelemetry),
    wheelOcr: r.wheelOcr === null ? null : sanitizeWheelSpec(r.wheelOcr),
    wheelOcrTelemetry:
      r.wheelOcrTelemetry === null
        ? null
        : sanitizeOcrTelemetry(r.wheelOcrTelemetry),
    acceptedAt: r.acceptedAt === null ? null : dateStr(r.acceptedAt),
    damageRecheck:
      r.damageRecheck === null ? null : sanitizeDamageRecheck(r.damageRecheck),
  };
}

/** 상한은 판독을 쌓는 쪽(lib/record/reanalysis.ts)과 같은 값을 쓴다 */
function sanitizeReanalyses(raw: unknown): ReanalysisRecord[] {
  return arr(raw, MAX_REANALYSES).map(sanitizeReanalysisRecord);
}

// ── 규격이 아닌 값 하나가 이 파일의 기준에 맞는가 ──
//
// 위의 isValidGrinderSpec·isValidWheelSpec과 같은 이유로 내놓는다. draft 복구
// (lib/draft/draftModel.ts)와 새로고침 복원(lib/state/inspection.tsx)이 저장된
// 상태 확인·체크리스트·시험운전 기록·작업 조건·측정값을 아래 함수들로 검사한다.
//
// 그쪽에서 "객체인가"·"값이 boolean인가"로만 보던 때에는, 빈 객체인 시험운전
// 기록이 "시험운전을 마쳤고 이상이 없었다"로 읽혀 저장이 열렸고, 그렇게 저장된
// 기록은 여기서 조용히 빠졌다. 기준은 이 파일 하나에만 둔다.

/** 작업 조건(재료·건식/습식)이 기준에 맞는가 */
export function isValidWorkConditions(raw: unknown): raw is WorkConditions {
  return passes(() => sanitizeWorkConditions(raw));
}

/** 작업자가 답한 그라인더 장비 상태가 기준에 맞는가(다섯 항목 모두 boolean·null) */
export function isValidGrinderCondition(raw: unknown): raw is GrinderCondition {
  return passes(() => sanitizeGrinderCondition(raw));
}

/** 작업자가 답한 숫돌 상태가 기준에 맞는가(기본 다섯 항목 + 종류별 선택 항목) */
export function isValidWheelCondition(raw: unknown): raw is WheelCondition {
  return passes(() => sanitizeWheelCondition(raw));
}

/** 작업 전 체크리스트가 기준에 맞는가 */
export function isValidSafetyChecklist(raw: unknown): raw is SafetyChecklist {
  return passes(() => sanitizeSafetyChecklist(raw));
}

/** 마친 시험운전 기록이 기준에 맞는가(결과·이상 항목·시각 포함) */
export function isValidTrialRun(raw: unknown): raw is TrialRun {
  return passes(() => sanitizeTrialRun(raw));
}

/** 촬영 측정값이 기준에 맞는가 */
export function isValidCaptureQualityMetrics(
  raw: unknown,
): raw is CaptureQualityMetrics {
  return passes(() => sanitizeCaptureQualityMetrics(raw));
}

/** 촬영 자리 하나의 사진 상태 확인 기록이 기준에 맞는가 */
export function isValidCaptureQualityCheck(
  raw: unknown,
): raw is CaptureQualityCheck {
  return passes(() => sanitizeCaptureQualityCheck(raw));
}

/** OCR 측정값이 기준에 맞는가 */
export function isValidOcrTelemetry(raw: unknown): raw is OcrTelemetry {
  return passes(() => sanitizeOcrTelemetry(raw));
}

/**
 * 서버 재분석 판독 목록이 기준에 맞는가(빈 목록 포함). 판독 하나라도 어긋나면
 * 목록 전체가 맞지 않는 것이다 — 일부만 골라 남기면 빠진 판독이 올린 외관 의심의
 * 출처가 사라진 목록을 온전한 것으로 믿게 된다.
 */
export function isValidReanalyses(raw: unknown): raw is ReanalysisRecord[] {
  return passes(() => sanitizeReanalyses(raw));
}

function sanitizeWheelExamFinding(raw: unknown): WheelExamFinding {
  const r = obj(raw);
  return {
    kind: oneOf(r.kind, WHEEL_EXAM_FINDING_KINDS),
    view: oneOf(r.view, WHEEL_EXAM_VIEWS),
    reason: str(r.reason, MAX_LONG_STRING),
    confidence: oneOf(r.confidence, CONFIDENCE),
  };
}

function sanitizeWheelExamPhotoQuality(raw: unknown): WheelExamPhotoQuality {
  const r = obj(raw);
  return {
    view: oneOf(r.view, WHEEL_EXAM_VIEWS),
    issues: arr(r.issues).map((i) => oneOf(i, WHEEL_EXAM_PHOTO_ISSUES)),
    readable: bool(r.readable),
  };
}

function sanitizeWheelExamResult(raw: unknown): WheelExamResult {
  const r = obj(raw);
  return {
    status: oneOf(r.status, WHEEL_EXAM_STATUSES),
    findings: arr(r.findings).map(sanitizeWheelExamFinding),
    photoQuality: arr(r.photoQuality).map(sanitizeWheelExamPhotoQuality),
    model: nullableStr(r.model),
    promptVersion: str(r.promptVersion),
    analyzedAt: dateStr(r.analyzedAt),
  };
}

function sanitizeWheelExamNotRun(raw: unknown): WheelExamNotRun {
  const r = obj(raw);
  return {
    reason: oneOf(r.reason, WHEEL_EXAM_NOT_RUN_REASONS),
    acknowledgedAt: dateStr(r.acknowledgedAt),
  };
}

/**
 * 점검 기록(사진 제외) 하나를 허용된 필드만으로 재구성한다.
 *
 * 알려진 필드가 없으면(옵션 필드) 건너뛰고, 있는데 타입·enum·날짜·길이가
 * 어긋나면 레코드 전체를 무효(null)로 버린다 — 일부만 잘라 담지 않는다.
 * 사진 필드(grinderImage 등)는 어떤 이름으로도 읽지 않으므로 원본에 있어도
 * 결과에 나타나지 않는다.
 */
export function sanitizeInspectionRecord(
  raw: unknown,
): InspectionWithoutPhotos | null {
  try {
    const r = obj(raw);
    const result: InspectionWithoutPhotos = {
      id: int(r.id),
      grinder: sanitizeGrinderSpec(r.grinder),
      wheel: sanitizeWheelSpec(r.wheel),
      result: sanitizeMatchResult(r.result),
      checklist: sanitizeSafetyChecklist(r.checklist),
      createdAt: dateStr(r.createdAt),
    };
    setOpt(
      result,
      'grinderCondition',
      r.grinderCondition === undefined
        ? undefined
        : sanitizeGrinderCondition(r.grinderCondition),
    );
    setOpt(
      result,
      'wheelCondition',
      r.wheelCondition === undefined
        ? undefined
        : sanitizeWheelCondition(r.wheelCondition),
    );
    setOpt(
      result,
      'trialRun',
      r.trialRun === undefined ? undefined : sanitizeTrialRun(r.trialRun),
    );
    setOpt(
      result,
      'declaredPurpose',
      r.declaredPurpose === undefined
        ? undefined
        : r.declaredPurpose === null
          ? null
          : oneOf(r.declaredPurpose, WORK_PURPOSES),
    );
    setOpt(
      result,
      'workConditions',
      r.workConditions === undefined
        ? undefined
        : sanitizeWorkConditions(r.workConditions),
    );
    setOpt(
      result,
      'accessoryProfile',
      r.accessoryProfile === undefined
        ? undefined
        : sanitizeAccessoryProfileRef(r.accessoryProfile),
    );
    setOpt(
      result,
      'profileConditions',
      r.profileConditions === undefined
        ? undefined
        : arr(r.profileConditions).map(sanitizeProfileCondition),
    );
    setOpt(
      result,
      'grinderOcr',
      r.grinderOcr === undefined
        ? undefined
        : sanitizeGrinderSpec(r.grinderOcr),
    );
    setOpt(
      result,
      'wheelOcr',
      r.wheelOcr === undefined ? undefined : sanitizeWheelSpec(r.wheelOcr),
    );
    setOpt(
      result,
      'grinderCaptureMetrics',
      r.grinderCaptureMetrics === undefined
        ? undefined
        : sanitizeCaptureQualityMetrics(r.grinderCaptureMetrics),
    );
    setOpt(
      result,
      'wheelCaptureMetrics',
      r.wheelCaptureMetrics === undefined
        ? undefined
        : sanitizeCaptureQualityMetrics(r.wheelCaptureMetrics),
    );
    setOpt(
      result,
      'wheelBackCaptureMetrics',
      r.wheelBackCaptureMetrics === undefined
        ? undefined
        : sanitizeCaptureQualityMetrics(r.wheelBackCaptureMetrics),
    );
    setOpt(
      result,
      'wheelEdgeCaptureMetrics',
      r.wheelEdgeCaptureMetrics === undefined
        ? undefined
        : sanitizeCaptureQualityMetrics(r.wheelEdgeCaptureMetrics),
    );
    setOpt(
      result,
      'wheelBoreCaptureMetrics',
      r.wheelBoreCaptureMetrics === undefined
        ? undefined
        : sanitizeCaptureQualityMetrics(r.wheelBoreCaptureMetrics),
    );
    setOpt(
      result,
      'captureChecks',
      r.captureChecks === undefined
        ? undefined
        : sanitizeCaptureChecks(r.captureChecks),
    );
    setOpt(
      result,
      'grinderOcrTelemetry',
      r.grinderOcrTelemetry === undefined
        ? undefined
        : sanitizeOcrTelemetry(r.grinderOcrTelemetry),
    );
    setOpt(
      result,
      'wheelOcrTelemetry',
      r.wheelOcrTelemetry === undefined
        ? undefined
        : sanitizeOcrTelemetry(r.wheelOcrTelemetry),
    );
    setOpt(
      result,
      'wheelExam',
      r.wheelExam === undefined
        ? undefined
        : sanitizeWheelExamResult(r.wheelExam),
    );
    setOpt(
      result,
      'wheelExamNotRun',
      r.wheelExamNotRun === undefined
        ? undefined
        : sanitizeWheelExamNotRun(r.wheelExamNotRun),
    );
    setOpt(result, 'wheelExamAcknowledged', optBool(r.wheelExamAcknowledged));
    setOpt(
      result,
      'elapsedMs',
      r.elapsedMs === undefined ? undefined : int(r.elapsedMs),
    );
    setOpt(
      result,
      'preTrialElapsedMs',
      r.preTrialElapsedMs === undefined ? undefined : int(r.preTrialElapsedMs),
    );
    setOpt(result, 'ruleVersion', optStr(r.ruleVersion));
    setOpt(result, 'analysisMode', optOneOf(r.analysisMode, ANALYSIS_MODES));
    setOpt(
      result,
      'analysisLimitCauses',
      r.analysisLimitCauses === undefined
        ? undefined
        : sanitizeAnalysisLimitCauses(r.analysisLimitCauses),
    );
    // 빈 목록도 그대로 옮긴다. 빈 목록은 「재분석을 하지 않았다」, 칸 없음은 「알 수
    // 없다」다 — 없는 칸에 빈 목록을 만들어 넣지도, 빈 목록을 지우지도 않는다.
    setOpt(
      result,
      'reanalyses',
      r.reanalyses === undefined ? undefined : sanitizeReanalyses(r.reanalyses),
    );
    return result;
  } catch (error) {
    if (error instanceof Invalid) return null;
    throw error;
  }
}
