// 결과 화면 우회 차단 테스트.
//
// Wheel Condition Gate는 화면 이동으로 건너뛸 수 있으면 의미가 없다.
// /result로 직접 들어오거나 새로고침해도, 작업자가 다섯 항목을 모두 직접
// 확인하지 않았다면 규격 대조 결과가 보이면 안 된다.
//
// 여기서만 잡을 수 있는 회귀다 — 순수 함수 테스트는 "화면이 그 함수를
// 실제로 부르는지"를 증명하지 못한다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, push, removeDraft, extractGrinder, extractWheel } = vi.hoisted(
  () => ({
    replace: vi.fn(),
    push: vi.fn(),
    removeDraft: vi.fn(async () => true),
    extractGrinder: vi.fn(),
    extractWheel: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
}));

// Link는 App Router 컨텍스트를 요구한다. 이 테스트가 보는 것은 라우팅이
// 아니라 가드이므로 평범한 <a>로 바꿔 둔다.
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
  isQuotaExceededError: (error: unknown) =>
    error instanceof Error && error.name === 'QuotaExceededError',
}));

// 진행 중 점검(draft)은 IndexedDB 대신 지우기 호출만 본다.
vi.mock('@/lib/draft/draftStore', () => ({
  draftStore: {
    load: vi.fn(async () => ({ status: 'none' })),
    save: vi.fn(async () => 'saved'),
    remove: removeDraft,
  },
}));

// 서버 재분석은 실제 서버를 부르지 않는다.
vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({
    extractGrinder,
    extractWheel,
    getLastTelemetry: () => null,
  }),
}));

import ResultPage from './page';
import { WHEEL_TYPE_OPTIONS } from '@/components/WheelTypeConfirm';
import { saveInspection } from '@/lib/db';
import { confirmedWheelSpec } from '@/lib/ocr/confirm';
import { CSV_COLUMNS, toCsv } from '@/lib/record/csv';
import {
  BONDED_ABRASIVE_PROFILE,
  conditionItemsFor,
} from '@/lib/rules/profiles';
import { RULESET_VERSION } from '@/lib/rules/version';
import { useResearchMode } from '@/lib/record/researchMode';
import { useInspection } from '@/lib/state/inspection';
import type {
  AnalysisLimitCause,
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

const CONFIRMED: WheelCondition = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

const GRINDER_OK: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

const LOADING = '결과를 불러오는 중입니다...';

function store() {
  return renderHook(() => useInspection()).result;
}

describe('결과 화면 — Wheel Condition Gate 우회 차단', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  it('값이 하나도 없이 직접 들어오면 결과를 보여주지 않고 처음으로 돌린다', () => {
    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('규격은 다 있는데 상태 확인을 하지 않았으면 결과를 보여주지 않는다', () => {
    // 가장 위험한 경로다. 판정은 계산할 수 있지만 작업자는 숫돌을 보지 않았다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('한 항목이라도 미확인이면 여전히 막는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition({ ...CONFIRMED, labelLegible: null });
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('문제 있음이 하나라도 있으면 결과로 넘어가지 않는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition({ ...CONFIRMED, damageFree: false });
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('다섯 항목을 모두 확인했을 때만 결과가 열린다', () => {
    // 위 네 개만으로는 "항상 막는" 버그를 잡지 못한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    expect(screen.getByText('규격 대조 결과')).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('작업(절단/연삭)을 고르지 않았으면 Gate가 모두 끝나도 결과를 보여주지 않고 작업 선택으로 돌린다', () => {
    // 이력 화면의 "새 점검 시작"처럼 작업 선택을 거치지 않은 경로의 회귀 테스트다.
    // 작업 목적 대조 없이 규격만 맞으면 적합이 나오던 결함이다.
    const result = store();
    act(() => {
      result.current.reset();
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });
    expect(result.current.declaredPurpose).toBeNull();

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('새 숫돌을 잡으면 상태 확인이 사라져 다시 막힌다', () => {
    // setWheel이 이전 숫돌의 확인을 지운다. 화면도 그에 따라 닫혀야 한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });
    act(() => result.current.setWheel({ ...WHEEL, diameter: 180 }));

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });
});

describe('결과 화면 — Grinder Condition Gate 우회 차단', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  /** 숫돌 쪽은 전부 통과시키고 그라인더 상태만 바꿔 가며 본다. */
  function seed(grinderCondition: GrinderCondition | null) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      if (grinderCondition) {
        result.current.setGrinderCondition(grinderCondition);
      }
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });
  }

  it('장비 상태를 확인하지 않았으면 숫돌이 다 돼 있어도 막는다', () => {
    seed(null);
    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    // 숫돌이 아니라 1단계로 되돌린다. 고쳐야 할 곳이 거기이기 때문이다.
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('장비 상태 한 항목이 미확인이면 막는다', () => {
    seed({ ...GRINDER_OK, guardSecure: null });
    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('장비 상태 한 항목이 문제 있음이면 막는다', () => {
    seed({ ...GRINDER_OK, cordAndPlugUndamaged: false });
    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('두 Gate를 모두 통과해야 결과가 열린다', () => {
    seed(GRINDER_OK);
    render(<ResultPage />);

    expect(screen.getByText('규격 대조 결과')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('새 그라인더를 잡으면 두 Gate가 함께 무효가 되어 막힌다', () => {
    seed(GRINDER_OK);
    const result = store();
    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });
});

describe('결과 화면 — 시험운전 절차', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  /** 두 Gate를 통과하고 규격도 맞는 상태까지 만든다. */
  function ready(wheel: WheelSpec = WHEEL) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel);
      result.current.setWheelCondition(CONFIRMED);
    });
    return result;
  }

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  it('체크리스트를 끝내기 전에는 시험운전을 열지 않는다', () => {
    ready();
    render(<ResultPage />);

    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
  });

  it('체크리스트를 마치면 숫돌 교체 여부를 묻는다', () => {
    ready();
    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('시험운전')).toBeInTheDocument();
    expect(screen.getByText('숫돌을 방금 교체했습니까?')).toBeInTheDocument();
  });

  it('부적합 조합에서는 시험운전을 열지 않는다', () => {
    // 맞지 않는 조합으로 기계를 돌리게 유도하면 그 자체가 사고 경로다.
    ready({ ...WHEEL, maxRPM: 8500 });
    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('부적합')).toBeInTheDocument();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
  });

  it.each([['cup_wheel'], ['diamond'], ['other'], ['unknown']] as const)(
    '숫돌 종류가 %s 이면 판정불가이고 시험운전을 열지 않는다',
    (type) => {
      // 일반 결합숫돌로 확인되지 않은 숫돌을 돌려 보게 유도하지 않는다.
      ready({ ...WHEEL, wheelType: type });
      render(<ResultPage />);
      checkAll();

      expect(screen.getByText('판정불가')).toBeInTheDocument();
      expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
    },
  );

  it('판정불가에서도 시험운전을 열지 않는다', () => {
    ready({ ...WHEEL, maxRPM: null });
    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
  });

  it('적합인데 시험운전을 하지 않았으면 저장할 수 없다', () => {
    ready();
    render(<ResultPage />);
    checkAll();

    expect(
      screen.getByRole('button', { name: /점검 완료 및 저장/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(/시험운전 후 저장할 수 있습니다/),
    ).toBeInTheDocument();
  });

  it('부적합·판정불가 기록은 시험운전 없이 그대로 저장할 수 있다', () => {
    // 하지 않아야 하는 절차를 저장 조건으로 걸면 기록 자체를 못 남긴다.
    ready({ ...WHEEL, maxRPM: 8500 });
    render(<ResultPage />);
    checkAll();

    expect(
      screen.getByRole('button', { name: /점검 완료 및 저장/ }),
    ).toBeEnabled();
  });

  it('타이머가 남아 있으면 완료 버튼이 잠겨 있다', () => {
    ready();
    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /60초/ }));

    expect(
      screen.getByRole('button', { name: /이상 없음 확인/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /이상 있음/ })).toBeDisabled();
    // 저장도 여전히 막혀 있다.
    expect(
      screen.getByRole('button', { name: /점검 완료 및 저장/ }),
    ).toBeDisabled();
  });

  it('세션에 남은 시험운전은 새로고침 후에도 이어진다', () => {
    // 절대 종료시각을 들고 있으므로 화면을 다시 그려도 남은 시간이 정확하다.
    const result = ready();
    act(() =>
      result.current.setTrialRun({
        wheelReplaced: true,
        requiredSeconds: 180,
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 120_000).toISOString(),
      }),
    );

    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('숫돌 교체 후 시험운전')).toBeInTheDocument();
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('숫돌을 다시 잡으면 진행 중이던 시험운전이 사라진다', () => {
    const result = ready();
    act(() =>
      result.current.setTrialRun({
        wheelReplaced: false,
        requiredSeconds: 60,
        startedAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    act(() => result.current.setWheel({ ...WHEEL, diameter: 100 }));

    expect(result.current.trialRun).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.trialRun')).toBeNull();
  });

  it('이상 없음으로 끝내면 저장이 열리고 문구가 점검 완료다', () => {
    const result = ready();
    act(() =>
      result.current.setTrialRun({
        wheelReplaced: false,
        requiredSeconds: 60,
        startedAt: new Date(Date.now() - 65_000).toISOString(),
        endsAt: new Date(Date.now() - 5_000).toISOString(),
      }),
    );
    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /이상 없음 확인/ }));

    expect(
      screen.getByRole('button', { name: /점검 완료 및 저장/ }),
    ).toBeEnabled();
    expect(screen.queryByText('작업하지 마십시오')).not.toBeInTheDocument();
  });

  it('이상 있음이면 작업 중지 안내가 뜨고 저장 문구가 갈린다', () => {
    const result = ready();
    act(() =>
      result.current.setTrialRun({
        wheelReplaced: true,
        requiredSeconds: 180,
        startedAt: new Date(Date.now() - 200_000).toISOString(),
        endsAt: new Date(Date.now() - 20_000).toISOString(),
      }),
    );
    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getAllByRole('checkbox').at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: /이상 있음/ }));

    expect(screen.getByText('작업하지 마십시오')).toBeInTheDocument();
    // 문제가 확인된 결과를 "점검 완료"로 부르지 않는다.
    expect(
      screen.getByRole('button', { name: /중지 결과 저장/ }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: /점검 완료 및 저장/ }),
    ).not.toBeInTheDocument();
  });
});

