// 규칙 세트의 버전과 근거 출처.
//
// 한 곳에서만 관리한다. 화면·기록·CSV가 같은 문자열을 쓰지 않으면 나중에
// "이 판정이 어느 규칙으로 나온 것인가"를 되짚을 수 없다.
//
// 이 표시는 **규칙이 무엇을 근거로 삼았는지**를 보여주는 용도다.
// 법적 인증이나 법령 적합 보증이 아니다. 문구에 그런 뜻을 담지 않는다.

/**
 * 규칙 세트 버전. `YYYY.MM.DD-r개정번호`.
 *
 * 날짜는 규칙이 확정된 날, `-r`은 같은 날 안에서의 개정 차수다.
 * **판정 규칙을 바꾸면 반드시 올린다.** 안 올리면 서로 다른 규칙으로 나온
 * 기록이 같은 버전을 달고 섞인다.
 */
export const RULESET_VERSION = '2026.09.17-r1';

// 변경 이력 (판정이 달라진 것만)
//
// 2026.09.17-r1 — 덮개 조건 규칙(RULE.GUARD) 추가.
//   작업자가 명판 확인 화면에서 "덮개 없음"을 고르거나 덮개 크기를 숫돌 지름보다
//   작게 넣으면 판정불가로 막는다. 이전 버전은 이 입력을 조건 표에만 보여주고
//   판정은 적합으로 낼 수 있었다 — 표와 판정이 모순됐다. 입력하지 않았거나 모름이면
//   판정은 이전과 같다. 이전 버전으로 저장된 기록의 판정은 다시 계산하지 않는다.
// 2026.09.12-r1 — 이 이력을 적기 시작하기 전의 마지막 버전.

/**
 * 규칙이 실제로 기대고 있는 문서들. 확인하지 못한 것은 넣지 않는다.
 *
 * 이름·식별자·적용 범위는 문구 키로 둔다. 법령 이름과 조항도 작업자가 고른
 * 언어로 읽혀야 근거 구실을 한다. 이 폴더는 번역 모듈을 불러오지 않으므로
 * 키 문자열만 두고, 키가 실제로 있는지는 화면(RuleVersionNote)의 타입 검사가
 * 확인한다.
 *
 * 상세와 확인 날짜·URL은 docs/regulatory-sources.md에 있다. 여기에는
 * 화면에 띄울 최소한만 둔다.
 */
export const RULE_SOURCES = [
  {
    label: 'ruleSource.krOsh.label',
    reference: 'ruleSource.krOsh.reference',
    scope: 'ruleSource.krOsh.scope',
  },
  {
    label: 'ruleSource.kosha.label',
    reference: 'ruleSource.kosha.reference',
    scope: 'ruleSource.kosha.scope',
  },
  {
    label: 'ruleSource.osa.label',
    reference: 'ruleSource.osa.reference',
    scope: 'ruleSource.osa.scope',
  },
] as const;

/** 근거 한 건. 세 값 모두 문구 키다. */
export type RuleSource = (typeof RULE_SOURCES)[number];
