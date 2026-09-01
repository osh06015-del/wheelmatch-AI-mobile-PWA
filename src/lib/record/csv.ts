// 점검 기록을 CSV로 뽑는다. 연구용 실측 데이터를 모으기 위한 것이다.
//
// 논문에 필요한 지표가 뭔지부터 정해서 열을 잡았다.
//   · 소요시간   — "30초 안에 점검" 주장을 뒷받침하거나 반박한다
//   · OCR 원본 vs 최종값 — 둘이 다르면 사용자가 고친 것이다. 정정률이 곧 인식률의 뒷면이다
//   · 판정과 걸린 규칙 — 어떤 규칙이 실제로 작동했는지
//   · 신뢰도            — 모델이 스스로 낮다고 한 경우와 실제 오류가 겹치는지
//
// 사진은 넣지 않는다. CSV에 base64를 밀어 넣으면 열리지 않는 파일이 된다.

import type { InspectionRecord } from '@/lib/rules/types';

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
] as const;

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
    ]),
    tick(checklist.guardCover),
    tick(checklist.auxiliaryHandle),
    tick(checklist.wheelDamage),
    tick(checklist.ppe),
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
