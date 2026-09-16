// 다각도 외관 확인 라우트의 입력 검증과 오류 상태.
//
// **네트워크를 타지 않는다.** 여기서 확인하는 것은 전부 Anthropic 호출
// *이전에* 끝나고 반환되는 경로다(extract 라우트 테스트와 같은 이유).
// 실제 사진으로 이상 징후를 찾아내는지는 여기서 확인되지 않는다 — 그것은
// 실물 촬영 세트로만 확인할 수 있다.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST } from './route';

/** 검증 단계까지 도달시키기 위한 가짜 키. 실제 호출에는 쓰이지 않는다. */
const DUMMY_KEY = 'sk-ant-not-a-real-key-for-tests-only';

function post(body: unknown, raw?: string) {
  return POST(
    new Request('http://localhost/api/wheel-exam', {
      method: 'POST',
      body: raw ?? JSON.stringify(body),
    }),
  );
}

/** 네 장짜리 정상 요청. 크기 검증에 걸리지 않을 만큼만 짧게 만든다. */
function images(count = 4, each = 'aaaa') {
  return Array.from({ length: count }, () => each);
}

let savedKey: string | undefined;

beforeEach(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = DUMMY_KEY;
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
});

describe('API 키가 없을 때', () => {
  it('값을 지어내지 않고 500으로 실패를 알린다', async () => {
    // 키가 없다고 "찾지 못했다"는 결과를 돌려주면, 살펴보지도 않고 확인한
    // 것처럼 보인다. 이 기능에서 가장 위험한 거짓말이다.
    delete process.env.ANTHROPIC_API_KEY;

    const res = await post({ images: images() });
    expect(res.status).toBe(500);

    const json = (await res.json()) as { error: string; code: string };
    expect(json.error).toContain('ANTHROPIC_API_KEY');
    expect(json.code).toBe('server_config');
  });
});

describe('요청 본문 검증', () => {
  it('JSON이 아니면 400', async () => {
    const res = await post(null, '{ this is not json');
    expect(res.status).toBe(400);
  });

  it('images가 없으면 400', async () => {
    const res = await post({});
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('images');
  });

  it.each([0, 1, 3, 5])('사진이 %d장이면 400 — 네 장이어야 한다', async (n) => {
    // 장수가 맞지 않으면 어느 면이 어느 사진인지 알 수 없다.
    const res = await post({ images: images(n) });
    expect(res.status).toBe(400);
  });

  it('항목이 문자열이 아니면 400', async () => {
    const res = await post({ images: ['a', 'b', 12345, 'd'] });
    expect(res.status).toBe(400);
  });

  it('빈 문자열이 섞여 있으면 400', async () => {
    const res = await post({ images: ['a', '', 'c', 'd'] });
    expect(res.status).toBe(400);
  });

  it('합계 용량이 상한을 넘으면 크기를 이유로 400', async () => {
    // 장당이 아니라 합계로 막는다 — 한 요청에 네 장이 함께 올라간다.
    const res = await post({ images: images(4, 'a'.repeat(1_000_001)) });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error: string; code: string };
    expect(json.code).toBe('image_too_large');
  });
});

describe('오류 응답 형태', () => {
  it('오류는 항상 error와 code를 가진 JSON이다', async () => {
    // 화면은 code로 작업자가 고른 언어의 문장을 찾는다.
    const res = await post({});
    const json = (await res.json()) as Record<string, unknown>;

    expect(typeof json.error).toBe('string');
    expect(json.code).toBe('bad_request');
  });

  it('오류 메시지에 API 키가 새지 않는다', async () => {
    const res = await post({ images: images(2) });
    const text = JSON.stringify(await res.json());

    expect(text).not.toContain(DUMMY_KEY);
    expect(text).not.toContain('sk-ant');
  });

  it('실패 응답에 status·findings를 담지 않는다 — 실패가 결과로 보이면 안 된다', async () => {
    const res = await post({ images: images(2) });
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.status).toBeUndefined();
    expect(json.findings).toBeUndefined();
  });

  // 허용 MIME(image/jpeg·png·webp)의 의미는 반대 방향으로 고정된다 —
  // 목록에 없는 값은 조용히 무시되고 기본값 image/jpeg로 보낸다. 그 분기는
  // Anthropic 호출에 진입해야 관찰되는데, 그건 이 파일의 전제(네트워크 없음)를
  // 깬다. extract 라우트 테스트와 같은 이유로 여기서 다루지 않는다.
});
