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
import { limitCausesOf, useInspection } from '@/lib/state/inspection';
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
      screen.getByText('제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(result.current.offlineSlots.grinder).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'local_ocr',
    });
  });

  it('서버가 읽었는데 그 순간 기기가 오프라인으로 보고되면 — 제한은 지키되 「이 기기에서 읽었다」고 기록하지 않는다', async () => {
    // navigator.onLine은 연결이 흔들리는 망이나 일부 WebView에서 틀린 값을 낸다.
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      const result = store();
      getLastTelemetry.mockReturnValue({
        engine: 'claude',
        model: 'claude-test',
        inputTokens: 10,
        outputTokens: 10,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        durationMs: 900,
      });
      render(<GrinderScanPage />);
      fireEvent.click(
        screen.getByRole('button', { name: '테스트 사진 고르기' }),
      );
      await screen.findByText('읽어낸 값을 확인하세요');

      for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
        fireEvent.click(button);
      }
      fireEvent.click(
        screen.getByRole('button', { name: '확인 후 숫돌 촬영' }),
      );

      expect(result.current.offlineSlots.grinder).toBe(true);
      expect(result.current.analysisMode).toBe('offline_limited');
      expect(limitCausesOf(result.current.offlineSlots)).toEqual({
        grinder: 'unknown',
      });
    } finally {
      online.mockRestore();
    }
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
      screen.getByText('제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('라벨을 직접 보고 값을 입력하세요', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('기기 안 OCR로 읽은 draft에는 확인됐다는 표시를 함께 저장한다', async () => {
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

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({
        analysisSource: 'local_ocr',
        localOcrConfirmed: true,
      });
    }
  });

  it('표시와 함께 저장된 local_ocr draft로 확정하면 까닭을 local_ocr로 남긴다', async () => {
    const result = store();
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
          guardSize: '',
        },
        photo: new Blob(['plate']),
        ocr: OCR,
        analysisSource: 'local_ocr',
        localOcrConfirmed: true,
      },
    });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'local_ocr',
    });
  });

  it('출처가 남지 않은 구버전 draft로 확정하면 제한은 지키되 까닭은 적지 않는다', async () => {
    // 그 draft가 서버로 읽은 것인지 기기에서 읽은 것인지 알 수 없다.
    const result = store();
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
          guardSize: '',
        },
        photo: new Blob(['plate']),
        ocr: OCR,
        offline: false,
      },
    });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(result.current.offlineSlots.grinder).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'unknown',
    });
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
      screen.getByText('제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
  });
});

