// 점검 기록을 CSV로 뽑는다. 연구용 실측 데이터를 모으기 위한 것이다.
//
// 논문에 필요한 지표가 뭔지부터 정해서 열을 잡았다.
//   · 소요시간   — 사전점검 시간(preTrialElapsedMs)으로 "30초 사전점검" 주장을 확인한다.
//                  전체 흐름(elapsedMs)은 법정 시험운전을 포함하므로 목표와 견주지 않는다
//   · OCR 원본 vs 최종값 — 둘이 다르면 사용자가 고친 것이다. 정정률이 곧 인식률의 뒷면이다
//   · 판정과 걸린 규칙 — 어떤 규칙이 실제로 작동했는지
//   · 신뢰도            — 모델이 스스로 낮다고 한 경우와 실제 오류가 겹치는지
//
// 사진은 넣지 않는다. CSV에 base64를 밀어 넣으면 열리지 않는 파일이 된다.

import type {
  CaptureSlot,
  InspectionRecord,
  ReanalysisRecord,
} from '@/lib/rules/types';

/** CSV에 적는 촬영 자리 순서. 열 순서와 같다. */
const CAPTURE_SLOTS: readonly CaptureSlot[] = [
  'grinder',
  'wheel',
  'wheelBack',
  'wheelEdge',
  'wheelBore',
];

