// 검증 빌드와 현장 배포판이 서로 다른 IndexedDB를 쓰는지 확인한다.
//
// 같은 이름을 쓰면 한 기기에서 검증용 시험 기록과 현장 점검 기록이 섞인다.
// 이 값은 빌드 시점(NEXT_PUBLIC_...)에 박히므로, 모듈을 새로 불러와 확인한다.
//
// 이 파일은 db.name(빌드 시점 상수)과 isQuotaExceededError(순수 함수)만
// 다룬다. 실제 IndexedDB 읽기·쓰기(listAllInspectionsWithoutPhotos,
// listInspectionsByIds 등)는 이 환경(happy-dom)에 IndexedDB가 없어 여기서
// 확인할 수 없다 — fake-indexeddb 같은 새 dependency를 추가하지 않았다.
// 그 대신 src/app/history/page.test.tsx(모킹된 db 모듈)와
// src/e2e/*.e2e.test.tsx(harness.tsx의 메모리 db)가 실제 동작을 확인한다.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { isQuotaExceededError } from './index';

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

describe('isQuotaExceededError', () => {
  it('QuotaExceededError 이름을 가진 오류를 저장 공간 부족으로 본다', () => {
    const error = new Error('storage full');
    error.name = 'QuotaExceededError';
    expect(isQuotaExceededError(error)).toBe(true);
  });

  it('DOMException으로 던져진 경우도 이름만으로 판단한다', () => {
    // 실제 브라우저는 QuotaExceededError를 DOMException으로 던진다.
    // happy-dom에도 DOMException이 있어 이름만 맞으면 잡아야 한다.
    const error = new DOMException('storage full', 'QuotaExceededError');
    expect(isQuotaExceededError(error)).toBe(true);
  });

  it('다른 이름의 오류는 저장 공간 부족이 아니다', () => {
    expect(isQuotaExceededError(new Error('network down'))).toBe(false);
    expect(isQuotaExceededError(new TypeError('x'))).toBe(false);
  });

  it('오류가 아닌 값을 던져도 죽지 않는다 — false로 본다', () => {
    expect(isQuotaExceededError('string thrown')).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
    expect(isQuotaExceededError(undefined)).toBe(false);
    expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(false);
  });
});
