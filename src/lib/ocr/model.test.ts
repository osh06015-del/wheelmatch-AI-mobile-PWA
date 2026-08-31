// 모델 이름 결정 테스트.
//
// 배포 환경에서 ANTHROPIC_MODEL이 빈 문자열로 설정돼 있어
// 빈 model이 API로 나가 400이 났다. 그 회귀를 막는 테스트다.

import { describe, expect, it } from 'vitest';

import { DEFAULT_MODEL, resolveModel } from './model';

describe('resolveModel', () => {
  it('설정된 값이 있으면 그대로 쓴다', () => {
    expect(resolveModel('claude-opus-5')).toBe('claude-opus-5');
  });

  it('미설정이면 기본값을 쓴다', () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL);
  });

  it('빈 문자열이면 기본값을 쓴다', () => {
    // Vercel에서 변수를 만들고 값을 비워두면 여기로 온다.
    // ?? 를 쓰면 이 값이 그대로 통과해 API가 400을 돌려준다.
    expect(resolveModel('')).toBe(DEFAULT_MODEL);
  });

  it('공백뿐이어도 기본값을 쓴다', () => {
    expect(resolveModel('   ')).toBe(DEFAULT_MODEL);
    expect(resolveModel('\n')).toBe(DEFAULT_MODEL);
  });

  it('앞뒤 공백은 잘라낸다', () => {
    // 대시보드에 붙여넣을 때 줄바꿈이 딸려오는 일이 흔하다.
    expect(resolveModel('  claude-sonnet-5\n')).toBe('claude-sonnet-5');
  });

  it('기본값은 비어 있지 않다', () => {
    expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
  });
});
