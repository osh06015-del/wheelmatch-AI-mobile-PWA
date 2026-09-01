// 규칙 이름·조치 문장을 언어별 문구 키로 잇는다.
//
// 규칙엔진은 한국어 문자열을 그대로 낸다. 엔진에 번역을 넣지 않는 이유:
// 엔진은 판정만 하는 순수 함수로 두어야 하고, 표시 언어는 판정과 아무 상관이 없다.
// 그래서 번역은 화면 쪽에서 규칙 이름을 키로 삼아 붙인다.
//
// 짝이 없는 규칙이 생기면 화면에는 엔진의 한국어 이름이 그대로 나온다.
// 빈 칸이 되지는 않는다. 짝이 빠지지 않았는지는 테스트가 지킨다.

import { RULE } from '@/lib/rules/engine';
import type { MessageKey } from './messages/ko';

/** 규칙 이름 → 문구 키 */
export const RULE_MESSAGE_KEY: Readonly<Record<string, MessageKey>> = {
  [RULE.REQUIRED_VALUES]: 'rule.requiredValues',
  [RULE.RPM_SAFETY]: 'rule.rpmSafety',
  [RULE.DIAMETER_FIT]: 'rule.diameterFit',
  [RULE.PURPOSE]: 'rule.purpose',
  [RULE.WORK_PURPOSE]: 'rule.workPurpose',
  [RULE.WHEEL_TYPE]: 'rule.wheelType',
  [RULE.VISIBLE_DAMAGE]: 'rule.visibleDamage',
  [RULE.PERIPHERAL_SPEED]: 'rule.peripheralSpeed',
  [RULE.CONFIDENCE]: 'rule.confidence',
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
};
