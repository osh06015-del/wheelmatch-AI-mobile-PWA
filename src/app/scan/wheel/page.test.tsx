// 숫돌 촬영 화면 테스트.
//
// 1. Grinder Condition Gate를 통과하지 않은 채 /scan/wheel로 들어오면
//    촬영 화면이 열려서는 안 된다. 열리면 장비 상태를 보지 않은 점검이
//    그대로 규격 대조까지 흘러간다.
// 2. 숫돌 종류는 작업자가 실물을 보고 고른다. AI가 본 종류는 제안값이고,
//    둘이 다르면 작업자가 직접 확인해야 넘어간다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, push, extractWheel } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  extractWheel: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
}));

// OCR 결과는 테스트가 정한다. 실제 모델을 부르지 않는다.
vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({
    extractGrinder: vi.fn(),
    extractWheel,
  }),
}));

// 사진 축소는 canvas가 필요하다. 이 테스트는 확인 화면만 본다.
vi.mock('@/lib/image/optimize', () => ({
  optimizeForUpload: async (blob: Blob) => blob,
}));

// 카메라 대신 사진 한 장을 고르는 버튼만 둔다.
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
import { useInspection } from '@/lib/state/inspection';
import type {
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

const CONFIRMED: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

/** 라벨이 선명한 결합숫돌을 모델이 읽은 결과 */
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

const BLOCKED = '그라인더 상태 확인이 먼저입니다.';

function store() {
  return renderHook(() => useInspection()).result;
}

describe('숫돌 촬영 화면 — Grinder Condition Gate 우회 차단', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    const result = store();
    act(() => result.current.reset());
  });

  it('그라인더 값이 없으면 촬영 화면을 열지 않는다', () => {
    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('그라인더는 있는데 장비 상태를 확인하지 않았으면 막는다', () => {
    const result = store();
    act(() => result.current.setGrinder(GRINDER));

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('한 항목이라도 미확인이면 막는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition({ ...CONFIRMED, guardSecure: null });
    });

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('한 항목이라도 문제 있음이면 막는다', () => {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition({
        ...CONFIRMED,
        cordAndPlugUndamaged: false,
      });
    });

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });

  it('다섯 항목을 모두 확인했을 때만 촬영 화면이 열린다', () => {
    // 위 네 개만으로는 "항상 막는" 버그를 잡지 못한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });

    render(<WheelScanPage />);

    expect(screen.queryByText(BLOCKED)).not.toBeInTheDocument();
    expect(screen.getByText('숫돌 라벨 촬영')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('새 그라인더를 잡으면 다시 막힌다', () => {
    // setGrinder가 이전 장비 상태를 지운다. 화면도 그에 따라 닫혀야 한다.
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });
    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    render(<WheelScanPage />);

    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/scan/grinder');
  });
});

describe('숫돌 촬영 화면 — 숫돌 종류 직접 확인', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    extractWheel.mockReset();
    const result = store();
    act(() => result.current.reset());
  });

  /** 그라인더 Gate를 통과하고 사진을 골라 값 확인 화면까지 연다. */
  async function openConfirm(ocr: WheelSpec) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });
    extractWheel.mockResolvedValue(ocr);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');
    return result;
  }

  function answerWheelCondition() {
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
  }

  const typeSelect = () => screen.getByRole('combobox', { name: '숫돌 종류' });
  const manualToggle = () =>
    screen.getByRole('checkbox', {
      name: /라벨을 직접 보고 위 값을 확인했습니다/,
    });
  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  it('AI가 일반 결합숫돌로 읽으면 제안값으로 채우고, 같으면 따로 확인을 요구하지 않는다', async () => {
    const result = await openConfirm(OCR);

    expect(typeSelect()).toHaveValue('bonded_abrasive');
    expect(
      screen.getByText(
        'AI 제안: 일반 결합숫돌 — 사진으로 본 초기 제안값일 뿐입니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '일반 결합숫돌로 직접 확인한 경우에만 이 앱이 규격을 대조합니다.',
      ),
    ).toBeInTheDocument();

    answerWheelCondition();
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheelOcr?.wheelType).toBe('bonded_abrasive');
  });

  it('AI가 플랩디스크로 읽으면 판정불가로 끝난다고 알리고 그 종류로 넘긴다', async () => {
    const result = await openConfirm({ ...OCR, wheelType: 'flap_disc' });

    expect(typeSelect()).toHaveValue('flap_disc');
    expect(
      screen.getByText(
        '이 앱이 판정하지 않는 종류입니다. 규격 대조는 판정불가로 끝납니다. 제조사 취급설명서를 확인하세요.',
      ),
    ).toBeInTheDocument();

    answerWheelCondition();
    fireEvent.click(proceedButton());

    expect(result.current.wheel?.wheelType).toBe('flap_disc');
  });

  it('작업자가 AI 제안과 다른 종류를 고르면 차이를 알리고 직접 확인 전에는 넘어가지 못한다', async () => {
    const result = await openConfirm({ ...OCR, wheelType: 'flap_disc' });

    fireEvent.change(typeSelect(), { target: { value: 'bonded_abrasive' } });

    expect(
      screen.getByText(
        /AI 제안\(플랩디스크\)과 선택한 종류\(일반 결합숫돌\)가 다릅니다/,
      ),
    ).toBeInTheDocument();

    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();
    expect(
      screen.getByText(
        '숫돌 종류가 AI 제안과 달라 직접 확인 체크가 필요합니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(manualToggle());
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    // 최종값과 OCR 원본을 따로 남긴다.
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheelOcr?.wheelType).toBe('flap_disc');
    expect(result.current.wheel?.confidence).toBe('high');
  });

  it('종류를 바꾸면 앞서 체크한 직접 확인이 풀린다', async () => {
    await openConfirm(OCR);

    fireEvent.click(manualToggle());
    expect(manualToggle()).toBeChecked();

    fireEvent.change(typeSelect(), { target: { value: 'cup_wheel' } });

    expect(manualToggle()).not.toBeChecked();
  });

  it('Tesseract가 종류를 모르겠음으로 남겨도 작업자가 일반 결합숫돌을 골라 계속할 수 있다', async () => {
    // 글자만 읽는 경로는 숫돌의 생김새를 볼 수 없어 항상 unknown·낮은 신뢰도다.
    const result = await openConfirm({
      ...OCR,
      wheelType: 'unknown',
      confidence: 'low',
    });

    expect(typeSelect()).toHaveValue('unknown');
    expect(
      screen.getByText(
        '종류를 확인하지 못하면 규격 대조가 판정불가로 끝납니다. 실물을 보고 고르세요.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(typeSelect(), { target: { value: 'bonded_abrasive' } });
    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();

    fireEvent.click(manualToggle());
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheel?.confidence).toBe('high');
    expect(result.current.wheelOcr?.wheelType).toBe('unknown');
  });
});