describe('결과 화면 — 사전점검 시간과 시험운전 시간 분리', () => {
  // 「30초 사전점검」은 시험운전 전까지의 시간이다. 법정 시험운전을 섞어 재면
  // 목표를 맞출 수 없고, 그러면 시험운전을 줄이는 쪽으로 압박이 생긴다.
  const T0 = new Date('2026-09-15T09:00:00.000Z').getTime();

  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    vi.mocked(saveInspection).mockClear();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
    // 시계만 가짜로 둔다. 타이머까지 멈추면 화면 갱신이 멈춘다.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** 작업을 고른 순간(T0)부터 두 Gate를 통과한 상태까지 만든다. */
  function start(wheel: WheelSpec) {
    const result = store();
    act(() => {
      result.current.setPurpose('cutting');
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel);
      result.current.setWheelCondition(CONFIRMED);
    });
    return result;
  }

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  it('적합 조합은 시험운전을 시작하기 직전까지만 사전점검 시간으로 남긴다', async () => {
    const result = start(WHEEL);
    act(() =>
      result.current.setTrialRun({
        wheelReplaced: false,
        requiredSeconds: 60,
        startedAt: new Date(T0 + 22_000).toISOString(),
        endsAt: new Date(T0 + 82_000).toISOString(),
      }),
    );
    vi.setSystemTime(T0 + 250_000);

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /이상 없음 확인/ }));
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.preTrialElapsedMs).toBe(22_000);
    expect(saved.elapsedMs).toBe(250_000);
  });

  it.each([
    ['부적합', { ...WHEEL, maxRPM: 8500 }],
    ['판정불가', { ...WHEEL, wheelType: 'unknown' as const }],
  ])(
    '%s 이면 시험운전이 열리지 않으므로 저장 순간에 사전점검이 끝난다',
    async (label, wheel) => {
      start(wheel);
      vi.setSystemTime(T0 + 17_500);

      render(<ResultPage />);
      checkAll();
      expect(screen.getByText(label)).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('button', { name: /점검 완료 및 저장/ }),
      );

      await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
      const saved = vi.mocked(saveInspection).mock.calls[0][0];
      expect(saved.preTrialElapsedMs).toBe(17_500);
      expect(saved.elapsedMs).toBe(17_500);
      expect(saved.trialRun).toBeUndefined();
    },
  );

  it('시험운전 안내에 30초 사전점검 목표와 따로 잰다고 적는다', () => {
    start(WHEEL);
    render(<ResultPage />);
    checkAll();

    expect(
      screen.getByText(
        '시험운전 시간은 「30초 사전점검」 목표와 따로 잽니다. 목표 때문에 법정 시간을 줄이지 마십시오.',
      ),
    ).toBeInTheDocument();
  });
});

describe('결과 화면 — 연구 도구 설정은 안전 판정을 바꾸지 않는다', () => {
  // 검증 빌드에서 표본을 빨리 모으려고 절차를 건너뛰는 코드가 들어오면, 그
  // 빌드로 모은 데이터는 현장 앱이 아니라 다른 앱의 결과가 된다. 빌드 설정과
  // 기기의 연구 모드 스위치를 모두 켠 채로 같은 차단이 그대로인지 본다.
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    vi.stubEnv('NEXT_PUBLIC_ENABLE_RESEARCH_TOOLS', 'true');
    const researchSwitch = renderHook(() => useResearchMode()).result;
    act(() => researchSwitch.current[1](true));
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  afterEach(() => {
    const researchSwitch = renderHook(() => useResearchMode()).result;
    act(() => researchSwitch.current[1](false));
    vi.unstubAllEnvs();
  });

  function ready(wheel: WheelSpec = WHEEL) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel);
      result.current.setWheelCondition(CONFIRMED);
    });
    return result;
  }

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  it('숫돌 상태 확인을 하지 않았으면 결과를 보여주지 않는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('부적합 조합은 부적합이고 시험운전을 열지 않는다', () => {
    ready({ ...WHEEL, maxRPM: 8500 });
    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('부적합')).toBeInTheDocument();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
  });

  it('적합 조합도 시험운전을 마치기 전에는 저장할 수 없다', () => {
    ready();
    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('숫돌을 방금 교체했습니까?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /점검 완료 및 저장/ }),
    ).toBeDisabled();
  });

  it('시험운전에서 이상 징후를 고르면 점검 완료로 저장할 수 없다', () => {
    const result = ready();
    act(() =>
      result.current.setTrialRun({
        wheelReplaced: false,
        requiredSeconds: 60,
        startedAt: new Date(Date.now() - 65_000).toISOString(),
        endsAt: new Date(Date.now() - 5_000).toISOString(),
      }),
    );
    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getAllByRole('checkbox').at(-1)!);

    expect(
      screen.getByRole('button', { name: /이상 없음 확인/ }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /이상 있음/ }));
    expect(screen.getByText('작업하지 마십시오')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /점검 완료 및 저장/ }),
    ).not.toBeInTheDocument();
  });
});

