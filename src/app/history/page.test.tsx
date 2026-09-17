// 이력 화면 — 현장 배포판과 검증 빌드의 차이 테스트.
//
// 연구 패널(CSV 내보내기·정답 파일·평가 지표)은 검증 빌드에서만 그린다.
// CSS로 숨기면 요소가 문서에 남아 스크린리더나 인쇄로 새어 나온다. 그래서
// "안 보인다"가 아니라 "문서에 없다"를 확인한다.

import {
  act,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 이 테스트가 보는 것은 IndexedDB가 아니라 무엇을 그리느냐다.
// 필터 테스트에서는 반환값을 기록 배열로 바꿔 쓴다. useLiveQuery를 모킹하므로
// listAllInspectionsWithoutPhotos·listInspectionsByIds는 실제로 불리지 않는다
// (useLiveQuery 모킹이 querier를 실행하지 않고 deps만 본다) — 그래도 모듈
// 형태를 실제와 맞춰 둔다.
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn(() => []) }));
vi.mock('@/lib/db', () => ({
  listAllInspectionsWithoutPhotos: vi.fn(),
  listInspectionsByIds: vi.fn(),
  clearInspections: vi.fn(),
  deleteInspection: vi.fn(),
  clearInspectionPhotos: vi.fn(),
  inspectionCount: vi.fn().mockResolvedValue(0),
  photoStorageStats: vi
    .fn()
    .mockResolvedValue({ recordsWithPhotos: 0, totalPhotoBytes: 0 }),
  inspectionIdsPresent: vi.fn().mockResolvedValue(new Set()),
  putInspectionWithId: vi.fn(),
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

import { useLiveQuery } from 'dexie-react-hooks';
import HistoryPage from './page';
import { clearInspections, deleteInspection } from '@/lib/db';
import { useResearchMode } from '@/lib/record/researchMode';
import type {
  GrinderSpec,
  InspectionRecord,
  WheelSpec,
} from '@/lib/rules/types';

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

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

function record(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: 1,
    grinder: GRINDER,
    wheel: WHEEL,
    result: { verdict: 'COMPATIBLE', checks: [], timestamp: '' },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    declaredPurpose: 'cutting',
    createdAt: '2026-09-16T05:00:00.000Z',
    ...overrides,
  };
}

describe('이력 화면 — 필터', () => {
  const cutting = record({
    id: 1,
    declaredPurpose: 'cutting',
    accessoryProfile: { type: 'bonded_abrasive', version: 'v1', scope: 'full' },
  });
  const grinding = record({
    id: 2,
    declaredPurpose: 'grinding',
    result: { verdict: 'INCOMPATIBLE', checks: [], timestamp: '' },
    wheel: { ...WHEEL, wheelType: 'flap_disc' },
    accessoryProfile: { type: 'flap_disc', version: 'v1', scope: 'limited' },
  });

  const all = [cutting, grinding];

  beforeEach(() => {
    // history/page.tsx는 useLiveQuery를 두 번 부른다 — 사진 없는 전체 기록
    // (deps: [])과 지금 보여줄 페이지(deps: [visibleIds]). deps로 둘을 가른다.
    vi.mocked(useLiveQuery).mockImplementation((_querier, deps) => {
      if (!deps || deps.length === 0) return all;
      const ids = deps[0] as number[];
      return all.filter((r) => r.id !== undefined && ids.includes(r.id));
    });
  });

  it('필터를 걸면 조건에 맞는 기록만 남고, 건수를 함께 보여준다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    expect(screen.getByText('2건')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('작업'), '연삭');

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('연삭')).toBeInTheDocument();
    expect(within(list).queryByText('절단')).not.toBeInTheDocument();
    expect(screen.getByText('전체 2건 중 1건')).toBeInTheDocument();
  });

  it('판정 범위(full/limited)로 걸러도 조건에 맞는 기록만 남는다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    await user.selectOptions(screen.getByLabelText('판정 범위'), '제한적');

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('연삭')).toBeInTheDocument();
    expect(within(list).queryByText('절단')).not.toBeInTheDocument();
  });

  it('기록 하나를 확인창을 거쳐 지운다', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteInspection).mockClear();
    render(<HistoryPage />);

    const list = screen.getByRole('list');
    await user.click(
      within(list).getAllByRole('button', { expanded: false })[0],
    );
    await user.click(screen.getByRole('button', { name: '이 기록 삭제' }));
    // 확인창을 거치기 전에는 아무것도 지우지 않는다.
    expect(deleteInspection).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: '이 기록을 지웁니다' }),
    );
    expect(deleteInspection).toHaveBeenCalledWith(1);
    // 전체 삭제는 건드리지 않는다.
    expect(clearInspections).not.toHaveBeenCalled();
  });

  it('조건에 맞는 기록이 없으면 결과 없음 안내를 보여준다 — 전체가 비었다는 안내와는 다르다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    await user.selectOptions(screen.getByLabelText('판정'), '판정불가');

    expect(
      screen.getByText('조건에 맞는 기록이 없습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('저장된 점검 기록이 없습니다.'),
    ).not.toBeInTheDocument();
  });

  it('초기화를 누르면 전체 기록으로 돌아온다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    await user.selectOptions(screen.getByLabelText('작업'), '연삭');
    expect(screen.getByText('전체 2건 중 1건')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '필터 초기화' }));

    expect(screen.getByText('2건')).toBeInTheDocument();
  });

  it('필터를 걸어도 IndexedDB를 읽거나 지우지 않는다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    const callsBefore = vi.mocked(clearInspections).mock.calls.length;
    await user.selectOptions(screen.getByLabelText('작업'), '연삭');
    await user.selectOptions(screen.getByLabelText('숫돌 종류'), '플랩디스크');
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));

    // 필터는 useLiveQuery가 이미 읽어 온 배열만 다시 거른다 — 삭제 함수는
    // "전체 삭제" 확인을 눌러야만 불린다.
    expect(vi.mocked(clearInspections).mock.calls.length).toBe(callsBefore);
  });
});