export const CSV_COLUMNS = [
  'id',
  'createdAt',
  'elapsedMs',
  'declaredPurpose',
  'verdict',
  'failedRules',
  'grinderModel',
  'grinderRPM',
  'grinderMaxDiameter',
  'grinderConfidence',
  'grinderRPM_ocr',
  'grinderMaxDiameter_ocr',
  'grinderEdited',
  'wheelMaxRPM',
  'wheelDiameter',
  'wheelThickness',
  'wheelPurpose',
  'wheelType',
  'visibleDamage',
  'wheelConfidence',
  'wheelMaxRPM_ocr',
  'wheelDiameter_ocr',
  'wheelEdited',
  'checkGuardCover',
  'checkAuxiliaryHandle',
  'checkWheelDamage',
  'checkPPE',
  // 기존 27열의 순서는 유지한다. Gate 도입 전 분석 파일이 밀리지 않도록
  // 작업자 직접 상태 확인은 뒤에만 추가한다.
  'conditionDamageFree',
  'conditionNotDeformed',
  'conditionMountingAreaUndamaged',
  'conditionLabelLegible',
  'conditionExpiryValid',
  // 그라인더 장비 상태는 숫돌 상태 열보다도 뒤에 붙인다. 앞선 열의 위치가
  // 한 칸이라도 밀리면 이미 뽑아둔 분석 파일과 대조할 수 없다.
  'conditionCordAndPlugUndamaged',
  'conditionBodyUndamaged',
  'conditionGuardSecure',
  'conditionAuxiliaryHandleSecure',
  'conditionSpindleAssemblyUndamaged',
  // 시험운전은 규격이 맞는 조합에서만 생긴다. 없는 기록은 빈 칸이다.
  'trialRunWheelReplaced',
  'trialRunRequiredSeconds',
  'trialRunElapsedSeconds',
  'trialRunOutcome',
  'trialRunFindings',
  // 작업 환경 체크는 나중에 붙었다. 앞선 열을 밀지 않도록 맨 뒤에 둔다.
  'checkWorkpieceSecured',
  'checkSurroundingsClear',
  // 어느 규칙으로 나온 판정인지. 기능 도입 전 기록은 빈 칸이다.
  'ruleVersion',
  // 사전점검 시간(시험운전 시작 직전까지). elapsedMs는 시험운전을 포함한 전체다.
  // 기능 도입 전 기록은 빈 칸이다. 앞선 열을 밀지 않도록 맨 뒤에 둔다.
  'preTrialElapsedMs',
  // ── 아래부터는 검증용 원시 측정값이다. 판정·현장 UI에 쓰지 않는다. ──
  // 기능 도입 전 기록은 빈 칸이다. 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  'grinderCaptureOriginalWidth',
  'grinderCaptureOriginalHeight',
  'grinderCaptureOriginalBytes',
  'grinderCaptureUploadWidth',
  'grinderCaptureUploadHeight',
  'grinderCaptureUploadBytes',
  'grinderCaptureBrightness',
  'grinderCaptureContrast',
  'grinderCaptureDarkRatio',
  'grinderCaptureBrightRatio',
  'grinderCaptureBlur',
  'grinderCaptureOptimizeMs',
  'wheelCaptureOriginalWidth',
  'wheelCaptureOriginalHeight',
  'wheelCaptureOriginalBytes',
  'wheelCaptureUploadWidth',
  'wheelCaptureUploadHeight',
  'wheelCaptureUploadBytes',
  'wheelCaptureBrightness',
  'wheelCaptureContrast',
  'wheelCaptureDarkRatio',
  'wheelCaptureBrightRatio',
  'wheelCaptureBlur',
  'wheelCaptureOptimizeMs',
  'grinderOcrEngine',
  'grinderOcrModel',
  'grinderOcrInputTokens',
  'grinderOcrOutputTokens',
  'grinderOcrCacheReadTokens',
  'grinderOcrCacheCreationTokens',
  'grinderOcrDurationMs',
  'wheelOcrEngine',
  'wheelOcrModel',
  'wheelOcrInputTokens',
  'wheelOcrOutputTokens',
  'wheelOcrCacheReadTokens',
  'wheelOcrCacheCreationTokens',
  'wheelOcrDurationMs',
  // 다각도 외관 확인. 이 확인이 있던 시기(2026-10-03에 점검 흐름에서 뺐다)의
  // 기록에만 값이 있고 나머지는 빈 칸이다. 열을 지우면 뒤 열의 자리가 밀려
  // 이전에 내보낸 CSV와 맞지 않으므로 그대로 둔다.
  //
  // status는 suspected / not_observed / unassessable 셋뿐이다. "손상 없음"에
  // 해당하는 값이 없다는 것이 이 열의 요점이다 — not_observed는 찾지 못했다는
  // 뜻이지 없다는 뜻이 아니다(types.ts의 WheelExamStatus 참고).
  'wheelExamStatus',
  'wheelExamFindingCount',
  'wheelExamFindings',
  'wheelExamRetakeViews',
  'wheelExamAcknowledged',
  'wheelExamModel',
  'wheelExamPromptVersion',
  // 확인이 실행되지 않은 이유. 실패를 status로 옮겨 적지 않기 위해 열을 따로
  // 둔다 — network_error / api_error / offline / user_manual_continue.
  // 확인이 돌아간 기록에서는 빈 칸이다.
  'wheelExamNotRunReason',
  // 촬영 직후 사진 상태 경고. 이 기능 도입 전 기록은 빈 칸이다. 앞선 열의
  // 자리를 지키기 위해 맨 뒤에 붙인다.
  //
  // 경계값이 검증되지 않은 잠정값이라 어느 기준으로 낸 경고인지(버전)를 함께
  // 적는다. 경고가 실제 판독 실패와 겹치는지를 이 열들로 잰다. 다각도 사진의
  // 원시 측정값은 열이 너무 많아져 CSV에 넣지 않고 기록에만 남긴다.
  'captureCheckVersion',
  'grinderCaptureWarnings',
  'grinderCaptureUsedDespiteWarning',
  'grinderCaptureRetakeCount',
  'wheelCaptureWarnings',
  'wheelCaptureUsedDespiteWarning',
  'wheelCaptureRetakeCount',
  'wheelBackCaptureWarnings',
  'wheelBackCaptureUsedDespiteWarning',
  'wheelBackCaptureRetakeCount',
  'wheelEdgeCaptureWarnings',
  'wheelEdgeCaptureUsedDespiteWarning',
  'wheelEdgeCaptureRetakeCount',
  'wheelBoreCaptureWarnings',
  'wheelBoreCaptureUsedDespiteWarning',
  'wheelBoreCaptureRetakeCount',
  // 부속품 Profile과 새 입력. 이 기능 도입 전 기록은 빈 칸이다. 앞선 열의
  // 자리를 지키기 위해 맨 뒤에 붙인다. 모르는 값은 unknown으로 적힌다 —
  // 빈 칸(입력 기능 없음)과 unknown(물었지만 모름)을 구분하기 위해서다.
  'workMaterial',
  'workCooling',
  'grinderSpindleThread',
  'grinderGuardType',
  'grinderGuardSize',
  'accessoryProfileType',
  'accessoryProfileVersion',
  'profileConflicts',
  // 종류별 상태 확인 항목(다이아몬드·플랩·컵·브러시·샌딩). 그 종류에서만 묻는다.
  // 묻지 않은 종류와 구기록은 빈 칸이다. 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  'conditionDiamondRimIntact',
  'conditionFlapsIntact',
  'conditionNoDelamination',
  'conditionFlapBackingIntact',
  'conditionThreadAdapterFit',
  'conditionEvenWear',
  'conditionDedicatedGuardFitted',
  'conditionWiresIntact',
  'conditionBackingPadUndamaged',
  // 저장 당시 Profile로 적합까지 낼 수 있었는지(full/limited). 이 기능 도입
  // 전 기록은 빈 칸이다. 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  'accessoryProfileScope',
  // 부속품 이름(선택). other·unknown에서만 작업자가 적는다. 이 기능 도입 전
  // 기록과 묻지 않은 종류는 빈 칸이다. 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  'wheelAccessoryName',
  // 판독 경로(online/offline_limited). 이 기능 도입 전 기록은 빈 칸이다 —
  // online으로 채우지 않는다. 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  // offline_limited는 제한 대조다. 기기가 오프라인이었다는 뜻이 아니다 — 까닭은
  // 맨 뒤의 grinderLimitCause·wheelLimitCause 열에 있다.
  'analysisMode',
  'wheelExpiryReview',
  // 외관 의심(visibleDamage: suspected)의 출처. 공백으로 이은 목록이다 —
  // label_photo / reanalysis / legacy_exam / dropped_ocr / carried.
  // visibleDamage 열만으로는 "이 사진을 읽은 판독이 의심했다"와 "다른 데서 이어받은
  // 의심이다"가 같은 suspected로 적혀, 사진 판독의 의심률을 재면 섞인다.
  // 의심이 아닌 기록과 이 표시 도입 전 기록은 빈 칸이다 — 빈 칸을 label_photo로
  // 읽지 않는다. label_photo여도 그 판독이 기록의 OCR 원본으로 남지 않은 경우가
  // 있다(일부 값만 모름으로 읽은 판독) — 그때는 *_ocr 열이 비어 있다.
  // 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  'visibleDamageSources',
  // 제한 대조가 된 까닭(manual / local_ocr / dropped_ocr / unknown). 단계별로 적는다.
  // analysisMode는 까닭이 달라도 offline_limited 한 값이라, 이 두 열이 없으면
  // 판정불가의 원인을 기록으로 가려낼 수 없다 — 직접 입력과 버린 판독은 다른 열로도
  // 구분되지 않는다(둘 다 OCR 원본이 없다).
  //
  // 빈 칸의 뜻: 그 단계가 제한되지 않았거나, 까닭을 남기기 전(2026-10-04 이전)의
  // 기록이다. 뒤쪽은 analysisMode가 offline_limited인데 두 열이 모두 비어 있는
  // 줄로 알아본다 — 추정해 채우지 않는다. unknown은 제한됐지만 까닭이 남지 않은
  // 단계다. 앞선 열의 자리를 지키기 위해 맨 뒤에 붙인다.
  'grinderLimitCause',
  'wheelLimitCause',
  // 결과 화면의 서버 재분석 판독(InspectionRecord.reanalyses). 앞선 열의 자리를
  // 지키기 위해 맨 뒤에 붙인다.
  //
  // 받아들이지 않은 판독도 적는다. 받아들인 것만 남기면 "작업자 값과 일치한 판독"만
  // 세어져 인식률이 실제보다 좋게 나온다. 기존 *_ocr·*Edited·OCR telemetry 열은
  // 확인 화면에서 작업자가 고치기 전의 원본을 말하므로 재분석 판독을 섞지 않는다.
  //
  // reanalysisCount는 기록에 남은 판독 수다. 재분석을 하지 않은 기록은 0, 이 칸이
  // 생기기 전 기록(그때 재분석을 했는지 알 수 없다)은 빈 칸이다 — 0으로 채우지
  // 않는다. 서버를 부른 횟수와 다를 수 있다: 숫돌을 다시 확정하면 그 숫돌 사진을 본
  // 판독은 빠지고, 실패한 호출은 판독이 없어 남지 않는다.
  // 나머지 열은 **판독마다 한 토큰**이고 받은 순서대로 띄어 적는다.
  //   -     이 판독에 그 단계의 값이 없다 — 그 단계를 다시 읽지 않았거나, 읽었지만
  //         숫돌을 다시 확정해 그 숫돌 사진의 판독을 뺐다. 손상 답 열에서는 답이
  //         없다(묻지 않았거나, 물었지만 답하지 않았다)
  //   null  다시 읽었지만 값을 얻지 못했다(토큰 수 열에서는 그 합을 모른다)
  'reanalysisCount',
  'reanalysisAccepted',
  'reanalysisGrinderRPM_ocr',
  'reanalysisGrinderMaxDiameter_ocr',
  'reanalysisWheelMaxRPM_ocr',
  'reanalysisWheelDiameter_ocr',
  // suspected / none_visible / unknown. none_visible은 「사진에서 보이지 않는다」이지
  // 손상이 없다는 뜻이 아니다(types.ts의 VisibleDamage).
  'reanalysisVisibleDamage',
  // 재분석한 AI의 경고를 본 뒤 다시 받은 손상 항목의 답. 기존 conditionDamageFree
  // 열은 그 경고를 보기 전의 답이다.
  'reanalysisDamageRecheck',
  // 그 판독에서 다시 읽은 단계의 토큰 수 합. 비용은 넣지 않는다(OcrTelemetry 참고).
  'reanalysisInputTokens',
  'reanalysisOutputTokens',
  'reanalysisCacheReadTokens',
  'reanalysisCacheCreationTokens',
] as const;