describe('결과 화면 — 저장 함수 내부 재검사와 저장공간 오류', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    vi.mocked(saveInspection).mockClear();
    vi.mocked(saveInspection).mockReset();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  function ready(wheel: WheelSpec = WHEEL) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel);
      result.current.setWheelCondition(CONFIRMED);
    });
    return result;
  }

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  // 버튼의 disabled와 저장 함수 내부의 canSaveInspection이 같은 조건을
  // 계산한다. 버튼이 막힌 상태에서 눌러도 saveInspection이 불리지 않는지로
  // 두 계산이 실제로 같은 방향을 가리키는지 확인한다.
  it('체크리스트를 다 채우지 않았으면 눌러도 저장되지 않는다', () => {
    ready();
    render(<ResultPage />);

    const button = screen.getByRole('button', { name: /점검 완료 및 저장/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(saveInspection).not.toHaveBeenCalled();
  });

  it('적합인데 시험운전을 끝내지 않았으면 눌러도 저장되지 않는다', () => {
    ready(WHEEL);
    render(<ResultPage />);
    checkAll();

    const button = screen.getByRole('button', { name: /점검 완료 및 저장/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(saveInspection).not.toHaveBeenCalled();
  });

  it('저장 공간이 가득 차면 기록이 저장되지 않았다고 명확히 안내한다', async () => {
    // 부적합으로 두면 시험운전 없이 바로 저장을 시도할 수 있다.
    ready({ ...WHEEL, maxRPM: 8500 });
    const quotaError = new Error('storage full');
    quotaError.name = 'QuotaExceededError';
    vi.mocked(saveInspection).mockRejectedValueOnce(quotaError);

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(
        /기기 저장 공간이 가득 차 이 기록은 저장되지 않았습니다/,
      ),
    ).toBeInTheDocument();
    // 실패했으므로 이력으로 넘어가지 않는다 — 작업자가 다시 시도할 수 있어야 한다.
    expect(push).not.toHaveBeenCalledWith('/history');
  });

  it('저장공간 부족이 아닌 다른 오류는 일반 저장 실패 문구를 그대로 쓴다', async () => {
    ready({ ...WHEEL, maxRPM: 8500 });
    vi.mocked(saveInspection).mockRejectedValueOnce(new Error('network down'));

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(
        '저장에 실패했습니다. 다시 시도하세요. 계속 실패하면 아래 오류 코드를 알려 주세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/기기 저장 공간이 가득 차/),
    ).not.toBeInTheDocument();
    expect(screen.getByText('오류 코드: Error')).toBeInTheDocument();
  });

  it('폰 브라우저에서 저장 공간 부족이 아닌 오류로 실패하면 감싼 오류까지 오류 코드로 보인다', async () => {
    // 현장 폰(모바일 WebKit)에서 나던 실패의 모양이다. 저장 공간 부족이 아니다.
    ready({ ...WHEEL, maxRPM: 8500 });
    const inner = new Error(
      'Error preparing Blob/File data to be stored in object store',
    );
    inner.name = 'UnknownError';
    const error = Object.assign(new Error('Dexie wrapper'), {
      name: 'UnknownError',
      inner,
    });
    vi.mocked(saveInspection).mockRejectedValueOnce(error);

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    expect(
      await screen.findByText('오류 코드: UnknownError'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith('/history');
  });
  it('저장 공간이 모자라면 사진을 빼고 결과만 저장할지 작업자가 고른다', async () => {
    // 앱이 알아서 사진을 버리지 않는다. 고르는 것은 작업자다.
    const photo = new Blob(['x'], { type: 'image/jpeg' });
    const wheel = { ...WHEEL, maxRPM: 8500 };
    const result = ready(wheel);
    act(() => {
      result.current.setWheel(wheel, photo);
      result.current.setWheelCondition(CONFIRMED);
    });

    const quotaError = new Error('storage full');
    quotaError.name = 'QuotaExceededError';
    vi.mocked(saveInspection).mockRejectedValueOnce(quotaError);

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveInspection).mock.calls[0][0].wheelImage).toBe(photo);

    fireEvent.click(
      await screen.findByRole('button', { name: '사진을 빼고 결과만 저장' }),
    );

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(2));
    const second = vi.mocked(saveInspection).mock.calls[1][0];
    expect(second.wheelImage).toBeUndefined();
    expect(second.grinderImage).toBeUndefined();
    // 사진만 빠진다. 결과는 그대로 남는다.
    expect(second.result.verdict).toBe('INCOMPATIBLE');
  });

  it('저장공간 부족이 아니면 사진을 빼는 선택지를 내놓지 않는다', async () => {
    ready({ ...WHEEL, maxRPM: 8500 });
    vi.mocked(saveInspection).mockRejectedValueOnce(new Error('network down'));

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole('button', { name: '사진을 빼고 결과만 저장' }),
    ).not.toBeInTheDocument();
  });
  it('다각도 외관 확인 기록을 만들지 않는다 — 결과 화면에 카드가 없고 저장 기록에도 없다', async () => {
    // 뒷면·가장자리·중심구멍 사진과 AI 확인 단계는 점검 흐름에서 뺐다. 하지 않은
    // 확인을 화면이나 기록에 남기지 않는다(이전 기록의 것은 이력이 그대로 보인다).
    ready({ ...WHEEL, maxRPM: 8500 });

    render(<ResultPage />);
    expect(screen.queryByText('다각도 외관 확인 기록')).not.toBeInTheDocument();

    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));

    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    for (const key of [
      'wheelExam',
      'wheelExamNotRun',
      'wheelExamAcknowledged',
      'wheelBackImage',
      'wheelEdgeImage',
      'wheelBoreImage',
      'wheelBackCaptureMetrics',
      'wheelEdgeCaptureMetrics',
      'wheelBoreCaptureMetrics',
    ]) {
      expect(saved).not.toHaveProperty(key);
    }
  });

  it('사진 상태 확인 기록을 함께 저장한다 — 사진을 빼고 저장해도 남는다', async () => {
    const wheel = { ...WHEEL, maxRPM: 8500 };
    const result = ready(wheel);
    const check = {
      checkVersion: 'v1',
      warnings: ['blur' as const],
      usedDespiteWarning: true,
      retakeCount: 1,
    };
    act(() => {
      result.current.setCaptureCheck('grinder', check);
      result.current.setCaptureCheck('wheel', { ...check, warnings: [] });
    });

    const quotaError = new Error('storage full');
    quotaError.name = 'QuotaExceededError';
    vi.mocked(saveInspection).mockRejectedValueOnce(quotaError);

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: '사진을 빼고 결과만 저장' }),
    );
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(2));

    const saved = vi.mocked(saveInspection).mock.calls[1][0];
    expect(saved.captureChecks).toEqual({
      grinder: check,
      wheel: { ...check, warnings: [] },
    });
  });

  it('사진 상태 확인 기록이 없으면 기록에 빈 객체를 남기지 않는다', async () => {
    ready({ ...WHEEL, maxRPM: 8500 });

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));

    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.captureChecks).toBeUndefined();
  });

  it('촬영 품질 측정값과 OCR telemetry를 저장한다 — 사진을 빼고 저장해도 남는다', async () => {
    // 검증용 실측 데이터(safety-critical.md 2번과 별개)다. 판정에는 쓰지
    // 않지만, 사진을 빼고 저장해도 숫자 자체는 남아야 인식률·정정률을
    // 나중에 잴 수 있다.
    const grinderMetrics = {
      originalWidth: 4032,
      originalHeight: 3024,
      originalBytes: 7_580_000,
      uploadWidth: 2048,
      uploadHeight: 1536,
      uploadBytes: 1_830_000,
      meanBrightness: 120.5,
      contrast: 42.1,
      darkPixelRatio: 0.02,
      brightPixelRatio: 0.01,
      blurMetric: 913.4,
      optimizeMs: 210,
    };
    const wheelMetrics = { ...grinderMetrics, optimizeMs: 180 };
    const grinderTelemetry = {
      engine: 'claude' as const,
      model: 'claude-sonnet-5',
      inputTokens: 1500,
      outputTokens: 80,
      cacheReadTokens: 0,
      cacheCreationTokens: 1500,
      durationMs: 2100,
    };
    const wheelTelemetry = { ...grinderTelemetry, durationMs: 1800 };

    // 부적합 조합을 쓴다 — 적합이면 시험운전을 먼저 마쳐야 저장 버튼이 열린다.
    // 여기서 보려는 것은 시험운전 흐름이 아니라 telemetry가 저장에 실리는지다.
    const wheel = { ...WHEEL, maxRPM: 8500 };
    const result = store();
    act(() => {
      result.current.setGrinder(
        GRINDER,
        null,
        null,
        grinderMetrics,
        grinderTelemetry,
      );
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel, null, null, wheelMetrics, wheelTelemetry);
      result.current.setWheelCondition(CONFIRMED);
    });

    const quotaError = new Error('storage full');
    quotaError.name = 'QuotaExceededError';
    vi.mocked(saveInspection).mockRejectedValueOnce(quotaError);

    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: '사진을 빼고 결과만 저장' }),
    );
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(2));

    const saved = vi.mocked(saveInspection).mock.calls[1][0];
    expect(saved.grinderCaptureMetrics).toEqual(grinderMetrics);
    expect(saved.wheelCaptureMetrics).toEqual(wheelMetrics);
    expect(saved.grinderOcrTelemetry).toEqual(grinderTelemetry);
    expect(saved.wheelOcrTelemetry).toEqual(wheelTelemetry);
    // 사진은 뺐다 — 숫자만 남고 Blob은 없다.
    expect(saved.grinderImage).toBeUndefined();
    expect(saved.wheelImage).toBeUndefined();
  });

  it('작업 조건·Profile·조건 표를 저장하고, 판정은 바꾸지 않는다', async () => {
    const wheel = { ...WHEEL, maxRPM: 8500 };
    const result = ready(wheel);
    act(() => {
      result.current.setPurpose('cutting', {
        material: 'steel',
        cooling: 'unknown',
      });
      result.current.setGrinder({ ...GRINDER, guardType: 'none' });
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    // 덮개 없음은 어긋남으로 보인다. 그래도 판정은 기존 규칙(RPM 부족 → 부적합) 그대로다.
    expect(
      screen.getByText(
        '덮개가 없다고 고르셨습니다. 이 종류는 덮개가 필요합니다. 덮개를 달기 전에는 작업하지 마십시오.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('부적합')).toBeInTheDocument();

    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));

    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.workConditions).toEqual({
      material: 'steel',
      cooling: 'unknown',
    });
    expect(saved.accessoryProfile?.type).toBe('bonded_abrasive');
    expect(saved.profileConditions).toContainEqual({
      key: 'guard',
      status: 'conflict',
      code: 'guard.missing',
    });
    expect(saved.result.verdict).toBe('INCOMPATIBLE');
  });

  it('Profile이 없는 종류는 조건표가 없다고 알리고 Profile을 저장하지 않는다', async () => {
    ready({ ...WHEEL, maxRPM: 8500, wheelType: 'diamond' });

    render(<ResultPage />);
    expect(
      screen.getByText(
        '이 종류에 적용할 조건표가 없습니다. 제조사 취급설명서를 확인하세요.',
      ),
    ).toBeInTheDocument();

    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));

    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.accessoryProfile).toBeUndefined();
    expect(saved.profileConditions).toBeUndefined();
  });
  it('덮개 없음 — 상단 판정·조건 표·저장 기록·CSV가 모두 비통과로 일치한다', async () => {
    // 회전속도·지름·유효기한이 모두 맞는 조합이다. 덮개 입력만 어긋난다.
    const result = ready(WHEEL);
    act(() => {
      result.current.setGrinder({ ...GRINDER, guardType: 'none' });
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    // 상단 판정: 적합이 아니다.
    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/표시된 규격끼리는 서로 맞습니다/),
    ).not.toBeInTheDocument();
    // 조건 표: 어긋남.
    expect(screen.getByText('⚠ 덮개 · 어긋남')).toBeInTheDocument();
    // 적합 조합에서만 여는 시험운전이 열리지 않는다.
    checkAll();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));

    // 저장 기록: 같은 판정과 근거, 새 규칙·Profile 버전.
    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.result.verdict).toBe('UNDETERMINED');
    expect(
      saved.result.checks.find((check) => check.rule === '덮개 조건')?.detail
        ?.code,
    ).toBe('guard.missing');
    expect(saved.ruleVersion).toBe(RULESET_VERSION);
    expect(saved.accessoryProfile).toEqual({
      type: 'bonded_abrasive',
      version: BONDED_ABRASIVE_PROFILE.version,
      scope: 'full',
    });
    expect(saved.profileConditions).toContainEqual({
      key: 'guard',
      status: 'conflict',
      code: 'guard.missing',
    });

    // CSV: 판정 열과 어긋남 열이 같은 말을 한다.
    const [header, row] = toCsv([{ ...saved, id: 1 }])
      .replace(/^\uFEFF/, '')
      .split('\r\n');
    expect(header.split(',')).toEqual([...CSV_COLUMNS]);
    const cells = row.split(',');
    expect(cells[CSV_COLUMNS.indexOf('verdict')]).toBe('UNDETERMINED');
    expect(cells[CSV_COLUMNS.indexOf('profileConflicts')]).toBe(
      'guard.missing',
    );
    expect(cells[CSV_COLUMNS.indexOf('ruleVersion')]).toBe(RULESET_VERSION);
  });

  it('숫돌보다 작은 덮개 — 화면에서 적합으로 보이지 않는다', () => {
    const result = ready(WHEEL);
    act(() => {
      result.current.setGrinder({ ...GRINDER, guardSize: 115 });
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(screen.getByText('⚠ 덮개 크기 · 어긋남')).toBeInTheDocument();
  });

  it('덮개를 입력하지 않으면 적합 조합은 그대로 적합이다', () => {
    ready(WHEEL);
    render(<ResultPage />);

    expect(screen.getByText('적합')).toBeInTheDocument();
  });

  it('덮개 없음 — 판정불가 안내가 충돌 사유를 말하고, 덮개 재확인 버튼만 보인다', () => {
    const result = ready(WHEEL);
    act(() => {
      result.current.setGrinder({ ...GRINDER, guardType: 'none' });
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    expect(
      screen.getByText(
        '덮개 정보가 서로 충돌합니다. 그라인더 상태와 덮개 선택을 다시 확인하세요.',
      ),
    ).toBeInTheDocument();
    // 상태를 대신 고치지 않는다 — 명판 확인 화면으로 보내는 이동 버튼뿐이다.
    const recheck = screen.getByRole('link', { name: '덮개 정보 다시 확인' });
    expect(recheck).toHaveAttribute('href', '/scan/grinder');
    // 원인과 무관한 일반 안내·버튼은 뜨지 않는다.
    expect(
      screen.queryByText(
        '값이 부족하거나 인식 신뢰도가 낮습니다. 다시 촬영하거나 값을 직접 입력하면 판정할 수 있습니다.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '그라인더부터 다시 확인' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '숫돌만 다시 확인' }),
    ).not.toBeInTheDocument();
  });

  it('숫돌보다 작은 덮개 — 제조사 설명서를 보라는 안내와 덮개 재확인 버튼을 보인다', () => {
    const result = ready(WHEEL);
    act(() => {
      result.current.setGrinder({ ...GRINDER, guardSize: 115 });
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(WHEEL);
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    expect(
      screen.getByText(
        '선택한 덮개가 액세서리 조건과 맞는지 확인할 수 없습니다. 제조사 설명서를 확인하세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '덮개 정보 다시 확인' }),
    ).toHaveAttribute('href', '/scan/grinder');
    expect(
      screen.queryByRole('link', { name: '그라인더부터 다시 확인' }),
    ).not.toBeInTheDocument();
  });

  it('덮개와 무관한 판정불가는 기존 일반 안내와 두 재촬영 버튼을 그대로 보인다', () => {
    ready({ ...WHEEL, maxRPM: null });
    render(<ResultPage />);

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(
      screen.getByText(
        '값이 부족하거나 인식 신뢰도가 낮습니다. 다시 촬영하거나 값을 직접 입력하면 판정할 수 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '그라인더부터 다시 확인' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '숫돌만 다시 확인' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '덮개 정보 다시 확인' }),
    ).not.toBeInTheDocument();
  });
});

describe('결과 화면 — 알려진 액세서리 Profile', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    vi.mocked(saveInspection).mockClear();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  const FLAP: WheelSpec = {
    ...WHEEL,
    wheelType: 'flap_disc',
    purpose: 'unknown',
    expiry: null,
  };
  const FLAP_CONDITION: WheelCondition = {
    damageFree: true,
    notDeformed: null,
    mountingAreaUndamaged: true,
    labelLegible: true,
    expiryValid: null,
    flapsIntact: true,
    noDelamination: true,
    flapBackingIntact: true,
  };

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  it('플랩디스크는 날개·박리·백킹판을 확인하지 않았으면 결과를 열지 않는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(FLAP);
      // 기존 다섯 항목만 확인했다 — 플랩 항목이 비어 있다.
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('판정 범위가 제한적인 종류는 RPM·지름이 맞아도 판정불가이며, 그 사실을 알린 뒤 저장할 수 있다', async () => {
    // flap_disc는 scope가 limited다 — 작업·덮개·재료의 근거가 없어 RPM·지름이
    // 맞아도 적합을 내지 않는다(checkProfileScope). 시험운전 근거 부재 안내는
    // 적합 조합에서만 뜨므로, 판정불가로 바뀐 이 조합에서는 뜨지 않는다.
    const result = store();
    act(() => {
      result.current.setPurpose('grinding');
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(FLAP);
      result.current.setWheelCondition(FLAP_CONDITION);
    });

    render(<ResultPage />);

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    // 초록·적합·안전 표현을 쓰지 않는다.
    expect(
      screen.queryByText(/안전합니다|사용해도 됩니다|검사 통과/),
    ).not.toBeInTheDocument();
    // 같은 문장이 검사 항목 사유와 안내 배너 양쪽에 나온다.
    expect(
      screen.getAllByText(
        'RPM과 지름만 대조했습니다. 작업·덮개·장착 적합성은 확인되지 않아 적합 판정을 제공하지 않습니다.',
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('제한적 규격 대조')).toBeInTheDocument();
    checkAll();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        '이 종류에는 시험운전 기준의 근거가 이 앱에 없어 시험운전을 요구하거나 기록하지 않습니다. 제조사 취급설명서의 시운전 안내를 따르세요.',
      ),
    ).not.toBeInTheDocument();
    // 근거 없는 작업·유효기한은 여전히 통과가 아니라 직접 확인 항목으로 보인다.
    expect(
      screen.getByText(/이 종류에 맞는 작업인지 대조할 근거가/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/이 종류에 유효기한 기준을 적용할 근거가/),
    ).toBeInTheDocument();

    // 판정불가는 저장을 막지 않는다 — 시험운전 미정산도 적합 조합에만 해당한다.
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.trialRun).toBeUndefined();
    expect(saved.accessoryProfile).toEqual({
      type: 'flap_disc',
      version: expect.any(String),
      scope: 'limited',
    });
    expect(saved.wheelCondition?.flapsIntact).toBe(true);
    expect(saved.result.verdict).toBe('UNDETERMINED');
    expect(
      saved.result.checks.find((check) => check.rule === '제한적 규격 대조')
        ?.detail?.code,
    ).toBe('profileScope.limited');
  });

  it('결합숫돌 세부 형식은 기존처럼 시험운전 전에는 저장할 수 없다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel({ ...WHEEL, wheelType: 'bonded_cutting' });
      result.current.setWheelCondition(CONFIRMED);
    });

    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('적합')).toBeInTheDocument();
    expect(screen.getByText('시험운전')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /점검 완료 및 저장/ }),
    ).toBeDisabled();
  });
});

