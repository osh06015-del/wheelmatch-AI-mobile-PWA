// 촬영 직후 사진 상태 확인 테스트.
//
// 경계값은 검증되지 않은 잠정값이다. 여기서 지키는 것은 값의 옳고 그름이
// 아니라 계약이다 — 어떤 측정값에서 어떤 경고가 나오는지, 측정하지 못한 값을
// 통과로도 경고로도 치지 않는지, 디코딩 실패만 진행을 막는지.

import { afterEach, describe, expect, it, vi } from 'vitest';

const { optimizeForUpload, measureCapture } = vi.hoisted(() => ({
  optimizeForUpload: vi.fn(),
  measureCapture: vi.fn(),
}));

vi.mock('./optimize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./optimize')>()),
  optimizeForUpload,
}));
vi.mock('./quality', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./quality')>()),
  measureCapture,
}));

import {
  CAPTURE_CHECK_THRESHOLDS as LIMIT,
  CAPTURE_CHECK_VERSION,
  assessCapture,
  captureReviewSettled,
  nextCaptureReview,
  prepareCapture,
  toCaptureQualityCheck,
  type CaptureReview,
} from './captureCheck';
import { ImageDecodeError } from './optimize';
import { EMPTY_CAPTURE_METRICS } from './quality';
import type { CaptureQualityMetrics } from '@/lib/rules/types';

/** 휴대폰으로 밝은 곳에서 초점 맞춰 찍은 사진의 측정값 */
function metrics(
  overrides: Partial<CaptureQualityMetrics> = {},
): CaptureQualityMetrics {
  return {
    ...EMPTY_CAPTURE_METRICS,
    originalWidth: 4032,
    originalHeight: 3024,
    meanBrightness: 130,
    contrast: 55,
    darkPixelRatio: 0.05,
    brightPixelRatio: 0.05,
    blurMetric: 400,
    ...overrides,
  };
}

afterEach(() => {
  optimizeForUpload.mockReset();
  measureCapture.mockReset();
});

describe('assessCapture — 경고 고르기', () => {
  it('선명하고 밝기가 적당한 사진에는 경고가 없다', () => {
    expect(assessCapture(metrics())).toEqual([]);
  });

  it('짧은 변이 기준보다 작으면 해상도 부족', () => {
    expect(
      assessCapture(
        metrics({
          originalWidth: 1280,
          originalHeight: LIMIT.minShortEdge - 1,
        }),
      ),
    ).toEqual(['low_resolution']);
  });

  it('짧은 변이 기준과 같으면 해상도 경고를 내지 않는다', () => {
    expect(
      assessCapture(
        metrics({ originalWidth: 1280, originalHeight: LIMIT.minShortEdge }),
      ),
    ).toEqual([]);
  });

  it('흐림 수치가 기준보다 낮으면 흐림', () => {
    expect(
      assessCapture(metrics({ blurMetric: LIMIT.minBlurMetric - 0.1 })),
    ).toEqual(['blur']);
    expect(assessCapture(metrics({ blurMetric: LIMIT.minBlurMetric }))).toEqual(
      [],
    );
  });

  it('평균이 어둡거나 어두운 픽셀이 많으면 어두움 — 한 번만 적는다', () => {
    expect(
      assessCapture(
        metrics({
          meanBrightness: LIMIT.minMeanBrightness - 1,
          darkPixelRatio: LIMIT.maxDarkPixelRatio + 0.1,
        }),
      ),
    ).toEqual(['too_dark']);
    expect(
      assessCapture(
        metrics({ darkPixelRatio: LIMIT.maxDarkPixelRatio + 0.01 }),
      ),
    ).toEqual(['too_dark']);
  });

  it('평균이 너무 밝거나 밝은 픽셀이 많으면 과노출·반사', () => {
    expect(
      assessCapture(metrics({ meanBrightness: LIMIT.maxMeanBrightness + 1 })),
    ).toEqual(['overexposed']);
    expect(
      assessCapture(
        metrics({ brightPixelRatio: LIMIT.maxBrightPixelRatio + 0.01 }),
      ),
    ).toEqual(['overexposed']);
  });

  it('여러 문제는 정해진 순서로 모두 적는다', () => {
    expect(
      assessCapture(
        metrics({
          originalWidth: 640,
          originalHeight: 480,
          blurMetric: 1,
          meanBrightness: 10,
        }),
      ),
    ).toEqual(['low_resolution', 'blur', 'too_dark']);
  });

  it('측정하지 못한 값은 경고하지도 통과로 치지도 않는다', () => {
    // 모든 값이 null이면 아무 경고도 없다. 좋은 사진이라는 뜻이 아니라 모른다는 뜻이다.
    expect(assessCapture(EMPTY_CAPTURE_METRICS)).toEqual([]);
    expect(
      assessCapture(metrics({ originalWidth: null, blurMetric: null })),
    ).toEqual([]);
  });

  it('경고 이름은 사진 상태만 말한다 — 숫돌·손상·안전을 말하지 않는다', () => {
    const all = assessCapture(
      metrics({
        originalWidth: 10,
        originalHeight: 10,
        blurMetric: 0,
        meanBrightness: 0,
        brightPixelRatio: 1,
      }),
    );
    for (const warning of all) {
      expect(warning).not.toMatch(/wheel|damage|crack|safe|normal|missing/i);
    }
  });
});

