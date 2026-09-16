// 촬영 원본·업로드본의 원시 측정값(검증용).
//
// **이 모듈은 재기만 한다.** 경고할지는 captureCheck.ts가 이 값을 읽고 정하며,
// 그 경고도 작업자가 "그래도 사용"으로 넘길 수 있다. 아래 두 경계값은 경고
// 기준이 아니라 "얼마나 어둡다/밝다"를 세는 기준일 뿐이다 — 바꾸면 기록된
// 비율의 뜻이 달라지므로 함부로 바꾸지 않는다.
//
// 측정 자체가 실패해도(브라우저 canvas 지원 차이 등) 점검을 막지 않는다.
// 실패한 항목은 null로 남긴다 — CaptureQualityMetrics 전체가 optional인 이유.

import type { CaptureQualityMetrics } from '@/lib/rules/types';

const DARK_THRESHOLD = 32;
const BRIGHT_THRESHOLD = 223;

export interface PixelBuffer {
  /** RGBA 순서. ImageData.data와 같은 배열 형태 */
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/**
 * 그레이스케일 밝기 통계 + 흐림 수치.
 *
 * 순수 함수다 — 실제 canvas 대신 임의의 픽셀 버퍼로 검증한다.
 * 흐림 수치는 3×3 라플라시안의 분산이다. 값이 낮을수록 흐릿한 사진이라는
 * 신호로 알려져 있지만, 여기서는 그 판단을 하지 않고 수치만 낸다.
 */
export function computePixelStats(buffer: PixelBuffer): {
  meanBrightness: number;
  contrast: number;
  darkPixelRatio: number;
  brightPixelRatio: number;
  blurMetric: number;
} {
  const { data, width, height } = buffer;
  const n = width * height;
  if (n === 0) {
    return {
      meanBrightness: 0,
      contrast: 0,
      darkPixelRatio: 0,
      brightPixelRatio: 0,
      blurMetric: 0,
    };
  }

  const gray = new Float64Array(n);
  let sum = 0;
  let dark = 0;
  let bright = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = luminance;
    sum += luminance;
    if (luminance < DARK_THRESHOLD) dark += 1;
    if (luminance > BRIGHT_THRESHOLD) bright += 1;
  }
  const mean = sum / n;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += (gray[i] - mean) ** 2;
  }
  variance /= n;

  // 3x3 라플라시안(상하좌우 4방향 커널). 가장자리 한 줄은 계산하지 않는다.
  let blurSum = 0;
  let blurSumSq = 0;
  let blurCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - width] -
        gray[idx + width];
      blurSum += laplacian;
      blurSumSq += laplacian * laplacian;
      blurCount += 1;
    }
  }
  const blurMean = blurCount === 0 ? 0 : blurSum / blurCount;
  const blurMetric =
    blurCount === 0 ? 0 : blurSumSq / blurCount - blurMean * blurMean;

  return {
    meanBrightness: mean,
    contrast: Math.sqrt(variance),
    darkPixelRatio: dark / n,
    brightPixelRatio: bright / n,
    blurMetric,
  };
}

/** 측정에 실패한 항목을 모두 null로 채운 값. */
export const EMPTY_CAPTURE_METRICS: CaptureQualityMetrics = {
  originalWidth: null,
  originalHeight: null,
  originalBytes: null,
  uploadWidth: null,
  uploadHeight: null,
  uploadBytes: null,
  meanBrightness: null,
  contrast: null,
  darkPixelRatio: null,
  brightPixelRatio: null,
  blurMetric: null,
  optimizeMs: null,
};

/**
 * 촬영 원본과 업로드본을 측정한다.
 *
 * 호출 시점의 optimizeForUpload() 앞뒤로 잰 시간(optimizeMs)을 그대로 받는다 —
 * 이 함수 안에서 다시 재면 호출자가 실제로 걸린 시간과 어긋난다.
 *
 * 어떤 단계가 실패해도(디코딩 불가, canvas 2D 컨텍스트 없음 등) 예외를
 * 던지지 않는다. 그 항목만 null로 남기고 나머지는 구할 수 있는 만큼 채운다.
 * 이 함수의 결과가 점검 흐름을 막아서는 안 되기 때문이다.
 */
export async function measureCapture(
  original: Blob,
  uploaded: Blob,
  optimizeMs: number,
): Promise<CaptureQualityMetrics> {
  const metrics: CaptureQualityMetrics = {
    ...EMPTY_CAPTURE_METRICS,
    originalBytes: original.size,
    uploadBytes: uploaded.size,
    optimizeMs,
  };

  try {
    const originalBitmap = await createImageBitmap(original);
    metrics.originalWidth = originalBitmap.width;
    metrics.originalHeight = originalBitmap.height;
    originalBitmap.close();
  } catch {
    // 원본 디코딩 실패는 크기만 없는 채로 둔다. optimizeForUpload가 이미
    // 성공했으므로(이 함수는 그 뒤에 불린다) 점검 자체는 막히지 않는다.
  }

  try {
    const uploadBitmap = await createImageBitmap(uploaded);
    metrics.uploadWidth = uploadBitmap.width;
    metrics.uploadHeight = uploadBitmap.height;

    const canvas = document.createElement('canvas');
    canvas.width = uploadBitmap.width;
    canvas.height = uploadBitmap.height;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(uploadBitmap, 0, 0);
      const imageData = context.getImageData(
        0,
        0,
        uploadBitmap.width,
        uploadBitmap.height,
      );
      const stats = computePixelStats(imageData);
      metrics.meanBrightness = stats.meanBrightness;
      metrics.contrast = stats.contrast;
      metrics.darkPixelRatio = stats.darkPixelRatio;
      metrics.brightPixelRatio = stats.brightPixelRatio;
      metrics.blurMetric = stats.blurMetric;
    }
    uploadBitmap.close();
  } catch {
    // 밝기·대비·흐림 항목만 null로 남는다.
  }

  return metrics;
}
