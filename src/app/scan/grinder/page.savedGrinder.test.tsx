// 그라인더 확인 화면 — 저장된 그라인더 선택.
//
// 핵심: 저장된 항목을 골라도 곧바로 입력칸이 바뀌지 않고(확인 필요), 적용해도
// userConfirmed·장비 상태 Gate는 자동으로 채워지지 않는다. 확인 화면 draft
// 복구(formDraftStore)와 저장된 그라인더(savedGrinderStore)는 서로 다른
// 저장소라 한쪽의 동작이 다른 쪽 데이터를 건드리지 않는다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  savedList,
  savedAdd,
  savedUpdate,
  savedRemove,
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
  savedList: vi.fn(),
  savedAdd: vi.fn(),
  savedUpdate: vi.fn(),
  savedRemove: vi.fn(),
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

vi.mock('@/lib/db/savedGrinderStore', () => ({
  savedGrinderStore: {
    list: savedList,
    add: savedAdd,
    update: savedUpdate,
    remove: savedRemove,
  },
}));

let currentSavedItems: unknown[] = [];
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (querier: () => Promise<unknown>) => {
    void querier();
    return currentSavedItems;
  },
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
import type { SavedGrinder } from '@/lib/db/savedGrinderModel';

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

function saved(overrides: Partial<SavedGrinder> = {}): SavedGrinder {
  return {
    id: 1,
    schemaVersion: 1,
    alias: '저장된 1호기',
    savedAt: '2026-09-17T00:00:00.000Z',
    model: 'DWE100',
    noLoadRPM: '10000',
    maxWheelDiameter: '100',
    spindleThread: 'M10',
    guardType: 'cutting',
    guardSize: '100',
    ...overrides,
  };
}

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
  savedList.mockReset();
  savedAdd.mockReset();
  savedUpdate.mockReset();
  savedRemove.mockReset();
  currentSavedItems = [];
  optimizeForUpload.mockImplementation(async (blob: Blob) => blob);
  measureCapture.mockResolvedValue(CLEAN);
  extractGrinder.mockResolvedValue(OCR);
  const result = store();
  act(() => result.current.reset());
});

async function goToConfirm() {
  render(<GrinderScanPage />);
  fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
  await screen.findByText('읽어낸 값을 확인하세요');
}

describe('그라인더 확인 화면 — 저장된 그라인더 선택', () => {
  it('선택해도 값은 확인 뒤에만 채워지고, 채운 뒤에도 확인·Gate는 다시 받아야 한다', async () => {
    currentSavedItems = [saved()];
    const user = userEvent.setup();
    await goToConfirm();

    // OCR로 읽은 값이 먼저 들어와 있다. 확인·Gate도 먼저 눌러 둔다.
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    expect(
      screen.getByRole('button', { name: '확인 후 숫돌 촬영' }),
    ).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: '선택' }));
    // 적용을 누르기 전에는 OCR 값이 그대로 남아 있다.
    expect(screen.getByDisplayValue('GWS 750-125')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '적용' }));

    // 저장된 값으로 입력칸이 바뀐다.
    expect(screen.getByDisplayValue('DWE100')).toBeInTheDocument();
    // 확인·Gate는 자동으로 채워지지 않는다 — 진행 버튼이 다시 막힌다.
    expect(
      screen.getByRole('button', { name: '확인 후 숫돌 촬영' }),
    ).toBeDisabled();
  });

  it('현재 값과 충돌하면 확인 전에 조용히 덮지 않는다', async () => {
    currentSavedItems = [saved()];
    const user = userEvent.setup();
    await goToConfirm();

    await user.click(screen.getByRole('button', { name: '선택' }));
    expect(
      screen.getByText('지금 읽은 값과 다릅니다', { exact: false }),
    ).toBeInTheDocument();
    // 여기서 취소하면 OCR 값이 그대로 남는다.
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByDisplayValue('GWS 750-125')).toBeInTheDocument();
  });

  it('확인 화면 draft 복구와 저장된 그라인더 선택은 서로 다른 저장소라 섞이지 않는다', async () => {
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'grinder',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          model: 'FROM-DRAFT',
          noLoadRPM: '7000',
          maxWheelDiameter: '80',
          spindleThread: 'unknown',
          guardType: 'unknown',
          guardSize: '',
        },
        photo: new Blob(['plate']),
        ocr: OCR,
        offline: false,
      },
    });
    currentSavedItems = [saved()];

    render(<GrinderScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    // draft가 복원한 입력값이 저장된 그라인더 목록 조회에 영향을 주지 않는다.
    expect(screen.getByDisplayValue('FROM-DRAFT')).toBeInTheDocument();
    expect(screen.getByText('저장된 1호기')).toBeInTheDocument();

    // 선택 화면을 열어도 formDraftStore 저장소 함수는 부르지 않는다 — 저장된
    // 그라인더 목록은 완전히 다른 데이터베이스에서 온다.
    expect(savedList).toHaveBeenCalled();
    expect(formLoad).toHaveBeenCalledTimes(1);
  });
});
