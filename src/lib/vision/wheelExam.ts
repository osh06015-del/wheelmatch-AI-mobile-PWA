// 다각도 외관 확인 요청.
//
// 네 장(앞면·뒷면·가장자리·중심구멍)을 **한 번의 요청**으로 보낸다. 장마다
// 따로 보내면 모델이 같은 숫돌의 다른 면이라는 것을 알 수 없어, 앞면에서 본
// 균열이 가장자리에서 이어지는지 같은 것을 볼 수 없다.
//
// 키는 서버에서만 읽는다. 이 파일은 /api/wheel-exam만 부른다
// (OCR의 ClaudeExtractor와 같은 경계다).

import {
  MULTI_UPLOAD_MAX_BYTES,
  MULTI_UPLOAD_MAX_EDGE,
  optimizeForUpload,
} from '@/lib/image/optimize';
import { ExtractError, failureFromResponse } from '@/lib/ocr/errors';
import { blobToBase64 } from '@/lib/ocr/extractor';
import type { WheelExamResult, WheelExamView } from '@/lib/rules/types';

/** 보낼 사진 네 장. front는 라벨 사진을 그대로 재사용한다. */
export interface WheelExamPhotos {
  front: Blob;
  back: Blob;
  edge: Blob;
  bore: Blob;
}

export const WHEEL_EXAM_ORDER: ReadonlyArray<WheelExamView> = [
  'front',
  'back',
  'edge',
  'bore',
];

export interface WheelExaminer {
  examine(photos: WheelExamPhotos): Promise<WheelExamResult>;
}

/**
 * 한 요청 안에 들어갈 수 있도록 네 장을 모두 줄인다.
 *
 * 라벨용 상한(2.5MB)을 그대로 쓰면 4장이 Vercel 요청 한도를 넘는다.
 * 기존 optimizeForUpload에 예산만 다르게 준다 — 축소·재인코딩 로직을 새로
 * 만들지 않는다.
 */
async function shrinkForExam(photos: WheelExamPhotos): Promise<string[]> {
  const budget = {
    maxEdge: MULTI_UPLOAD_MAX_EDGE,
    maxBytes: MULTI_UPLOAD_MAX_BYTES,
  };
  const ordered = [photos.front, photos.back, photos.edge, photos.bore];
  const shrunk = await Promise.all(
    ordered.map((photo) => optimizeForUpload(photo, budget)),
  );
  return Promise.all(shrunk.map((photo) => blobToBase64(photo)));
}

/** 서버의 /api/wheel-exam을 거쳐 Claude로 살펴본다. */
export class ServerWheelExaminer implements WheelExaminer {
  async examine(photos: WheelExamPhotos): Promise<WheelExamResult> {
    const images = await shrinkForExam(photos);

    let response: Response;
    try {
      response = await fetch('/api/wheel-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          mediaType: photos.front.type || 'image/jpeg',
        }),
      });
    } catch {
      // 서버에 닿지 못했다(오프라인·연결 끊김).
      throw new ExtractError('network');
    }

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as {
        code?: unknown;
        upstreamStatus?: unknown;
      } | null;
      const upstreamStatus =
        typeof detail?.upstreamStatus === 'number'
          ? detail.upstreamStatus
          : null;
      throw new ExtractError(
        failureFromResponse(response.status, detail?.code),
        upstreamStatus ?? response.status,
      );
    }

    return (await response.json()) as WheelExamResult;
  }
}

/**
 * 테스트가 넣은 확인기. 카메라와 모델 대신 정해 둔 결과를 돌려주는 경계다.
 *
 * NODE_ENV가 'test'일 때만 쓰인다 — getExtractor와 같은 이유·같은 방식이다
 * (src/lib/ocr/extractor.ts). 현장 앱에서 이 경로로 가짜 결과가 들어갈 방법은 없다.
 */
let testExaminer: WheelExaminer | null = null;

export function setWheelExaminerForTesting(
  examiner: WheelExaminer | null,
): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'setWheelExaminerForTesting is only available when NODE_ENV is test',
    );
  }
  testExaminer = examiner;
}

export function getWheelExaminer(): WheelExaminer {
  if (process.env.NODE_ENV === 'test' && testExaminer) return testExaminer;
  return new ServerWheelExaminer();
}