describe('그라인더 확인 화면 — 통째로 버린 OCR이 남은 draft', () => {
  // 저장된 명판 OCR의 형태가 어긋나면 통째로 버린다. 조용히 버리면 화면은 신뢰도
  // 낮음만 띄우고 이유를 말하지 않는다 — 작업자는 AI가 읽은 값이 여전히 뒤에 있다고
  // 안다. 명판 OCR에는 외관 의심이 없어 이어갈 것은 없다.
  //
  // 버린 판독으로 확정한 점검은 제한 대조로 남긴다(2026-10-04). draft에 남은 출처
  // (server)는 그대로 두고, 버렸다는 흔적으로 낮춘다.
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
    '⚠ 저장된 AI 판독 결과를 읽을 수 없어 복구하지 못했습니다. 이대로 진행하면 적합 판정을 받을 수 없습니다. 다시 촬영하거나, 결과 화면에서 서버로 다시 분석하세요.';

  async function openDraft(draft: unknown) {
    formLoad.mockResolvedValueOnce({ status: 'found', draft });
    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');
  }

  /** 직접 확인을 체크하고 장비 상태에 답한 뒤 확정한다 */
  function confirmAndProceed() {
    fireEvent.click(screen.getByRole('checkbox', { name: /라벨을 직접 보고/ }));
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));
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

  it('버린 판독으로 확정하면 제한 대조로 남긴다 — 직접 확인을 체크해도 온라인 대조로 나가지 않는다', async () => {
    // 화면에 내놓을 AI 판독이 없다. 확정한 값은 직접 입력과 내용이 같은데(OCR 원본
    // 없음·원문 없음), draft에 남은 출처(server)만 믿고 온라인으로 내보내면 작업자의
    // 확인만으로 적합까지 간다 — 직접 입력은 같은 값으로 적합을 받지 못한다.
    const result = store();
    await openDraft(draftWith({ ocr: BROKEN_OCR }));

    confirmAndProceed();

    expect(push).toHaveBeenCalledWith('/scan/wheel');
    // 직접 확인으로 신뢰도는 올라간다. 적합을 막는 것은 신뢰도가 아니라 판독 경로다.
    expect(result.current.grinder?.confidence).toBe('high');
    expect(result.current.grinder?.rawText).toBe('');
    expect(result.current.offlineSlots.grinder).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    // 서버 분석을 거친 점검이다. 직접 입력이나 로컬 OCR이었다고 남기지 않는다.
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'dropped_ocr',
    });
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
        // 출처는 바꿔 적지 않는다. 서버 분석을 거친 것은 사실이고, 로컬 판독이나
        // 직접 입력이었다고 적으면 화면이 사실과 다른 배지를 띄운다. 제한 대조는
        // 흔적이 정한다.
        analysisSource: 'server',
      });
    }
  });

  it('다시 저장된 draft(OCR 없음 + 흔적)에서도 알림이 그대로다', async () => {
    await openDraft(draftWith({ ocr: null, droppedOcr: 'dropped' }));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
  });

  it('다시 저장된 draft(OCR 없음 + 흔적)로 확정해도 제한 대조다 — 새로고침 한 번으로 풀리지 않는다', async () => {
    const result = store();
    await openDraft(draftWith({ ocr: null, droppedOcr: 'dropped' }));

    confirmAndProceed();

    expect(push).toHaveBeenCalledWith('/scan/wheel');
    expect(result.current.offlineSlots.grinder).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'dropped_ocr',
    });
  });

  it('출처가 server인 제한 대조에 로컬 OCR·직접 입력 배지를 띄우지 않는다 — 사실과 다른 말이다', async () => {
    await openDraft(draftWith({ ocr: BROKEN_OCR }));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    // 두 배지는 모두 「제한 대조 — 」로 시작한다. 위 「로컬 OCR 제한 판정」
    // 묶음이 같은 문구로 배지가 뜨는 것을 확인한다.
    expect(
      screen.queryByText('제한 대조 —', { exact: false }),
    ).not.toBeInTheDocument();
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
    // 새 판독이 화면에 있고 기록의 원본으로 남는다. 제한 대조도 함께 풀린다.
    expect(result.current.offlineSlots.grinder).toBe(false);
    expect(result.current.analysisMode).toBe('online');
  });

  it('OCR이 온전한 draft에는 알림이 없다 — 없던 일을 알리지 않는다', async () => {
    const result = store();
    await openDraft(draftWith({ ocr: OCR }));

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();

    // 판독이 온전하면 예전처럼 온라인 대조다. 버린 판독만 낮춘다.
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(push).toHaveBeenCalledWith('/scan/wheel');
    expect(result.current.grinderOcr).toEqual(OCR);
    expect(result.current.offlineSlots.grinder).toBe(false);
    expect(result.current.analysisMode).toBe('online');
  });

  it('직접 입력으로 저장된 draft(OCR 없음)에도 알림이 없다', async () => {
    await openDraft(draftWith({ ocr: null, analysisSource: 'manual' }));

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
  });

  it('직접 입력으로 저장된 draft로 확정하면 까닭을 manual로 남긴다', async () => {
    const result = store();
    await openDraft(draftWith({ ocr: null, analysisSource: 'manual' }));

    confirmAndProceed();

    expect(push).toHaveBeenCalledWith('/scan/wheel');
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'manual',
    });
  });

  it('서버로 읽어 그대로 확정한 단계에는 까닭이 없다', async () => {
    const result = store();
    await openDraft(draftWith({ ocr: OCR }));

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(result.current.analysisMode).toBe('online');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({});
    expect(result.current.offlineSlots).toEqual({
      grinder: false,
      wheel: false,
    });
  });
});
