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
export const RULESET_VERSION = '2026.09.17-r5';

// 변경 이력 (판정이 달라진 것만)
//
// 2026.09.17-r5 — 오프라인 제한 대조(analysisMode: offline_limited) 추가.
//   서버에 닿지 못해 작업자가 값을 직접 입력한 점검은 checkAnalysisMode가
//   판정불가로 막는다 — 확정된 RPM·지름 위반은 그대로 부적합이지만 적합은 내지
//   않는다. online(기본)의 판정은 바뀌지 않았다. 이전 기록은 다시 계산하지 않는다.
// 2026.09.17-r4 — 종류를 특정하지 못한 부속품(other·unknown)도 RPM·지름은
//   대조한다. 이전에는 Profile이 아예 없어 종류 규칙(checkWheelType)이 곧바로
//   판정불가로 막았다 — RPM·지름이 맞는지조차 화면에 보이지 않았다. 그 상태에서
//   other·unknown은 유효기한 정책도 없이 만료 판정을 그대로 받는 결함이 있었다
//   (profile===null이면 checkExpiry의 noPolicy 분기를 타지 않았다). 이제 두
//   종류에 scope: 'limited'인 대체(fallback) Profile을 준다 — RPM·지름은 공통
//   규칙으로 대조하고, checkProfileScope가 그 이상은 판정불가로 막는다. 유효
//   기한·시험운전·사진 AI 확인은 근거가 없어 요구하지 않는다(profiles.ts의
//   OTHER_PROFILE·UNKNOWN_PROFILE). RPM·지름 위반이 있으면 그대로 부적합이다.
// 2026.09.17-r3 — 판정 범위(scope)가 제한적인 Profile은 적합을 내지 않는다.
//   r2에서 추가한 플랩디스크·다이아몬드·와이어 브러시·샌딩 계열 등은 작업·덮개·
//   재료의 근거가 없는데도(profiles.ts의 UNVERIFIED_BASE) RPM·지름만 맞으면
//   적합(COMPATIBLE)이 나올 수 있었다 — r2의 결함이다. 이제 그 Profile들은
//   scope: 'limited'이고, checkProfileScope 규칙이 RPM·지름 위반이 없어도
//   판정불가로 막는다. 화면에는 "RPM과 지름만 대조했습니다. 작업·덮개·장착
//   적합성은 확인되지 않아 적합 판정을 제공하지 않습니다."를 적는다. 위반이
//   있으면 그대로 부적합이다(decideVerdict가 false를 먼저 본다). bonded_abrasive와
//   결합숫돌 세부 형식(scope: 'full')의 판정은 바뀌지 않았다.
// 2026.09.17-r2 — 알려진 그라인더 액세서리 Profile 추가.
//   결합숫돌 세부 형식(Type 1/41·27/28·27/42·6/11), 플랩디스크, 다이아몬드
//   절단날(연속·터보·세그먼트)·컵휠, 줄눈 휠, 와이어 브러시, 파이버·샌딩 디스크,
//   부직포 디스크, 제조사 승인 연마 패드가 판정불가에서 규격 대조 대상이 됐다.
//   회전속도·지름은 공통 규칙을 그대로 쓴다. 근거가 없는 작업·유효기한은 경고
//   (직접 확인)로 남고, 절단 전용 Profile에 연삭 작업을 고르면 판정불가다.
//   일반 결합숫돌(bonded_abrasive)의 판정은 바뀌지 않았다.
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
