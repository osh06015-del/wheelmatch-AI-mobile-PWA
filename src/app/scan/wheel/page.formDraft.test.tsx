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

/** 다각도 확인을 요구하는 종류(일반 결합숫돌) */
const OCR_EXAM: WheelSpec = { ...OCR, wheelType: 'bonded_abrasive' };

const METRICS: CaptureQualityMetrics = {
  originalWidth: 4032,
  originalHeight: 3024,
  originalBytes: 7_500_000,
  uploadWidth: 2048,
  uploadHeight: 1536,
  uploadBytes: 1_800_000,
  meanBrightness: 130,
  contrast: 40,
  darkPixelRatio: 0.05,
  brightPixelRatio: 0.05,
  blurMetric: 400,
  optimizeMs: 120,
};

const EXAM_METRICS = { back: METRICS, edge: METRICS, bore: METRICS };

const EXAM_SUSPECTED: WheelExamResult = {
  status: 'suspected',
  findings: [
    {
      kind: 'crack',
      view: 'edge',
      reason: '가장자리에 균열',
      confidence: 'high',
    },
  ],
  photoQuality: (['front', 'back', 'edge', 'bore'] as const).map((view) => ({
    view,
    issues: [],
    readable: true,
  })),
  model: 'claude-sonnet-5',
  promptVersion: 'test',
  analyzedAt: '2026-09-17T00:00:00.000Z',
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

describe('숫돌 확인 화면 — 다각도 확인(Wheel Exam) draft 복구', () => {
  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  function examDraft(
    exam: Partial<Record<'back' | 'edge' | 'bore', Blob | null>> = {
      back: new Blob(['back']),
      edge: new Blob(['edge']),
      bore: new Blob(['bore']),
    },
  ) {
    return {
      slot: 'wheel' as const,
      schemaVersion: 1,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: {
        maxRPM: '12200',
        diameter: '125',
        thickness: '1.6',
        purpose: 'cutting',
        expiry: '',
        wheelType: 'bonded_abrasive',
        accessoryName: '',
      },
      photo: new Blob(['label']),
      ocr: OCR_EXAM,
      offline: false,
      exam: {
        photos: exam,
        metrics: EXAM_METRICS,
        exam: EXAM_SUSPECTED,
        notRunReason: null,
      },
    };
  }

  it('사진·품질·AI 결과를 복원하지만 이상 징후 확인(acknowledge)은 다시 받는다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({ status: 'found', draft: examDraft() });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    // 사진과 AI 결과가 복원됐다 — 다시 촬영·분석할 필요가 없다.
    expect(
      screen.getByText(
        '사진에서 이상 징후가 보입니다. 실물을 직접 확인하세요.',
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('사진 있음')).toHaveLength(3);

    // 이상 징후 확인·Wheel Condition Gate는 복원되지 않아 진행이 막힌다.
    expect(
      screen.getByRole('checkbox', {
        name: /표시된 위치를 실물에서 직접 확인했습니다/,
      }),
    ).not.toBeChecked();
    expect(proceedButton()).toBeDisabled();
  });

  it('사진이 하나라도 없으면(누락) AI 결과를 버리고 재촬영을 요구한다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: examDraft({
        back: new Blob(['back']),
        edge: new Blob(['edge']),
        bore: null, // 이 자리만 없다
      }),
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    // AI 결과는 사진이 갖춰지지 않아 되살아나지 않는다.
    expect(
      screen.queryByText(
        '사진에서 이상 징후가 보입니다. 실물을 직접 확인하세요.',
        { exact: false },
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        '뒷면·가장자리·중심구멍 사진을 모두 넣어야 확인할 수 있습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('손상된(형태가 어긋난) 사진 값은 버리고 재촬영을 요구한다', async () => {
    readyGrinder();
    const draft = examDraft();
    // Blob이 아닌 값 — IndexedDB에서 손상되거나 구버전 형태로 온 경우를 흉내낸다.
    (draft.exam.photos as unknown as Record<string, unknown>).edge =
      'data:image/png;base64,broken';

    formLoad.mockResolvedValueOnce({ status: 'found', draft });
    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(
      screen.queryByText(
        '사진에서 이상 징후가 보입니다. 실물을 직접 확인하세요.',
        { exact: false },
      ),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('사진 있음')).toHaveLength(2);
  });

  it('지금 종류가 다각도 확인을 요구하지 않으면 저장된 Exam을 복원하지 않는다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        ...examDraft(),
        fields: {
          ...examDraft().fields,
          wheelType: 'flap_disc', // 다각도 확인을 요구하지 않는 종류
        },
        ocr: OCR,
      },
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        '사진에서 이상 징후가 보입니다. 실물을 직접 확인하세요.',
        { exact: false },
      ),
    ).not.toBeInTheDocument();
  });
});

describe('숫돌 확인 화면 — 같은 화면에서 종류를 바꾸면', () => {
  const typeSelect = () => screen.getByRole('combobox', { name: '숫돌 종류' });

  async function openConfirm() {
    readyGrinder();
    extractWheel.mockResolvedValue(OCR_EXAM);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');
  }

  it('debounce를 기다리지 않고 곧바로 이전 종류의 draft를 지운다', async () => {
    await openConfirm();
    formRemove.mockClear();

    fireEvent.change(typeSelect(), { target: { value: 'flap_disc' } });

    // 1초 debounce가 돌기 전에 이미 지워져 있어야 한다 — 그 사이 새로고침해도
    // 이전 종류(bonded_abrasive)의 fields·exam이 되살아나지 않는다.
    expect(formRemove).toHaveBeenCalledWith('wheel');
  });

  it('other로 옮기면 부속품 이름 입력이 비어 있다', async () => {
    await openConfirm();

    fireEvent.change(typeSelect(), { target: { value: 'other' } });

    expect(screen.getByRole('textbox', { name: /부속품 이름/ })).toHaveValue(
      '',
    );
  });

  it('종류를 바꾸면 이전 종류의 다각도 확인 사진·결과가 새 종류에 남지 않는다', async () => {
    await openConfirm();
    // 결합숫돌 다각도 확인 사진을 하나 넣는다.
    const backInput =
      document.querySelectorAll<HTMLInputElement>('input[type=file]')[0];
    await act(async () => {
      fireEvent.change(backInput, {
        target: {
          files: [new File(['x'], 'back.jpg', { type: 'image/jpeg' })],
        },
      });
    });
    expect(screen.getAllByText('사진 있음')).toHaveLength(1);

    // 다각도 확인을 요구하지 않는 종류로 바꾼다.
    fireEvent.change(typeSelect(), { target: { value: 'flap_disc' } });

    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();

    // 다시 결합숫돌로 돌아와도 방금 넣었던 사진은 남아 있지 않다.
    fireEvent.change(typeSelect(), { target: { value: 'bonded_abrasive' } });
    expect(screen.queryByText('사진 있음')).not.toBeInTheDocument();
  });
});
