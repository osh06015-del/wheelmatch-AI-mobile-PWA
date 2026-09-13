// 이력 화면 — 현장 배포판과 검증 빌드의 차이 테스트.
//
// 연구 패널(CSV 내보내기·정답 파일·평가 지표)은 검증 빌드에서만 그린다.
// CSS로 숨기면 요소가 문서에 남아 스크린리더나 인쇄로 새어 나온다. 그래서
// "안 보인다"가 아니라 "문서에 없다"를 확인한다.

import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 이 테스트가 보는 것은 IndexedDB가 아니라 무엇을 그리느냐다.
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => [] }));
vi.mock('@/lib/db', () => ({
  listInspections: vi.fn(),
  clearInspections: vi.fn(),
}));

// Link는 App Router 컨텍스트를 요구한다. 평범한 <a>로 바꿔 둔다.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import HistoryPage from './page';
import { useResearchMode } from '@/lib/record/researchMode';

const FLAG = 'NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS';
const NOTICE = '검증/연구용 기능이며 현장 판정을 변경하지 않습니다.';

/** 패널 안의 연구 모드 스위치. localStorage에 남는 값이다. */
function setResearchSwitch(on: boolean) {
  const { result } = renderHook(() => useResearchMode());
  act(() => result.current[1](on));
}

function expectNoResearchPanel() {
  expect(screen.queryByText('연구·실험 모드')).not.toBeInTheDocument();
  expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /CSV 내려받기/ }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('정답(Ground Truth) 파일')).not.toBeInTheDocument();
  expect(screen.queryByText('평가 지표')).not.toBeInTheDocument();
}

describe('이력 화면 — 현장 배포판 (설정 없음)', () => {
  beforeEach(() => {
    vi.stubEnv(FLAG, undefined);
  });

  afterEach(() => {
    setResearchSwitch(false);
    vi.unstubAllEnvs();
  });

  it('연구 패널을 그리지 않는다', () => {
    render(<HistoryPage />);

    // 현장에서 쓰는 부분은 그대로 있다.
    expect(
      screen.getByRole('heading', { name: '점검 이력' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '새 점검 시작' }),
    ).toBeInTheDocument();
    expectNoResearchPanel();
  });

  it('이 기기에서 연구 모드 스위치를 켜 둔 적이 있어도 그리지 않는다', () => {
    // 이전 배포판에서 켜 둔 localStorage 값이 남아 있는 기기다.
    // 스위치가 빌드 설정을 이기면 현장 배포판에서 연구 도구가 되살아난다.
    setResearchSwitch(true);
    render(<HistoryPage />);

    expectNoResearchPanel();
  });

  it('true가 아닌 값으로 설정해도 그리지 않는다', () => {
    vi.stubEnv(FLAG, '1');
    render(<HistoryPage />);

    expectNoResearchPanel();
  });
});

describe('이력 화면 — 검증 빌드 (NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS=true)', () => {
  beforeEach(() => {
    vi.stubEnv(FLAG, 'true');
  });

  afterEach(() => {
    setResearchSwitch(false);
    vi.unstubAllEnvs();
  });

  it('연구 패널과 검증용 표시를 함께 그린다', () => {
    render(<HistoryPage />);

    expect(screen.getByText('연구·실험 모드')).toBeInTheDocument();
    expect(screen.getByRole('note')).toContainElement(screen.getByText(NOTICE));
    // 현장에서 쓰는 부분은 설정과 무관하게 같다.
    expect(
      screen.getByRole('link', { name: '새 점검 시작' }),
    ).toBeInTheDocument();
  });

  it('스위치를 켜기 전에도 검증용 표시는 보인다', () => {
    // 여기가 현장 화면이 아니라는 것은 스위치를 누르기 전부터 알려야 한다.
    setResearchSwitch(false);
    render(<HistoryPage />);

    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /CSV 내려받기/ }),
    ).not.toBeInTheDocument();
  });

  it('스위치를 켜면 CSV 내보내기와 평가 지표가 나온다', () => {
    setResearchSwitch(true);
    render(<HistoryPage />);

    expect(
      screen.getByRole('button', { name: /CSV 내려받기/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('평가 지표')).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
  });
});
