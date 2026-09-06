// 검사 결과를 성격별로 나눈다.
//
// 판정을 하지 않는다. 이미 나온 결과를 화면이 읽기 좋게 묶을 뿐이다.
// engine.ts 옆에 두는 이유는 CheckItem의 의미(passed·advisory 조합)를
// 아는 코드가 한 곳에 모여 있어야 하기 때문이다.
//
// 왜 나누는가:
// 항목을 한 줄로 늘어놓으면 ✅와 ⚠가 섞여 "대체로 괜찮구나"로 읽힌다.
// 확인된 것과 확인하지 못한 것은 성격이 전혀 다르다. 섞어 보여주면
// 안 읽은 값이 읽은 값처럼 보인다.

import type { CheckItem } from './types';

export interface GroupedChecks {
  /** 대조해서 맞다고 확인된 것 */
  confirmed: CheckItem[];
  /** 대조해서 어긋난 것. 사용하면 안 되는 이유다 */
  conflicting: CheckItem[];
  /** 읽지 못했거나 믿을 수 없어 판정하지 못한 것 */
  unreadable: CheckItem[];
  /** 이 앱이 확인할 수 없어 사람이 직접 봐야 하는 것 */
  manual: CheckItem[];
}

/**
 * passed와 advisory 조합으로 나눈다.
 *
 *   passed === false            → 불일치 (확인해보니 어긋났다)
 *   passed === true             → 확인됨
 *   passed === null, advisory   → 사용자 확인 (앱이 볼 수 없는 것)
 *   passed === null, 아님       → 판독불가 (읽었어야 하는데 못 읽었다)
 *
 * 마지막 두 줄의 구분이 핵심이다. "확인하지 못했다"와 "애초에 확인할 수 없다"는
 * 사용자가 해야 할 일이 다르다. 앞은 재촬영, 뒤는 직접 점검이다.
 */
export function groupChecks(checks: CheckItem[]): GroupedChecks {
  const grouped: GroupedChecks = {
    confirmed: [],
    conflicting: [],
    unreadable: [],
    manual: [],
  };

  for (const check of checks) {
    if (check.passed === false) {
      grouped.conflicting.push(check);
    } else if (check.passed === true) {
      grouped.confirmed.push(check);
    } else if (check.advisory) {
      grouped.manual.push(check);
    } else {
      grouped.unreadable.push(check);
    }
  }

  return grouped;
}
