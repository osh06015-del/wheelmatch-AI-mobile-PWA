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
    wheelBackImage: null,
    wheelEdgeImage: null,
    wheelBoreImage: null,
    wheelExam: null,
    wheelExamNotRun: null,
    wheelExamAcknowledged: false,
    grinderCaptureMetrics: null,
    wheelCaptureMetrics: null,
    grinderOcrTelemetry: null,
    wheelOcrTelemetry: null,
    captureChecks: {},
    wheelExamCaptureMetrics: null,
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
