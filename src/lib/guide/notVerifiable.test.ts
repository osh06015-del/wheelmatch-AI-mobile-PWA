import { describe, expect, it } from 'vitest';

import { NOT_VERIFIABLE } from './notVerifiable';

describe('확인할 수 없는 것 목록', () => {
  it('네 가지를 모두 적어 둔다', () => {
    expect(NOT_VERIFIABLE.map((n) => n.title)).toEqual([
      '내부 균열',
      '물리적 손상',
      '올바른 장착',
      '방호덮개 상태',
    ]);
  });

  it('각 항목이 지시문으로 끝난다', () => {
    // "못 봅니다"로 끝나면 작업자가 할 일이 없다. 앱이 못 보는 것마다
    // 사람이 무엇을 해야 하는지 함께 적는다.
    for (const item of NOT_VERIFIABLE) {
      expect(item.detail.length).toBeGreaterThan(20);
      expect(item.detail).toMatch(/세요\.$/);
    }
  });

  it('"안전하다"고 말하지 않는다', () => {
    // 이 목록은 앱이 확인하지 못한 것을 적는 곳이다. 승인 문구가 섞이면 안 된다.
    for (const item of NOT_VERIFIABLE) {
      expect(item.detail).not.toMatch(/안전합니다|이상 없습니다|괜찮습니다/);
    }
  });
});
