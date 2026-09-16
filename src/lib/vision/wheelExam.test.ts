// 다각도 외관 확인 요청 테스트.
//
// 실제 서버를 부르지 않는다. fetch 자리에 응답을 넣어 경계만 본다 —
// 네 장을 한 번에 보내는지, 실패를 결과로 꾸미지 않는지.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 사진 축소는 canvas가 필요하다. 여기서 보는 것은 요청 형태다.
vi.mock('@/lib/image/optimize', () => ({
  optimizeForUpload: async (blob: Blob) => blob,
  MULTI_UPLOAD_MAX_EDGE: 1280,
  MULTI_UPLOAD_MAX_BYTES: 600_000,
}));

import { ExtractError } from '@/lib/ocr/errors';
import {
  ServerWheelExaminer,
  WHEEL_EXAM_ORDER,
  getWheelExaminer,
  setWheelExaminerForTesting,
  type WheelExamPhotos,
} from './wheelExam';
import type { WheelExamResult } from '@/lib/rules/types';

const PHOTOS: WheelExamPhotos = {
  front: new Blob(['front'], { type: 'image/jpeg' }),
  back: new Blob(['back'], { type: 'image/jpeg' }),
  edge: new Blob(['edge'], { type: 'image/jpeg' }),
  bore: new Blob(['bore'], { type: 'image/jpeg' }),
};

const RESULT: WheelExamResult = {
  status: 'not_observed',
  findings: [],
  photoQuality: [],
  model: 'claude-sonnet-5',
  promptVersion: 'test',
  analyzedAt: '2026-09-16T03:00:00.000Z',
};

function respond(status: number, body: string) {
  const fetchMock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ServerWheelExaminer — 요청 형태', () => {
  it('네 장을 한 번의 요청으로 보낸다', async () => {
    // 장마다 따로 보내면 모델이 같은 숫돌의 다른 면이라는 것을 알 수 없다.
    const fetchMock = respond(200, JSON.stringify(RESULT));

    await new ServerWheelExaminer().examine(PHOTOS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/wheel-exam');
    const body = JSON.parse(String(init.body)) as {
      images: string[];
      mediaType: string;
    };
    expect(body.images).toHaveLength(4);
    expect(body.mediaType).toBe('image/jpeg');
  });

  it('앞면·뒷면·가장자리·중심구멍 순서로 보낸다', async () => {
    // 순서가 곧 어느 사진이 어느 면인지다. 뒤섞이면 모델이 엉뚱한 면을 본다.
    const fetchMock = respond(200, JSON.stringify(RESULT));

    await new ServerWheelExaminer().examine(PHOTOS);

    const body = JSON.parse(
      String(
        (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body,
      ),
    ) as { images: string[] };
    const decoded = body.images.map((image) => atob(image));
    expect(decoded).toEqual(['front', 'back', 'edge', 'bore']);
    expect([...WHEEL_EXAM_ORDER]).toEqual(['front', 'back', 'edge', 'bore']);
  });

  it('성공 응답을 그대로 돌려준다', async () => {
    respond(200, JSON.stringify(RESULT));

    await expect(new ServerWheelExaminer().examine(PHOTOS)).resolves.toEqual(
      RESULT,
    );
  });
});

describe('ServerWheelExaminer — 실패를 결과로 꾸미지 않는다', () => {
  it('서버에 닿지 못하면 network 실패를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const caught = await new ServerWheelExaminer()
      .examine(PHOTOS)
      .catch((error: unknown) => error);

    // 던진다는 것이 핵심이다. "찾지 못했다"는 결과를 만들어내지 않는다.
    expect(caught).toBeInstanceOf(ExtractError);
    expect((caught as ExtractError).failure).toBe('network');
  });

  it('서버가 준 code를 그대로 쓴다', async () => {
    respond(429, JSON.stringify({ error: '서버 문장', code: 'rate_limited' }));

    const caught = await new ServerWheelExaminer()
      .examine(PHOTOS)
      .catch((error: unknown) => error);

    expect((caught as ExtractError).failure).toBe('rate_limited');
    expect((caught as ExtractError).status).toBe(429);
  });

  it('분석 서비스 오류는 그 서비스의 상태 코드를 남긴다', async () => {
    respond(502, JSON.stringify({ code: 'upstream', upstreamStatus: 400 }));

    const caught = await new ServerWheelExaminer()
      .examine(PHOTOS)
      .catch((error: unknown) => error);

    expect((caught as ExtractError).failure).toBe('upstream');
    expect((caught as ExtractError).status).toBe(400);
  });

  it('JSON이 아닌 응답도 상태 코드로 종류를 정한다', async () => {
    // Vercel이 코드에 닿기 전에 잘라낸 413은 HTML로 온다.
    respond(413, '<html>Request Entity Too Large</html>');

    const caught = await new ServerWheelExaminer()
      .examine(PHOTOS)
      .catch((error: unknown) => error);

    expect((caught as ExtractError).failure).toBe('image_too_large');
  });
});

describe('테스트 확인기 경계 — 테스트 밖에서는 켜지지 않는다', () => {
  const fixture = { examine: async () => RESULT };

  beforeEach(() => {
    setWheelExaminerForTesting(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setWheelExaminerForTesting(null);
  });

  it('테스트에서는 넣은 확인기를 쓴다', () => {
    setWheelExaminerForTesting(fixture);
    expect(getWheelExaminer()).toBe(fixture);
  });

  it('비워 두면 서버 확인기로 돌아간다', () => {
    setWheelExaminerForTesting(fixture);
    setWheelExaminerForTesting(null);
    expect(getWheelExaminer()).toBeInstanceOf(ServerWheelExaminer);
  });

  it.each(['production', 'development'])(
    '%s에서는 넣을 수 없다 — 조용히 무시하지 않고 막는다',
    (env) => {
      vi.stubEnv('NODE_ENV', env);
      expect(() => setWheelExaminerForTesting(fixture)).toThrow();
    },
  );

  it.each(['production', 'development'])(
    '%s에서는 이미 넣어 둔 확인기도 쓰지 않는다',
    (env) => {
      setWheelExaminerForTesting(fixture);
      vi.stubEnv('NODE_ENV', env);
      expect(getWheelExaminer()).toBeInstanceOf(ServerWheelExaminer);
    },
  );
});
