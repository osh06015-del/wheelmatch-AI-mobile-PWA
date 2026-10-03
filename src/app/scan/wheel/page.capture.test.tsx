// 숫돌 촬영 화면 — 촬영 직후 사진 상태 확인.
//
// 라벨 사진이 아래 규칙을 따르는지 본다.
//   · 경고는 서버로 보내기 전에 보이고, 작업자가 그래도 쓸 수 있다
//   · 열지 못한 사진만 진행을 막는다
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

const { push, extractWheel, optimizeForUpload, measureCapture } = vi.hoisted(
  () => ({
    push: vi.fn(),
    extractWheel: vi.fn(),
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
  optimizeForUpload.mockReset();
  measureCapture.mockReset();
  optimizeForUpload.mockImplementation(async (blob: Blob) => blob);
  measureCapture.mockResolvedValue(CLEAN);
  extractWheel.mockResolvedValue(OCR);
  const result = store();
  act(() => {
    result.current.reset();
    // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
    result.current.setPurpose('cutting');
  });
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
    // 사진 상태 기록은 명판·라벨 자리에만 있다(추가 사진 자리는 없다).
    expect(Object.keys(result.current.captureChecks)).toEqual(['wheel']);
  });
});
