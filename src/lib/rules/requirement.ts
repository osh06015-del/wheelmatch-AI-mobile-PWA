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

import type { GrinderSpec, WheelSpec, WorkPurpose } from './types';

export interface Requirement {
  label: string;
  /** 충족해야 할 조건. 값을 몰라 조건을 세울 수 없으면 null */
  condition: string | null;
  /** 조건을 세울 수 없는 이유 */
  unknownReason: string;
}

const PURPOSE_LABEL: Record<WorkPurpose, string> = {
  cutting: '절단용',
  grinding: '연삭용',
};

/**
 * 숫돌 지름으로 그라인더 등급을 붙인다.
 *
 * 현장에서는 "4인치", "5인치"로 부르는 일이 많아서 mm만으로는 잘 와닿지 않는다.
 * 사진에서 크기를 재는 것이 아니라 명판에 적힌 값을 옮기는 것뿐이다.
 * 흔히 쓰는 규격만 넣고, 나머지는 억지로 등급을 붙이지 않는다.
 */
const SIZE_CLASS: ReadonlyArray<[diameter: number, label: string]> = [
  [100, '4인치급'],
  [115, '4.5인치급'],
  [125, '5인치급'],
  [150, '6인치급'],
  [180, '7인치급'],
  [230, '9인치급'],
];

export function grinderSizeClass(
  maxWheelDiameter: number | null,
): string | null {
  if (maxWheelDiameter === null) return null;
  const found = SIZE_CLASS.find(([mm]) => mm === maxWheelDiameter);
  return found ? found[1] : null;
}

/** 화면 머리에 쓸 그라인더 한 줄 요약. 값이 없는 항목은 빼고 만든다. */
export function grinderSummary(grinder: GrinderSpec): string {
  const parts: string[] = [];
  if (grinder.model) parts.push(grinder.model);

  const size = grinderSizeClass(grinder.maxWheelDiameter);
  if (grinder.maxWheelDiameter !== null) {
    parts.push(
      size
        ? `${size} (최대 Φ${grinder.maxWheelDiameter}mm)`
        : `최대 Φ${grinder.maxWheelDiameter}mm`,
    );
  }
  if (grinder.noLoadRPM !== null) {
    parts.push(`${grinder.noLoadRPM.toLocaleString('en-US')}rpm`);
  }

  return parts.length > 0 ? parts.join(' · ') : '명판 값을 읽지 못했습니다';
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
    {
      label: '용도',
      condition: declaredPurpose ? PURPOSE_LABEL[declaredPurpose] : null,
      unknownReason: '작업을 고르지 않아 용도를 정할 수 없습니다.',
    },
    {
      label: '지름',
      condition:
        grinder.maxWheelDiameter === null
          ? null
          : `Φ${grinder.maxWheelDiameter}mm 이하`,
      unknownReason: '명판에서 허용 최대 지름을 읽지 못했습니다.',
    },
    {
      label: '최고사용회전속도',
      condition:
        grinder.noLoadRPM === null
          ? null
          : `${grinder.noLoadRPM.toLocaleString('en-US')}rpm 이상`,
      unknownReason: '명판에서 무부하 회전속도를 읽지 못했습니다.',
    },
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
 * 여유율을 화면 문구로 만든다.
 *
 * 소수점 한 자리까지만 쓴다. 그 이상은 OCR로 읽은 값의 정밀도를 넘어선다.
 * 0%는 규칙상 통과지만 여유가 전혀 없다는 뜻이므로 따로 표시한다.
 */
export function formatMargin(percent: number | null): string | null {
  if (percent === null) return null;
  const rounded = Math.round(percent * 10) / 10;
  if (rounded > 0) return `여유 +${rounded}%`;
  if (rounded < 0) return `부족 ${rounded}%`;
  return '여유 없음 (0%)';
}

/** 결과 화면에 함께 보여줄 여유율 묶음. */
export interface Margins {
  rpm: string | null;
  diameter: string | null;
}

export function margins(grinder: GrinderSpec, wheel: WheelSpec): Margins {
  return {
    rpm: formatMargin(rpmMarginPercent(grinder.noLoadRPM, wheel.maxRPM)),
    diameter: formatMargin(
      diameterMarginPercent(grinder.maxWheelDiameter, wheel.diameter),
    ),
  };
}
