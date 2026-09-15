// 검증 빌드와 현장 배포판이 서로 다른 IndexedDB를 쓰는지 확인한다.
//
// 같은 이름을 쓰면 한 기기에서 검증용 시험 기록과 현장 점검 기록이 섞인다.
// 이 값은 빌드 시점(NEXT_PUBLIC_...)에 박히므로, 모듈을 새로 불러와 확인한다.

import { afterEach, describe, expect, it, vi } from 'vitest';

const FLAG = 'NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('IndexedDB 이름 — 검증 빌드와 현장판 분리', () => {
  it('연구 도구가 꺼져 있으면 현장판 이름을 쓴다', async () => {
    vi.stubEnv(FLAG, undefined);
    const { db } = await import('./index');
    expect(db.name).toBe('wheelmatch');
  });

  it('연구 도구가 켜져 있으면 검증판 이름을 쓴다 — 현장 기록과 섞이지 않는다', async () => {
    vi.stubEnv(FLAG, 'true');
    const { db } = await import('./index');
    expect(db.name).toBe('wheelmatch-validation');
  });
});