describe('이력 화면 — 51건 이상은 상한 없이 다룬다', () => {
  // "최근 50건" 상한이 있던 시절 회귀 버그: 51번째 이후 기록이 필터·CSV에서
  // 조용히 빠졌다. 51건으로 그 상한이 사라졌는지 고정한다.
  const many = Array.from({ length: 51 }, (_, i) =>
    record({
      id: i + 1,
      createdAt: new Date(2026, 0, 1 + i).toISOString(),
    }),
  );

  beforeEach(() => {
    vi.mocked(useLiveQuery).mockImplementation((_querier, deps) => {
      if (!deps || deps.length === 0) return many;
      const ids = deps[0] as number[];
      return many.filter((r) => r.id !== undefined && ids.includes(r.id));
    });
  });

  it('전체 건수는 51건이다 — 50건에서 잘리지 않는다', () => {
    render(<HistoryPage />);
    expect(screen.getByText('51건')).toBeInTheDocument();
  });

  it('처음에는 페이지 크기(20건)만 목록에 그린다', () => {
    render(<HistoryPage />);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    expect(
      screen.getByRole('button', { name: '더 보기 (20/51건)' }),
    ).toBeInTheDocument();
  });

  it('더 보기를 누르면 다음 페이지가 이어 붙는다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: '더 보기 (20/51건)' }));

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(40);
    expect(
      screen.getByRole('button', { name: '더 보기 (40/51건)' }),
    ).toBeInTheDocument();
  });

  it('끝까지 더 보면 더 보기 버튼이 사라진다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: '더 보기 (20/51건)' }));
    await user.click(screen.getByRole('button', { name: '더 보기 (40/51건)' }));

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(51);
    expect(
      screen.queryByRole('button', { name: /더 보기/ }),
    ).not.toBeInTheDocument();
  });

  it('필터는 목록에 지금 그려진 20건이 아니라 51건 전체를 기준으로 센다', async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    // 절단으로 좁혀도(record() 기본값이 모두 cutting) 51건 전체가 대상이다.
    await user.selectOptions(screen.getByLabelText('작업'), '절단');

    expect(screen.getByText('전체 51건 중 51건')).toBeInTheDocument();
  });

  it('검증판 CSV는 50건 상한 없이 51건 전체를 내보내고 건수를 밝힌다', async () => {
    vi.stubEnv(FLAG, 'true');
    setResearchSwitch(true);
    const user = userEvent.setup();
    render(<HistoryPage />);

    expect(
      screen.getByRole('button', { name: 'CSV 내려받기 (51건)' }),
    ).toBeInTheDocument();

    // jsdom/happy-dom에 없는 다운로드 배관을 최소한으로 채운다.
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    await user.click(
      screen.getByRole('button', { name: 'CSV 내려받기 (51건)' }),
    );

    expect(
      screen.getByText('전체 51건을 CSV로 내보냈습니다.'),
    ).toBeInTheDocument();
    setResearchSwitch(false);
    vi.unstubAllEnvs();
  });
});
