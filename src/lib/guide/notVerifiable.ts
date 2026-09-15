// 이 앱이 **원리상 확인할 수 없는** 것들.
//
// 사진과 라벨로는 알 수 없는 항목이다. 카메라를 더 좋게 만들거나 모델을 바꿔도
// 알 수 없다. 화면에 그대로 띄워 "확인했다"는 착각을 막는다.
//
// 안전 판정에 넣은 것처럼 표현하지 않는다 — 판정 결과와 섞어 보여주지 말고
// 별도 영역에 둔다. 문구는 고정한다. 매번 다르게 나오면 작업자가 익힐 수 없다.
//
// hazards.ts와 같은 자리에 둔다. 둘 다 판정이 아니라 사람에게 하는 안내다.
// 규칙 계층(src/lib/rules)에 두지 않는 이유이기도 하다 — 판정에 관여하지 않는다.
//
// 문장은 문구 파일(src/lib/i18n/messages)에 있다. 여기서는 순서만 정한다.

import type { MessageKey } from '@/lib/i18n';

export interface NotVerifiableItem {
  titleKey: MessageKey;
  /** 왜 못 보는지 + 그래서 사람이 무엇을 해야 하는지. 반드시 지시문으로 끝낸다. */
  detailKey: MessageKey;
}

export const NOT_VERIFIABLE: readonly NotVerifiableItem[] = [
  {
    titleKey: 'notVerifiable.internalCrack.title',
    detailKey: 'notVerifiable.internalCrack.detail',
  },
  {
    titleKey: 'notVerifiable.physicalDamage.title',
    detailKey: 'notVerifiable.physicalDamage.detail',
  },
  {
    titleKey: 'notVerifiable.mounting.title',
    detailKey: 'notVerifiable.mounting.detail',
  },
  {
    titleKey: 'notVerifiable.guard.title',
    detailKey: 'notVerifiable.guard.detail',
  },
];
