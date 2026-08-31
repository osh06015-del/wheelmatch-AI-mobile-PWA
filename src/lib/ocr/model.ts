// 사용할 Claude 모델 결정.
//
// 환경변수는 "없음"과 "빈 값"이 다르다. Vercel 대시보드에서 변수를 만들고
// 값을 비워두면 process.env에는 빈 문자열이 들어온다. 이때 `??`로 기본값을
// 주면 빈 문자열이 그대로 통과해 API가 400을 돌려준다.
//
//   model: String should have at least 1 character
//
// 실제 배포에서 이 오류를 만났다. 그래서 빈 값과 공백도 미설정으로 본다.

/** 사양서의 claude-sonnet-4-6 대신 더 최신·저렴한 Sonnet을 기본으로 둔다. */
export const DEFAULT_MODEL = 'claude-sonnet-5';

/**
 * 환경변수 값에서 실제로 쓸 모델 이름을 정한다.
 * 미설정·빈 문자열·공백뿐인 값은 모두 기본값으로 되돌린다.
 */
export function resolveModel(configured: string | undefined): string {
  const trimmed = configured?.trim();
  return trimmed ? trimmed : DEFAULT_MODEL;
}
