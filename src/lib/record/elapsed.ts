// 점검 한 건에 걸린 시간.
//
// 제안서가 내건 목표가 "30초 안에 사전점검"이라, 실제로 몇 초가 걸리는지
// 재지 않으면 목표를 달성했는지 말할 수 없다. 실측 데이터로도 쓴다.
//
// 시간은 두 가지로 잰다.
//
//   사전점검 시간   작업 선택 → 시험운전 시작 직전   「30초」 목표는 이것으로 잰다
//   전체 흐름 시간  작업 선택 → 저장                법정 시험운전이 들어 있다
//
// 둘을 합쳐 목표와 견주면 1분·3분 시험운전 때문에 목표를 맞출 수 없고, 그러면
// 시험운전을 줄이는 쪽으로 압박이 생긴다. 그래서 법정 시간은 목표에서 뺀다.
//
// 시작 시점은 메인에서 작업(절단/연삭)을 고른 순간이다. 그 행위가 곧 점검 시작이다.

import type { Translate } from '@/lib/i18n';

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
 * 사전점검 시간 — 작업 선택부터 시험운전을 시작하기 직전까지.
 *
 * 시험운전을 했으면 그 시작 시각에서 끊는다. 시작 시각은 절대 시각으로 저장돼
 * 있어 새로고침을 거쳐도 그대로다. 시험운전이 없으면(부적합·판정불가라 열리지
 * 않았으면) 저장 순간에서 끊는다 — 그때는 사전점검이 곧 점검 전체다.
 *
 * 시험운전 시작 시각을 읽을 수 없으면 null이다. 저장 순간으로 대신 끊으면
 * 시험운전 시간이 사전점검에 섞여 들어간다.
 */
export function preTrialElapsed(
  startedAt: number | null,
  trialRunStartedAt: string | null,
  savedAt: number = Date.now(),
): number | null {
  if (trialRunStartedAt === null) return elapsedSince(startedAt, savedAt);
  const trialStart = Date.parse(trialRunStartedAt);
  if (Number.isNaN(trialStart)) return null;
  return elapsedSince(startedAt, trialStart);
}

/**
 * 화면에 쓸 문구. 초 단위로 내림한다.
 *
 * 1시간이 넘으면 실제 점검 시간이 아니라 화면을 켜둔 채 자리를 뜬 것이다.
 * "127분"처럼 적으면 평균을 왜곡하므로 그대로 쓰지 않는다.
 *
 * 분·초 표기는 언어마다 달라서 문구 조회 함수를 받는다.
 */
export function formatElapsed(ms: number | null, t: Translate): string | null {
  if (ms === null) return null;
  if (!Number.isFinite(ms) || ms < 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds >= 3600) return t('elapsed.overHour');

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return t('elapsed.seconds', { seconds });
  return seconds === 0
    ? t('elapsed.minutes', { minutes })
    : t('elapsed.minutesSeconds', { minutes, seconds });
}
