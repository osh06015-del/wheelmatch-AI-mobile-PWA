// 그라인더 확인 화면 — 입력 중 draft 복구와 로컬 OCR 제한 판정.
//
// 핵심: "다음"을 누르기 전 새로고침해도 입력칸이 복원되지만, 확인(userConfirmed)과
// Gate는 자동으로 채워지지 않는다. 새 사진을 찍으면 draft를 지운다. 로컬 OCR로
// 읽었으면(엔진이 tesseract) 값은 있어도 오프라인과 같은 제한 판정으로 남는다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  push,
  extractGrinder,
  getLastTelemetry,
  optimizeForUpload,
  measureCapture,
  formLoad,
  formSave,
  formRemove,
} = vi.hoisted(() => ({
  push: vi.fn(),
  extractGrinder: vi.fn(),
  getLastTelemetry: vi.fn(
    (): import('@/lib/rules/types').OcrTelemetry | null => null,
  ),
  optimizeForUpload: vi.fn(),
  measureCapture: vi.fn(),
  formLoad: vi.fn(),
  formSave: vi.fn(),
  formRemove: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push,
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({
    extractGrinder,
    extractWheel: vi.fn(),
    getLastTelemetry,
  }),
}));

vi.mock('@/lib/draft/draftStore', () => ({
  formDraftStore: { load: formLoad, save: formSave, remove: formRemove },
}));

vi.mock('@/lib/image/optimize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/optimize')>()),
  optimizeForUpload,
}));

vi.mock('@/lib/image/quality', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/quality')>()),
  measureCapture,
}));

vi.mock('@/components/CameraView', () => ({
  CameraView: ({ onPickFile }: { onPickFile: (file: File) => void }) => (
    <button
      type="button"
      onClick={() =>
        onPickFile(new File(['x'], 'plate.jpg', { type: 'image/jpeg' }))
      }
    >
      테스트 사진 고르기
    </button>
  ),
}));

import GrinderScanPage from './page';
import { EMPTY_CAPTURE_METRICS } from '@/lib/image/quality';
import { useInspection } from '@/lib/state/inspection';
import type { CaptureQualityMetrics, GrinderSpec } from '@/lib/rules/types';

const OCR: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: 'GWS 750-125 11000 min-1 125mm',
  confidence: 'high',
};

const CLEAN: CaptureQualityMetrics = {
  ...EMPTY_CAPTURE_METRICS,
  originalWidth: 4032,
  originalHeight: 3024,
  meanBrightness: 130,
  darkPixelRatio: 0.05,
  brightPixelRatio: 0.05,
  blurMetric: 400,
};

function store() {
  return renderHook(() => useInspection()).result;
}

beforeEach(() => {
  push.mockClear();
  extractGrinder.mockReset();
  getLastTelemetry.mockReset().mockReturnValue(null);
  optimizeForUpload.mockReset();
  measureCapture.mockReset();
  formLoad.mockReset().mockResolvedValue({ status: 'none' });
  formSave.mockReset();
  formRemove.mockReset();
  optimizeForUpload.mockImplementation(async (blob: Blob) => blob);
  measureCapture.mockResolvedValue(CLEAN);
  extractGrinder.mockResolvedValue(OCR);
  const result = store();
  act(() => {
    result.current.reset();
    // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
    result.current.setPurpose('cutting');
  });
});

