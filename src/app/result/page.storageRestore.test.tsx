// 결과 화면 — 새로고침으로 되살아난 값.
//
// 결과 화면은 저장소의 규격을 그대로 규칙엔진에 넘긴다. 새로고침하면 그 값은
// sessionStorage에서 온다. 형태가 어긋난 값이 그대로 넘어가면
//   · {year, month}가 아닌 유효기한 — 유효기한 규칙을 통과해 "적합"이 보인다
//   · 목록에 없는 종류 — 엔진이 예외를 던져 화면이 죽는다
//   · 읽지 못한 오프라인 표시 — 온라인으로 읽혀 오프라인 제한이 풀린다
//   · 종료시각을 읽지 못하는 시험운전 타이머 — 기다리지 않고 답할 수 있다
//
// 순수 함수 테스트는 "화면이 그 값을 실제로 받지 않는지"를 증명하지 못한다. 여기서는
// 저장소에 값을 심고 화면을 새로 불러, 작업자에게 무엇이 보이는지를 본다.

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, push } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
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

// IndexedDB는 이 테스트의 관심사가 아니다. 저장은 부르지 않는다.
vi.mock('@/lib/db', () => ({
  saveInspection: vi.fn(),
  isQuotaExceededError: () => false,
}));

vi.mock('@/lib/draft/draftStore', () => ({
  draftStore: {
    load: vi.fn(async () => ({ status: 'none' })),
    save: vi.fn(async () => 'saved'),
    remove: vi.fn(async () => true),
  },
}));

// 서버 재분석은 실제 서버를 부르지 않는다.
vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({
    extractGrinder: vi.fn(),
    extractWheel: vi.fn(),
    getLastTelemetry: () => null,
  }),
}));

import type {
  GrinderCondition,
  GrinderSpec,
  WheelCondition,
  WheelSpec,
} from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

/** 규격이 서로 맞고 유효기한도 남은 일반 결합숫돌 — 온전하면 적합이다 */
const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  expiry: { year: 2099, month: 12 },
  rawText: '',
  confidence: 'high',
};

const GRINDER_OK: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

const WHEEL_OK: WheelCondition = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

const LOADING = '결과를 불러오는 중입니다...';

const key = (name: string) => `wheelmatch.${name}`;

/**
 * 결과 화면까지 간 점검을 앱이 쓰는 그대로 sessionStorage에 남긴다.
 * 저장 형태를 손으로 적지 않고, 앱이 쓴 값에서 필요한 자리만 고친다.
 */
async function seed(): Promise<void> {
  vi.resetModules();
  const { useInspection } = await import('@/lib/state/inspection');
  const { result } = renderHook(() => useInspection());
  act(() => {
    result.current.setPurpose('cutting');
    result.current.setGrinder(GRINDER);
    result.current.setGrinderCondition(GRINDER_OK);
    result.current.setWheel(WHEEL);
    result.current.setWheelCondition(WHEEL_OK);
  });
  cleanup();
}

/** 저장된 객체 하나에서 일부 자리만 바꾼다 */
function patch(name: string, change: Record<string, unknown>): void {
  const current = JSON.parse(
    sessionStorage.getItem(key(name)) ?? '{}',
  ) as Record<string, unknown>;
  sessionStorage.setItem(key(name), JSON.stringify({ ...current, ...change }));
}

/** 새로고침 — 저장소와 화면을 새로 불러와 sessionStorage 값으로 다시 그린다 */
async function reloadResultPage(): Promise<void> {
  vi.resetModules();
  const { default: ResultPage } = await import('./page');
  render(<ResultPage />);
}

function checkAll() {
  for (const box of screen.getAllByRole('checkbox')) {
    if (!(box as HTMLInputElement).checked) fireEvent.click(box);
  }
}