describe('결과 화면 — 제한 대조와 서버 재분석', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    removeDraft.mockClear();
    extractGrinder.mockReset();
    extractWheel.mockReset();
    vi.mocked(saveInspection).mockReset();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  /**
   * 명판 단계가 제한 대조로 확정되고 두 Gate를 마친 상태. 규격은 서로 맞는다.
   *
   * @param cause 제한된 까닭. 넘기지 않으면 까닭 없이 표시만 남는다 — 까닭을 적기
   *   전 형식의 진행 중 점검이 이렇게 읽힌다.
   */
  function readyOffline(wheel: WheelSpec = WHEEL, cause?: AnalysisLimitCause) {
    const result = store();
    act(() => {
      result.current.setGrinder(
        GRINDER,
        new Blob(['plate'], { type: 'image/jpeg' }),
        null,
      );
      result.current.setOfflineSlot('grinder', true, cause);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(wheel);
      result.current.setWheelCondition(CONFIRMED);
    });
    return result;
  }

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  it('규격이 맞아도 적합이 아니라 판정불가 + 제한 대조이고 시험운전을 열지 않는다', () => {
    readyOffline();
    render(<ResultPage />);
    checkAll();

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        '제한 대조입니다. 확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 적합 판정을 제공하지 않습니다. 풀려면 서버 재분석이나 다시 촬영이 필요합니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '⚠ 제한 대조' }),
    ).toBeInTheDocument();
  });

  it('확정된 RPM 위반은 제한 대조여도 부적합이다', () => {
    readyOffline({ ...WHEEL, maxRPM: 8500 });
    render(<ResultPage />);
    expect(screen.getByText('부적합')).toBeInTheDocument();
  });

  // 제한 대조는 값이 모자라서 판정불가인 것이 아니다. 판정 카드 아래 문구가
  // 「값을 직접 입력하세요」라고 하면, 직접 입력해서 제한 대조가 된 작업자를 같은
  // 자리로 되돌려 보낸다.
  it('판정 카드 아래에 값이 부족하다고 적지 않고 제한 대조라고 적는다', () => {
    readyOffline();
    render(<ResultPage />);

    expect(
      screen.getByText(
        '제한 대조라 적합 판정을 제공하지 않습니다. 아래 항목과 안내를 확인하세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        '값이 부족해 판정할 수 없습니다. 재촬영하거나 값을 직접 입력하세요.',
      ),
    ).not.toBeInTheDocument();
  });

  it('검사 항목의 이름과 사유도 까닭을 단정하지 않는다', () => {
    readyOffline();
    render(<ResultPage />);

    expect(
      screen.getAllByText(
        '확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만 대조했습니다. RPM·지름 위반만 부적합으로 판정하며 적합 판정은 제공하지 않습니다.',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        '이 결과는 확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만 대조했습니다. RPM·지름 위반은 부적합으로 판정하지만 적합 판정은 제공하지 않고 시험운전도 열지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/오프라인/)).not.toBeInTheDocument();
    expect(screen.queryByText(/서버 분석 없이/)).not.toBeInTheDocument();
    expect(screen.queryByText(/서버에 닿지/)).not.toBeInTheDocument();
  });

  describe('제한된 까닭', () => {
    // 까닭은 확인 화면이 확정할 때 남긴 그대로만 적는다. 결과 화면이 추정하지 않는다.
    it.each([
      ['manual', '그라인더: 서버에 닿지 못해 직접 입력한 값입니다.'],
      ['local_ocr', '그라인더: 서버가 아니라 이 기기에서 읽은 값입니다.'],
      [
        'dropped_ocr',
        '그라인더: 저장된 AI 판독을 읽을 수 없어 버린 뒤 확정한 값입니다.',
      ],
      ['unknown', '그라인더: 제한된 까닭이 기록되지 않았습니다.'],
    ] as const)('기록된 까닭을 한 줄로 적는다 — %s', (cause, line) => {
      readyOffline(WHEEL, cause);
      render(<ResultPage />);

      expect(screen.getByText(line)).toBeInTheDocument();
    });

    it('까닭이 남아 있지 않으면 추정하지 않고 기록되지 않았다고 적는다', () => {
      // 까닭을 적기 전 형식으로 저장된 진행 중 점검이 이렇게 들어온다.
      readyOffline();
      render(<ResultPage />);

      expect(
        screen.getByText('그라인더: 제한된 까닭이 기록되지 않았습니다.'),
      ).toBeInTheDocument();
    });

    it('제한된 단계만 적는다 — 서버로 읽은 단계의 줄은 없다', () => {
      readyOffline(WHEEL, 'manual');
      render(<ResultPage />);

      expect(screen.queryByText(/^숫돌: /)).not.toBeInTheDocument();
    });

    it('두 단계가 모두 제한됐으면 단계마다 적는다', () => {
      const result = readyOffline(WHEEL, 'manual');
      act(() => {
        result.current.setOfflineSlot('wheel', true, 'dropped_ocr');
      });
      render(<ResultPage />);

      expect(
        screen.getByText('그라인더: 서버에 닿지 못해 직접 입력한 값입니다.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          '숫돌: 저장된 AI 판독을 읽을 수 없어 버린 뒤 확정한 값입니다.',
        ),
      ).toBeInTheDocument();
    });

    it('까닭이 무엇이든 적합을 내지 않고 시험운전을 열지 않는다', () => {
      // 까닭은 사실을 적는 값일 뿐이다. 제한을 푸는 근거로 쓰이면 안 된다.
      for (const cause of [
        'manual',
        'local_ocr',
        'dropped_ocr',
        'unknown',
      ] as const) {
        const result = readyOffline(WHEEL, cause);
        const view = render(<ResultPage />);
        checkAll();

        expect(result.current.analysisMode, cause).toBe('offline_limited');
        expect(screen.getByText('판정불가')).toBeInTheDocument();
        expect(screen.queryByText('적합')).not.toBeInTheDocument();
        expect(screen.queryByText('시험운전')).not.toBeInTheDocument();
        view.unmount();
      }
    });

    it('저장하면 단계별 까닭을 기록에 남긴다', async () => {
      readyOffline(WHEEL, 'dropped_ocr');
      vi.mocked(saveInspection).mockResolvedValueOnce(1);
      render(<ResultPage />);
      checkAll();
      fireEvent.click(
        screen.getByRole('button', { name: /점검 완료 및 저장/ }),
      );

      await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
      const saved = vi.mocked(saveInspection).mock.calls[0][0];
      expect(saved.analysisMode).toBe('offline_limited');
      // 제한되지 않은 숫돌 단계에는 까닭이 없다.
      expect(saved.analysisLimitCauses).toEqual({ grinder: 'dropped_ocr' });
    });

    it('까닭이 남아 있지 않은 점검은 지어내지 않고 unknown으로 남긴다', async () => {
      readyOffline();
      vi.mocked(saveInspection).mockResolvedValueOnce(1);
      render(<ResultPage />);
      checkAll();
      fireEvent.click(
        screen.getByRole('button', { name: /점검 완료 및 저장/ }),
      );

      await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
      expect(
        vi.mocked(saveInspection).mock.calls[0][0].analysisLimitCauses,
      ).toEqual({ grinder: 'unknown' });
    });

    it('재분석으로 제한을 푼 단계는 까닭도 함께 사라진다', async () => {
      const result = readyOffline(WHEEL, 'manual');
      extractGrinder.mockResolvedValue({ ...GRINDER, rawText: 'AI' });
      render(<ResultPage />);

      await act(async () => {
        screen.getByRole('button', { name: '서버로 다시 분석하기' }).click();
      });
      await act(async () => {
        screen
          .getByRole('button', {
            name: 'AI 값과 같음을 확인하고 제한 대조 풀기',
          })
          .click();
      });

      expect(result.current.analysisMode).toBe('online');
      expect(result.current.offlineSlots).toEqual({
        grinder: false,
        wheel: false,
      });
      expect(
        screen.queryByText('그라인더: 서버에 닿지 못해 직접 입력한 값입니다.'),
      ).not.toBeInTheDocument();
    });
  });

  it('저장하면 판독 경로를 함께 남기고, 저장에 성공한 뒤에만 draft를 지운다', async () => {
    readyOffline();
    vi.mocked(saveInspection).mockResolvedValueOnce(1);
    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.analysisMode).toBe('offline_limited');
    expect(saved.result.verdict).toBe('UNDETERMINED');
    expect(saved.trialRun).toBeUndefined();
    await waitFor(() => expect(removeDraft).toHaveBeenCalledTimes(1));
  });

  it('최종 저장이 실패하면 draft를 지우지 않는다', async () => {
    readyOffline();
    vi.mocked(saveInspection).mockRejectedValueOnce(new Error('disk'));
    render(<ResultPage />);
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /점검 완료 및 저장/ }),
      ).toBeEnabled(),
    );
    expect(removeDraft).not.toHaveBeenCalled();
  });

  it('온라인 점검은 online으로 남긴다', async () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel({ ...WHEEL, maxRPM: 8500 });
      result.current.setWheelCondition(CONFIRMED);
    });
    vi.mocked(saveInspection).mockResolvedValueOnce(1);
    render(<ResultPage />);
    expect(
      screen.queryByRole('heading', { name: '⚠ 제한 대조' }),
    ).not.toBeInTheDocument();
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));

    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.analysisMode).toBe('online');
    // 제한되지 않은 점검에는 까닭이 없다. 빈 객체로도 남기지 않는다.
    expect(saved).not.toHaveProperty('analysisLimitCauses');
  });

  it('연결이 돌아와도 사용자가 고르기 전에는 서버를 부르지 않는다', () => {
    readyOffline();
    render(<ResultPage />);
    expect(
      screen.getByRole('button', { name: '서버로 다시 분석하기' }),
    ).toBeInTheDocument();
    expect(extractGrinder).not.toHaveBeenCalled();
  });

  it('재분석 값이 입력값과 같으면 나란히 보여 준 뒤 전환을 허락하고, 입력값은 그대로다', async () => {
    const result = readyOffline();
    extractGrinder.mockResolvedValue({ ...GRINDER, rawText: 'AI' });
    render(<ResultPage />);

    await act(async () => {
      screen.getByRole('button', { name: '서버로 다시 분석하기' }).click();
    });

    expect(
      screen.getByText(
        '무부하 회전속도: 확정한 값 11000rpm / AI 값 11000rpm · 같음',
      ),
    ).toBeInTheDocument();
    // 전환 전까지는 여전히 제한 대조 결과다.
    expect(screen.getByText('판정불가')).toBeInTheDocument();

    await act(async () => {
      screen
        .getByRole('button', {
          name: 'AI 값과 같음을 확인하고 제한 대조 풀기',
        })
        .click();
    });

    expect(result.current.analysisMode).toBe('online');
    expect(result.current.grinder).toEqual(GRINDER);
    expect(result.current.grinderOcr?.rawText).toBe('AI');
    expect(screen.getByText('적합')).toBeInTheDocument();
  });

  it('재분석 값이 다르면 전환을 막고, 취소하면 제한 대조 결과를 유지한다', async () => {
    const result = readyOffline();
    extractGrinder.mockResolvedValue({ ...GRINDER, noLoadRPM: 13000 });
    render(<ResultPage />);

    await act(async () => {
      screen.getByRole('button', { name: '서버로 다시 분석하기' }).click();
    });

    expect(
      screen.getByRole('button', {
        name: 'AI 값과 같음을 확인하고 제한 대조 풀기',
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        '확정한 값과 AI 값이 다르거나 AI가 읽지 못한 값이 있어 제한 대조를 풀 수 없습니다. 제한 대조 결과를 유지하거나 다시 촬영하세요.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '취소하고 제한 대조 결과 유지' }),
    );
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(result.current.grinder?.noLoadRPM).toBe(11000);
    expect(screen.getByText('판정불가')).toBeInTheDocument();
  });

  it('재분석이 다시 실패하면 값을 지어내지 않고 제한 대조 결과를 유지한다', async () => {
    const result = readyOffline();
    extractGrinder.mockRejectedValue(new Error('network'));
    render(<ResultPage />);

    await act(async () => {
      screen.getByRole('button', { name: '서버로 다시 분석하기' }).click();
    });

    expect(
      screen.getByText(
        '서버 재분석에 실패했습니다. 제한 대조 결과를 그대로 유지합니다.',
      ),
    ).toBeInTheDocument();
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(result.current.grinderOcr).toBeNull();
  });

  it('기기가 오프라인이면 재분석 버튼을 보이지 않는다', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    readyOffline();
    render(<ResultPage />);

    expect(
      screen.queryByRole('button', { name: '서버로 다시 분석하기' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        '지금 기기가 오프라인입니다. 연결되면 서버 재분석을 선택할 수 있습니다.',
      ),
    ).toBeInTheDocument();
    online.mockRestore();
  });
});

