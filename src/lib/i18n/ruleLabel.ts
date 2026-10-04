// 규칙 이름·조치 문장을 언어별 문구 키로 잇는다.
//
// 규칙엔진은 한국어 문자열을 그대로 낸다. 엔진에 번역을 넣지 않는 이유:
// 엔진은 판정만 하는 순수 함수로 두어야 하고, 표시 언어는 판정과 아무 상관이 없다.
// 그래서 번역은 화면 쪽에서 규칙 이름을 키로 삼아 붙인다.
//
// 짝이 없는 규칙이 생기면 화면에는 엔진의 한국어 이름이 그대로 나온다.
// 빈 칸이 되지는 않는다. 짝이 빠지지 않았는지는 테스트가 지킨다.

import { RULE, currentRuleName } from '@/lib/rules/engine';
import type { Translate } from './index';
import type { MessageKey } from './messages/ko';

/**
 * 규칙 이름을 고른 언어로 바꾼다.
 *
 * 짝이 없으면 엔진이 낸 한국어 이름을 그대로 쓴다. 빈 칸이 되지 않게 하려는 것이다.
 * 결과 화면과 이력 화면이 같은 이름을 쓰도록 여기 한 곳에 둔다.
 *
 * 이름을 바꾸기 전에 저장된 기록은 옛 이름을 갖고 있다. 지금 이름으로 읽은 뒤
 * 짝을 찾는다 — 안 그러면 그 기록만 옛 한국어 이름이 그대로 나온다.
 */
export function ruleLabelText(rule: string, t: Translate): string {
  const current = currentRuleName(rule);
  // 표에 실제로 있는 이름만 찾는다. 기록에서 읽은 이름은 아무 문자열이나 될 수 있어
  // (백업으로 들여온 기록), 객체에 원래 있는 이름(constructor 등)을 문구 키로 읽으면
  // 라벨이 비고 내보낸 문서를 만들다 멈춘다.
  const key = Object.prototype.hasOwnProperty.call(RULE_MESSAGE_KEY, current)
    ? RULE_MESSAGE_KEY[current]
    : undefined;
  return key ? t(key) : rule;
}

/** 규칙 이름 → 문구 키 */
export const RULE_MESSAGE_KEY: Readonly<Record<string, MessageKey>> = {
  [RULE.REQUIRED_VALUES]: 'rule.requiredValues',
  [RULE.RPM_SAFETY]: 'rule.rpmSafety',
  [RULE.DIAMETER_FIT]: 'rule.diameterFit',
  [RULE.PURPOSE]: 'rule.purpose',
  [RULE.WORK_PURPOSE]: 'rule.workPurpose',
  [RULE.WHEEL_TYPE]: 'rule.wheelType',
  [RULE.VISIBLE_DAMAGE]: 'rule.visibleDamage',
  [RULE.UNIT_CONSISTENCY]: 'rule.unitConsistency',
  [RULE.MOUNTING_SPEC]: 'rule.mountingSpec',
  [RULE.PERIPHERAL_SPEED]: 'rule.peripheralSpeed',
  [RULE.EXPIRY]: 'rule.expiry',
  [RULE.CONFIDENCE]: 'rule.confidence',
  [RULE.GUARD]: 'rule.guard',
  [RULE.PROFILE_SCOPE]: 'rule.profileScope',
  [RULE.OFFLINE_LIMITED]: 'rule.offlineLimited',
};

/**
 * 부적합일 때 보여줄 조치 문장 키.
 *
 * 부적합이 날 수 있는 규칙에만 있다. 나머지는 'action.generic'으로 받는다.
 * 조치 문장을 AI가 만들지 않는 것과 같은 이유로, 여기 짝도 미리 고정한다.
 */
export const ACTION_MESSAGE_KEY: Readonly<Record<string, MessageKey>> = {
  [RULE.RPM_SAFETY]: 'action.rpmSafety',
  [RULE.DIAMETER_FIT]: 'action.diameterFit',
  [RULE.WORK_PURPOSE]: 'action.workPurpose',
  [RULE.EXPIRY]: 'action.expiry',
};
