// 그라인더 명판에서 따라 나오는 것들 — 필요 숫돌 조건, 규격 등급, 여유율.
//
// 제품을 추천하지 않는다. 추천은 제안서가 제외한 '안전 승인'에 다가선다.
// 여기서 하는 것은 명판에 적힌 값에서 곧바로 따라 나오는 조건을 적는 것뿐이다.
//
//   그라인더 11,000rpm   →  숫돌 최고사용회전속도 11,000rpm 이상
//   그라인더 최대 Φ125mm →  숫돌 지름 125mm 이하
//   오늘 작업 연삭        →  연삭용 숫돌
//
// 규칙엔진(engine.ts)의 판정 기준을 그대로 뒤집은 것이라 둘이 어긋날 수 없다.
// 숫돌을 고르기 전에 무엇을 봐야 하는지 알려주는 것이 목적이다.
//
// 여기서는 값만 낸다. 문장은 화면이 고른 언어로 붙인다(src/lib/i18n/format.ts).
// 이 폴더는 번역 모듈을 불러오지 않는다 — 판정 계층의 순수성 경계다.

import type { GrinderSpec, WheelSpec, WorkPurpose } from './types';

/**
 * 숫돌이 만족해야 할 조건 하나.
 *
 * 값을 몰라 조건을 세울 수 없으면 value가 null이다. 조건을 지어내지 않는다.
 */
export type Requirement =
  | { kind: 'purpose'; value: WorkPurpose | null }
  | { kind: 'diameter'; value: number | null }
  | { kind: 'rpm'; value: number | null };

/**
 * 숫돌 지름으로 그라인더 인치 등급을 붙인다.
 *
 * 현장에서는 "4인치", "5인치"로 부르는 일이 많아서 mm만으로는 잘 와닿지 않는다.
 * 사진에서 크기를 재는 것이 아니라 명판에 적힌 값을 옮기는 것뿐이다.
 * 흔히 쓰는 규격만 넣고, 나머지는 억지로 등급을 붙이지 않는다.
 */
const SIZE_CLASS: ReadonlyArray<[diameter: number, inch: string]> = [
  [100, '4'],
  [115, '4.5'],
  [125, '5'],
  [150, '6'],
  [180, '7'],
  [230, '9'],
];

/** 인치 등급의 숫자. 예: 125 → '5'. 흔치 않은 규격이면 null이다. */
export function grinderSizeClass(
  maxWheelDiameter: number | null,
): string | null {
  if (maxWheelDiameter === null) return null;
  const found = SIZE_CLASS.find(([mm]) => mm === maxWheelDiameter);
  return found ? found[1] : null;
}

/**
 * 이 그라인더와 오늘 작업에 맞는 숫돌 조건.
 *
 * 값을 읽지 못한 항목은 조건을 지어내지 않고 null로 남긴다. 규칙엔진과 같은 원칙이다.
 */
export function wheelRequirements(
  grinder: GrinderSpec,
  declaredPurpose: WorkPurpose | null,
): Requirement[] {
  return [
    { kind: 'purpose', value: declaredPurpose },
    { kind: 'diameter', value: grinder.maxWheelDiameter },
    { kind: 'rpm', value: grinder.noLoadRPM },
  ];
}

/**
 * 회전속도 여유율(%).
 *
 *   (숫돌 정격 − 그라인더 속도) / 그라인더 속도 × 100
 *
 * 양수면 그만큼 여유가 있고, 음수면 그만큼 모자라다.
 * 판정은 이미 규칙엔진이 내렸다. 이 값은 "얼마나"를 보여줄 뿐 판정을 바꾸지 않는다.
 */
export function rpmMarginPercent(
  grinderRPM: number | null,
  wheelMaxRPM: number | null,
): number | null {
  if (grinderRPM === null || wheelMaxRPM === null) return null;
  if (grinderRPM <= 0) return null;
  return ((wheelMaxRPM - grinderRPM) / grinderRPM) * 100;
}

/** 지름 여유율(%). 그라인더 허용치 대비 남은 여유. */
export function diameterMarginPercent(
  grinderMaxDiameter: number | null,
  wheelDiameter: number | null,
): number | null {
  if (grinderMaxDiameter === null || wheelDiameter === null) return null;
  if (grinderMaxDiameter <= 0) return null;
  return ((grinderMaxDiameter - wheelDiameter) / grinderMaxDiameter) * 100;
}

/**
 * 여유율을 소수점 한 자리로 반올림한다.
 *
 * 그 이상은 OCR로 읽은 값의 정밀도를 넘어선다. 0%는 규칙상 통과지만 여유가
 * 전혀 없다는 뜻이라 화면이 따로 알린다. -0은 0으로 둔다 — 부호로 문구를 고르는
 * 화면에 "부족 -0%"가 뜨면 안 된다.
 */
export function roundMargin(percent: number | null): number | null {
  if (percent === null) return null;
  const rounded = Math.round(percent * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

/** 결과 화면에 함께 보여줄 여유율(%) 묶음. 계산할 수 없으면 null이다. */
export interface Margins {
  rpm: number | null;
  diameter: number | null;
}

export function margins(grinder: GrinderSpec, wheel: WheelSpec): Margins {
  return {
    rpm: roundMargin(rpmMarginPercent(grinder.noLoadRPM, wheel.maxRPM)),
    diameter: roundMargin(
      diameterMarginPercent(grinder.maxWheelDiameter, wheel.diameter),
    ),
  };
}
