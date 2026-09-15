// 명판에서 따라 나오는 값(규격 요약·숫돌 조건·여유율)을 고른 언어의 문장으로 만든다.
//
// 계산은 규칙 계층(src/lib/rules/requirement.ts)이 하고, 여기서는 말만 붙인다.
// 규칙 계층은 번역 모듈을 불러오지 못하므로(판정 엔진 순수성 경계) 둘을 나눴다.

import { grinderSizeClass, type Requirement } from '@/lib/rules/requirement';
import type { GrinderSpec, WorkPurpose } from '@/lib/rules/types';
import type { Translate } from './index';
import type { MessageKey } from './messages/ko';

const PURPOSE_CONDITION: Readonly<Record<WorkPurpose, MessageKey>> = {
  cutting: 'wheelPurpose.cutting',
  grinding: 'wheelPurpose.grinding',
};

/**
 * rpm에 천 단위 쉼표를 붙인다.
 *
 * 실행 기기의 로케일 설정에 따라 11.000이나 11 000으로 바뀌지 않게 en-US로
 * 고정한다. 숫자 모양이 흔들리면 작업자가 라벨과 대조하기 어렵다.
 */
function rpmText(rpm: number): string {
  return rpm.toLocaleString('en-US');
}

/** 화면 머리에 쓸 그라인더 한 줄 요약. 값이 없는 항목은 빼고 만든다. */
export function formatGrinderSummary(
  grinder: GrinderSpec,
  t: Translate,
): string {
  const parts: string[] = [];
  if (grinder.model) parts.push(grinder.model);

  // 인치 등급을 못 붙여도 지름은 반드시 남긴다. 등급은 거들 뿐이고 지름이 본체다.
  if (grinder.maxWheelDiameter !== null) {
    const inch = grinderSizeClass(grinder.maxWheelDiameter);
    parts.push(
      inch
        ? t('summary.sizeClass', { inch, diameter: grinder.maxWheelDiameter })
        : t('summary.maxDiameter', { diameter: grinder.maxWheelDiameter }),
    );
  }
  if (grinder.noLoadRPM !== null) {
    parts.push(`${rpmText(grinder.noLoadRPM)}rpm`);
  }

  return parts.length > 0 ? parts.join(' · ') : t('summary.unreadable');
}

export interface RequirementText {
  label: string;
  /** 충족해야 할 조건. 값을 몰라 세울 수 없으면 null */
  condition: string | null;
  /** 조건을 세울 수 없는 이유 */
  unknownReason: string;
}

/** 숫돌 조건 한 줄을 고른 언어로 만든다. 값이 없는 조건은 지어내지 않는다. */
export function formatRequirement(
  requirement: Requirement,
  t: Translate,
): RequirementText {
  switch (requirement.kind) {
    case 'purpose':
      return {
        label: t('field.purpose'),
        condition:
          requirement.value === null
            ? null
            : t(PURPOSE_CONDITION[requirement.value]),
        unknownReason: t('requirement.purposeUnknown'),
      };
    case 'diameter':
      return {
        label: t('field.diameter'),
        condition:
          requirement.value === null
            ? null
            : t('requirement.diameterMax', { diameter: requirement.value }),
        unknownReason: t('requirement.diameterUnknown'),
      };
    case 'rpm':
      return {
        label: t('field.maxRPM'),
        condition:
          requirement.value === null
            ? null
            : t('requirement.rpmMin', { rpm: rpmText(requirement.value) }),
        unknownReason: t('requirement.rpmUnknown'),
      };
  }
}

/**
 * 여유율 문구. 부호로 문구를 고른다.
 *
 * 계산할 수 없으면 null이다. 여기서 "여유 없음 (0%)"을 내면 재지도 않은 값을
 * 0%로 단정하게 된다 — 결과 화면은 null이면 여유율 줄을 통째로 감춘다.
 */
export function formatMargin(
  percent: number | null,
  t: Translate,
): string | null {
  if (percent === null) return null;
  if (percent > 0) return t('margin.surplus', { percent });
  if (percent < 0) return t('margin.shortfall', { percent });
  return t('margin.none');
}