/** 재분석 열 — 이 판독에 그 단계의 값이 없다(손상 답 열에서는 답이 없다) */
const NOT_IN_READING = '-';
/**
 * 재분석 열 — 다시 읽었지만 값을 얻지 못했다. 빈 토큰으로 두면 띄어 적은 순서가
 * 무너져 어느 판독의 값인지 알 수 없게 된다.
 */
const NO_VALUE = 'null';

/**
 * 한 칸을 CSV 규칙(RFC 4180)에 맞게 감싼다.
 *
 * 판정 사유에 쉼표가 들어 있어 감싸지 않으면 열이 밀린다.
 * 빈 값과 문자열 'null'을 구분해야 하므로, 없는 값은 빈 칸으로 둔다.
 */
function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/** 체크박스는 미확인(null)과 아니오(false)를 구분해서 적는다. */
function tick(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? 'Y' : 'N';
}

/**
 * OCR이 읽은 값과 최종 값이 다른지.
 *
 * OCR 원본이 없는(기능 도입 전) 기록은 판단할 수 없으므로 빈 칸으로 남긴다.
 * '고치지 않았다'로 적으면 정정률이 실제보다 낮게 나온다.
 */
function edited<T extends object>(
  ocr: T | undefined,
  final: T,
  keys: readonly (keyof T)[],
): string {
  if (!ocr) return '';
  return keys.some((key) => ocr[key] !== final[key]) ? 'Y' : 'N';
}

