// 숫돌 촬영 화면 — 촬영 직후 사진 상태 확인.
//
// 라벨 사진과 다각도 확인 사진 세 장이 같은 규칙을 따르는지 본다.
//   · 경고는 서버로 보내기 전에 보이고, 작업자가 그래도 쓸 수 있다
//   · 열지 못한 사진만 진행을 막는다
//   · 사진을 바꾸면 이전 경고와 AI 분석을 버린다
//   · 경고·그래도 사용·재촬영 횟수가 기록으로 넘어간다
//
// 측정값은 테스트가 정한다(measureCapture 모킹). 경고 판단은 실제 코드를 쓴다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, extractWheel, examine, optimizeForUpload, measureCapture } =
  vi.hoisted(() => ({
    push: vi.fn(),
    extractWheel: vi.fn(),
    examine: vi.fn(),
    optimizeForUpload: vi.fn(),
    measureCapture: vi.fn(),
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
  getExtractor: () => ({ extractGrinder: vi.fn(), extractWheel }),
}));

vi.mock('@/lib/image/optimize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/optimize')>()),
  optimizeForUpload,
}));

vi.mock('@/lib/image/quality', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/quality')>()),
  measureCapture,
}));

vi.mock('@/lib/vision/wheelExam', () => ({
  getWheelExaminer: () => ({ examine }),
}));

vi.mock('@/components/CameraView', () => ({
  CameraView: ({ onPickFile }: { onPickFile: (file: File) => void }) => (
    <button
      type="button"
      onClick={() =>
        onPickFile(new File(['x'], 'wheel.jpg', { type: 'image/jpeg' }))
      }
    >
      테스트 사진 고르기
    </button>
  ),
}));

import WheelScanPage from './page';
import { CAPTURE_CHECK_VERSION } from '@/lib/image/captureCheck';
import { ImageDecodeError } from '@/lib/image/optimize';
import { EMPTY_CAPTURE_METRICS } from '@/lib/image/quality';
import { useInspection } from '@/lib/state/inspection';
import type {
  CaptureQualityMetrics,
  GrinderCondition,
  GrinderSpec,
  WheelExamResult,
  WheelSpec,
} from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
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

const OCR: WheelSpec = {
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
    expiryRaw: '06/2099',
  },
  rpmSource: 'label',
  expiry: { year: 2099, month: 6 },
  rawText: '12200 rpm 80 m/s 125x1.6x22.23 06/2099',
  confidence: 'high',
};

const EXAM_NOT_OBSERVED: WheelExamResult = {
  status: 'not_observed',
  findings: [],
  photoQuality: (['front', 'back', 'edge', 'bore'] as const).map((view) => ({
    view,
    issues: [],
    readable: true,
  })),
  model: 'claude-sonnet-5',
  promptVersion: 'test',
  analyzedAt: '2026-09-16T03:00:00.000Z',
};

/** 경고가 나오지 않는 측정값 */
const CLEAN: CaptureQualityMetrics = {
  ...EMPTY_CAPTURE_METRICS,
  originalWidth: 4032,
  originalHeight: 3024,
  meanBrightness: 130,
  darkPixelRatio: 0.05,
  brightPixelRatio: 0.05,
  blurMetric: 400,
};

/** 흐림 경고가 나오는 측정값 */
const BLURRY: CaptureQualityMetrics = { ...CLEAN, blurMetric: 1 };

const USE_ANYWAY = '그래도 이 사진 사용';
const BLUR_TEXT = '⚠ 사진이 흐릿해 보입니다.';

function store() {
  return renderHook(() => useInspection()).result;
}

function pickLabel() {
  fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
}

function openPage() {
  const result = store();
  act(() => {
    result.current.setGrinder(GRINDER);
    result.current.setGrinderCondition(GRINDER_OK);
  });
  render(<WheelScanPage />);
  return result;
}

beforeEach(() => {
  push.mockClear();
  extractWheel.mockReset();
  examine.mockReset();
  optimizeForUpload.mockReset();
  measureCapture.mockReset();
  optimizeForUpload.mockImplementation(async (blob: Blob) => blob);
  measureCapture.mockResolvedValue(CLEAN);
  extractWheel.mockResolvedValue(OCR);
  const result = store();
  act(() => result.current.reset());
});

