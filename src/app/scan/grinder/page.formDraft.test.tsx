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
  act(() => result.current.reset());
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
        offline: false,
      },
    });

    render(<GrinderScanPage />);

    await screen.findByText('읽어낸 값을 확인하세요');
    expect(screen.getByDisplayValue('GWS 750-125')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11000')).toBeInTheDocument();
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
});