describe('그라인더 확인 화면 — 입력 draft 복구', () => {
  it('새로고침 전 draft가 있으면 입력칸을 복원하지만 확인·Gate는 다시 받는다', async () => {
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'grinder',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          model: 'GWS 750-125',
          noLoadRPM: '11000',
          maxWheelDiameter: '125',
          spindleThread: 'M14',
          guardType: 'grinding',
          guardSize: '125',
        },
        photo: new Blob(['plate']),
        ocr: OCR,
        analysisSource: 'server',
      },
    });

    render(<GrinderScanPage />);

    await screen.findByText('읽어낸 값을 확인하세요');
    expect(screen.getByDisplayValue('GWS 750-125')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11000')).toBeInTheDocument();
    // 판독값을 대조할 사진이 같은 화면에 있다(확대 가능).
    expect(
      screen.getByRole('button', { name: '그라인더 명판 크게 보기' }),
    ).toBeInTheDocument();
    // 최대 지름(125)과 덮개 크기(125)가 각각 복원되어 두 곳에 나타난다.
    expect(screen.getAllByDisplayValue('125')).toHaveLength(2);

    // 확인(userConfirmed)·장비 상태 Gate는 복원되지 않는다 — 진행 버튼이 막혀 있다.
    expect(
      screen.getByRole('button', { name: '확인 후 숫돌 촬영' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /라벨을 직접 보고/ }),
    ).not.toBeChecked();
  });

  it('새 사진을 찍으면 이전 확인 화면 draft를 지운다', async () => {
    render(<GrinderScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(formRemove).toHaveBeenCalledWith('grinder');
  });

  it('"다음"을 누르면 확정되어 확인 화면 draft를 지운다', async () => {
    render(<GrinderScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');
    formRemove.mockClear();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(formRemove).toHaveBeenCalledWith('grinder');
    expect(push).toHaveBeenCalledWith('/scan/wheel');
  });
});

describe('그라인더 확인 화면 — 로컬 OCR 제한 판정', () => {
  it('엔진이 tesseract면 값은 살리되 오프라인과 같은 제한 판정으로 남긴다', async () => {
    const result = store();
    getLastTelemetry.mockReturnValue({
      engine: 'tesseract',
      model: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      durationMs: 120,
    });
    render(<GrinderScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    // 서버 직접 입력(offline)과 다르게, 로컬 OCR 값은 입력칸에 그대로 남는다.
    expect(screen.getByDisplayValue('GWS 750-125')).toBeInTheDocument();
    expect(
      screen.getByText('오프라인 제한 대조', { exact: false }),
    ).toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(result.current.offlineSlots.grinder).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
  });

  it('claude 엔진으로 정상 분석하면 제한 판정을 남기지 않는다', async () => {
    const result = store();
    getLastTelemetry.mockReturnValue({
      engine: 'claude',
      model: 'claude-x',
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      durationMs: 300,
    });
    render(<GrinderScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(result.current.offlineSlots.grinder).toBe(false);
    expect(result.current.analysisMode).toBe('online');
  });

  it('로컬 OCR로 읽은 확인 화면 draft는 출처를 local_ocr로 남긴다(직접 입력과 구분)', async () => {
    // offline 하나로만 합쳐 저장하면 새로고침 복구 때 "직접 입력"과 "로컬 OCR"을
    // 구분할 수 없다. analysisSource로 따로 남겨야 한다.
    getLastTelemetry.mockReturnValue({
      engine: 'tesseract',
      model: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      durationMs: 90,
    });
    render(<GrinderScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({ analysisSource: 'local_ocr' });
    }
  });

  it('새로고침 복구 — local_ocr 출처는 "로컬 OCR" 배지로, manual 출처는 "직접 입력" 배지로 되살아난다', async () => {
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'grinder',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          model: '',
          noLoadRPM: '',
          maxWheelDiameter: '',
          spindleThread: 'unknown',
          guardType: 'unknown',
          guardSize: '',
        },
        photo: new Blob(['plate']),
        ocr: null,
        analysisSource: 'local_ocr',
      },
    });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(
      screen.getByText('오프라인 제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('라벨을 직접 보고 값을 입력하세요', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('새로고침 복구 — analysisSource가 manual이면 직접 입력 배지로 되살아난다', async () => {
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'grinder',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          model: '',
          noLoadRPM: '',
          maxWheelDiameter: '',
          spindleThread: 'unknown',
          guardType: 'unknown',
          guardSize: '',
        },
        photo: new Blob(['plate']),
        ocr: null,
        analysisSource: 'manual',
      },
    });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(
      screen.getByText('라벨을 직접 보고 값을 입력하세요', { exact: false }),
    ).toBeInTheDocument();
  });

  it('새로고침 복구 — analysisSource가 없는 구버전 draft는 온라인으로 승격하지 않고 로컬 OCR 배지로 되살아난다', async () => {
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'grinder',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          model: '',
          noLoadRPM: '',
          maxWheelDiameter: '',
          spindleThread: 'unknown',
          guardType: 'unknown',
          guardSize: '',
        },
        photo: new Blob(['plate']),
        ocr: null,
        offline: false,
      },
    });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(
      screen.getByText('오프라인 제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
  });
});

