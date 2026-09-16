// 촬영 직후, 서버로 보내기 전의 사진 상태 확인.
//
// 측정은 quality.ts(measureCapture)가, 축소·디코딩은 optimize.ts가 이미 한다.
// 이 파일은 그 측정값을 읽어 **경고할지만** 정한다. 측정을 다시 하지 않는다.
//
// 이 확인이 지키는 경계 세 가지.
//   1. **사진만 본다.** 명판·숫돌이 찍혔는지, 손상됐는지, 써도 되는지는 말하지
//      않는다. 경고 이름도 사진의 상태(흐림·어두움…)로만 짓는다.
//   2. **경계값은 검증되지 않은 잠정값이다.** 실제 판독 실패와 얼마나 겹치는지
//      아직 재지 않았다. 그래서 경고만 하고 작업자가 "그래도 사용"할 수 있다.
//      경고가 없다고 사진이 좋다는 뜻도 아니다.
//   3. **디코딩 실패만 막는다.** 열 수 없는 사진은 서버로 보내도 읽을 수 없고,
//      다각도 확인에서는 빈 사진을 본 것처럼 남게 된다.
//
// 측정이 실패해 값이 null인 항목은 경고하지도, 통과로 치지도 않는다 — 모를 뿐이다.

import { optimizeForUpload, type OptimizeBudget } from './optimize';
import { measureCapture } from './quality';
import type {
  CaptureQualityCheck,
  CaptureQualityMetrics,
  CaptureQualityWarning,
} from '@/lib/rules/types';

/**
 * 경계값 버전. 아래 값을 하나라도 바꾸면 올린다 — 기록에 남은 경고가 어느
 * 기준으로 나왔는지 되짚을 수 있어야 한다.
 */
export const CAPTURE_CHECK_VERSION = '2026.09.16-provisional';

/**
 * 잠정 경계값. **검증되지 않았다.**
 *
 * 출처가 있는 기준이 아니라 휴대폰 사진에서 흔히 쓰이는 어림값이다.
 * docs/validation-plan.md의 실측으로 조정하기 전까지 경고에만 쓴다.
 */
export const CAPTURE_CHECK_THRESHOLDS = {
  /** 원본 짧은 변(px)이 이보다 작으면 해상도 부족. 라벨 글자가 몇 픽셀로 뭉개진다 */
  minShortEdge: 720,
  /** 라플라시안 분산이 이보다 작으면 흐림. 업로드본(축소 후)에서 잰 값이다 */
  minBlurMetric: 60,
  /** 평균 밝기(0~255)가 이보다 낮으면 어두움 */
  minMeanBrightness: 50,
  /** 매우 어두운 픽셀 비율이 이보다 크면 어두움 */
  maxDarkPixelRatio: 0.6,
  /** 평균 밝기가 이보다 높으면 과노출 */
  maxMeanBrightness: 225,
  /** 매우 밝은 픽셀 비율이 이보다 크면 과노출·강한 반사 */
  maxBrightPixelRatio: 0.35,
} as const;

/**
 * 측정값에서 경고를 고른다. 순수 함수다.
 *
 * 순서는 화면에 보이는 순서다. 같은 원인을 두 번 적지 않는다(어두움은 한 번만).
 */
export function assessCapture(
  metrics: CaptureQualityMetrics,
): CaptureQualityWarning[] {
  const limit = CAPTURE_CHECK_THRESHOLDS;
  const warnings: CaptureQualityWarning[] = [];

  if (
    metrics.originalWidth !== null &&
    metrics.originalHeight !== null &&
    Math.min(metrics.originalWidth, metrics.originalHeight) < limit.minShortEdge
  ) {
    warnings.push('low_resolution');
  }

  if (metrics.blurMetric !== null && metrics.blurMetric < limit.minBlurMetric) {
    warnings.push('blur');
  }

  if (
    (metrics.meanBrightness !== null &&
      metrics.meanBrightness < limit.minMeanBrightness) ||
    (metrics.darkPixelRatio !== null &&
      metrics.darkPixelRatio > limit.maxDarkPixelRatio)
  ) {
    warnings.push('too_dark');
  }

  if (
    (metrics.meanBrightness !== null &&
      metrics.meanBrightness > limit.maxMeanBrightness) ||
    (metrics.brightPixelRatio !== null &&
      metrics.brightPixelRatio > limit.maxBrightPixelRatio)
  ) {
    warnings.push('overexposed');
  }

  return warnings;
}

