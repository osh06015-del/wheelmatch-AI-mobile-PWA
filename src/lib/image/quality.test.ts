// 촬영 품질 원시 측정값 — 순수 계산만 검증한다.
//
// canvas 재인코딩(measureCapture)은 optimize.ts와 같은 이유로 브라우저 기능이라
// 여기서 검증하지 않는다. computePixelStats()만 픽셀 버퍼로 확인한다.

import { describe, expect, it } from 'vitest';

import {
  computePixelStats,
  EMPTY_CAPTURE_METRICS,
  measureCapture,
} from './quality';

function solid(width: number, height: number, gray: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = gray;
    data[i * 4 + 1] = gray;
    data[i * 4 + 2] = gray;
    data[i * 4 + 3] = 255;
  }
  return data;
}

describe('computePixelStats', () => {
  it('균일한 회색 이미지는 대비도 흐림도 0이다', () => {
    const stats = computePixelStats({
      data: solid(4, 4, 128),
      width: 4,
      height: 4,
    });
    // 0.299/0.587/0.114 가중합은 부동소수 오차가 든다. 128에 가까우면 된다.
    expect(stats.meanBrightness).toBeCloseTo(128, 5);
    expect(stats.contrast).toBe(0);
    expect(stats.blurMetric).toBe(0);
    expect(stats.darkPixelRatio).toBe(0);
    expect(stats.brightPixelRatio).toBe(0);
  });

  it('전부 어두운 이미지는 darkPixelRatio가 1이다', () => {
    const stats = computePixelStats({
      data: solid(4, 4, 0),
      width: 4,
      height: 4,
    });
    expect(stats.darkPixelRatio).toBe(1);
    expect(stats.brightPixelRatio).toBe(0);
  });

  it('전부 밝은 이미지는 brightPixelRatio가 1이다', () => {
    const stats = computePixelStats({
      data: solid(4, 4, 255),
      width: 4,
      height: 4,
    });
    expect(stats.brightPixelRatio).toBe(1);
    expect(stats.darkPixelRatio).toBe(0);
  });

  it('체크판 무늬는 균일한 이미지보다 흐림 수치가 크다', () => {
    const width = 6;
    const height = 6;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const gray = (x + y) % 2 === 0 ? 0 : 255;
        data[i * 4] = gray;
        data[i * 4 + 1] = gray;
        data[i * 4 + 2] = gray;
        data[i * 4 + 3] = 255;
      }
    }
    const checker = computePixelStats({ data, width, height });
    const flat = computePixelStats({
      data: solid(width, height, 128),
      width,
      height,
    });
    expect(checker.blurMetric).toBeGreaterThan(flat.blurMetric);
  });

  it('픽셀이 0개면 죽지 않고 전부 0을 낸다', () => {
    const stats = computePixelStats({
      data: new Uint8ClampedArray(0),
      width: 0,
      height: 0,
    });
    expect(stats).toEqual({
      meanBrightness: 0,
      contrast: 0,
      darkPixelRatio: 0,
      brightPixelRatio: 0,
      blurMetric: 0,
    });
  });
});

describe('measureCapture — 실패해도 점검을 막지 않는다', () => {
  it('createImageBitmap이 없는 환경에서도 예외를 던지지 않고 null로 채운다', async () => {
    // happy-dom에는 createImageBitmap이 없다. 실제 브라우저 실패와 같은 조건이다.
    const original = new Blob(['a'], { type: 'image/jpeg' });
    const uploaded = new Blob(['b'], { type: 'image/jpeg' });

    const metrics = await measureCapture(original, uploaded, 42);

    expect(metrics.originalBytes).toBe(original.size);
    expect(metrics.uploadBytes).toBe(uploaded.size);
    expect(metrics.optimizeMs).toBe(42);
    // 디코딩 자체가 안 되는 환경이므로 크기·밝기 항목은 비어 있다.
    expect(metrics.originalWidth).toBeNull();
    expect(metrics.meanBrightness).toBeNull();
  });

  it('빈 값 기본형은 전부 null이다', () => {
    expect(Object.values(EMPTY_CAPTURE_METRICS).every((v) => v === null)).toBe(
      true,
    );
  });
});