/** CaptureQualityMetrics의 필드 하나. 기록에 없으면(구기록) undefined다. */
function capture<K extends keyof InspectionRecord>(
  record: InspectionRecord,
  key: K,
  field: string,
): number | null | undefined {
  const metrics = record[key] as Record<string, number | null> | undefined;
  return metrics ? metrics[field] : undefined;
}

/** OcrTelemetry의 필드 하나. 기록에 없으면(구기록) undefined다. */
function telemetry<K extends keyof InspectionRecord>(
  record: InspectionRecord,
  key: K,
  field: string,
): string | number | null | undefined {
  const value = record[key] as
    Record<string, string | number | null> | undefined;
  return value ? value[field] : undefined;
}

/**
 * 재분석 판독마다 한 토큰을 내어 받은 순서대로 띄어 적는다.
 *
 * 칸이 없는 기록(undefined)과 재분석을 하지 않은 기록(빈 목록)은 둘 다 빈 칸이 된다.
 * 둘은 reanalysisCount 열에서 갈린다(빈 칸 / 0).
 */
function perReanalysis(
  record: InspectionRecord,
  token: (reading: ReanalysisRecord) => string | number,
): string | undefined {
  return record.reanalyses?.map(token).join(' ');
}

/** 다시 읽은 단계의 값 하나. 읽지 않은 단계와 얻지 못한 값을 가른다 */
function readingValue<T extends object>(
  ocr: T | null,
  key: keyof T,
): string | number {
  if (ocr === null) return NOT_IN_READING;
  const value = ocr[key];
  return typeof value === 'number' || typeof value === 'string'
    ? value
    : NO_VALUE;
}

