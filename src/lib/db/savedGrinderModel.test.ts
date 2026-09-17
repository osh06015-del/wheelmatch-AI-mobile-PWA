import { describe, expect, it } from 'vitest';

import {
  normalizeAlias,
  parseSavedGrinder,
  savedGrinderFieldsDiffer,
  type SavedGrinderFields,
} from './savedGrinderModel';

function fields(
  overrides: Partial<SavedGrinderFields> = {},
): SavedGrinderFields {
  return {
    model: 'GWS 750-125',
    noLoadRPM: '11000',
    maxWheelDiameter: '125',
    spindleThread: 'M14',
    guardType: 'grinding',
    guardSize: '125',
    ...overrides,
  };
}

describe('savedGrinderFieldsDiffer — 저장된 값과 지금 화면 값이 다른지', () => {
  it('모든 필드가 같으면 다르지 않다고 본다', () => {
    expect(savedGrinderFieldsDiffer(fields(), fields())).toBe(false);
  });

  it('필드 하나라도 다르면 다르다고 본다(조용히 덮지 않기 위한 신호)', () => {
    expect(
      savedGrinderFieldsDiffer(fields(), fields({ noLoadRPM: '9000' })),
    ).toBe(true);
    expect(
      savedGrinderFieldsDiffer(fields(), fields({ spindleThread: 'M10' })),
    ).toBe(true);
  });
});

describe('normalizeAlias', () => {
  it('앞뒤 공백을 없앤다', () => {
    expect(normalizeAlias('  1번 그라인더  ')).toBe('1번 그라인더');
  });

  it('공백만 있으면 빈 문자열이 된다', () => {
    expect(normalizeAlias('   ')).toBe('');
  });
});

describe('parseSavedGrinder — 손상·구버전 데이터 방어', () => {
  it('id나 별칭이 없으면 가리킬 수 없는 항목이라 버린다', () => {
    expect(parseSavedGrinder({ alias: '이름만' })).toBeNull();
    expect(parseSavedGrinder({ id: 1 })).toBeNull();
    expect(parseSavedGrinder({ id: 1, alias: '   ' })).toBeNull();
    expect(parseSavedGrinder('not an object')).toBeNull();
    expect(parseSavedGrinder(null)).toBeNull();
  });

  it('알려지지 않은 속성(API 키·원시 응답·__proto__)은 어디서도 결과에 남지 않는다', () => {
    const raw = JSON.parse(
      '{"id":7,"alias":"1호기","apiKey":"sk-ant-secret","rawApiResponse":{"id":"msg_1"},"__proto__":{"polluted":true},"prototype":{"polluted":true}}',
    ) as unknown;
    const result = parseSavedGrinder(raw);
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('apiKey');
    expect(result).not.toHaveProperty('rawApiResponse');
    expect(result).not.toHaveProperty('__proto__');
    expect(result).not.toHaveProperty('prototype');
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it('형태가 어긋난 필드는 기본값으로 되돌리고, 값이 있는 필드는 살린다', () => {
    const result = parseSavedGrinder({
      id: 7,
      alias: '섞인 데이터',
      model: 42, // 문자열이 아님 — 손상
      noLoadRPM: '11000',
      spindleThread: 'not-a-real-spindle',
      guardType: 'grinding',
    });

    expect(result).toEqual({
      id: 7,
      schemaVersion: 1,
      alias: '섞인 데이터',
      savedAt: expect.any(String),
      model: '',
      noLoadRPM: '11000',
      maxWheelDiameter: '',
      spindleThread: 'unknown',
      guardType: 'grinding',
      guardSize: '',
    });
  });
});
