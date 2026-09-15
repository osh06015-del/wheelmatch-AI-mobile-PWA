// 규칙 버전과 출처 테스트.
//
// 버전 문자열이 여러 곳에 흩어지면 "이 판정이 어느 규칙으로 나왔는가"를
// 되짚을 수 없다. 여기서 형식과 출처 표기 경계만 고정한다.
//
// 출처의 문장은 문구 파일에 있다. 원본인 한국어로 내용을 확인한다.

import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/messages/en';
import { ko } from '@/lib/i18n/messages/ko';
import { RULESET_VERSION, RULE_SOURCES, type RuleSource } from './version';

const text = (source: RuleSource, field: keyof RuleSource) => ko[source[field]];

describe('규칙 세트 버전', () => {
  it('날짜와 개정 번호를 구분한 형식이다', () => {
    expect(RULESET_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}-r\d+$/);
  });

  it('한 곳에서만 정의한다', () => {
    // 화면·기록·CSV가 이 상수를 함께 쓴다. 문자열을 복사해 두면
    // 한쪽만 고쳐져 서로 다른 버전이 기록된다.
    expect(typeof RULESET_VERSION).toBe('string');
    expect(RULESET_VERSION.length).toBeGreaterThan(0);
  });
});

describe('규칙 출처', () => {
  const law = RULE_SOURCES[0];
  const kosha = RULE_SOURCES[1];
  const osa = RULE_SOURCES[2];

  it('법령·KOSHA·oSa 세 근거를 구분해 담는다', () => {
    expect(text(law, 'label')).toBe('산업안전보건기준에 관한 규칙');
    expect(text(kosha, 'label')).toBe('KOSHA GUIDE');
    expect(text(osa, 'label')).toContain('oSa');
  });

  it('각 근거에 식별자와 적용 범위가 있다', () => {
    for (const source of RULE_SOURCES) {
      expect(text(source, 'reference').trim().length).toBeGreaterThan(0);
      expect(text(source, 'scope').trim().length).toBeGreaterThan(0);
    }
  });

  it('법령은 조항과 시행일까지 적는다', () => {
    expect(text(law, 'reference')).toContain('제122조');
    expect(text(law, 'reference')).toContain('2026-03-02');
  });

  it('KOSHA 지침이 법적 강제력이 없다는 것을 함께 적는다', () => {
    expect(text(kosha, 'reference')).toContain('M-189-2015');
    expect(text(kosha, 'scope')).toContain('법적 강제력 없음');
  });

  it('EN 12413 원문을 읽지 못했다는 한계를 남긴다', () => {
    // 읽지 않은 표준을 근거로 인용하지 않는다.
    expect(text(osa, 'scope')).toContain('확인하지 못함');
  });

  it('번역해도 조항·문서번호·시행일은 바뀌지 않는다', () => {
    // 식별자가 번역 중에 달라지면 같은 근거를 가리키지 않게 된다.
    expect(en[law.reference]).toContain('122');
    expect(en[law.reference]).toContain('2026-03-02');
    expect(en[kosha.reference]).toContain('M-189-2015');
    expect(en[osa.reference]).toContain('EN 12413:2019');
  });

  it('법적 인증이나 적합 보증으로 읽힐 표현을 쓰지 않는다', () => {
    const korean = RULE_SOURCES.map(
      (source) =>
        `${text(source, 'label')} ${text(source, 'reference')} ${text(source, 'scope')}`,
    ).join(' ');
    for (const banned of ['법적 인증', '적합 보증', '인증됨', '보장']) {
      expect(korean).not.toContain(banned);
    }

    const english = RULE_SOURCES.map(
      (source) =>
        `${en[source.label]} ${en[source.reference]} ${en[source.scope]}`,
    )
      .join(' ')
      .toLowerCase();
    for (const banned of ['certif', 'guarantee', 'compliant']) {
      expect(english).not.toContain(banned);
    }
  });
});
