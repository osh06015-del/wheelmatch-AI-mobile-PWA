// 숫돌 확인 화면 — 입력 중 draft 복구와 로컬 OCR 제한 판정.
//
// 그라인더 쪽(page.formDraft.test.tsx)과 같은 계약을 숫돌 확인 화면에서도 본다.

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

/** 일반 결합숫돌로 읽힌 라벨 */
const OCR_BONDED: WheelSpec = { ...OCR, wheelType: 'bonded_abrasive' };

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
  act(() => {
    result.current.reset();
    // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
    result.current.setPurpose('cutting');
  });
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
        analysisSource: 'server',
      },
    });

    render(<WheelScanPage />);

    await screen.findByText('읽어낸 값을 확인하세요');
    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('125')).toBeInTheDocument();
    // 판독값을 대조할 사진이 같은 화면에 있다(확대 가능).
    expect(
      screen.getByRole('button', { name: '숫돌 라벨 크게 보기' }),
    ).toBeInTheDocument();
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

  it('로컬 OCR로 읽은 확인 화면 draft는 출처를 local_ocr로 남긴다(직접 입력과 구분)', async () => {
    // offline 하나로만 합쳐 저장하면 새로고침 복구 때 "직접 입력"과 "로컬 OCR"을
    // 구분할 수 없다. analysisSource로 따로 남겨야 한다.
    readyGrinder();
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

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({ analysisSource: 'local_ocr' });
    }
  });

  it('새로고침 복구 — local_ocr 출처는 "로컬 OCR" 배지로, manual 출처는 "직접 입력" 배지로 되살아난다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'wheel',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          maxRPM: '',
          diameter: '',
          thickness: '',
          purpose: 'unknown',
          expiry: '',
          wheelType: 'unknown',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: null,
        analysisSource: 'local_ocr',
      },
    });
    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(
      screen.getByText('오프라인 제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('라벨을 직접 보고 값을 입력하세요', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('새로고침 복구 — analysisSource가 없는 구버전 draft는 온라인으로 승격하지 않고 로컬 OCR 배지로 되살아난다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: {
        slot: 'wheel',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          maxRPM: '',
          diameter: '',
          thickness: '',
          purpose: 'unknown',
          expiry: '',
          wheelType: 'unknown',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: null,
        offline: false,
      },
    });
    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(
      screen.getByText('오프라인 제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
  });
});

describe('숫돌 확인 화면 — 이전 버전이 남긴 다각도 확인 draft', () => {
  it('추가 사진·AI 결과는 되살리지 않고 입력칸만 복원한다 — 그 단계가 다시 뜨지 않는다', async () => {
    // 다각도 외관 확인을 빼기 전(2026-10-03 이전)에 저장된 확인 화면 draft다.
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
          wheelType: 'bonded_abrasive',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: OCR_BONDED,
        analysisSource: 'server',
        exam: {
          photos: {
            back: new Blob(['back']),
            edge: new Blob(['edge']),
            bore: new Blob(['bore']),
          },
          metrics: { back: null, edge: null, bore: null },
          exam: {
            status: 'suspected',
            findings: [
              {
                kind: 'crack',
                view: 'edge',
                reason: '가장자리에 균열',
                confidence: 'high',
              },
            ],
            photoQuality: [],
            model: 'claude-sonnet-5',
            promptVersion: 'test',
            analyzedAt: '2026-09-17T00:00:00.000Z',
          },
          notRunReason: null,
        },
      },
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();
    expect(screen.queryByText('가장자리에 균열')).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type=file]')).toHaveLength(0);
    // 확인·Gate는 여전히 다시 받는다.
    expect(
      screen.getByRole('button', { name: '확인 후 규격 대조' }),
    ).toBeDisabled();
  });

  it('새로 저장하는 확인 화면 draft에는 다각도 확인 자리가 없다', async () => {
    readyGrinder();
    extractWheel.mockResolvedValue(OCR_BONDED);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({ slot: 'wheel' });
      expect(draft).not.toHaveProperty('exam');
    }
  });
});

describe('숫돌 확인 화면 — 같은 화면에서 종류를 바꾸면', () => {
  const typeSelect = () => screen.getByRole('combobox', { name: '숫돌 종류' });

  async function openConfirm() {
    readyGrinder();
    extractWheel.mockResolvedValue(OCR_BONDED);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');
  }

  it('debounce를 기다리지 않고 곧바로 이전 종류의 draft를 지운다', async () => {
    await openConfirm();
    formRemove.mockClear();

    fireEvent.change(typeSelect(), { target: { value: 'flap_disc' } });

    // 1초 debounce가 돌기 전에 이미 지워져 있어야 한다 — 그 사이 새로고침해도
    // 이전 종류(bonded_abrasive)의 입력이 되살아나지 않는다.
    expect(formRemove).toHaveBeenCalledWith('wheel');
  });

  it('other로 옮기면 부속품 이름 입력이 비어 있다', async () => {
    await openConfirm();

    fireEvent.change(typeSelect(), { target: { value: 'other' } });

    expect(screen.getByRole('textbox', { name: /부속품 이름/ })).toHaveValue(
      '',
    );
  });
});