describe('prepareCapture — 촬영 직후 준비', () => {
  it('줄인 사진·측정값·경고를 함께 돌려준다', async () => {
    const source = new Blob(['original'], { type: 'image/jpeg' });
    const upload = new Blob(['upload'], { type: 'image/jpeg' });
    optimizeForUpload.mockResolvedValue(upload);
    measureCapture.mockResolvedValue(metrics({ blurMetric: 1 }));

    const prepared = await prepareCapture(source, { maxEdge: 1280 });

    expect(optimizeForUpload).toHaveBeenCalledWith(source, { maxEdge: 1280 });
    // 측정은 원본과 업로드본을 함께 본다 — 기존 measureCapture를 그대로 쓴다.
    expect(measureCapture).toHaveBeenCalledWith(
      source,
      upload,
      expect.any(Number),
    );
    expect(prepared).toEqual({
      status: 'ready',
      blob: upload,
      metrics: metrics({ blurMetric: 1 }),
      warnings: ['blur'],
    });
  });

  it('열 수 없는 사진은 예외 대신 decode_failed로 알린다', async () => {
    optimizeForUpload.mockRejectedValue(new ImageDecodeError());

    const prepared = await prepareCapture(new Blob(['heic']));

    expect(prepared).toEqual({ status: 'decode_failed' });
    // 열지 못한 사진은 측정하지 않는다.
    expect(measureCapture).not.toHaveBeenCalled();
  });
});

describe('촬영 자리 상태', () => {
  const ready = {
    status: 'ready' as const,
    blob: new Blob(['x']),
    metrics: metrics(),
    warnings: ['blur' as const],
  };

  it('사진을 넣을 때마다 횟수가 늘고, 이전 "그래도 사용"은 이어 쓰지 않는다', () => {
    const first = nextCaptureReview(null, ready);
    expect(first).toEqual({
      decodeFailed: false,
      warnings: ['blur'],
      usedDespiteWarning: false,
      attempts: 1,
    });

    const accepted: CaptureReview = { ...first, usedDespiteWarning: true };
    const second = nextCaptureReview(accepted, ready);
    expect(second.attempts).toBe(2);
    expect(second.usedDespiteWarning).toBe(false);

    const failed = nextCaptureReview(second, { status: 'decode_failed' });
    expect(failed).toEqual({
      decodeFailed: true,
      warnings: [],
      usedDespiteWarning: false,
      attempts: 3,
    });
  });

  it('경고가 없거나 그래도 사용을 골라야 진행한다. 열지 못한 사진은 어떤 경우에도 막는다', () => {
    expect(captureReviewSettled(null)).toBe(false);
    expect(
      captureReviewSettled({ ...nextCaptureReview(null, ready), warnings: [] }),
    ).toBe(true);
    expect(captureReviewSettled(nextCaptureReview(null, ready))).toBe(false);
    expect(
      captureReviewSettled({
        ...nextCaptureReview(null, ready),
        usedDespiteWarning: true,
      }),
    ).toBe(true);
    expect(
      captureReviewSettled({
        decodeFailed: true,
        warnings: [],
        usedDespiteWarning: true,
        attempts: 1,
      }),
    ).toBe(false);
  });

  it('기록에는 기준 버전·경고·그래도 사용·재촬영 횟수를 남긴다', () => {
    expect(
      toCaptureQualityCheck({
        decodeFailed: false,
        warnings: ['too_dark'],
        usedDespiteWarning: true,
        attempts: 3,
      }),
    ).toEqual({
      checkVersion: CAPTURE_CHECK_VERSION,
      warnings: ['too_dark'],
      usedDespiteWarning: true,
      retakeCount: 2,
    });
    // 한 번도 찍지 않은 자리는 기록하지 않는다.
    expect(toCaptureQualityCheck(null)).toBeNull();
  });
});
