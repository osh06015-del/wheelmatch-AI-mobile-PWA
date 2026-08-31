// OCR 텍스트 → 필드 추출 파서.
//
// Tesseract.js가 뱉은 평문에서 규격 값을 뽑아낸다. 외부 의존성 없는 순수 함수라
// 단위 테스트로 전부 검증할 수 있다. Phase 1(Claude API)에서도 원주속도 환산은
// 이 파일의 함수를 그대로 쓴다. 산술은 한 군데에만 둔다.

import type {
  Confidence,
  GrinderSpec,
  WheelPurpose,
  WheelSpec,
} from '@/lib/rules/types';

/** 숫자 안의 천 단위 쉼표와 공백을 제거한다. "12,200" → 12200 */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * 회전속도(rpm)를 읽는다.
 * r/min, rpm, RPM, 회전/분, min⁻¹, min-1 표기를 모두 같은 단위로 본다.
 */
export function parseRPM(text: string): number | null {
  const match = text.match(
    /(\d{1,2}[,\s]?\d{3})\s*(?:r\s*\/\s*min|rpm|RPM|회전\s*\/\s*분|min\s*⁻¹|min\s*-\s*1)/,
  );
  return match ? toNumber(match[1]) : null;
}

/** 원주속도(m/s)를 읽는다. 예: "80m/s", "80 m/sec" */
export function parsePeripheralSpeed(text: string): number | null {
  const match = text.match(/(\d{2,3}(?:\.\d)?)\s*m\s*\/\s*s(?:ec)?\b/i);
  return match ? toNumber(match[1]) : null;
}

/**
 * 원주속도(m/s)와 지름(mm)으로 최고사용회전속도(rpm)를 환산한다.
 *
 *   rpm = (v[m/s] × 60) / (π × d[m])
 *
 * 예: 80m/s, Φ125mm → (80 × 60) / (π × 0.125) ≈ 12223rpm
 *
 * 안전 방향으로 내림한다. 올림하면 실제보다 높은 정격을 주장하게 되어
 * 부적합한 조합을 적합으로 판정할 수 있다.
 */
export function rpmFromPeripheralSpeed(
  metersPerSecond: number | null,
  diameterMm: number | null,
): number | null {
  if (metersPerSecond === null || diameterMm === null) return null;
  if (metersPerSecond <= 0 || diameterMm <= 0) return null;

  const diameterMeters = diameterMm / 1000;
  return Math.floor((metersPerSecond * 60) / (Math.PI * diameterMeters));
}

/**
 * "125 x 1.0 x 22.23" 또는 "Φ125×1.6mm" 같은 치수 표기에서
 * 지름과 두께를 함께 읽는다. 숫돌 라벨의 가장 흔한 형태다.
 */
export function parseDimensions(text: string): {
  diameter: number | null;
  thickness: number | null;
} {
  // D × T × H (지름 × 두께 × 구멍) — 세 값이 모두 있는 경우
  const triple = text.match(
    /(\d{2,3})\s*[×xX*]\s*(\d{1,2}(?:\.\d{1,2})?)\s*[×xX*]\s*(\d{1,2}(?:\.\d{1,2})?)/,
  );
  if (triple) {
    return { diameter: toNumber(triple[1]), thickness: toNumber(triple[2]) };
  }

  // D × T — 두 값만 있는 경우
  const pair = text.match(/(\d{2,3})\s*[×xX*]\s*(\d{1,2}(?:\.\d{1,2})?)/);
  if (pair) {
    return { diameter: toNumber(pair[1]), thickness: toNumber(pair[2]) };
  }

  return { diameter: null, thickness: null };
}

/**
 * 지름(mm)을 읽는다. 치수 표기를 먼저 시도하고, 없으면 "Φ125mm" 형태를 찾는다.
 */
export function parseDiameter(text: string): number | null {
  const fromDimensions = parseDimensions(text).diameter;
  if (fromDimensions !== null) return fromDimensions;

  const match = text.match(/(?:Φ|ø|φ|ϕ|D)?\s*(\d{2,3})\s*(?:mm|㎜)/);
  return match ? toNumber(match[1]) : null;
}

/** 두께(mm)를 읽는다. */
export function parseThickness(text: string): number | null {
  const fromDimensions = parseDimensions(text).thickness;
  if (fromDimensions !== null) return fromDimensions;

  const match = text.match(/[×xX*]\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:mm|㎜)/);
  return match ? toNumber(match[1]) : null;
}

/** 용도 키워드를 찾는다. 어느 쪽도 확실하지 않으면 unknown으로 남긴다. */
export function parsePurpose(text: string): WheelPurpose {
  const lower = text.toLowerCase();
  const isCutting = /절단|컷팅|cutting|cut[-\s]?off|cut[-\s]?disc/.test(lower);
  const isGrinding = /연삭|그라인딩|grinding|depressed\s*center/.test(lower);

  // 둘 다 잡히면 확정하지 못한 것으로 본다. 임의로 하나를 고르지 않는다.
  if (isCutting && isGrinding) return 'unknown';
  if (isCutting) return 'cutting';
  if (isGrinding) return 'grinding';
  return 'unknown';
}

/**
 * 모델명을 읽는다. "GWS 750-125" 처럼 대문자 코드 + 숫자 조합을 찾는다.
 * 제조사명(BOSCH 등) 단독은 모델명으로 보지 않는다.
 */
export function parseModel(text: string): string | null {
  const match = text.match(
    /\b([A-Z][A-Z0-9]{1,}[\s-]?\d{2,4}(?:\s*-\s*\d{1,4})?)\b/,
  );
  if (!match) return null;
  return match[1]
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 읽어낸 값의 개수로 신뢰도를 정한다.
 * OCR 자체가 신뢰도를 주지 않으므로, 핵심 값이 비어 있을수록 낮게 본다.
 */
function confidenceFromFields(
  values: Array<number | string | null>,
): Confidence {
  const found = values.filter((value) => value !== null && value !== '').length;
  if (found === values.length) return 'high';
  if (found === 0) return 'low';
  return 'medium';
}

/** 그라인더 명판 OCR 텍스트 → GrinderSpec */
export function parseGrinderText(text: string): GrinderSpec {
  const model = parseModel(text);
  const noLoadRPM = parseRPM(text);
  const maxWheelDiameter = parseDiameter(text);

  return {
    model,
    noLoadRPM,
    maxWheelDiameter,
    rawText: text,
    confidence: confidenceFromFields([model, noLoadRPM, maxWheelDiameter]),
  };
}

/** 숫돌 라벨 OCR 텍스트 → WheelSpec */
export function parseWheelText(text: string): WheelSpec {
  const { diameter, thickness } = parseDimensions(text);
  const resolvedDiameter = diameter ?? parseDiameter(text);
  const directRPM = parseRPM(text);

  // rpm 표기가 없으면 원주속도에서 환산한다. 환산도 실패하면 null로 남긴다.
  const maxRPM =
    directRPM ??
    rpmFromPeripheralSpeed(parsePeripheralSpeed(text), resolvedDiameter);

  return {
    maxRPM,
    diameter: resolvedDiameter,
    thickness: thickness ?? parseThickness(text),
    purpose: parsePurpose(text),
    rawText: text,
    confidence: confidenceFromFields([maxRPM, resolvedDiameter]),
  };
}
