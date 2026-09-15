import { describe, expect, it } from 'vitest';

import { elapsedSince, formatElapsed, preTrialElapsed } from './elapsed';
import { translate, type Translate } from '@/lib/i18n';

const ko: Translate = (key, params) => translate('ko', key, params);
const en: Translate = (key, params) => translate('en', key, params);

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
    expect(formatElapsed(28_400, ko)).toBe('28초');
  });

  it('내림한다 — 29.9초를 30초로 올리면 목표 달성처럼 보인다', () => {
    expect(formatElapsed(29_900, ko)).toBe('29초');
  });

  it('1분이 넘으면 분과 초를 함께 적는다', () => {
    expect(formatElapsed(80_000, ko)).toBe('1분 20초');
  });

  it('초가 딱 떨어지면 분만 적는다', () => {
    expect(formatElapsed(120_000, ko)).toBe('2분');
  });

  it('1시간이 넘으면 자리를 뜬 것으로 보고 뭉뚱그린다', () => {
    expect(formatElapsed(7_200_000, ko)).toBe('1시간 이상');
  });

  it('값이 없거나 이상하면 null', () => {
    expect(formatElapsed(null, ko)).toBeNull();
    expect(formatElapsed(-1, ko)).toBeNull();
    expect(formatElapsed(Number.NaN, ko)).toBeNull();
  });

  it('고른 언어의 단위로 적는다 — 한국어 단위가 섞이지 않는다', () => {
    expect(formatElapsed(80_000, en)).toBe('1 min 20 s');
    expect(formatElapsed(7_200_000, en)).toBe('over 1 hour');
  });
});

describe('preTrialElapsed — 사전점검 시간', () => {
  const T0 = Date.parse('2026-09-15T09:00:00.000Z');

  it('시험운전을 했으면 시작 직전까지만 잰다 — 법정 시험운전 시간은 빠진다', () => {
    const trialStart = new Date(T0 + 22_000).toISOString();
    expect(preTrialElapsed(T0, trialStart, T0 + 250_000)).toBe(22_000);
  });

  it('시험운전이 열리지 않았으면(부적합·판정불가) 저장 순간에서 끝난다', () => {
    expect(preTrialElapsed(T0, null, T0 + 17_500)).toBe(17_500);
  });

  it('시작 시각을 모르면 재지 않는다', () => {
    expect(preTrialElapsed(null, null, T0)).toBeNull();
    expect(preTrialElapsed(null, new Date(T0).toISOString(), T0)).toBeNull();
  });

  it('시험운전 시작 시각을 읽을 수 없으면 저장 순간으로 대신하지 않는다', () => {
    // 대신 끊으면 시험운전 시간이 사전점검에 섞인다.
    expect(preTrialElapsed(T0, '시각 아님', T0 + 250_000)).toBeNull();
  });

  it('시험운전 시작이 점검 시작보다 앞서면(시계가 뒤로 감) null', () => {
    const before = new Date(T0 - 1_000).toISOString();
    expect(preTrialElapsed(T0, before, T0 + 5_000)).toBeNull();
  });
});
