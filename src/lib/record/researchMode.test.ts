// 연구 도구 포함 여부 테스트.
//
// 현장 배포판에 연구 패널이 섞여 나가는 사고는 화면에서 조용히 일어난다.
// 설정이 없거나 애매한 값이면 반드시 꺼진 쪽으로 떨어져야 한다.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { researchToolsEnabled } from './researchMode';

const FLAG = 'NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS';

describe('researchToolsEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('설정이 없으면 꺼져 있다 — 현장 배포판의 기본값', () => {
    vi.stubEnv(FLAG, undefined);
    expect(researchToolsEnabled()).toBe(false);
  });

  it.each(['', 'false', '0', '1', 'TRUE', 'yes', ' true'])(
    '정확히 true가 아닌 %j 은 켜지 않는다',
    (value) => {
      // 오타나 다른 표기로 켜지면, 끄려던 빌드에서도 켜질 수 있다.
      vi.stubEnv(FLAG, value);
      expect(researchToolsEnabled()).toBe(false);
    },
  );

  it('정확히 true일 때만 켠다 — 검증 빌드', () => {
    vi.stubEnv(FLAG, 'true');
    expect(researchToolsEnabled()).toBe(true);
  });
});