/**
 * 한 판독에서 다시 읽은 단계의 토큰 수 합.
 *
 * 다시 읽은 단계 가운데 하나라도 그 수를 모르면(메타데이터를 받지 못했거나 값이
 * 비었으면) 합도 모른다. 아는 것만 더해 적으면 실제보다 적은 수가 합으로 읽힌다.
 */
function readingTokens(
  reading: ReanalysisRecord,
  field:
    'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheCreationTokens',
): string | number {
  let sum = 0;
  const steps = [
    [reading.grinderOcr, reading.grinderOcrTelemetry],
    [reading.wheelOcr, reading.wheelOcrTelemetry],
  ] as const;
  for (const [ocr, telemetryOfStep] of steps) {
    if (ocr === null) continue;
    const value = telemetryOfStep?.[field] ?? null;
    if (value === null) return NO_VALUE;
    sum += value;
  }
  return sum;
}

function row(record: InspectionRecord): string {
  const { grinder, wheel, result, checklist } = record;
  const failed = result.checks
    .filter((check) => check.passed === false)
    .map((check) => check.rule)
    .join('; ');

  const values = [
    record.id,
    record.createdAt,
    record.elapsedMs,
    record.declaredPurpose,
    result.verdict,
    failed,
    grinder.model,
    grinder.noLoadRPM,
    grinder.maxWheelDiameter,
    grinder.confidence,
    record.grinderOcr?.noLoadRPM,
    record.grinderOcr?.maxWheelDiameter,
    edited(record.grinderOcr, grinder, [
      'model',
      'noLoadRPM',
      'maxWheelDiameter',
    ]),
    wheel.maxRPM,
    wheel.diameter,
    wheel.thickness,
    wheel.purpose,
    wheel.wheelType,
    wheel.visibleDamage,
    wheel.confidence,
    record.wheelOcr?.maxRPM,
    record.wheelOcr?.diameter,
    edited(record.wheelOcr, wheel, [
      'maxRPM',
      'diameter',
      'thickness',
      'purpose',
      // 종류도 작업자가 고친다. 빼면 AI가 본 종류를 바꾼 기록이 '안 고침'으로 남는다.
      'wheelType',
    ]),
    tick(checklist.guardCover),
    tick(checklist.auxiliaryHandle),
    tick(checklist.wheelDamage),
    tick(checklist.ppe),
    tick(record.wheelCondition?.damageFree),
    tick(record.wheelCondition?.notDeformed),
    tick(record.wheelCondition?.mountingAreaUndamaged),
    tick(record.wheelCondition?.labelLegible),
    tick(record.wheelCondition?.expiryValid),
    tick(record.grinderCondition?.cordAndPlugUndamaged),
    tick(record.grinderCondition?.bodyUndamaged),
    tick(record.grinderCondition?.guardSecure),
    tick(record.grinderCondition?.auxiliaryHandleSecure),
    tick(record.grinderCondition?.spindleAssemblyUndamaged),
    tick(record.trialRun?.wheelReplaced),
    record.trialRun?.requiredSeconds,
    record.trialRun?.elapsedSeconds,
    record.trialRun?.outcome,
    record.trialRun ? record.trialRun.findings.join(' ') : undefined,
    tick(checklist.workpieceSecured),
    tick(checklist.surroundingsClear),
    record.ruleVersion,
    record.preTrialElapsedMs,
    capture(record, 'grinderCaptureMetrics', 'originalWidth'),
    capture(record, 'grinderCaptureMetrics', 'originalHeight'),
    capture(record, 'grinderCaptureMetrics', 'originalBytes'),
    capture(record, 'grinderCaptureMetrics', 'uploadWidth'),
    capture(record, 'grinderCaptureMetrics', 'uploadHeight'),
    capture(record, 'grinderCaptureMetrics', 'uploadBytes'),
    capture(record, 'grinderCaptureMetrics', 'meanBrightness'),
    capture(record, 'grinderCaptureMetrics', 'contrast'),
    capture(record, 'grinderCaptureMetrics', 'darkPixelRatio'),
    capture(record, 'grinderCaptureMetrics', 'brightPixelRatio'),
    capture(record, 'grinderCaptureMetrics', 'blurMetric'),
    capture(record, 'grinderCaptureMetrics', 'optimizeMs'),
    capture(record, 'wheelCaptureMetrics', 'originalWidth'),
    capture(record, 'wheelCaptureMetrics', 'originalHeight'),
    capture(record, 'wheelCaptureMetrics', 'originalBytes'),
    capture(record, 'wheelCaptureMetrics', 'uploadWidth'),
    capture(record, 'wheelCaptureMetrics', 'uploadHeight'),
    capture(record, 'wheelCaptureMetrics', 'uploadBytes'),
    capture(record, 'wheelCaptureMetrics', 'meanBrightness'),
    capture(record, 'wheelCaptureMetrics', 'contrast'),
    capture(record, 'wheelCaptureMetrics', 'darkPixelRatio'),
    capture(record, 'wheelCaptureMetrics', 'brightPixelRatio'),
    capture(record, 'wheelCaptureMetrics', 'blurMetric'),
    capture(record, 'wheelCaptureMetrics', 'optimizeMs'),
    telemetry(record, 'grinderOcrTelemetry', 'engine'),
    telemetry(record, 'grinderOcrTelemetry', 'model'),
    telemetry(record, 'grinderOcrTelemetry', 'inputTokens'),
    telemetry(record, 'grinderOcrTelemetry', 'outputTokens'),
    telemetry(record, 'grinderOcrTelemetry', 'cacheReadTokens'),
    telemetry(record, 'grinderOcrTelemetry', 'cacheCreationTokens'),
    telemetry(record, 'grinderOcrTelemetry', 'durationMs'),
    telemetry(record, 'wheelOcrTelemetry', 'engine'),
    telemetry(record, 'wheelOcrTelemetry', 'model'),
    telemetry(record, 'wheelOcrTelemetry', 'inputTokens'),
    telemetry(record, 'wheelOcrTelemetry', 'outputTokens'),
    telemetry(record, 'wheelOcrTelemetry', 'cacheReadTokens'),
    telemetry(record, 'wheelOcrTelemetry', 'cacheCreationTokens'),
    telemetry(record, 'wheelOcrTelemetry', 'durationMs'),
    record.wheelExam?.status,
    record.wheelExam?.findings.length,
    // 종류:부위 목록. 문장(reason)은 넣지 않는다 — 쉼표·줄바꿈이 섞인 자유
    // 문장이라 열이 밀리고, 분석에 쓰는 것은 어느 부위에서 무엇이 보였는가다.
    record.wheelExam?.findings
      .map((finding) => `${finding.kind}:${finding.view}`)
      .join(' '),
    record.wheelExam?.photoQuality
      .filter((photo) => !photo.readable)
      .map((photo) => photo.view)
      .join(' '),
    tick(record.wheelExamAcknowledged),
    record.wheelExam?.model,
    record.wheelExam?.promptVersion,
    record.wheelExamNotRun?.reason,
    // 버전은 기록된 자리 중 아무 곳에서나 읽는다. 한 점검 안에서는 같다.
    CAPTURE_SLOTS.map(
      (slot) => record.captureChecks?.[slot]?.checkVersion,
    ).find((version) => version !== undefined),
    ...CAPTURE_SLOTS.flatMap((slot) => {
      const check = record.captureChecks?.[slot];
      // 찍지 않은 자리(구기록·요구되지 않은 종류)는 세 칸 모두 빈 칸이다.
      // 경고가 없었던 자리는 경고 칸만 빈 문자열이고 나머지는 N·0으로 채워진다.
      return [
        check?.warnings.join(' '),
        tick(check?.usedDespiteWarning),
        check?.retakeCount,
      ];
    }),
    record.workConditions?.material,
    record.workConditions?.cooling,
    record.grinder.spindleThread,
    record.grinder.guardType,
    record.grinder.guardSize,
    record.accessoryProfile?.type,
    record.accessoryProfile?.version,
    // 어긋남만 코드로 적는다. 조건 표를 저장하지 않은 기록은 빈 칸이다.
    record.profileConditions
      ?.filter((condition) => condition.status === 'conflict')
      .map((condition) => condition.code)
      .join(' '),
    tick(record.wheelCondition?.diamondRimIntact),
    tick(record.wheelCondition?.flapsIntact),
    tick(record.wheelCondition?.noDelamination),
    tick(record.wheelCondition?.flapBackingIntact),
    tick(record.wheelCondition?.threadAdapterFit),
    tick(record.wheelCondition?.evenWear),
    tick(record.wheelCondition?.dedicatedGuardFitted),
    tick(record.wheelCondition?.wiresIntact),
    tick(record.wheelCondition?.backingPadUndamaged),
    record.accessoryProfile?.scope,
    wheel.accessoryName,
    record.analysisMode,
    wheel.expiryReview,
    // 의심일 때만 적는다. 의심이 아닌데 출처가 남은 값(손으로 고친 백업 등)을
    // 그대로 적으면 visibleDamage 열과 어긋나 의심 건수를 세는 쪽이 틀어진다.
    wheel.visibleDamage === 'suspected'
      ? wheel.visibleDamageSources?.join(' ')
      : undefined,
    record.analysisLimitCauses?.grinder,
    record.analysisLimitCauses?.wheel,
    record.reanalyses?.length,
    perReanalysis(record, (reading) =>
      reading.acceptedAt === null ? 'N' : 'Y',
    ),
    perReanalysis(record, (reading) =>
      readingValue(reading.grinderOcr, 'noLoadRPM'),
    ),
    perReanalysis(record, (reading) =>
      readingValue(reading.grinderOcr, 'maxWheelDiameter'),
    ),
    perReanalysis(record, (reading) =>
      readingValue(reading.wheelOcr, 'maxRPM'),
    ),
    perReanalysis(record, (reading) =>
      readingValue(reading.wheelOcr, 'diameter'),
    ),
    perReanalysis(record, (reading) =>
      readingValue(reading.wheelOcr, 'visibleDamage'),
    ),
    perReanalysis(record, (reading) =>
      reading.damageRecheck === null
        ? NOT_IN_READING
        : reading.damageRecheck.damageFree
          ? 'Y'
          : 'N',
    ),
    perReanalysis(record, (reading) => readingTokens(reading, 'inputTokens')),
    perReanalysis(record, (reading) => readingTokens(reading, 'outputTokens')),
    perReanalysis(record, (reading) =>
      readingTokens(reading, 'cacheReadTokens'),
    ),
    perReanalysis(record, (reading) =>
      readingTokens(reading, 'cacheCreationTokens'),
    ),
  ];

  return values.map(cell).join(',');
}

/**
 * CSV 본문.
 *
 * 줄바꿈은 CRLF다. Excel이 LF만 있는 파일을 한 줄로 읽는 경우가 있다.
 * 맨 앞의 BOM은 Excel이 한글을 깨뜨리지 않게 하기 위한 것이다 —
 * 없으면 '적합'이 '?��'로 열린다.
 */
export function toCsv(records: InspectionRecord[]): string {
  const lines = [CSV_COLUMNS.join(','), ...records.map(row)];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** 파일 이름. 같은 날 여러 번 뽑아도 덮어쓰이지 않게 시각을 붙인다. */
export function csvFilename(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `wheelmatch-${stamp}.csv`;
}
