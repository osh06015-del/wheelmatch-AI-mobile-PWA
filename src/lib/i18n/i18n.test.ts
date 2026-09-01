// 번역 무결성 테스트.
//
// 번역문이 맞는지는 사람이 봐야 안다. 여기서 지키는 것은 그 앞 단계다 —
// 빠진 문구, 빈 문구, 어긋난 자리표시자. 안전 문구가 빈 칸으로 뜨는 일을 막는다.

import { describe, expect, it } from 'vitest';

import { RULE } from '@/lib/rules/engine';
import { LOCALES, translate, type Locale } from './index';
import { en } from './messages/en';
import { id } from './messages/id';
import { ko, type MessageKey } from './messages/ko';
import { vi } from './messages/vi';
import { zh } from './messages/zh';
import { ACTION_MESSAGE_KEY, RULE_MESSAGE_KEY } from './ruleLabel';

const CATALOG: Record<Locale, Record<string, string>> = { ko, en, vi, id, zh };
const KEYS = Object.keys(ko) as MessageKey[];

/** '...{count}...' 안의 자리표시자 이름들 */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe.each(LOCALES)('$label 번역', ({ code }) => {
  const messages = CATALOG[code];

  it('한국어에 있는 문구가 모두 있다', () => {
    const missing = KEYS.filter((key) => !(key in messages));
    expect(missing).toEqual([]);
  });

  it('빈 문구가 없다', () => {
    const blank = KEYS.filter((key) => messages[key].trim() === '');
    expect(blank).toEqual([]);
  });

  it('한국어에 없는 문구를 넣지 않았다', () => {
    // 남은 키는 어느 화면에도 안 나온다. 고쳤다고 착각하기 쉽다.
    const extra = Object.keys(messages).filter((key) => !(key in ko));
    expect(extra).toEqual([]);
  });

  it('자리표시자가 한국어와 같다', () => {
    // {count}를 빠뜨리면 "안전 항목 개를 모두 확인"처럼 숫자가 사라진다.
    for (const key of KEYS) {
      expect(placeholders(messages[key])).toEqual(placeholders(ko[key]));
    }
  });

  it('한국어를 그대로 베껴 두지 않았다', () => {
    // 번역을 안 한 채 원문을 복사해두면 번역된 것처럼 보인다.
    if (code === 'ko') return;
    const copied = KEYS.filter(
      (key) => messages[key] === ko[key] && /[가-힣]/.test(ko[key]),
    );
    expect(copied).toEqual([]);
  });
});

describe('translate', () => {
  it('고른 언어의 문구를 준다', () => {
    expect(translate('en', 'verdict.incompatible')).toBe('SPECS DO NOT MATCH');
    expect(translate('ko', 'verdict.incompatible')).toBe('부적합');
  });

  it('자리표시자를 채운다', () => {
    expect(translate('ko', 'checklist.incomplete', { count: 4 })).toContain(
      '4개',
    );
  });

  it('판정 문구는 "사용해도 된다"는 뜻이 되지 않게 한다', () => {
    // 이 앱은 규격이 맞는지만 본다. 사용 승인이 아니다.
    expect(translate('en', 'verdict.compatible')).toBe('SPECS MATCH');
    expect(translate('en', 'verdict.compatible').toLowerCase()).not.toContain(
      'safe',
    );
  });
});

describe('규칙 이름 연결', () => {
  it('엔진의 모든 규칙에 문구 키가 있다', () => {
    // 규칙을 새로 추가하고 번역을 잊으면 그 항목만 한국어로 남는다.
    const missing = Object.values(RULE).filter(
      (rule) => !(rule in RULE_MESSAGE_KEY),
    );
    expect(missing).toEqual([]);
  });

  it('연결된 문구 키가 실제로 존재한다', () => {
    for (const key of Object.values(RULE_MESSAGE_KEY)) {
      expect(ko).toHaveProperty(key);
    }
    for (const key of Object.values(ACTION_MESSAGE_KEY)) {
      expect(ko).toHaveProperty(key);
    }
  });
});
