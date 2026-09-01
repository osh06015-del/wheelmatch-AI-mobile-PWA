// 점검 한 건에 걸린 시간.
//
// 제안서가 내건 목표가 "30초 안에 사전점검"이라, 실제로 몇 초가 걸리는지
// 재지 않으면 목표를 달성했는지 말할 수 없다. 실측 데이터로도 쓴다.
//
// 시작 시점은 메인에서 작업(절단/연삭)을 고른 순간이다. 그 행위가 곧 점검 시작이다.
// 끝 시점은 저장 버튼을 누른 순간이다.

/** 시작 시각(epoch ms)부터 지금까지. 시작 시각을 모르면 null. */
export function elapsedSince(
  startedAt: number | null,
  now: number = Date.now(),
): number | null {
  if (startedAt === null) return null;
  if (!Number.isFinite(startedAt)) return null;
  const elapsed = now - startedAt;
  // 기기 시계가 뒤로 간 경우다. 음수 시간을 기록하느니 없는 편이 낫다.
  if (elapsed < 0) return null;
  return elapsed;
}

/**
 * 화면에 쓸 문구. 초 단위로 내림한다.
 *
 * 1시간이 넘으면 실제 점검 시간이 아니라 화면을 켜둔 채 자리를 뜬 것이다.
 * "127분"처럼 적으면 평균을 왜곡하므로 그대로 쓰지 않는다.
 */
export function formatElapsed(ms: number | null): string | null {
  if (ms === null) return null;
  if (!Number.isFinite(ms) || ms < 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds >= 3600) return '1시간 이상';

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}초`;
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`;
}
