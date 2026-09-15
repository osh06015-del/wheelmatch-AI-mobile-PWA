// 라벨 분석 실패의 종류.
//
// 화면은 서버가 보낸 문장을 그대로 띄우지 않는다. 서버 문장은 한 언어로만 쓰여
// 있어서, 작업자가 고른 언어로 무엇이 잘못됐는지 알려줄 수 없다. 그래서 실패를
// 종류로 나눠 넘기고, 문장은 화면이 고른 언어로 붙인다(src/lib/i18n/errors.ts).
//
// extractor.ts와 파일을 나눈 이유: 추출기를 테스트에서 통째로 바꿔 끼워도
// 오류 종류는 그대로 남아야 화면의 오류 경로를 확인할 수 있다.

/** 서버 응답의 code와 같은 이름을 쓴다 (src/app/api/extract/route.ts). */
export type ExtractFailure =
  | 'network' // 서버에 닿지 못했다. 응답이 없다
  | 'server_config' // API 키가 없거나 틀렸다. 작업자가 고칠 수 없다
  | 'bad_request' // 요청 형식이 틀렸다
  | 'image_too_large'
  | 'rate_limited'
  | 'upstream' // 분석 서비스가 오류를 돌려줬다
  | 'unknown';

const FAILURES: ReadonlyArray<ExtractFailure> = [
  'network',
  'server_config',
  'bad_request',
  'image_too_large',
  'rate_limited',
  'upstream',
  'unknown',
];

function isFailure(value: unknown): value is ExtractFailure {
  return FAILURES.some((failure) => failure === value);
}

export class ExtractError extends Error {
  readonly failure: ExtractFailure;
  /** 서버나 분석 서비스가 돌려준 HTTP 상태. 원인을 되짚을 수 있게 화면에도 보인다 */
  readonly status: number | null;

  constructor(failure: ExtractFailure, status: number | null = null) {
    super(
      status === null
        ? `extract failed: ${failure}`
        : `extract failed: ${failure} (${status})`,
    );
    this.name = 'ExtractError';
    this.failure = failure;
    this.status = status;
  }
}

/**
 * 서버 응답에서 실패 종류를 고른다.
 *
 * 서버가 준 code를 먼저 믿는다. code가 없거나 모르는 값이면(이전 버전 서버,
 * Vercel이 코드에 닿기 전에 잘라낸 응답) 상태 코드로 추정한다.
 */
export function failureFromResponse(
  status: number,
  code: unknown,
): ExtractFailure {
  if (isFailure(code)) return code;
  if (status === 429) return 'rate_limited';
  if (status === 413) return 'image_too_large';
  if (status === 400) return 'bad_request';
  if (status === 502 || status === 503 || status === 504) return 'upstream';
  return 'unknown';
}
