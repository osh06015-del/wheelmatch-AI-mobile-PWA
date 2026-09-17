// 숫돌 확인 화면 — 입력 중 draft 복구와 로컬 OCR 제한 판정.
//
// 그라인더 쪽(page.formDraft.test.tsx)과 같은 계약을 숫돌 확인 화면에서도 본다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replace,
  push,
  extractWheel,
  getLastTelemetry,
  formLoad,
  formSave,
  formRemove,
} = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  extractWheel: vi.fn(),
  getLastTelemetry: vi.fn(
    (): import('@/lib/rules/types').OcrTelemetry | null => null,
  ),
  formLoad: vi.fn(),
  formSave: vi.fn(),
  formRemove: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/ocr/extractor', () => ({
  getExtractor: () => ({
    extractGrinder: vi.fn(),
    extractWheel,
    getLastTelemetry,
  }),
}));

vi.mock('@/lib/draft/draftStore', () => ({
  formDraftStore: { load: formLoad, save: formSave, remove: formRemove },
}));

vi.mock('@/lib/image/optimize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/optimize')>()),
  optimizeForUpload: async (blob: Blob) => blob,
}));

vi.mock('@/lib/vision/wheelExam', () => ({
  getWheelExaminer: () => ({ examine: vi.fn() }),
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

/** 다각도 확인을 요구하지 않는 종류라 확인 흐름을 단순하게 유지한다. */
const OCR: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'flap_disc',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

function store() {
  return renderHook(() => useInspection()).result;
}

function readyGrinder() {
  const result = store();
  act(() => {
    result.current.setGrinder(GRINDER);
    result.current.setGrinderCondition(CONFIRMED);
  });
  return result;
}

beforeEach(() => {
  replace.mockClear();
  push.mockClear();
  extractWheel.mockReset();
  getLastTelemetry.mockReset().mockReturnValue(null);
  formLoad.mockReset().mockResolvedValue({ status: 'none' });
  formSave.mockReset();
  formRemove.mockReset();
  extractWheel.mockResolvedValue(OCR);
  const result = store();
  act(() => result.current.reset());
});

describe('숫돌 확인 화면 — 입력 draft 복구', () => {
  it('새로고침 전 draft가 있으면 입력칸을 복원하지만 확인·Gate는 다시 받는다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'wheel',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          maxRPM: '12200',
          diameter: '125',
          thickness: '1.6',
          purpose: 'cutting',
          expiry: '',
          wheelType: 'flap_disc',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: OCR,
        offline: false,
      },
    });

    render(<WheelScanPage />);

    await screen.findByText('읽어낸 값을 확인하세요');
    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('125')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '확인 후 규격 대조' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /라벨을 직접 보고/ }),
    ).not.toBeChecked();
  });

  it('새 사진을 찍으면 이전 확인 화면 draft를 지운다', async () => {
    readyGrinder();
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(formRemove).toHaveBeenCalledWith('wheel');
  });
});

describe('숫돌 확인 화면 — 로컬 OCR 제한 판정', () => {
  it('엔진이 tesseract면 값은 살리되 오프라인과 같은 제한 판정으로 남긴다', async () => {
    const result = readyGrinder();
    getLastTelemetry.mockReturnValue({
      engine: 'tesseract',
      model: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      durationMs: 90,
    });
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
    expect(
      screen.getByText('오프라인 제한 대조', { exact: false }),
    ).toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
  });
});
