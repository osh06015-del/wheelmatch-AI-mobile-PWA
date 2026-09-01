import { describe, expect, it } from 'vitest';

import { elapsedSince, formatElapsed } from './elapsed';

describe('elapsedSince', () => {
  it('시작 시각부터 지금까지를 잰다', () => {
    expect(elapsedSince(1_000, 32_500)).toBe(31_500);
  });

  it('시작 시각을 모르면 재지 않는다', () => {
    expect(elapsedSince(null)).toBeNull();
  });

  it('기기 시계가 뒤로 가면 음수 대신 null', () => {
    expect(elapsedSince(50_000, 10_000)).toBeNull();
  });
});

describe('formatElapsed', () => {
  it('1분 미만은 초로만 적는다', () => {
    expect(formatElapsed(28_400)).toBe('28초');
  });

  it('내림한다 — 29.9초를 30초로 올리면 목표 달성처럼 보인다', () => {
    expect(formatElapsed(29_900)).toBe('29초');
  });

  it('1분이 넘으면 분과 초를 함께 적는다', () => {
    expect(formatElapsed(80_000)).toBe('1분 20초');
  });

  it('초가 딱 떨어지면 분만 적는다', () => {
    expect(formatElapsed(120_000)).toBe('2분');
  });

  it('1시간이 넘으면 자리를 뜬 것으로 보고 뭉뚱그린다', () => {
    expect(formatElapsed(7_200_000)).toBe('1시간 이상');
  });

  it('값이 없거나 이상하면 null', () => {
    expect(formatElapsed(null)).toBeNull();
    expect(formatElapsed(-1)).toBeNull();
    expect(formatElapsed(Number.NaN)).toBeNull();
  });
});
