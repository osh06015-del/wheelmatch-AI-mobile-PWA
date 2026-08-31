// 업로드 크기 계산 테스트.
//
// canvas 재인코딩 자체는 브라우저 기능이라 여기서 검증하지 않는다.
// "얼마로 줄일 것인가"를 정하는 순수 함수만 확인한다. 이 판단이 틀리면
// Vercel의 4.5MB 요청 한도를 넘어 배포 환경에서만 413으로 실패한다.

import { describe, expect, it } from 'vitest';

import {
  MAX_EDGE,
  MAX_UPLOAD_BYTES,
  fitWithinMaxEdge,
  needsOptimization,
} from './optimize';

describe('fitWithinMaxEdge', () => {
  it('긴 변을 2048로 맞추고 비율을 유지한다', () => {
    // 12MP 세로 사진 (아이폰 기본)
    expect(fitWithinMaxEdge(3024, 4032)).toEqual({ width: 1536, height: 2048 });
  });

  it('가로 사진도 긴 변 기준으로 줄인다', () => {
    expect(fitWithinMaxEdge(4032, 3024)).toEqual({ width: 2048, height: 1536 });
  });

  it('이미 작은 이미지는 확대하지 않는다', () => {
    expect(fitWithinMaxEdge(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('정확히 상한이면 그대로 둔다', () => {
    expect(fitWithinMaxEdge(2048, 1024)).toEqual({ width: 2048, height: 1024 });
  });

  it('0을 넘겨도 죽지 않는다', () => {
    expect(fitWithinMaxEdge(0, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe('needsOptimization', () => {
  it('용량이 크면 줄인다', () => {
    expect(needsOptimization(4_000_000, 1000, 800)).toBe(true);
  });

  it('해상도가 크면 용량이 작아도 줄인다', () => {
    // 큰 해상도를 그대로 보내면 OCR 비용과 지연만 늘어난다.
    expect(needsOptimization(500_000, 4032, 3024)).toBe(true);
  });

  it('둘 다 충분히 작으면 원본을 그대로 쓴다', () => {
    expect(needsOptimization(500_000, 1600, 1200)).toBe(false);
  });

  it('경계값은 통과시킨다', () => {
    expect(needsOptimization(MAX_UPLOAD_BYTES, MAX_EDGE, MAX_EDGE)).toBe(false);
    expect(needsOptimization(MAX_UPLOAD_BYTES + 1, MAX_EDGE, MAX_EDGE)).toBe(
      true,
    );
  });
});

describe('Vercel 요청 한도', () => {
  it('base64로 감싸도 4.5MB 한도 안에 들어온다', () => {
    // base64는 원본의 약 4/3 크기가 된다. JSON 래퍼도 약간 붙는다.
    const base64Bytes = Math.ceil(MAX_UPLOAD_BYTES * (4 / 3));
    const VERCEL_REQUEST_LIMIT = 4_500_000;
    expect(base64Bytes).toBeLessThan(VERCEL_REQUEST_LIMIT);
  });
});
