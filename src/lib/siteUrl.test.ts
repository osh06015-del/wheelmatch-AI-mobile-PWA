// 메타데이터 기준 URL 결정 순서 테스트.
//
// 핵심: 새 필수 환경변수 없이 항상 유효한 https URL을 돌려주는지(metadataBase
// 경고가 다시 나오지 않는지), Preview 빌드(VERCEL_PROJECT_PRODUCTION_URL만
// 있는 경우)에도 상대 경로가 아니라 실제 배포 주소가 나오는지, 서버 비밀값이
// 섞여 들어갈 자리가 없는지.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveSiteUrl } from './siteUrl';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveSiteUrl', () => {
  it('아무 환경변수도 없으면(로컬·CI 빌드) 지어낸 도메인이 아니라 문서에 적힌 배포 주소로 채운다', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined);
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', undefined);

    const url = resolveSiteUrl();
    expect(url).toBeInstanceOf(URL);
    expect(url.toString()).toBe('https://wheelmatch-nu.vercel.app/');
    expect(url.protocol).toBe('https:');
  });

  it('VERCEL_PROJECT_PRODUCTION_URL만 있으면(Preview 빌드 포함) 그 도메인을 쓴다', () => {
    // Preview 배포에도 이 값이 들어 있다 — PR 미리보기 카드가 상대 경로로
    // 깨지지 않는다는 것이 이 케이스가 지키는 것이다.
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined);
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'wheelmatch-nu.vercel.app');

    const url = resolveSiteUrl();
    expect(url.toString()).toBe('https://wheelmatch-nu.vercel.app/');
  });

  it('NEXT_PUBLIC_APP_URL이 있으면 Vercel 값보다 우선한다', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'other-domain.vercel.app');

    const url = resolveSiteUrl();
    expect(url.toString()).toBe('https://example.com/');
  });

  it('NEXT_PUBLIC_APP_URL이 http면 거부하고 다음 순서로 넘어간다', () => {
    // 메신저가 http 이미지를 카드에 거부할 수 있다.
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://insecure.example.com');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'wheelmatch-nu.vercel.app');

    const url = resolveSiteUrl();
    expect(url.toString()).toBe('https://wheelmatch-nu.vercel.app/');
  });

  it('NEXT_PUBLIC_APP_URL 형식이 잘못되면 무시하고 다음 순서로 넘어간다', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'not a url');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', undefined);

    const url = resolveSiteUrl();
    expect(url.toString()).toBe('https://wheelmatch-nu.vercel.app/');
  });

  it('빈 문자열 환경변수는 없는 것과 같이 취급한다', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '   ');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '  ');

    const url = resolveSiteUrl();
    expect(url.toString()).toBe('https://wheelmatch-nu.vercel.app/');
  });
});
