// 출시용 평가 지표.
//
// 저장된 점검 기록 + 사람이 적은 정답으로 지표를 낸다.
// **네 가지를 절대 한 숫자로 합치지 않는다.** 성격이 다르고, 합치면
// 가장 중요한 것(false-safe)이 다른 수치에 묻힌다.
//
//   false-safe        실제로는 부적합인데 적합이라고 한 비율  ← 0이어야 한다
//   unreadable        읽지 못해 판정하지 못한 비율
//   field accuracy    필드 단위 인식 정확도
//   unit normalization 단위 환산이 틀린 비율
//
// 판정이 결정론적 규칙이므로 "판정 오류"와 "인식 오류"를 나눠 볼 수 있다.
// 추출이 맞으면 판정은 항상 맞는다. 그래서 재야 할 근본 수치는 추출 정확도다.

import type { InspectionRecord, Verdict } from '@/lib/rules/types';

/** 사람이 라벨을 직접 읽어 적은 정답. 앱을 켜기 전에 적는다. */
export interface GroundTruth {
  /** 대응하는 기록의 id */
  recordId: number;
  grinderRPM: number | null;
  grinderMaxDiameter: number | null;
  wheelMaxRPM: number | null;
  wheelDiameter: number | null;
  /** 사람이 내린 정답 판정 */
  verdict: Verdict;
}

/** 필드 하나의 채점 결과 */
export interface FieldScore {
  field: string;
  /** 정답과 맞은 건수 */
  correct: number;
  /** 정답이 있는데 앱이 null로 남긴 건수 */
  missed: number;
  /** 정답과 다른 값을 낸 건수. 가장 나쁘다 */
  wrong: number;
}

export interface EvaluationReport {
  /** 채점에 쓴 기록 수 (정답이 있는 것만) */
  scored: number;

  /**
   * 실제 부적합인데 앱이 COMPATIBLE로 낸 건수와 비율.
   *
   * **이 값이 0이 아니면 출시하지 않는다.** 다른 지표가 아무리 좋아도 그렇다.
   * 판정불가로 막은 것은 여기 들어가지 않는다 — 그것은 설계된 동작이다.
   */
  falseSafe: { count: number; rate: number; recordIds: number[] };

  /**
   * 판정하지 못한 비율.
   *
   * 실패가 아니라 설계된 동작이다. 다만 너무 높으면 현장에서 앱을 끄게 되므로
   * 따로 보고한다. false-safe와 맞바꾸지 않는다.
   */
  unreadable: { count: number; rate: number };

  /** 필드별 추출 정확도 */
  fieldAccuracy: { fields: FieldScore[]; overall: number };

  /**
   * 단위 정규화 오류.
   *
   * m/s에서 rpm으로 환산한 기록 중 결과가 정답과 다른 비율.
   * 라벨을 제대로 읽고도 환산에서 틀리는 것은 인식 오류와 원인이 다르다.
   * 섞어 보고하면 어느 쪽을 고쳐야 하는지 알 수 없다.
   */
  unitNormalization: { converted: number; wrong: number; rate: number };
}

