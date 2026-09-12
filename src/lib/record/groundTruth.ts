// 정답(Ground Truth) 파일 읽기.
//
// 정답은 앱이 만들 수 없다. 촬영 **전에** 사람이 라벨을 직접 읽어 적은 값이고
// (docs/validation-plan.md), 그래야 앱 결과에 끌려가지 않는다. 그래서 밖에서
// 만든 JSON을 읽어 들이기만 한다.
//
// 형식이 어긋난 줄은 조용히 버리지 않고 몇 줄이 버려졌는지 함께 돌려준다.
// 조용히 버리면 표본 수가 줄어든 줄 모르고 비율만 보게 된다.

import type { GroundTruth } from './metrics';
import type { Verdict } from '@/lib/rules/types';

const VERDICTS: ReadonlyArray<Verdict> = [
  'COMPATIBLE',
  'INCOMPATIBLE',
  'UNDETERMINED',
];

export interface GroundTruthParseResult {
  truths: GroundTruth[];
  /** 형식이 맞지 않아 버린 줄 수 */
  rejected: number;
}

function numberOrNull(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function toTruth(raw: unknown): GroundTruth | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;

  const recordId = row.recordId;
  if (typeof recordId !== 'number' || !Number.isInteger(recordId)) return null;

  const verdict = row.verdict;
  if (typeof verdict !== 'string' || !VERDICTS.includes(verdict as Verdict)) {
    return null;
  }

  const grinderRPM = numberOrNull(row.grinderRPM);
  const grinderMaxDiameter = numberOrNull(row.grinderMaxDiameter);
  const wheelMaxRPM = numberOrNull(row.wheelMaxRPM);
  const wheelDiameter = numberOrNull(row.wheelDiameter);
  if (
    grinderRPM === undefined ||
    grinderMaxDiameter === undefined ||
    wheelMaxRPM === undefined ||
    wheelDiameter === undefined
  ) {
    return null;
  }

  return {
    recordId,
    grinderRPM,
    grinderMaxDiameter,
    wheelMaxRPM,
    wheelDiameter,
    verdict: verdict as Verdict,
  };
}

/**
 * 정답 JSON을 읽는다. 배열이 아니면 전부 버린다.
 *
 * 값을 보정하거나 추정하지 않는다. 정답을 앱이 만들면 정답이 아니게 된다.
 */
export function parseGroundTruth(text: string): GroundTruthParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { truths: [], rejected: 0 };
  }
  if (!Array.isArray(raw)) return { truths: [], rejected: 0 };

  const truths: GroundTruth[] = [];
  let rejected = 0;
  for (const row of raw) {
    const truth = toTruth(row);
    if (truth) truths.push(truth);
    else rejected += 1;
  }
  return { truths, rejected };
}