describe('그라인더 확인 화면 — 통째로 버린 OCR이 남은 draft', () => {
  // 저장된 명판 OCR의 형태가 어긋나면 통째로 버린다. 조용히 버리면 화면은 신뢰도
  // 낮음만 띄우고 이유를 말하지 않는다 — 작업자는 AI가 읽은 값이 여전히 뒤에 있다고
  // 안다. 명판 OCR에는 외관 의심이 없어 여기서는 알림만 한다.
  function draftWith(extra: Record<string, unknown>) {
    return {
      slot: 'grinder',
      schemaVersion: 1,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: {
        model: 'GWS 750-125',
        noLoadRPM: '11000',
        maxWheelDiameter: '125',
        spindleThread: 'M14',
        guardType: 'grinding',
        guardSize: '',
      },
      photo: new Blob(['plate']),
      analysisSource: 'server',
      ...extra,
    };
  }

  /** 원문이 문자열이 아니다 — 지금 기준에 맞지 않아 통째로 버려지는 OCR */
  const BROKEN_OCR = { ...OCR, rawText: null };

  const DROPPED_NOTICE =
    '⚠ 저장된 AI 판독 결과를 읽을 수 없어 복구하지 못했습니다. 아래 값을 사진 속 표기와 직접 대조하거나 다시 촬영하세요.';

  async function openDraft(draft: unknown) {
    formLoad.mockResolvedValueOnce({ status: 'found', draft });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');
  }

  it('버렸다는 것을 알리고 입력칸은 복원한다 — 확정하면 OCR 원본은 남지 않는다', async () => {
    const result = store();
    await openDraft(draftWith({ ocr: BROKEN_OCR }));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.getByDisplayValue('GWS 750-125')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11000')).toBeInTheDocument();
    // 확인·Gate는 여전히 다시 받는다.
    expect(
      screen.getByRole('button', { name: '확인 후 숫돌 촬영' }),
    ).toBeDisabled();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(push).toHaveBeenCalledWith('/scan/wheel');
    expect(result.current.grinderOcr).toBeNull();
    // 읽을 수 없던 판독의 신뢰도를 이어받지 않는다. 사람이 확인하기 전에는 낮음이다.
    expect(result.current.grinder?.confidence).toBe('low');
  });

  it('버렸다는 흔적을 다시 저장한다 — 한 번 더 새로고침해도 알림이 사라지지 않는다', async () => {
    await openDraft(draftWith({ ocr: BROKEN_OCR }));

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      // 버린 판독 자체는 다시 저장하지 않는다. 흔적만 남긴다.
      expect(draft).toMatchObject({
        slot: 'grinder',
        ocr: null,
        droppedOcr: 'dropped',
      });
    }
  });

  it('다시 저장된 draft(OCR 없음 + 흔적)에서도 알림이 그대로다', async () => {
    await openDraft(draftWith({ ocr: null, droppedOcr: 'dropped' }));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
  });

  it('새 명판 사진을 찍으면 흔적을 지운다 — 새 판독은 원본으로 남는다', async () => {
    const result = store();
    await openDraft(draftWith({ ocr: BROKEN_OCR }));
    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();

    // 새 사진으로 저장되는 draft에도 흔적이 따라가지 않는다.
    formSave.mockClear();
    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).not.toHaveProperty('droppedOcr');
    }

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));
    expect(result.current.grinderOcr).toEqual(OCR);
  });

  it('OCR이 온전한 draft에는 알림이 없다 — 없던 일을 알리지 않는다', async () => {
    await openDraft(draftWith({ ocr: OCR }));

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
  });

  it('직접 입력으로 저장된 draft(OCR 없음)에도 알림이 없다', async () => {
    await openDraft(draftWith({ ocr: null, analysisSource: 'manual' }));

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
  });
});
