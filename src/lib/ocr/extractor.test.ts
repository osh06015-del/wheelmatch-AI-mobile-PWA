// 서버 응답을 실패 종류로 옮기는지 확인한다.
//
// 화면은 이 종류로 작업자가 고른 언어의 문장을 찾는다. 종류가 틀리면 엉뚱한
// 안내가 뜬다 — 네트워크 문제인데 "다시 촬영하라"고 하면 같은 실패를 되풀이한다.
//
// 실제 서버를 부르지 않는다. fetch 자리에 응답을 넣어 경계만 본다.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExtractError, failureFromResponse } from './errors';
import { ClaudeExtractor } from './extractor';

const PHOTO = new Blob(['x'], { type: 'image/jpeg' });

function respond(status: number, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status })),
  );
}

async function failureOf(run: Promise<unknown>): Promise<ExtractError> {
  const caught = await run.then(
    () => null,
    (error: unknown) => error,
  );
  expect(caught).toBeInstanceOf(ExtractError);
  return caught as ExtractError;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClaudeExtractor — 실패 종류', () => {
  it('서버에 닿지 못하면 network다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const error = await failureOf(new ClaudeExtractor().extractWheel(PHOTO));

    expect(error.failure).toBe('network');
    expect(error.status).toBeNull();
  });

  it('서버가 준 code를 그대로 쓴다', async () => {
    respond(429, JSON.stringify({ error: '서버 문장', code: 'rate_limited' }));

    const error = await failureOf(new ClaudeExtractor().extractGrinder(PHOTO));

    expect(error.failure).toBe('rate_limited');
    expect(error.status).toBe(429);
  });

  it('분석 서비스 오류는 그 서비스의 상태 코드를 남긴다', async () => {
    // 502만 남으면 모델 문제인지 요청 형식 문제인지 구분할 수 없다.
    respond(
      502,
      JSON.stringify({
        error: '서버 문장',
        code: 'upstream',
        upstreamStatus: 400,
      }),
    );

    const error = await failureOf(new ClaudeExtractor().extractWheel(PHOTO));

    expect(error.failure).toBe('upstream');
    expect(error.status).toBe(400);
  });

  it('JSON이 아닌 응답도 상태 코드로 종류를 정한다', async () => {
    // Vercel이 코드에 닿기 전에 잘라낸 413은 HTML로 온다.
    respond(413, '<html>Request Entity Too Large</html>');

    const error = await failureOf(new ClaudeExtractor().extractWheel(PHOTO));

    expect(error.failure).toBe('image_too_large');
    expect(error.status).toBe(413);
  });

  it('성공 응답은 값을 그대로 돌려준다', async () => {
    const spec = { model: 'GWS 750-125', noLoadRPM: 11000 };
    respond(200, JSON.stringify(spec));

    await expect(new ClaudeExtractor().extractGrinder(PHOTO)).resolves.toEqual(
      spec,
    );
  });
});

describe('failureFromResponse', () => {
  it('모르는 code는 상태 코드로 추정한다', () => {
    expect(failureFromResponse(400, 'weird')).toBe('bad_request');
    expect(failureFromResponse(503, undefined)).toBe('upstream');
    expect(failureFromResponse(504, null)).toBe('upstream');
    expect(failureFromResponse(500, 42)).toBe('unknown');
  });

  it('알려진 code는 상태 코드보다 앞선다', () => {
    expect(failureFromResponse(500, 'server_config')).toBe('server_config');
  });
});
