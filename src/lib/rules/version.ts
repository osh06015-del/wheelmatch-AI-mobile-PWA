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
export const RULESET_VERSION = '2026.09.12-r1';

/** 근거 한 건. 확인하지 못한 것은 넣지 않는다. */
export interface RuleSource {
  /** 화면에 보일 이름 */
  label: string;
  /** 조항·문서번호·판 같은 식별자 */
  reference: string;
  /** 이 앱에서 무엇의 근거인지 */
  scope: string;
}

/**
 * 규칙이 실제로 기대고 있는 문서들.
 *
 * 상세와 확인 날짜·URL은 docs/regulatory-sources.md에 있다. 여기에는
 * 화면에 띄울 최소한만 둔다 — 확인하지 못한 것을 적지 않는다.
 */
export const RULE_SOURCES: ReadonlyArray<RuleSource> = [
  {
    label: '산업안전보건기준에 관한 규칙',
    reference: '제122조 (고용노동부령 제450호, 시행 2026-03-02)',
    scope: '최고사용회전속도·측면 사용·덮개·시험운전',
  },
  {
    label: 'KOSHA GUIDE',
    reference: 'M-189-2015 휴대형 연삭기 안전작업에 관한 기술지침',
    scope: '보관·취급 권고 (법적 강제력 없음)',
  },
  {
    label: 'oSa Product marking requirements',
    reference: 'Issue 2, 2020-04 (EN 12413:2019 기준)',
    scope: '유효기한 표시 형식 참고. EN 원문은 확인하지 못함',
  },
];
