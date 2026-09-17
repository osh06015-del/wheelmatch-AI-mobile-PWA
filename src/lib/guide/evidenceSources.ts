// 판정 근거 화면(EvidencePanel)에 쓰는 규칙별 출처·적용 한계·계산식 문구 키.
//
// 새로운 법적 주장을 만들지 않는다. docs/regulatory-sources.md와
// docs/safety-boundaries.md에 이미 적힌 내용을 화면에서 볼 수 있게 요약한
// 것뿐이다. 문서를 고치면 여기 문구도 맞춰 고친다.
//
// 문장은 문구 파일(src/lib/i18n/messages)에 있다. 여기서는 키만 잇는다 —
// notVerifiable.ts·fieldGuide.ts와 같은 방식이다. 규칙 계층(src/lib/rules)에
// 두지 않는 이유도 같다: 이 파일은 판정에 관여하지 않고 안내만 한다.

import { RULE } from '@/lib/rules/engine';
import type { MessageKey } from '@/lib/i18n';

export interface EvidenceSource {
  /** 이 판정이 기대는 근거. 법령 조항, 제조사 안내, 또는 이 앱의 설계 결정 */
  docKey: MessageKey;
  /** 이 근거가 말하지 않는 것. 안전 승인으로 읽히지 않게 반드시 함께 보여준다 */
  limitKey: MessageKey;
  /** 계산식이 있는 규칙만 채운다. 없으면 이 규칙에는 산술적 근거가 없다는 뜻이다 */
  formulaKey?: MessageKey;
}

/** 규칙 이름(RULE의 값) → 근거. 새 규칙을 추가하면 여기도 채운다. */
export const EVIDENCE_SOURCE: Readonly<Record<string, EvidenceSource>> = {
  [RULE.REQUIRED_VALUES]: {
    docKey: 'evidence.doc.requiredValues',
    limitKey: 'evidence.limit.requiredValues',
  },
  [RULE.RPM_SAFETY]: {
    docKey: 'evidence.doc.rpmSafety',
    limitKey: 'evidence.limit.rpmSafety',
    formulaKey: 'evidence.formula.rpmSafety',
  },
  [RULE.DIAMETER_FIT]: {
    docKey: 'evidence.doc.diameterFit',
    limitKey: 'evidence.limit.diameterFit',
    formulaKey: 'evidence.formula.diameterFit',
  },
  [RULE.PURPOSE]: {
    docKey: 'evidence.doc.purpose',
    limitKey: 'evidence.limit.purpose',
  },
  [RULE.WORK_PURPOSE]: {
    docKey: 'evidence.doc.workPurpose',
    limitKey: 'evidence.limit.workPurpose',
  },
  [RULE.WHEEL_TYPE]: {
    docKey: 'evidence.doc.wheelType',
    limitKey: 'evidence.limit.wheelType',
  },
  [RULE.VISIBLE_DAMAGE]: {
    docKey: 'evidence.doc.visibleDamage',
    limitKey: 'evidence.limit.visibleDamage',
  },
  [RULE.UNIT_CONSISTENCY]: {
    docKey: 'evidence.doc.unitConsistency',
    limitKey: 'evidence.limit.unitConsistency',
    formulaKey: 'evidence.formula.unitConsistency',
  },
  [RULE.GUARD]: {
    docKey: 'evidence.doc.guard',
    limitKey: 'evidence.limit.guard',
  },
  [RULE.MOUNTING_SPEC]: {
    docKey: 'evidence.doc.mountingSpec',
    limitKey: 'evidence.limit.mountingSpec',
  },
  [RULE.PERIPHERAL_SPEED]: {
    docKey: 'evidence.doc.peripheralSpeed',
    limitKey: 'evidence.limit.peripheralSpeed',
    formulaKey: 'evidence.formula.peripheralSpeed',
  },
  [RULE.EXPIRY]: {
    docKey: 'evidence.doc.expiry',
    limitKey: 'evidence.limit.expiry',
    formulaKey: 'evidence.formula.expiry',
  },
  [RULE.CONFIDENCE]: {
    docKey: 'evidence.doc.confidence',
    limitKey: 'evidence.limit.confidence',
  },
};
