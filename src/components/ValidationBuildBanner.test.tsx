// 검증용 빌드 배너 테스트.
//
// 연구 도구와 같은 조건으로만 그려져야 한다. 현장 배포판에서 실수로 뜨면
// 작업자가 "이건 진짜 판정이 아닌가?"로 혼란스러워한다.

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ValidationBuildBanner } from './ValidationBuildBanner';

const FLAG = 'NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS';
const SHA_VAR = 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ValidationBuildBanner', () => {
  it('연구 도구가 꺼져 있으면(현장 배포판) 아무것도 그리지 않는다', () => {
    vi.stubEnv(FLAG, undefined);
    const { container } = render(<ValidationBuildBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('연구 도구가 켜져 있으면 검증용 빌드 표시와 커밋 해시를 보여준다', () => {
    vi.stubEnv(FLAG, 'true');
    vi.stubEnv(SHA_VAR, 'abcdef1234567890');
    render(<ValidationBuildBanner />);

    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByText(/검증용 빌드/)).toBeInTheDocument();
    // 전체 해시가 아니라 앞 7자리만 — 화면이 좁은 촬영 화면에서도 한 줄에 들어간다.
    expect(screen.getByText(/abcdef1/)).toBeInTheDocument();
    expect(screen.queryByText(/abcdef1234567890/)).not.toBeInTheDocument();
  });

  it('커밋 해시가 없으면(로컬 개발) 없다고 적는다 — 값을 지어내지 않는다', () => {
    vi.stubEnv(FLAG, 'true');
    vi.stubEnv(SHA_VAR, undefined);
    render(<ValidationBuildBanner />);

    expect(screen.getByText('커밋 정보 없음')).toBeInTheDocument();
  });
});