beforeEach(() => {
  replace.mockClear();
  push.mockClear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('결과 화면 — 새로고침으로 되살아난 값', () => {
  it('온전한 값이면 새로고침 뒤에도 결과가 그대로 열린다', async () => {
    // 아래 테스트들만으로는 "항상 막는" 결함을 잡지 못한다.
    await seed();

    await reloadResultPage();

    expect(screen.getByText('규격 대조 결과')).toBeInTheDocument();
    expect(screen.getByText('적합')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    ['빈 객체', {}],
    ['문자열', '01/2020'],
    ['다른 이름의 필드', { y: 2020, m: 1 }],
    ['배열', [2020, 1]],
  ])(
    '유효기한이 {year, month}가 아닌 숫돌(%s)은 적합으로 보이지 않고 숫돌 단계로 돌아간다',
    async (_name, expiry) => {
      await seed();
      patch('wheel', { expiry });

      await reloadResultPage();

      expect(screen.queryByText('적합')).not.toBeInTheDocument();
      expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
      expect(screen.getByText(LOADING)).toBeInTheDocument();
      expect(replace).toHaveBeenCalledWith('/scan/wheel');
    },
  );

  it('목록에 없는 종류가 남아 있어도 화면이 죽지 않고 숫돌 단계로 돌아간다', async () => {
    await seed();
    patch('wheel', { wheelType: 'resin_wheel' });

    await reloadResultPage();

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('목록에 없는 용도가 남아 있어도 근거 없는 부적합을 보여주지 않는다', async () => {
    await seed();
    patch('wheel', { purpose: 'polishing' });

    await reloadResultPage();

    expect(screen.queryByText('부적합')).not.toBeInTheDocument();
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('명판 규격이 어긋나 있으면 결과를 보여주지 않고 처음 화면으로 돌아간다', async () => {
    // 명판이 없을 때 이 화면의 가드가 보내는 곳은 처음 화면이다(기존 동작).
    await seed();
    patch('grinder', { guardType: 'weird' });

    await reloadResultPage();

    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('오프라인 표시를 읽지 못하면 규격이 맞아도 적합을 내지 않는다', async () => {
    await seed();
    sessionStorage.setItem(key('offlineSlots'), '{}');

    await reloadResultPage();

    expect(screen.getByText('규격 대조 결과')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(
      screen.getByText(
        '오프라인 제한 대조입니다. 작업자가 입력한 값으로만 대조해 적합 판정을 제공하지 않습니다. 연결되면 서버 재분석을 직접 선택할 수 있습니다.',
      ),
    ).toBeInTheDocument();
    // 적합 조합에서만 여는 시험운전도 열리지 않는다.
    checkAll();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
  });

  it.each([
    ['빈 객체', {}],
    [
      '종료시각이 날짜가 아닌 값',
      {
        wheelReplaced: true,
        requiredSeconds: 180,
        startedAt: new Date().toISOString(),
        endsAt: '언젠가',
      },
    ],
  ])(
    '어긋난 시험운전 타이머(%s)는 끝난 것으로 읽히지 않고 처음부터 다시 묻는다',
    async (_name, progress) => {
      // 제122조 ②의 1분·3분을 기다리지 않고 "이상 없음"을 누를 수 있으면 안 된다.
      await seed();
      sessionStorage.setItem(key('trialRun'), JSON.stringify(progress));

      await reloadResultPage();
      checkAll();

      expect(screen.getByText('숫돌을 방금 교체했습니까?')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /이상 없음 확인/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /점검 완료 및 저장/ }),
      ).toBeDisabled();
    },
  );

  it('온전한 시험운전 타이머는 새로고침 뒤에도 남은 시간 그대로 이어진다', async () => {
    await seed();
    sessionStorage.setItem(
      key('trialRun'),
      JSON.stringify({
        wheelReplaced: true,
        requiredSeconds: 180,
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 120_000).toISOString(),
      }),
    );

    await reloadResultPage();
    checkAll();

    expect(screen.getByText('숫돌 교체 후 시험운전')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /이상 없음 확인/ }),
    ).toBeDisabled();
  });
});
