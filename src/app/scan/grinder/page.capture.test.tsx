// 그라인더 명판 촬영 화면 — 촬영 직후 사진 상태 확인.
//
// 숫돌 라벨과 같은 규칙을 따른다. 경고는 서버로 보내기 전에 보이고 그래도
// 쓸 수 있으며, 열지 못한 사진만 막는다. 경고·재촬영 여부는 기록으로 넘어간다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, extractGrinder, optimizeForUpload, measureCapture } = vi.hoisted(
  () => ({
    push: vi.fn(),
    extractGrinder: vi.fn(),
    optimizeForUpload: vi.fn(),
    measureCapture: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push,
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({ extractGrinder, extractWheel: vi.fn() }),
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
import { CAPTURE_CHECK_VERSION } from '@/lib/image/captureCheck';
import { ImageDecodeError } from '@/lib/image/optimize';
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

/** 어두운 곳에서 찍은 사진 */
const DARK: CaptureQualityMetrics = {
  ...CLEAN,
  meanBrightness: 20,
  darkPixelRatio: 0.9,
};

function store() {
  return renderHook(() => useInspection()).result;
}

function pick() {
  fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
}

beforeEach(() => {
  push.mockClear();
  extractGrinder.mockReset();
  optimizeForUpload.mockReset();
  measureCapture.mockReset();
  optimizeForUpload.mockImplementation(async (blob: Blob) => blob);
  measureCapture.mockResolvedValue(CLEAN);
  extractGrinder.mockResolvedValue(OCR);
  const result = store();
  act(() => result.current.reset());
});

describe('그라인더 명판 — 촬영 직후 사진 상태 확인', () => {
  it('어두운 사진은 판독 전에 경고하고, 그래도 사용하면 판독한다', async () => {
    measureCapture.mockResolvedValueOnce(DARK);
    render(<GrinderScanPage />);
    pick();

    expect(
      await screen.findByText('⚠ 사진이 너무 어둡습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('밝은 곳으로 옮기거나 조명을 비춘 뒤에 찍으세요.'),
    ).toBeInTheDocument();
    expect(extractGrinder).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: '그래도 이 사진 사용' }),
    );
    expect(
      await screen.findByText('읽어낸 값을 확인하세요'),
    ).toBeInTheDocument();
    expect(extractGrinder).toHaveBeenCalledTimes(1);
  });

  it('열지 못한 사진은 판독으로 보내지 않는다', async () => {
    optimizeForUpload.mockRejectedValueOnce(new ImageDecodeError());
    render(<GrinderScanPage />);
    pick();

    expect(
      await screen.findByText(
        '열 수 없는 사진으로는 진행할 수 없습니다. 다시 찍거나 다른 사진을 고르세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /그래도/ }),
    ).not.toBeInTheDocument();
    expect(extractGrinder).not.toHaveBeenCalled();
  });

  it('판독에 실패해 다시 시도할 때는 같은 사진을 다시 준비하지 않는다', async () => {
    extractGrinder.mockRejectedValueOnce(new Error('down'));
    render(<GrinderScanPage />);
    pick();

    fireEvent.click(
      await screen.findByRole('button', { name: '같은 사진으로 다시 분석' }),
    );
    await screen.findByText('읽어낸 값을 확인하세요');

    // 사진 준비(축소·측정)는 처음 한 번뿐이다. 재촬영으로 세지 않는다.
    expect(optimizeForUpload).toHaveBeenCalledTimes(1);
    expect(extractGrinder).toHaveBeenCalledTimes(2);
  });

  it('다시 찍은 횟수와 최종 사진의 경고를 기록으로 넘긴다', async () => {
    const result = store();
    render(<GrinderScanPage />);

    // 1번째: 경고 → 다시 찍기
    measureCapture.mockResolvedValueOnce(DARK);
    pick();
    fireEvent.click(await screen.findByRole('button', { name: '다시 찍기' }));
    // 2번째: 경고 없음 → 곧바로 판독
    pick();
    await screen.findByText('읽어낸 값을 확인하세요');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 숫돌 촬영' }));

    expect(push).toHaveBeenCalledWith('/scan/wheel');
    expect(result.current.captureChecks.grinder).toEqual({
      checkVersion: CAPTURE_CHECK_VERSION,
      warnings: [],
      usedDespiteWarning: false,
      retakeCount: 1,
    });
    // 기존 원시 측정값 기록도 그대로 남는다.
    expect(result.current.grinderCaptureMetrics).toEqual(CLEAN);
  });
});
