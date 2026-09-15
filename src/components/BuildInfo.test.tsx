// 빌드 정보 표시 테스트.
//
// ValidationBuildBanner와 다르게 조건 없이 항상 그려진다 — 현장판·검증판
// 모두에서 커밋을 확인할 수 있어야 한다.

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BuildInfo } from './BuildInfo';

const SHA_VAR = 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA';
const RESEARCH_FLAG = 'NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('BuildInfo', () => {
  it('연구 도구 설정과 무관하게 항상 커밋을 보여준다 — 현장판에서도', () => {
    vi.stubEnv(RESEARCH_FLAG, undefined);
    vi.stubEnv(SHA_VAR, 'abcdef1234567890');
    render(<BuildInfo />);

    expect(screen.getByText(/abcdef1/)).toBeInTheDocument();
  });

  it('검증 빌드에서도 같은 자리에 보인다', () => {
    vi.stubEnv(RESEARCH_FLAG, 'true');
    vi.stubEnv(SHA_VAR, 'abcdef1234567890');
    render(<BuildInfo />);

    expect(screen.getByText(/abcdef1/)).toBeInTheDocument();
  });

  it('커밋 정보가 없으면(로컬 개발) 없다고 적는다', () => {
    vi.stubEnv(SHA_VAR, undefined);
    render(<BuildInfo />);

    expect(screen.getByText('빌드 정보 없음')).toBeInTheDocument();
  });
});