describe('결과 화면 — 숫돌 라벨 재분석이 낸 외관 의심과 원본 표시', () => {
  // 숫돌 라벨을 서버 분석 없이 직접 넣은 점검은 확정값에 외관 판독도 원본 표시도
  // 없다(confirmedWheelSpec(null, …) — visibleDamage는 unknown, markings는 없음).
  // 결과 화면에서 서버 재분석을 받아들여 온라인 대조로 바꿀 때, 같은 사진을 처음부터
  // 온라인으로 읽었다면 판정에 들어갔을 값이 빠지면 재분석 경로가 온라인 경로보다
  // 느슨해진다. 의심을 덜어내는 방향이라 넣을 수 없다(docs/safety-boundaries.md).
  const DAMAGE_SUSPECTED =
    '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.';
  const DAMAGE_NOT_VERIFIABLE =
    '사진으로는 미세균열을 확인할 수 없습니다. 장착 전 타음검사(가볍게 두드려 소리 확인)를 하세요.';
  const MARKINGS_MISMATCH =
    '라벨의 회전속도 표기와 원주속도 표기가 서로 맞지 않습니다. 둘 중 하나를 잘못 읽었을 수 있습니다. 라벨의 숫자를 다시 확인하세요.';
  const ACCEPT = 'AI 값과 같음을 확인하고 제한 대조 풀기';
  const CANCEL = '취소하고 제한 대조 결과 유지';
  const AI_DAMAGE_ALERT =
    '⚠ AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.';
  const RECHECK_HINT =
    '앞서 답한 숫돌 손상 확인은 아래 AI 경고를 보기 전의 답입니다. 숫돌 실물을 다시 보고 답해야 제한 대조를 풀 수 있습니다.';
  const VALUES_DIFFER =
    '확정한 값과 AI 값이 다르거나 AI가 읽지 못한 값이 있어 제한 대조를 풀 수 없습니다. 제한 대조 결과를 유지하거나 다시 촬영하세요.';

  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    removeDraft.mockClear();
    extractGrinder.mockReset();
    extractWheel.mockReset();
    vi.mocked(saveInspection).mockReset();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
  });

  /** 확인 화면에서 작업자가 라벨을 직접 보고 넣은 값. 화면과 같은 함수로 만든다 */
  const TYPED_WHEEL = confirmedWheelSpec(null, {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    expiryText: '12/2099',
    expiryReview: 'marked',
    userConfirmed: true,
  });

  /** 서버(route.ts)가 같은 라벨 사진에서 읽어 돌려주는 모양 */
  function aiWheel(
    overrides: Partial<WheelSpec> = {},
    markings: Partial<NonNullable<WheelSpec['markings']>> = {},
  ): WheelSpec {
    return {
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      visibleDamage: 'none_visible',
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: 80,
        boreDiameter: 22.23,
        expiryRaw: '12/2099',
        ...markings,
      },
      rpmSource: 'label',
      expiry: { year: 2099, month: 12 },
      rawText: 'AI',
      confidence: 'high',
      ...overrides,
    };
  }

  /** 명판은 온라인으로 읽고 숫돌 라벨만 직접 넣은 뒤 두 Gate를 마친 상태 */
  function readyOfflineWheel(wheel: WheelSpec = TYPED_WHEEL) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER, null, GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(
        wheel,
        new Blob(['label'], { type: 'image/jpeg' }),
        null,
      );
      result.current.setOfflineSlot('wheel', true);
      result.current.setWheelCondition(CONFIRMED);
    });
    return result;
  }

  async function reanalyze() {
    await act(async () => {
      screen.getByRole('button', { name: '서버로 다시 분석하기' }).click();
    });
  }

  /** 전환 버튼을 누른다. 막혀 있으면 눌러도 아무 일도 일어나지 않아야 한다 */
  async function accept() {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: ACCEPT }));
    });
  }

  function checkAll() {
    for (const box of screen.getAllByRole('checkbox')) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
  }

  it('직접 입력한 숫돌은 재분석 전에는 외관을 확인할 수 없다고만 말한다', () => {
    readyOfflineWheel();
    render(<ResultPage />);

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_NOT_VERIFIABLE)).toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_SUSPECTED)).not.toBeInTheDocument();
  });

  it('재분석한 AI가 외관 손상을 의심하면 전환하기 전에도 결과의 외관 항목이 경고로 바뀐다', async () => {
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'suspected' }));
    render(<ResultPage />);

    await reanalyze();

    // 아직 전환하지 않았다. 제한 대조 결과 그대로이고 경고만 더해졌다.
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_NOT_VERIFIABLE)).not.toBeInTheDocument();
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    // AI 값은 아직 받아들이지 않았다. OCR 원본 자리도 원본 표시도 비어 있다.
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.wheel?.markings).toBeUndefined();
    // 의심의 출처는 재분석이다. 이 사진을 읽은 판독이라 출처 줄은 붙지 않는다.
    expect(result.current.wheel?.visibleDamageSources).toEqual(['reanalysis']);
  });

  it('이어받은 의심이 있던 숫돌을 재분석도 의심하면 출처 줄이 사라지지 않고 「…에서도」로 바뀐다', async () => {
    // 확인 화면을 되살리지 못해 라벨을 다시 찍었고(다른 숫돌일 수 있다), 서버에 닿지
    // 못해 직접 입력으로 확정한 점검이다. 재분석이 의심을 더했다고 「다른 숫돌을
    // 촬영했더라도 실물을 직접 확인하세요」가 화면에서 사라지면, 앱이 보여 주던
    // 경고를 앱이 줄인 것이 된다.
    const CARRIED_ONLY =
      '이 의심은 라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인에서 이어받은 것입니다. 이 점검에 쓴 라벨 사진의 판독에서 나온 것이 아닙니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.';
    const CARRIED_ALSO =
      '라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인에서도 AI의 손상 의심이 있었습니다. 그 의심도 지우지 않고 이어갑니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.';
    const result = readyOfflineWheel(
      confirmedWheelSpec(null, {
        maxRPM: 12200,
        diameter: 125,
        thickness: 1.6,
        purpose: 'cutting',
        wheelType: 'bonded_abrasive',
        expiryText: '12/2099',
        expiryReview: 'marked',
        userConfirmed: true,
        priorDamageSources: ['carried'],
      }),
    );
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'suspected' }));
    render(<ResultPage />);

    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
    expect(screen.getByText(CARRIED_ONLY)).toBeInTheDocument();

    await reanalyze();

    expect(result.current.wheel?.visibleDamageSources).toEqual([
      'carried',
      'reanalysis',
    ]);
    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
    expect(screen.getByText(CARRIED_ALSO)).toBeInTheDocument();
    // 이 사진의 판독(재분석)도 의심했다. 「이 사진의 판독에서 나온 것이 아닙니다」는
    // 더 이상 사실이 아니라 내려간다.
    expect(screen.queryByText(CARRIED_ONLY)).not.toBeInTheDocument();
  });

  it('의심이 올라온 숫돌은 손상 항목을 다시 확인하기 전에는 온라인 대조로 바꿀 수 없다', async () => {
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'suspected' }));
    render(<ResultPage />);

    await reanalyze();
    expect(
      screen.getByText(
        '최고사용회전속도: 확정한 값 12200rpm / AI 값 12200rpm · 같음',
      ),
    ).toBeInTheDocument();
    // 값은 모두 같다. 그래도 경고를 보고 다시 답하기 전에는 열리지 않는다.
    expect(screen.getByText(RECHECK_HINT)).toBeInTheDocument();
    expect(screen.getByText(AI_DAMAGE_ALERT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ACCEPT })).toBeDisabled();
    await accept();
    expect(result.current.analysisMode).toBe('offline_limited');

    // 답은 작업자가 직접 누른다. 앱이 대신 고르지 않는다.
    expect(screen.getByRole('button', { name: /확인함/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: /확인함/ }));
    expect(screen.getByRole('button', { name: ACCEPT })).toBeEnabled();
    await accept();

    expect(result.current.analysisMode).toBe('online');
    // 같은 사진을 처음부터 온라인으로 읽었다면 이 경고가 나왔다.
    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_NOT_VERIFIABLE)).not.toBeInTheDocument();
    // 외관 손상은 경고다. 판정은 엔진이 낸 그대로다.
    expect(screen.getByText('적합')).toBeInTheDocument();
    // 숫돌 상태 기록은 작업자가 답한 그대로다.
    expect(result.current.wheelCondition).toEqual(CONFIRMED);
  });

  it('다시 물은 손상 항목에 문제 있음으로 답하면 결과를 닫고 사용 중지를 알린다', async () => {
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'suspected' }));
    vi.mocked(saveInspection).mockResolvedValue(1);
    const view = render(<ResultPage />);

    await reanalyze();
    fireEvent.click(screen.getByRole('button', { name: /문제 있음/ }));

    // 답은 숫돌 상태에 남는다. 다른 항목의 답은 그대로다.
    expect(result.current.wheelCondition).toEqual({
      ...CONFIRMED,
      damageFree: false,
    });
    expect(result.current.analysisMode).toBe('offline_limited');
    // 숫돌 확인 화면의 Gate가 같은 답에 보이는 정지 안내를 여기서도 보인다. 곧바로
    // 촬영 화면으로 보내면 이 문장을 한 번도 보지 못한다.
    const stop = screen.getByRole('alert');
    expect(stop).toHaveTextContent('이 숫돌을 사용하지 마십시오');
    expect(stop).toHaveTextContent(
      '숫돌 상태에 문제가 확인되었습니다. 장착하지 말고 사용 가능한 다른 숫돌로 교체한 뒤 다시 점검하세요.',
    );
    expect(replace).not.toHaveBeenCalled();
    // 숫돌 상태에 문제가 있으면 규격이 맞아도 진행하지 못한다. 대조 결과도, 전환도,
    // 저장도 없다.
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(screen.queryByText('판정불가')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: ACCEPT }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /점검 완료 및 저장/ }),
    ).not.toBeInTheDocument();
    expect(saveInspection).not.toHaveBeenCalled();
    // 작업자가 눌러서 숫돌 확인으로 간다.
    expect(
      screen.getByRole('link', { name: '숫돌만 다시 확인' }),
    ).toHaveAttribute('href', '/scan/wheel');

    // 새로고침하거나 주소로 다시 와도 결과는 열리지 않는다. 그때는 가드가 평소대로
    // 숫돌 확인으로 돌려보낸다.
    view.unmount();
    render(<ResultPage />);
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('규격 대조 결과')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/wheel');
  });

  it('손상 항목은 숫돌 종류가 무엇이든 숫돌 상태 확인에서 묻는 항목이다', () => {
    // 재확인은 damageFree 하나를 다시 받고, 「문제 있음」이면 그 답을 숫돌 상태에
    // 남겨 결과 화면의 가드가 막게 한다. 가드는 그 종류에서 묻는 항목만 보므로,
    // 이 항목을 묻지 않는 종류가 생기면 신고한 손상이 가드에 걸리지 않는다.
    for (const { value } of WHEEL_TYPE_OPTIONS) {
      expect(conditionItemsFor(value), value).toContain('damageFree');
    }
  });

  it('취소하면 AI 값은 버리지만 AI가 올린 의심은 남는다', async () => {
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'suspected' }));
    render(<ResultPage />);

    await reanalyze();
    fireEvent.click(screen.getByRole('button', { name: CANCEL }));

    expect(result.current.analysisMode).toBe('offline_limited');
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.wheel?.markings).toBeUndefined();
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
  });

  it('값이 달라 전환이 막혀도 의심은 남고, 전환할 수 없으므로 손상 항목은 다시 묻지 않는다', async () => {
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(
      aiWheel(
        { maxRPM: 13300, visibleDamage: 'suspected' },
        { labeledRPM: 13300 },
      ),
    );
    render(<ResultPage />);

    await reanalyze();

    expect(screen.getByRole('button', { name: ACCEPT })).toBeDisabled();
    expect(screen.getByText(VALUES_DIFFER)).toBeInTheDocument();
    expect(screen.getByText(AI_DAMAGE_ALERT)).toBeInTheDocument();
    expect(screen.queryByText(RECHECK_HINT)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /확인함/ }),
    ).not.toBeInTheDocument();
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    // 작업자가 넣은 값은 AI 값으로 바뀌지 않는다.
    expect(result.current.wheel?.maxRPM).toBe(12200);
    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
  });

  it('전환하지 않고 저장한 기록에도 AI가 올린 의심이 남는다', async () => {
    readyOfflineWheel();
    extractWheel.mockResolvedValue(
      aiWheel(
        { maxRPM: 13300, visibleDamage: 'suspected' },
        { labeledRPM: 13300 },
      ),
    );
    vi.mocked(saveInspection).mockResolvedValueOnce(1);
    render(<ResultPage />);

    await reanalyze();
    checkAll();
    fireEvent.click(screen.getByRole('button', { name: /점검 완료 및 저장/ }));
    await waitFor(() => expect(saveInspection).toHaveBeenCalledTimes(1));

    const saved = vi.mocked(saveInspection).mock.calls[0][0];
    expect(saved.analysisMode).toBe('offline_limited');
    expect(saved.result.verdict).toBe('UNDETERMINED');
    expect(saved.wheel.visibleDamage).toBe('suspected');
    expect(
      saved.result.checks.find((check) => check.rule === '외관 손상')?.detail
        ?.code,
    ).toBe('visibleDamage.suspected');
    // 받아들이지 않은 AI 값은 기록에 넣지 않는다.
    expect(saved.wheelOcr).toBeUndefined();
    expect(saved.wheel.markings).toBeUndefined();
    expect(saved.wheel.maxRPM).toBe(12200);
  });

  it('취소하고 다시 분석했을 때 AI가 이번에는 의심하지 않아도 손상 항목을 다시 받는다', async () => {
    // 앞서 올린 의심은 확정값에 남아 있고, 숫돌 상태의 답은 여전히 그 경고보다 먼저다.
    const result = readyOfflineWheel();
    extractWheel
      .mockResolvedValueOnce(aiWheel({ visibleDamage: 'suspected' }))
      .mockResolvedValueOnce(aiWheel({ visibleDamage: 'none_visible' }));
    render(<ResultPage />);

    await reanalyze();
    fireEvent.click(screen.getByRole('button', { name: CANCEL }));
    await reanalyze();

    // 두 번째 판독이 의심하지 않았다고 의심이 지워지지 않는다.
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    expect(screen.getByText(RECHECK_HINT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ACCEPT })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /확인함/ }));
    await accept();

    expect(result.current.analysisMode).toBe('online');
    expect(screen.getByText(DAMAGE_SUSPECTED)).toBeInTheDocument();
  });

  it('취소하고 다시 분석하면 앞서 누른 재확인 답을 이어 쓰지 않는다', async () => {
    readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'suspected' }));
    render(<ResultPage />);

    await reanalyze();
    fireEvent.click(screen.getByRole('button', { name: /확인함/ }));
    expect(screen.getByRole('button', { name: ACCEPT })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: CANCEL }));
    await reanalyze();

    expect(screen.getByRole('button', { name: ACCEPT })).toBeDisabled();
    expect(screen.getByRole('button', { name: /확인함/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  describe('재분석 응답이 늦게 도착할 때', () => {
    // 연결이 나쁜 현장이 이 기능이 쓰이는 곳이다. 응답을 기다리다 화면을 떠날 수 있다.

    /** 응답을 테스트가 원하는 때에 돌려주는 재분석 */
    function pendingReanalysis() {
      let respond: (spec: WheelSpec) => void = () => undefined;
      extractWheel.mockReturnValue(
        new Promise<WheelSpec>((resolve) => {
          respond = resolve;
        }),
      );
      return (spec: WheelSpec) => act(async () => respond(spec));
    }

    it('그 사이 숫돌을 다시 찍어 확정했으면, 이전 사진의 의심을 새 숫돌에 얹지 않는다', async () => {
      const result = readyOfflineWheel();
      const respond = pendingReanalysis();
      const view = render(<ResultPage />);
      await reanalyze();

      // 작업자가 기다리지 않고 숫돌 확인으로 돌아가 다른 숫돌을 찍어 확정했다.
      view.unmount();
      act(() => {
        result.current.setWheel(
          { ...TYPED_WHEEL, diameter: 115 },
          new Blob(['other label'], { type: 'image/jpeg' }),
          null,
        );
        result.current.setOfflineSlot('wheel', true);
        result.current.setWheelCondition(CONFIRMED);
      });
      await respond(aiWheel({ visibleDamage: 'suspected' }));

      // AI가 본 것은 이전 숫돌의 사진이다. 새 숫돌에 의심을 지어내지 않는다.
      expect(result.current.wheel?.diameter).toBe(115);
      expect(result.current.wheel?.visibleDamage).toBe('unknown');
    });

    it('화면만 떠났고 숫돌이 그대로면, 늦게 온 의심을 버리지 않는다', async () => {
      const result = readyOfflineWheel();
      const respond = pendingReanalysis();
      const view = render(<ResultPage />);
      await reanalyze();

      view.unmount();
      await respond(aiWheel({ visibleDamage: 'suspected' }));

      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      // 전환한 것은 아니다.
      expect(result.current.analysisMode).toBe('offline_limited');
      expect(result.current.wheelOcr).toBeNull();
    });
  });

  it('명판만 다시 분석할 때는 숫돌 손상 항목을 다시 묻지 않는다', async () => {
    // 이 숫돌은 온라인으로 읽었다. 의심은 숫돌 상태 확인에서 이미 경고로 떴고
    // 작업자는 그 경고를 보면서 답했다. 같은 것을 두 번 묻지 않는다.
    const result = store();
    act(() => {
      result.current.setGrinder(
        GRINDER,
        new Blob(['plate'], { type: 'image/jpeg' }),
        null,
      );
      result.current.setOfflineSlot('grinder', true);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel({ ...WHEEL, visibleDamage: 'suspected' });
      result.current.setWheelCondition(CONFIRMED);
    });
    extractGrinder.mockResolvedValue({ ...GRINDER, rawText: 'AI' });
    render(<ResultPage />);

    await reanalyze();

    expect(extractWheel).not.toHaveBeenCalled();
    expect(screen.queryByText(RECHECK_HINT)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: ACCEPT })).toBeEnabled();
    await accept();
    expect(result.current.analysisMode).toBe('online');
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
  });

  it('재분석한 AI가 읽은 rpm·m/s 표기가 서로 어긋나면 온라인 대조로 바꿔도 적합이 되지 않는다', async () => {
    // Φ125 12,200rpm은 약 80m/s다. AI가 m/s를 8로 읽었다면 둘 중 하나는 오독이다.
    // 처음부터 온라인이었다면 표기 일치 규칙이 판정불가로 막았을 판독이다.
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({}, { peripheralSpeedMps: 8 }));
    render(<ResultPage />);

    await reanalyze();
    await accept();

    expect(result.current.analysisMode).toBe('online');
    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(screen.getByText(MARKINGS_MISMATCH)).toBeInTheDocument();
  });

  it('재분석한 AI가 읽은 내경은 직접 확인할 항목으로 나타난다', async () => {
    readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel());
    render(<ResultPage />);

    await reanalyze();
    await accept();

    expect(
      screen.getByText(
        '라벨에 적힌 내경은 Φ22.23mm입니다. 그라인더 명판에는 축 규격이 적혀 있지 않아 이 앱이 대조할 수 없습니다. 축에 맞는지 직접 확인하세요.',
      ),
    ).toBeInTheDocument();
  });

  it('재분석한 AI가 손상을 의심하지 않으면 의심을 지어내지 않는다', async () => {
    const result = readyOfflineWheel();
    extractWheel.mockResolvedValue(aiWheel({ visibleDamage: 'none_visible' }));
    render(<ResultPage />);

    await reanalyze();
    // 의심이 없으면 손상 항목을 다시 묻지 않는다. 값이 같으면 바로 열린다.
    expect(screen.queryByText(RECHECK_HINT)).not.toBeInTheDocument();
    expect(screen.queryByText(AI_DAMAGE_ALERT)).not.toBeInTheDocument();
    expect(result.current.wheel?.visibleDamage).toBe('unknown');
    await accept();

    expect(result.current.analysisMode).toBe('online');
    expect(screen.queryByText(DAMAGE_SUSPECTED)).not.toBeInTheDocument();
    // 보이지 않았다는 판독을 「손상 없음」으로 바꿔 말하지도 않는다.
    expect(screen.getByText(DAMAGE_NOT_VERIFIABLE)).toBeInTheDocument();
    expect(result.current.wheel?.visibleDamage).toBe('unknown');
    expect(screen.getByText('적합')).toBeInTheDocument();
  });
});