describe('숫돌 라벨 — 촬영 직후 사진 상태 확인', () => {
  it('경고가 있으면 서버로 보내기 전에 멈추고 이유와 다시 찍는 방법을 보인다', async () => {
    measureCapture.mockResolvedValueOnce(BLURRY);
    openPage();
    pickLabel();

    expect(await screen.findByText(BLUR_TEXT)).toBeInTheDocument();
    expect(
      screen.getByText(
        '휴대폰을 움직이지 말고, 글자에 초점이 맞은 뒤에 찍으세요.',
      ),
    ).toBeInTheDocument();
    // 판독은 아직 부르지 않았다.
    expect(extractWheel).not.toHaveBeenCalled();
    // 방금 찍은 사진을 크게 볼 수 있다.
    expect(
      screen.getByRole('button', { name: '숫돌 라벨 크게 보기' }),
    ).toBeInTheDocument();
  });

  it('그래도 사용을 고르면 그 사진으로 판독한다', async () => {
    measureCapture.mockResolvedValueOnce(BLURRY);
    openPage();
    pickLabel();

    fireEvent.click(await screen.findByRole('button', { name: USE_ANYWAY }));

    expect(
      await screen.findByText('읽어낸 값을 확인하세요'),
    ).toBeInTheDocument();
    expect(extractWheel).toHaveBeenCalledTimes(1);
  });

  it('경고가 없으면 멈추지 않고 곧바로 판독한다', async () => {
    openPage();
    pickLabel();

    expect(
      await screen.findByText('읽어낸 값을 확인하세요'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/사진 상태 확인/)).not.toBeInTheDocument();
  });

  it('열지 못한 사진은 그래도 사용할 수 없고 판독으로 가지 않는다', async () => {
    optimizeForUpload.mockRejectedValueOnce(new ImageDecodeError());
    openPage();
    pickLabel();

    expect(
      await screen.findByText(
        '열 수 없는 사진으로는 진행할 수 없습니다. 다시 찍거나 다른 사진을 고르세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /그래도/ }),
    ).not.toBeInTheDocument();
    expect(extractWheel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '다시 찍기' }));
    expect(
      screen.getByRole('button', { name: '테스트 사진 고르기' }),
    ).toBeInTheDocument();
  });

  it('경고·그래도 사용·재촬영 횟수를 기록으로 넘긴다', async () => {
    // 종류를 플랩디스크로 두어 다각도 확인 없이 바로 넘어갈 수 있게 한다.
    extractWheel.mockResolvedValue({ ...OCR, wheelType: 'flap_disc' });
    optimizeForUpload.mockRejectedValueOnce(new ImageDecodeError());
    measureCapture.mockResolvedValueOnce(BLURRY);
    const result = openPage();

    // 1번째: 열지 못함 → 다시 찍기
    pickLabel();
    fireEvent.click(await screen.findByRole('button', { name: '다시 찍기' }));
    // 2번째: 흐림 경고 → 그래도 사용
    pickLabel();
    fireEvent.click(await screen.findByRole('button', { name: USE_ANYWAY }));
    await screen.findByText('읽어낸 값을 확인하세요');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.captureChecks.wheel).toEqual({
      checkVersion: CAPTURE_CHECK_VERSION,
      warnings: ['blur'],
      usedDespiteWarning: true,
      retakeCount: 1,
    });
  });
});