/** 촬영 직후 준비 결과. */
export type PreparedCapture =
  | {
      status: 'ready';
      /** 업로드용으로 줄인 사진 */
      blob: Blob;
      metrics: CaptureQualityMetrics;
      warnings: CaptureQualityWarning[];
    }
  | { status: 'decode_failed' };

/**
 * 사진 한 장을 서버로 보낼 수 있게 준비하고 상태를 확인한다.
 *
 * 축소(optimizeForUpload) → 측정(measureCapture) → 경고(assessCapture) 순서다.
 * 세 단계를 화면마다 따로 이어 붙이면 한 화면만 측정을 빠뜨리는 일이 생긴다.
 * 축소에 걸린 시간도 여기서 잰다 — 화면에서 재면 렌더 순수성 규칙에 걸린다.
 *
 * 축소가 실패하면(열 수 없는 형식) 예외 대신 decode_failed를 돌려준다.
 * 호출자가 그 사진으로 진행하지 못하게 막는다.
 */
export async function prepareCapture(
  source: Blob,
  budget: OptimizeBudget = {},
): Promise<PreparedCapture> {
  const start = performance.now();
  let blob: Blob;
  try {
    blob = await optimizeForUpload(source, budget);
  } catch {
    // optimizeForUpload가 던지는 것은 디코딩 실패뿐이다(canvas 실패는 원본을
    // 돌려준다). 어떤 이유든 열지 못한 사진으로는 진행하지 않는다.
    return { status: 'decode_failed' };
  }
  const optimizeMs = performance.now() - start;
  const metrics = await measureCapture(source, blob, optimizeMs);
  return { status: 'ready', blob, metrics, warnings: assessCapture(metrics) };
}

/**
 * 촬영 자리 하나의 진행 중 상태.
 *
 * 화면이 들고 있다가 저장할 때 CaptureQualityCheck로 바꾼다.
 */
export interface CaptureReview {
  /** 지금 자리에 있는 사진을 열지 못했는가 */
  decodeFailed: boolean;
  warnings: CaptureQualityWarning[];
  /** 경고를 보고 그래도 쓰기로 했는가 */
  usedDespiteWarning: boolean;
  /** 이 자리에 사진을 넣은 횟수(처음 포함) */
  attempts: number;
}

/** 이 사진으로 다음 단계(서버 전송)에 가도 되는가. */
export function captureReviewSettled(review: CaptureReview | null): boolean {
  if (!review || review.decodeFailed) return false;
  return review.warnings.length === 0 || review.usedDespiteWarning;
}

/** 새 사진을 넣었을 때의 상태. 이전 사진의 경고·"그래도 사용"은 이어 쓰지 않는다. */
export function nextCaptureReview(
  previous: CaptureReview | null,
  prepared: PreparedCapture,
): CaptureReview {
  return {
    decodeFailed: prepared.status === 'decode_failed',
    warnings: prepared.status === 'ready' ? prepared.warnings : [],
    usedDespiteWarning: false,
    attempts: (previous?.attempts ?? 0) + 1,
  };
}

/** 기록에 남길 형태. 사진을 한 번도 넣지 않은 자리는 남기지 않는다. */
export function toCaptureQualityCheck(
  review: CaptureReview | null,
): CaptureQualityCheck | null {
  if (!review || review.attempts === 0) return null;
  return {
    checkVersion: CAPTURE_CHECK_VERSION,
    warnings: review.warnings,
    usedDespiteWarning: review.usedDespiteWarning,
    retakeCount: review.attempts - 1,
  };
}