/** 0으로 나누지 않는다. 표본이 없으면 비율도 없다(0). */
function rate(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

/** 한 필드를 채점한다. 정답이 null인 필드는 채점 대상이 아니다. */
function scoreField(
  field: string,
  pairs: ReadonlyArray<{ actual: number | null; expected: number | null }>,
): FieldScore {
  const score: FieldScore = { field, correct: 0, missed: 0, wrong: 0 };

  for (const { actual, expected } of pairs) {
    // 라벨에 애초에 없던 값은 채점하지 않는다. 못 읽은 것이 아니다.
    if (expected === null) continue;
    if (actual === null) score.missed += 1;
    else if (actual === expected) score.correct += 1;
    else score.wrong += 1;
  }

  return score;
}

/**
 * 기록과 정답을 맞춰 지표를 낸다.
 *
 * 정답이 없는 기록은 조용히 건너뛴다. 채점에 쓴 수를 scored로 함께 낸다 —
 * 몇 건으로 낸 수치인지 모르면 비율은 뜻이 없다.
 *
 * 인식 정확도는 **사용자가 고치기 전의 원본값**(grinderOcr / wheelOcr)으로 잰다.
 * 최종값으로 재면 사람이 고친 것까지 모델이 맞힌 것으로 계산된다.
 */
export function evaluate(
  records: readonly InspectionRecord[],
  truths: readonly GroundTruth[],
): EvaluationReport {
  const truthById = new Map(truths.map((t) => [t.recordId, t]));

  const scored: Array<{ record: InspectionRecord; truth: GroundTruth }> = [];
  for (const record of records) {
    if (record.id === undefined) continue;
    const truth = truthById.get(record.id);
    if (truth) scored.push({ record, truth });
  }

  const total = scored.length;

  // ── false-safe ──────────────────────────────────────
  // 판정불가는 여기 넣지 않는다. 막은 것은 놓친 것이 아니다.
  const falseSafeIds = scored
    .filter(
      ({ record, truth }) =>
        record.result.verdict === 'COMPATIBLE' &&
        truth.verdict === 'INCOMPATIBLE',
    )
    .map(({ record }) => record.id as number);

  // ── unreadable ──────────────────────────────────────
  const undetermined = scored.filter(
    ({ record }) => record.result.verdict === 'UNDETERMINED',
  ).length;

  // ── field accuracy ──────────────────────────────────
  // 원본값이 없는(기능 도입 전) 기록은 필드 채점에서 빠진다.
  const withOcr = scored.filter(
    ({ record }) =>
      record.grinderOcr !== undefined || record.wheelOcr !== undefined,
  );

  const fields: FieldScore[] = [
    scoreField(
      'grinderRPM',
      withOcr.map(({ record, truth }) => ({
        actual: record.grinderOcr?.noLoadRPM ?? null,
        expected: truth.grinderRPM,
      })),
    ),
    scoreField(
      'grinderMaxDiameter',
      withOcr.map(({ record, truth }) => ({
        actual: record.grinderOcr?.maxWheelDiameter ?? null,
        expected: truth.grinderMaxDiameter,
      })),
    ),
    scoreField(
      'wheelMaxRPM',
      withOcr.map(({ record, truth }) => ({
        actual: record.wheelOcr?.maxRPM ?? null,
        expected: truth.wheelMaxRPM,
      })),
    ),
    scoreField(
      'wheelDiameter',
      withOcr.map(({ record, truth }) => ({
        actual: record.wheelOcr?.diameter ?? null,
        expected: truth.wheelDiameter,
      })),
    ),
  ];

  const graded = fields.reduce(
    (sum, f) => sum + f.correct + f.missed + f.wrong,
    0,
  );
  const correct = fields.reduce((sum, f) => sum + f.correct, 0);

  // ── unit normalization ──────────────────────────────
  // m/s에서 환산한 기록만 본다. 라벨에 rpm이 적혀 있던 것은 환산하지 않았다.
  const convertedRecords = scored.filter(
    ({ record }) => record.wheelOcr?.rpmSource === 'converted',
  );
  const convertedWrong = convertedRecords.filter(
    ({ record, truth }) =>
      truth.wheelMaxRPM !== null &&
      record.wheelOcr?.maxRPM !== truth.wheelMaxRPM,
  ).length;

  return {
    scored: total,
    falseSafe: {
      count: falseSafeIds.length,
      rate: rate(falseSafeIds.length, total),
      recordIds: falseSafeIds,
    },
    unreadable: { count: undetermined, rate: rate(undetermined, total) },
    fieldAccuracy: { fields, overall: rate(correct, graded) },
    unitNormalization: {
      converted: convertedRecords.length,
      wrong: convertedWrong,
      rate: rate(convertedWrong, convertedRecords.length),
    },
  };
}

/** 백분율 문자열. 소수점 한 자리까지만 — 20건 표본에 그 이상은 뜻이 없다. */
export function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
