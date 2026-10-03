// 진행 중 점검 복구 화면 테스트.
//
// 핵심: draft가 있으면 묻기만 한다(자동으로 이어가거나 지우지 않는다). 묻는 동안
// 자동 저장이 draft를 덮어쓰지 않는다. 삭제는 작업자가 고를 때만 한다. 저장 실패가
// 지금 점검을 막지 않는다.

import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { push, load, save, remove, formRemove } = vi.hoisted(() => ({
  push: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  formRemove: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/draft/draftStore', () => ({
  draftStore: { load, save, remove },
  // 확인 화면 입력 draft. 이 파일의 시나리오와는 다른 저장소라 항상 성공만 가정한다.
  formDraftStore: { remove: formRemove },
}));

import { DRAFT_SAVE_DELAY_MS, DraftRecovery } from './DraftRecovery';
import Home from '@/app/page';
import { buildDraft } from '@/lib/draft/draftModel';
import { useInspection, type InspectionSnapshot } from '@/lib/state/inspection';
import type { GrinderSpec } from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const GRINDER_OK = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

function store() {
  return renderHook(() => useInspection()).result;
}

/** 명판 단계까지 마친 진행 중 점검 draft */
function savedDraft(overrides: Partial<InspectionSnapshot> = {}) {
  const base: InspectionSnapshot = {
    declaredPurpose: 'cutting',
    startedAt: 1,
    workConditions: null,
    grinder: GRINDER,
    wheel: null,
    grinderOcr: null,
    wheelOcr: null,
    grinderCondition: GRINDER_OK,
    wheelCondition: null,
    trialRun: null,
    grinderImage: new Blob(['g'], { type: 'image/jpeg' }),
    wheelImage: null,
    grinderCaptureMetrics: null,
    wheelCaptureMetrics: null,
    grinderOcrTelemetry: null,
    wheelOcrTelemetry: null,
    captureChecks: {},
    offlineSlots: { grinder: true, wheel: false },
    checklist: null,
    trialRunRecord: null,
    ...overrides,
  };
  return buildDraft(base, new Date('2026-09-17T03:00:00.000Z'));
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  push.mockReset();
  formRemove.mockReset().mockResolvedValue(true);
  load.mockReset();
  save.mockReset().mockResolvedValue('saved');
  remove.mockReset().mockResolvedValue(true);
  const result = store();
  act(() => result.current.reset());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DraftRecovery — draft가 있을 때', () => {
  it('홈에서 복구를 물을 때와 이어하기 선택 시 미확정 입력 draft를 지우지 않는다', async () => {
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });
    render(
      <>
        <DraftRecovery />
        <Home />
      </>,
    );
    await flush();
    expect(formRemove).not.toHaveBeenCalled();
    await act(async () => {
      screen.getByRole('button', { name: '이어하기' }).click();
    });
    expect(formRemove).not.toHaveBeenCalled();
    expect(store().current.grinder).toEqual(GRINDER);
    expect(push).toHaveBeenCalledWith('/scan/wheel');
  });
  it('묻기만 하고 자동으로 이어가거나 지우지 않는다', async () => {
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });
    render(<DraftRecovery />);
    await flush();

    const dialog = screen.getByRole('dialog', {
      name: '진행 중이던 점검이 있습니다',
    });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이어하기' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: '삭제하고 새로 시작' }),
    ).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(store().current.declaredPurpose).toBeNull();
  });

  it('묻는 동안에는 새로고침으로 되살아난 상태가 draft를 덮어쓰지 않는다(PWA 업데이트 뒤 포함)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });
    render(<DraftRecovery />);
    await flush();

    // 새로고침·업데이트 뒤 sessionStorage에서 되살아난 진행 상태와 같다.
    const result = store();
    act(() => result.current.setPurpose('grinding'));
    act(() => {
      vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS * 3);
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('이어하기를 고르면 draft 상태로 되살리고 마친 단계의 다음 화면으로 간다', async () => {
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });
    render(<DraftRecovery />);
    await flush();

    await act(async () => {
      screen.getByRole('button', { name: '이어하기' }).click();
    });

    const result = store();
    expect(result.current.declaredPurpose).toBe('cutting');
    expect(result.current.grinder).toEqual(GRINDER);
    expect(result.current.grinderImage).toBeInstanceOf(Blob);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(push).toHaveBeenCalledWith('/scan/wheel');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });

  it('일부 사진이 빠진 draft는 가능한 값만 되살리고 경고를 남긴다', async () => {
    const draft = savedDraft();
    load.mockResolvedValue({
      status: 'found',
      draft: { ...draft, photos: {} },
    });
    render(<DraftRecovery />);
    await flush();

    expect(
      screen.getByText(
        '⚠ 일부 사진을 복구하지 못했습니다. 필요한 사진은 다시 찍어야 합니다.',
      ),
    ).toBeInTheDocument();
    await act(async () => {
      screen.getByRole('button', { name: '이어하기' }).click();
    });
    expect(store().current.grinder).toEqual(GRINDER);
    expect(store().current.grinderImage).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      '일부 사진을 복구하지 못했습니다',
    );
  });

  it('이전 버전의 다각도 확인이 들어 있던 draft는 그것을 되살리지 않았다고 알리고 이어간다', async () => {
    // 뒷면·가장자리·중심구멍 사진과 AI 확인은 점검 흐름에서 뺐다(2026-10-03).
    const draft = savedDraft() as unknown as {
      state: Record<string, unknown>;
      photos: Record<string, unknown>;
      photoSlots: string[];
    };
    draft.state.wheelExam = {
      status: 'not_observed',
      findings: [],
      photoQuality: [],
      model: null,
      promptVersion: 'test',
      analyzedAt: '2026-09-17T02:00:00.000Z',
    };
    draft.photos.wheelBack = new Blob(['back'], { type: 'image/jpeg' });
    draft.photoSlots = [...draft.photoSlots, 'wheelBack'];
    load.mockResolvedValue({ status: 'found', draft });
    render(<DraftRecovery />);
    await flush();

    expect(
      screen.getByText(
        '⚠ 이전 버전에서 넣은 추가 사진(뒷면·가장자리·중심구멍)과 AI 외관 확인 결과는 이제 쓰지 않아 복구하지 않았습니다. 나머지는 그대로 이어집니다.',
      ),
    ).toBeInTheDocument();
    await act(async () => {
      screen.getByRole('button', { name: '이어하기' }).click();
    });
    expect(store().current.grinder).toEqual(GRINDER);
    expect(store().current).not.toHaveProperty('wheelExam');
    expect(store().current).not.toHaveProperty('wheelBackImage');
  });

  it('삭제하고 새로 시작을 고르면 draft를 지우고 처음 화면으로 간다', async () => {
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });
    render(<DraftRecovery />);
    await flush();

    await act(async () => {
      screen.getByRole('button', { name: '삭제하고 새로 시작' }).click();
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/');
    expect(store().current.declaredPurpose).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('지우기에 실패하면 창을 닫지 않고 알린다', async () => {
    remove.mockResolvedValue(false);
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });
    render(<DraftRecovery />);
    await flush();

    await act(async () => {
      screen.getByRole('button', { name: '삭제하고 새로 시작' }).click();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '진행 상태를 삭제하지 못했습니다. 다시 시도하세요.',
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('읽을 수 없는 draft는 이어하기를 막고 삭제만 고르게 한다', async () => {
    load.mockResolvedValue({ status: 'found', draft: { broken: true } });
    render(<DraftRecovery />);
    await flush();

    expect(screen.getByRole('button', { name: '이어하기' })).toBeDisabled();
    expect(
      screen.getByText(
        '⚠ 저장된 진행 상태를 읽을 수 없습니다. 삭제하고 새로 시작하세요.',
      ),
    ).toBeInTheDocument();
  });
});

describe('DraftRecovery — 자동 저장', () => {
  it('draft가 없으면 묻지 않고, 상태가 바뀌면 모아서 한 번 저장한다', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    load.mockResolvedValue({ status: 'none' });
    render(<DraftRecovery />);
    await flush();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const result = store();
    act(() => result.current.setPurpose('cutting'));
    act(() => result.current.setGrinder(GRINDER));
    act(() => {
      vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS - 1);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(save).toHaveBeenCalledTimes(1);
    const draft = save.mock.calls[0][0];
    expect(draft.state.declaredPurpose).toBe('cutting');
    expect(draft.state.grinder).toEqual(GRINDER);
  });

  it('점검이 진행 중이 아니면 저장도 삭제도 하지 않는다', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    load.mockResolvedValue({ status: 'none' });
    render(<DraftRecovery />);
    await flush();

    act(() => {
      vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS * 3);
    });
    expect(save).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('draft 저장이 실패해도 점검을 막지 않고 알리기만 한다', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    save.mockResolvedValue('failed');
    load.mockResolvedValue({ status: 'none' });
    render(<DraftRecovery />);
    await flush();

    const result = store();
    act(() => result.current.setPurpose('cutting'));
    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS);
    });
    await flush();

    expect(screen.getByRole('status')).toHaveTextContent(
      '진행 상태를 기기에 임시 저장하지 못했습니다.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(result.current.declaredPurpose).toBe('cutting');
  });

  it('저장 공간이 모자라 사진 없이 저장했으면 그 사실을 알린다', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    save.mockResolvedValue('savedWithoutPhotos');
    load.mockResolvedValue({ status: 'none' });
    render(<DraftRecovery />);
    await flush();

    const result = store();
    act(() => result.current.setPurpose('cutting'));
    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS);
    });
    await flush();

    expect(screen.getByRole('status')).toHaveTextContent(
      '저장 공간이 부족해 사진 없이 진행 상태만 임시 저장했습니다.',
    );
  });

  it('draft를 읽지 못해도 점검은 그대로 진행된다', async () => {
    load.mockResolvedValue({ status: 'error' });
    render(<DraftRecovery />);
    await flush();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('DraftRecovery — 새로고침 때 버린 값 알림', () => {
  // 새로고침하면 화면 간 값은 sessionStorage에서 되살아난다. 형태가 어긋난 값은
  // 버리는데(inspection.tsx), 작업자는 이유 없이 촬영 화면으로 돌아가게 된다.
  // draft 복구 창이 뜨지 않는 경우(draft가 없거나 읽지 못한 경우)에도 같은 자리,
  // 같은 문구로 알린다.

  const NOTICE =
    '저장 형식이 달라 일부 값만 복구했습니다. 빠진 값은 다시 입력하세요.';

  afterEach(() => {
    sessionStorage.clear();
  });

  /**
   * 명판 단계까지 마친 점검을 앱이 쓰는 그대로 sessionStorage에 남기고, 저장된
   * 명판 규격에서 일부 자리만 바꾼 뒤 새로고침한 화면을 그린다.
   */
  async function reloadWith(change: Record<string, unknown>) {
    vi.resetModules();
    const seeding = await import('@/lib/state/inspection');
    const { result } = renderHook(() => seeding.useInspection());
    act(() => {
      result.current.setPurpose('cutting');
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
    });
    sessionStorage.setItem(
      'wheelmatch.grinder',
      JSON.stringify({ ...GRINDER, ...change }),
    );

    vi.resetModules();
    const reloaded = await import('./DraftRecovery');
    const { useInspection: useReloaded } =
      await import('@/lib/state/inspection');
    render(<reloaded.DraftRecovery />);
    await flush();
    return renderHook(() => useReloaded()).result;
  }

  it('draft가 없어도, 버린 값이 있으면 복구 경고와 같은 문구로 알린다', async () => {
    load.mockResolvedValue({ status: 'none' });

    const reloaded = await reloadWith({ guardType: 'weird' });

    expect(reloaded.current.grinder).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(`⚠ ${NOTICE}`);
  });

  it('draft를 읽지 못한 경우에도 알린다', async () => {
    load.mockResolvedValue({ status: 'error' });

    await reloadWith({ guardType: 'weird' });

    expect(screen.getByRole('status')).toHaveTextContent(`⚠ ${NOTICE}`);
  });

  it('닫기를 누르면 사라진다', async () => {
    load.mockResolvedValue({ status: 'none' });
    await reloadWith({ guardType: 'weird' });

    await act(async () => {
      screen.getByRole('button', { name: '닫기' }).click();
    });

    expect(screen.queryByText(`⚠ ${NOTICE}`)).not.toBeInTheDocument();
  });

  it('버린 값이 없으면 알리지 않는다', async () => {
    load.mockResolvedValue({ status: 'none' });

    const reloaded = await reloadWith({});

    expect(reloaded.current.grinder).toEqual(GRINDER);
    expect(screen.queryByText(`⚠ ${NOTICE}`)).not.toBeInTheDocument();
  });

  it('draft 복구를 묻는 동안에는 따로 알리지 않고, 이어하기 뒤에는 draft의 경고만 남는다', async () => {
    // 묻는 창이 그 draft의 경고를 직접 보여준다. 이어하면 상태가 draft에서 되살린
    // 값으로 바뀌므로, sessionStorage에서 버린 값에 대한 알림은 더 맞지 않는다.
    load.mockResolvedValue({ status: 'found', draft: savedDraft() });

    const reloaded = await reloadWith({ guardType: 'weird' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(`⚠ ${NOTICE}`)).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: '이어하기' }).click();
    });

    expect(reloaded.current.grinder).toEqual(GRINDER);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(`⚠ ${NOTICE}`)).not.toBeInTheDocument();
  });
});
