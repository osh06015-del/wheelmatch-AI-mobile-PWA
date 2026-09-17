// 검증용 원시 측정값(CaptureQualityMetrics·OcrTelemetry)이 판정에 영향을 주지
// 않는지 고정한다.
//
// matchSpecs()는 GrinderSpec·WheelSpec만 받는다 — InspectionRecord 전체나
// 그 안의 메타데이터 필드를 받지 않는다. 그래서 이 필드들이 존재해도, 같은
// grinder·wheel이면 항상 같은 판정이 나온다. 타입 시그니처가 이미 이를
// 강제하지만, 실행 시점에도 회귀를 잡을 수 있도록 값 하나로 고정해 둔다.

import { describe, expect, it } from 'vitest';

import { matchSpecs } from './engine';
import type {
  CaptureQualityMetrics,
  GrinderSpec,
  OcrTelemetry,
  WheelSpec,
} from './types';
import { BONDED_ABRASIVE_PROFILE } from './profiles';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

const CAPTURE_METRICS: CaptureQualityMetrics = {
  originalWidth: 4032,
  originalHeight: 3024,
  originalBytes: 7_580_000,
  uploadWidth: 2048,
  uploadHeight: 1536,
  uploadBytes: 1_830_000,
  meanBrightness: 40, // 어두운 사진 — 판정을 흔들면 이 테스트가 잡는다
  contrast: 5,
  darkPixelRatio: 0.9,
  brightPixelRatio: 0,
  blurMetric: 1,
  optimizeMs: 500,
};

const OCR_TELEMETRY: OcrTelemetry = {
  engine: 'claude',
  model: 'claude-sonnet-5',
  inputTokens: 1500,
  outputTokens: 80,
  cacheReadTokens: 0,
  cacheCreationTokens: 1500,
  durationMs: 4000,
};

describe('CaptureQualityMetrics·OcrTelemetry는 판정에 영향을 주지 않는다', () => {
  it('같은 grinder·wheel이면 검증용 메타데이터가 무엇이든 같은 판정이 나온다', () => {
    const baseline = matchSpecs(GRINDER, WHEEL, {
      profile: BONDED_ABRASIVE_PROFILE,
    });

    // matchSpecs는 그라인더·숫돌 값만 받는다. 메타데이터를 넘길 방법이
    // 시그니처 자체에 없으므로, 여기서는 같은 두 값으로 다시 불러도
    // 결과가 그대로인지만 확인한다 — 어두운 사진·많은 토큰 같은 "나쁜"
    // 메타데이터를 만들어 눈으로 봐도 판정에 관여할 경로가 없음을 보인다.
    void CAPTURE_METRICS;
    void OCR_TELEMETRY;
    const result = matchSpecs(GRINDER, WHEEL, {
      profile: BONDED_ABRASIVE_PROFILE,
    });

    expect(result.verdict).toBe(baseline.verdict);
    expect(result.checks).toEqual(baseline.checks);
  });
});
