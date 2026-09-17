// 번역 무결성 테스트.
//
// 번역문이 맞는지는 사람이 봐야 안다. 여기서 지키는 것은 그 앞 단계다 —
// 빠진 문구, 빈 문구, 어긋난 자리표시자. 안전 문구가 빈 칸으로 뜨는 일을 막는다.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

  it('번역문에 한국어가 한 글자도 섞이지 않았다', () => {
    // 문장 하나만 한국어로 남아도, 그 언어를 고른 작업자는 그 자리에서 막힌다.
    // 베낀 것만 막아서는 일부만 번역하고 남긴 문장을 잡지 못한다.
    if (code === 'ko') return;
    const mixed = KEYS.filter((key) => /[가-힣]/.test(messages[key]));
    expect(mixed).toEqual([]);
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

describe('쓰이지 않는 문구', () => {
  /** src 아래 소스를 전부 이어 붙인다 (문구 파일과 테스트는 뺀다). */
  function appSource(dir = 'src'): string {
    let out = '';
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        // E2E 흐름 테스트 도구는 문구 키로 화면을 찾는다. 앱이 쓰는 것으로 세지 않는다.
        if (name !== 'e2e') out += appSource(path);
      } else if (
        /\.tsx?$/.test(name) &&
        !name.includes('.test.') &&
        !path.includes('messages')
      ) {
        out += readFileSync(path, 'utf-8');
      }
    }
    return out;
  }

  it('모든 문구가 화면 어딘가에서 쓰인다', () => {
    // 안 쓰는 키가 남아 있으면 번역이 실제보다 많이 된 것처럼 보인다.
    // 화면을 새로 번역할 때 키를 먼저 만들지 말고, 쓸 때 만든다.
    const source = appSource();
    // JSX 속성(nameKey="…")은 큰따옴표로 쓰인다. 두 모양을 모두 쓰임으로 본다.
    const unused = KEYS.filter(
      (key) => !source.includes(`'${key}'`) && !source.includes(`"${key}"`),
    );
    expect(unused).toEqual([]);
  });
});

describe('비통과 문구', () => {
  it('덮개 어긋남 문구가 어느 언어에서도 통과·적합·안전으로 읽히지 않는다', () => {
    // 덮개 어긋남은 판정불가로 막는 사유다. 번역에서 "맞다"·"안전하다"로
    // 바뀌면 화면의 비통과 판정과 문장이 서로 다른 말을 한다.
    const SUCCESS: Record<Locale, RegExp> = {
      ko: /적합합니다|안전합니다|통과|사용해도 됩니다|맞습니다/,
      en: /\b(safe|ok|okay|pass(ed)?|compatible|approved|specs match)\b/i,
      vi: /an toàn|đạt|được phép sử dụng|phù hợp/i,
      id: /\baman\b|lulus|cocok|boleh digunakan/i,
      zh: /安全|合格|通过|相符|可以使用/,
    };
    const BLOCKING_KEYS = [
      'reason.guard.missing',
      'reason.guard.smallerThanWheel',
      'profile.code.guard.missing',
      'profile.code.guardSize.smallerThanWheel',
      'profile.status.conflict',
      'verdict.undetermined',
      // 판정 범위(scope)가 제한적이라는 사실이 적합·안전으로 읽히면 안 된다.
      'profile.scope.limited',
      'history.filter.scopeLimited',
      // 오프라인 제한 대조는 적합을 낼 수 없는 판정이다.
      'rule.offlineLimited',
      'reason.analysisMode.offlineLimited',
      'result.undetermined.offlineLimited',
      'evidence.limit.offlineLimited',
      'offline.limit',
      'scan.offline.continueHint',
      'scan.offline.notice',
      'scan.localOcr.notice',
    ] as const;

    for (const { code } of LOCALES) {
      for (const key of BLOCKING_KEYS) {
        expect(CATALOG[code][key], `${code} ${key}`).not.toMatch(SUCCESS[code]);
      }
      // 판정불가와 적합이 같은 말로 번역되지 않는다.
      expect(CATALOG[code]['verdict.undetermined']).not.toBe(
        CATALOG[code]['verdict.compatible'],
      );
    }
  });
});
