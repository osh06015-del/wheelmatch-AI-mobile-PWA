// OCR 라우트의 입력 검증과 오류 상태.
//
// **네트워크를 타지 않는다.** 여기서 확인하는 검증은 전부 Anthropic 호출
// *이전에* 끝나고 반환되는 경로다. 그래서 실제 API 키 없이 돌릴 수 있고,
// 외부 서비스를 mock으로 감싸지 않아도 된다 — 감싸면 진짜 오류가 숨는다.
//
// 키가 필요한 경로(정상 추출)는 여기서 다루지 않는다. 그건 실기기·실제 호출로만
// 확인할 수 있고, mock으로 흉내 내면 "통과했지만 실제로는 안 되는" 상태가 된다.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST } from './route';

/** 검증 단계까지 도달시키기 위한 가짜 키. 실제 호출에는 쓰이지 않는다. */
const DUMMY_KEY = 'sk-ant-not-a-real-key-for-tests-only';

function post(body: unknown, raw?: string) {
  return POST(
    new Request('http://localhost/api/extract', {
      method: 'POST',
      body: raw ?? JSON.stringify(body),
    }),
  );
}

let savedKey: string | undefined;

beforeEach(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  // 테스트끼리 환경변수가 새지 않게 되돌린다.
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
});

describe('API 키가 없을 때', () => {
  it('값을 지어내지 않고 500으로 실패를 알린다', async () => {
    // 키가 없다고 조용히 우회하거나 빈 결과를 돌려주면, 화면은 "읽지 못했다"로
    // 보이고 원인은 영영 드러나지 않는다.
    delete process.env.ANTHROPIC_API_KEY;

    const res = await post({ image: 'abc', type: 'grinder' });
    expect(res.status).toBe(500);

    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('ANTHROPIC_API_KEY');
  });
});

describe('요청 본문 검증', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = DUMMY_KEY;
  });

  it('JSON이 아니면 400', async () => {
    const res = await post(null, '{ this is not json');
    expect(res.status).toBe(400);
  });

  it('image가 없으면 400', async () => {
    const res = await post({ type: 'grinder' });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('image');
  });

  it('image가 빈 문자열이면 400', async () => {
    // 빈 문자열을 통과시키면 빈 이미지를 모델에 보내게 된다.
    const res = await post({ image: '', type: 'grinder' });
    expect(res.status).toBe(400);
  });

  it('image가 문자열이 아니면 400', async () => {
    const res = await post({ image: 12345, type: 'grinder' });
    expect(res.status).toBe(400);
  });

  it('image가 상한을 넘으면 크기를 이유로 400', async () => {
    // Vercel 4.5MB 한도에 닿기 전에 여기서 한국어로 안내한다.
    const tooBig = 'a'.repeat(4_000_001);
    const res = await post({ image: tooBig, type: 'grinder' });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('큽니다');
  });

  it('type이 없으면 400', async () => {
    const res = await post({ image: 'abc' });
    expect(res.status).toBe(400);
  });

  it('type이 grinder/wheel이 아니면 400', async () => {
    const res = await post({ image: 'abc', type: 'nameplate' });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('type');
  });

  // 'grinder'/'wheel'이 검증을 통과한다는 것은 여기서 확인하지 않는다.
  //
  // 통과를 관찰하려면 그 다음 단계인 실제 Anthropic 호출에 진입해야 하는데,
  // 그건 이 파일의 전제(네트워크 없음)를 깬다. 게다가 happy-dom 환경에서는
  // SDK가 브라우저로 오인해 인스턴스화 자체를 거부한다
  // ("It looks like you're running in a browser-like environment").
  // 프로덕션은 runtime='nodejs'라 해당 없는, 테스트 환경만의 제약이다.
  //
  // 허용 목록의 의미는 반대 방향(위의 'nameplate' → 400)으로 이미 고정된다.
});

describe('오류 응답 형태', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = DUMMY_KEY;
  });

  it('오류는 항상 error 필드를 가진 JSON이다', async () => {
    // 화면이 detail?.error로 읽는다. 형태가 깨지면 사용자에게 빈 오류가 뜬다.
    const res = await post({ type: 'grinder' });
    const json = (await res.json()) as Record<string, unknown>;

    expect(typeof json.error).toBe('string');
    expect((json.error as string).length).toBeGreaterThan(0);
  });

  it('오류 메시지에 API 키가 새지 않는다', async () => {
    // 오류를 자세히 돌려주기로 한 라우트라, 키가 섞여 나가지 않는지 고정해 둔다.
    const res = await post({ image: '', type: 'grinder' });
    const text = JSON.stringify(await res.json());

    expect(text).not.toContain(DUMMY_KEY);
    expect(text).not.toContain('sk-ant');
  });
});