describe('다각도 확인 사진 — 촬영 직후 사진 상태 확인', () => {
  async function openConfirm() {
    const result = openPage();
    pickLabel();
    await screen.findByText('읽어낸 값을 확인하세요');
    return result;
  }

  function fileInput(index: number) {
    return [...document.querySelectorAll<HTMLInputElement>('input[type=file]')][
      index * 2
    ];
  }

  async function addPhoto(index: number) {
    await act(async () => {
      fireEvent.change(fileInput(index), {
        target: {
          files: [new File(['x'], `${index}.jpg`, { type: 'image/jpeg' })],
        },
      });
    });
  }

  const analyzeButton = () =>
    screen.getByRole('button', { name: '사진 4장으로 확인하기' });

  it('경고가 붙은 사진은 그래도 사용을 고르기 전까지 분석으로 보내지 않는다', async () => {
    await openConfirm();
    measureCapture.mockResolvedValueOnce(BLURRY);
    await addPhoto(0);
    await addPhoto(1);
    await addPhoto(2);

    expect(
      screen.getByRole('region', { name: '뒷면 전체 사진 상태 확인' }),
    ).toHaveTextContent('사진이 흐릿해 보입니다.');
    expect(analyzeButton()).toBeDisabled();
    expect(
      screen.getByText(
        '사진 상태 경고가 있는 사진은 다시 찍거나 그래도 사용을 골라야 확인하기를 할 수 있습니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '뒷면 전체 사진을 그래도 사용' }),
    );
    expect(analyzeButton()).toBeEnabled();
  });

  it('열지 못한 사진은 자리에 넣지 않고, 직접점검으로 넘어가는 길도 열지 않는다', async () => {
    await openConfirm();
    optimizeForUpload.mockRejectedValueOnce(new ImageDecodeError());
    await addPhoto(1);
    await addPhoto(0);
    await addPhoto(2);

    expect(screen.getByText('추가 사진 2 / 3장 준비됨')).toBeInTheDocument();
    expect(analyzeButton()).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /그래도 사용/ }),
    ).not.toBeInTheDocument();
    // AI 실패와 달리 "AI 확인 없이 진행" 확인을 내놓지 않는다.
    expect(
      screen.queryByRole('checkbox', {
        name: 'AI 확인 없이 작업자 직접점검으로 진행합니다.',
      }),
    ).not.toBeInTheDocument();
  });

  it('사진을 바꾸면 이전 AI 분석과 경고 선택을 버린다', async () => {
    await openConfirm();
    measureCapture.mockResolvedValueOnce(BLURRY);
    await addPhoto(0);
    await addPhoto(1);
    await addPhoto(2);
    fireEvent.click(
      screen.getByRole('button', { name: '뒷면 전체 사진을 그래도 사용' }),
    );
    examine.mockResolvedValue(EXAM_NOT_OBSERVED);
    await act(async () => {
      fireEvent.click(analyzeButton());
    });
    expect(
      screen.getByText(/뚜렷한 이상을 찾지 못했습니다/),
    ).toBeInTheDocument();

    // 같은 자리에 다시 흐린 사진을 넣는다.
    measureCapture.mockResolvedValueOnce(BLURRY);
    await addPhoto(0);

    expect(
      screen.queryByText(/뚜렷한 이상을 찾지 못했습니다/),
    ).not.toBeInTheDocument();
    // 앞서 고른 "그래도 사용"은 새 사진에 이어지지 않는다.
    expect(
      screen.getByRole('button', { name: '뒷면 전체 사진을 그래도 사용' }),
    ).toBeInTheDocument();
    expect(analyzeButton()).toBeDisabled();
  });

  it('자리별 경고·재촬영 횟수와 측정값을 기록으로 넘긴다', async () => {
    const result = await openConfirm();
    measureCapture.mockResolvedValueOnce(BLURRY);
    await addPhoto(0);
    await addPhoto(1);
    await addPhoto(1); // 가장자리를 한 번 다시 넣었다
    await addPhoto(2);
    fireEvent.click(
      screen.getByRole('button', { name: '뒷면 전체 사진을 그래도 사용' }),
    );
    examine.mockResolvedValue(EXAM_NOT_OBSERVED);
    await act(async () => {
      fireEvent.click(analyzeButton());
    });
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(push).toHaveBeenCalledWith('/result');
    const checks = result.current.captureChecks;
    expect(checks.wheelBack).toEqual({
      checkVersion: CAPTURE_CHECK_VERSION,
      warnings: ['blur'],
      usedDespiteWarning: true,
      retakeCount: 0,
    });
    expect(checks.wheelEdge?.retakeCount).toBe(1);
    expect(checks.wheelEdge?.warnings).toEqual([]);
    expect(checks.wheelBore?.retakeCount).toBe(0);
    expect(result.current.wheelExamCaptureMetrics?.back).toEqual(BLURRY);
    expect(result.current.wheelExamCaptureMetrics?.edge).toEqual(CLEAN);
    // 사진 상태 경고는 AI 결과를 바꾸지 않는다.
    expect(result.current.wheelExam).toEqual(EXAM_NOT_OBSERVED);
  });
});
