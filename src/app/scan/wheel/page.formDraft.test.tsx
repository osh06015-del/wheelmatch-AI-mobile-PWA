// 숫돌 확인 화면 — 입력 중 draft 복구와 로컬 OCR 제한 판정.
//
// 그라인더 쪽(page.formDraft.test.tsx)과 같은 계약을 숫돌 확인 화면에서도 본다.

import {
  act,
  cleanup,
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
  decodeLabel,
  measureLabel,
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
  // 사진 상태 확인 단계를 밟아야 하는 테스트만 쓴다. 정해 주지 않으면 사진은
  // 그대로 열리고 측정값도 실제 값이다(경고 없음).
  decodeLabel: vi.fn(async (): Promise<void> => {}),
  measureLabel: vi.fn(
    async (): Promise<
      import('@/lib/rules/types').CaptureQualityMetrics | undefined
    > => undefined,
  ),
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
  optimizeForUpload: async (blob: Blob) => {
    await decodeLabel();
    return blob;
  },
}));

vi.mock('@/lib/image/quality', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/image/quality')>();
  return {
    ...original,
    measureCapture: async (
      ...args: Parameters<typeof original.measureCapture>
    ) => (await measureLabel()) ?? original.measureCapture(...args),
  };
});

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
import { carriedDamageOnlyDraft } from '@/lib/draft/formDraftModel';
import { ko } from '@/lib/i18n/messages/ko';
import { ImageDecodeError } from '@/lib/image/optimize';
import { EMPTY_CAPTURE_METRICS } from '@/lib/image/quality';
import { ExtractError } from '@/lib/ocr/errors';
import { limitCausesOf, useInspection } from '@/lib/state/inspection';
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
  decodeLabel.mockReset();
  measureLabel.mockReset();
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

  it('목록에 없는 숫돌 종류가 남은 draft — 선택칸은 「모르겠음」을 가리키고, 화면에 보인 그 값이 대조로 넘어간다', async () => {
    // 종류 이름이 나중에 바뀌었거나 저장된 값이 손상된 경우다. 선택지에 없는 값을
    // 그대로 들이면 선택칸이 보여주는 종류와 실제로 넘어가는 값이 서로 달라진다.
    const result = readyGrinder();
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
          wheelType: 'resin_wheel',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: OCR,
        analysisSource: 'server',
      },
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    const typeSelect = screen.getByRole('combobox', { name: '숫돌 종류' });
    expect(typeSelect).toHaveDisplayValue('모르겠음');
    expect(typeSelect).toHaveValue('unknown');
    // 되살리지 못한 선택을 AI 제안으로 메우지 않는다. 종류는 작업자가 다시 고른다.
    expect(
      screen.getByText(
        '⚠ AI 제안(플랩디스크)과 선택한 종류(모르겠음)가 다릅니다. 실물을 다시 보고 아래 직접 확인을 체크해야 진행할 수 있습니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /라벨을 직접 보고/ }));
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('unknown');
    // AI가 본 종류(OCR 원본)는 그대로 남는다.
    expect(result.current.wheelOcr?.wheelType).toBe('flap_disc');
  });

  it('목록에 없는 용도가 남은 draft — 선택칸은 「모르겠음」을 가리키고, 화면에 보인 그 값이 대조로 넘어간다', async () => {
    // 용도 선택칸은 값에 맞는 선택지가 없으면 첫 선택지(절단용)를 고른 것처럼
    // 보인다. 화면에는 절단용이 보이는데 규칙엔진에는 모르는 용도가 넘어가면, 작업을
    // 절단으로 고른 점검이 근거 없는 용도 불일치(부적합)로 끝난다.
    const result = readyGrinder();
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
          purpose: 'polishing',
          expiry: '',
          wheelType: 'bonded_abrasive',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: OCR_BONDED,
        analysisSource: 'server',
      },
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    const purposeSelect = screen.getByRole('combobox', { name: /^용도/ });
    expect(purposeSelect).toHaveDisplayValue('모르겠음');
    expect(purposeSelect).toHaveValue('unknown');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(push).toHaveBeenCalledWith('/result');
    // 절단용·연삭용 어느 쪽으로도 추정하지 않는다. 용도는 작업자가 다시 고른다.
    expect(result.current.wheel?.purpose).toBe('unknown');
    // AI가 읽은 용도(OCR 원본)는 그대로 남는다.
    expect(result.current.wheelOcr?.purpose).toBe('cutting');
  });

  describe('OCR 원본에 목록에 없는 종류가 남은 draft', () => {
    // 종류 이름이 나중에 바뀌었거나 저장된 값이 손상된 경우다. 그 값만 「모르겠음」
    // 으로 읽고 나머지 판독(외관 의심·원본 표시)은 그대로 쓴다. 다만 손댄 OCR을
    // "모델이 읽은 원본"으로 기록하지는 않는다.
    const MARKINGS = {
      labeledRPM: 12200,
      peripheralSpeedMps: 80,
      boreDiameter: 22.23,
    };
    const DAMAGE_WARNING =
      '⚠ AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.';

    function staleOcrDraft() {
      return {
        slot: 'wheel',
        schemaVersion: 1,
        savedAt: '2026-09-17T00:00:00.000Z',
        fields: {
          maxRPM: '12200',
          diameter: '125',
          thickness: '1.6',
          purpose: 'cutting',
          expiry: '',
          wheelType: 'resin_wheel',
          accessoryName: '',
        },
        photo: new Blob(['label']),
        ocr: {
          ...OCR,
          wheelType: 'resin_wheel',
          visibleDamage: 'suspected',
          markings: MARKINGS,
          rpmSource: 'label',
        },
        analysisSource: 'server',
      };
    }

    async function openStaleDraft() {
      const result = readyGrinder();
      formLoad.mockResolvedValueOnce({
        status: 'found',
        draft: staleOcrDraft(),
      });
      render(<WheelScanPage />);
      await screen.findByText('읽어낸 값을 확인하세요');
      return result;
    }

    function confirmAndProceed() {
      for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
        fireEvent.click(button);
      }
      fireEvent.click(
        screen.getByRole('button', { name: '확인 후 규격 대조' }),
      );
    }

    it('AI 제안은 「모르겠음」으로 읽는다 — 읽지 못한 제안을 두고 선택과 다르다고 하지 않는다', async () => {
      await openStaleDraft();

      expect(screen.getByRole('combobox', { name: '숫돌 종류' })).toHaveValue(
        'unknown',
      );
      expect(
        screen.getByText(
          'AI 제안: 모르겠음 — 사진으로 본 초기 제안값일 뿐입니다.',
        ),
      ).toBeInTheDocument();
      // "AI 제안(모르겠음)과 선택한 종류(모르겠음)가 다릅니다"가 뜨면 안 된다.
      expect(screen.queryByText(/가 다릅니다/)).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          '숫돌 종류가 AI 제안과 달라 직접 확인 체크가 필요합니다.',
        ),
      ).not.toBeInTheDocument();
    });

    it('그 OCR이 올린 외관 의심과 원본 표시는 이어가고, 손댄 OCR은 원본으로 기록하지 않는다', async () => {
      const result = await openStaleDraft();

      // 의심을 덜어내지 않는다 — 종류를 읽지 못했다고 손상 경고까지 사라지지 않는다.
      expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();

      confirmAndProceed();

      expect(push).toHaveBeenCalledWith('/result');
      expect(result.current.wheel?.wheelType).toBe('unknown');
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      // 이 사진을 읽은 판독이 올린 의심이다. 모름으로 바꿔 읽은 것은 종류뿐이다.
      expect(result.current.wheel?.visibleDamageSources).toEqual([
        'label_photo',
      ]);
      // 표기 일치 검사의 근거(원본 표시)도 규격으로 넘어간다.
      expect(result.current.wheel?.markings).toEqual(MARKINGS);
      // unknown으로 바꿔 읽은 값을 "모델이 unknown이라고 읽었다"로 남기지 않는다.
      expect(result.current.wheelOcr).toBeNull();
    });

    it('손댔다는 표시를 다시 저장한다 — 한 번 더 새로고침해도 원본으로 둔갑하지 않는다', async () => {
      await openStaleDraft();

      await waitFor(() => expect(formSave).toHaveBeenCalled(), {
        timeout: 3000,
      });
      for (const [draft] of formSave.mock.calls) {
        expect(draft).toMatchObject({
          slot: 'wheel',
          ocrAltered: true,
          ocr: { wheelType: 'unknown', visibleDamage: 'suspected' },
        });
      }
    });

    it('원본 표시가 어긋난 OCR — 그 표시만 빼고 외관 의심은 이어가며, 원본으로는 기록하지 않는다', async () => {
      // 원본 표시는 일부만 고쳐 살리지 않는다. 확정하면 기록에 "라벨에 인쇄된
      // 그대로"로 남는 값이라, 빈 자리를 메워 넣으면 고친 원본이 된다.
      const result = readyGrinder();
      formLoad.mockResolvedValueOnce({
        status: 'found',
        draft: {
          ...staleOcrDraft(),
          fields: { ...staleOcrDraft().fields, wheelType: 'bonded_abrasive' },
          ocr: {
            ...OCR_BONDED,
            visibleDamage: 'suspected',
            markings: { labeledRPM: 12200 },
          },
        },
      });
      render(<WheelScanPage />);
      await screen.findByText('읽어낸 값을 확인하세요');

      expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();

      confirmAndProceed();

      expect(push).toHaveBeenCalledWith('/result');
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      expect(result.current.wheel).not.toHaveProperty('markings');
      expect(result.current.wheelOcr).toBeNull();
    });

    it('일부만 모름으로 읽은 OCR로 확정하면 온라인 대조로 남는다 — 통째로 버린 판독과 달리 판독이 화면에 있다', async () => {
      // 통째로 버린 판독은 제한 대조로 낮춘다(아래 「통째로 버린 OCR」 묶음). 이쪽은
      // 낮추지 않는다 — 숫자·원문·신뢰도가 기준에 맞는 판독이 화면에 남아 있고,
      // 확정한 규격에 그 판독의 회전속도 출처와 원본 표시가 실린다. 직접 입력과
      // 같은 증거가 아니다.
      const result = await openStaleDraft();

      confirmAndProceed();

      expect(push).toHaveBeenCalledWith('/result');
      expect(result.current.wheel?.rpmSource).toBe('label');
      expect(result.current.wheel?.markings).toEqual(MARKINGS);
      expect(result.current.offlineSlots.wheel).toBe(false);
      expect(result.current.analysisMode).toBe('online');
    });

    it('새 라벨 사진을 찍으면 표시를 지운다 — 새 판독은 원본으로 기록된다', async () => {
      const result = await openStaleDraft();
      extractWheel.mockResolvedValue(OCR_BONDED);

      fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
      fireEvent.click(
        screen.getByRole('button', { name: '테스트 사진 고르기' }),
      );
      await screen.findByText('읽어낸 값을 확인하세요');

      confirmAndProceed();

      expect(push).toHaveBeenCalledWith('/result');
      expect(result.current.wheelOcr).toEqual(OCR_BONDED);
    });
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
      screen.getByText('제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'local_ocr',
    });
  });

  it('기기가 온라인이어도 로컬 OCR 배지는 오프라인이었다고 말하지 않는다', async () => {
    // 기기 안 OCR로 읽는 빌드에서는 연결이 멀쩡해도 이 배지가 뜬다.
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

    expect(
      screen.getByText(
        '⚠ 제한 대조 — 서버가 아니라 이 기기에서 직접 읽었습니다. 기기가 온라인이면 결과 화면에서 서버로 다시 분석할 수 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/오프라인/)).not.toBeInTheDocument();
  });

  it('서버가 읽었는데 그 순간 기기가 오프라인으로 보고되면 — 제한은 지키되 「이 기기에서 읽었다」고 기록하지 않는다', async () => {
    // navigator.onLine은 연결이 흔들리는 망이나 일부 WebView에서 틀린 값을 낸다.
    // 그 값 하나로 서버가 읽은 판독을 「기기 안 OCR」로 기록하면 모르는 것을
    // 단정하는 것이다.
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      const result = readyGrinder();
      getLastTelemetry.mockReturnValue({
        engine: 'claude',
        model: 'claude-test',
        inputTokens: 10,
        outputTokens: 10,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        durationMs: 900,
      });
      render(<WheelScanPage />);
      fireEvent.click(
        screen.getByRole('button', { name: '테스트 사진 고르기' }),
      );
      await screen.findByText('읽어낸 값을 확인하세요');

      for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
        fireEvent.click(button);
      }
      fireEvent.click(
        screen.getByRole('button', { name: '확인 후 규격 대조' }),
      );

      expect(result.current.offlineSlots.wheel).toBe(true);
      expect(result.current.analysisMode).toBe('offline_limited');
      expect(limitCausesOf(result.current.offlineSlots)).toEqual({
        wheel: 'unknown',
      });
    } finally {
      online.mockRestore();
    }
  });

  it('기기 안 OCR로 읽은 draft에는 확인됐다는 표시를 함께 저장한다 — 새로고침 뒤에도 까닭이 남는다', async () => {
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
    const saved = formSave.mock.calls.at(-1)?.[0];
    expect(saved).toMatchObject({
      analysisSource: 'local_ocr',
      localOcrConfirmed: true,
    });

    // 저장된 그대로 새로고침 뒤 되살려 확정한다. 복원한 화면은 직접 확인과 상태
    // 확인을 다시 받는다.
    cleanup();
    formLoad.mockResolvedValueOnce({ status: 'found', draft: saved });
    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');
    fireEvent.click(screen.getByRole('checkbox', { name: /라벨을 직접 보고/ }));
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    const proceed = screen.getByRole('button', { name: '확인 후 규격 대조' });
    expect(proceed).toBeEnabled();
    fireEvent.click(proceed);

    expect(push).toHaveBeenCalledWith('/result');
    // cleanup()이 앞서 만든 저장소 관찰자도 내렸다. 지금 상태는 새로 읽는다.
    const after = store();
    expect(after.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(after.current.offlineSlots)).toEqual({
      wheel: 'local_ocr',
    });
  });

  it('서버로 읽은 draft에는 그 표시를 저장하지 않는다', async () => {
    readyGrinder();
    getLastTelemetry.mockReturnValue({
      engine: 'claude',
      model: 'claude-test',
      inputTokens: 10,
      outputTokens: 10,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      durationMs: 900,
    });
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({ analysisSource: 'server' });
      expect(draft).not.toHaveProperty('localOcrConfirmed');
    }
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
      screen.getByText('제한 대조 — 서버가 아니라', { exact: false }),
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
      screen.getByText('제한 대조 — 서버가 아니라', { exact: false }),
    ).toBeInTheDocument();
  });

  it('출처가 남지 않은 구버전 draft로 확정하면 제한은 지키되 까닭은 적지 않는다', async () => {
    // 그 draft가 서버로 읽은 것인지 기기에서 읽은 것인지 알 수 없다.
    const result = readyGrinder();
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
        offline: false,
      },
    });
    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'unknown',
    });
  });
});

describe('숫돌 확인 화면 — 이전 버전이 남긴 다각도 확인 draft', () => {
  // 다각도 외관 확인(뒷면·가장자리·중심구멍 사진 + AI 확인)을 빼기 전
  // (2026-10-03 이전)에 저장된 확인 화면 draft의 모양이다.
  function legacyDraft(status: 'suspected' | 'not_observed') {
    return {
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
          status,
          findings:
            status === 'suspected'
              ? [
                  {
                    kind: 'crack',
                    view: 'edge',
                    reason: '가장자리에 균열',
                    confidence: 'high',
                  },
                ]
              : [],
          photoQuality: [],
          model: 'claude-sonnet-5',
          promptVersion: 'test',
          analyzedAt: '2026-09-17T00:00:00.000Z',
        },
        notRunReason: null,
      },
    };
  }

  const DROPPED_NOTICE =
    '⚠ 이전 버전에서 넣은 추가 사진(뒷면·가장자리·중심구멍)과 AI 외관 확인 결과는 이제 쓰지 않아 복구하지 않았습니다. 나머지는 그대로 이어집니다.';
  const DAMAGE_WARNING =
    '⚠ AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.';

  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  function answerWheelCondition() {
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
  }

  it('추가 사진·AI 결과는 되살리지 않고 입력칸만 복원한다 — 버렸다는 것을 알리고, 그 단계는 다시 뜨지 않는다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: legacyDraft('not_observed'),
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type=file]')).toHaveLength(0);
    // 그 확인이 의심하지 않았으면 손상 경고를 지어내지 않는다.
    expect(screen.queryByText(DAMAGE_WARNING)).not.toBeInTheDocument();
    // 확인·Gate는 여전히 다시 받는다.
    expect(proceedButton()).toBeDisabled();
  });

  it('그 확인이 의심했던 숫돌이면 의심을 이어간다 — Gate에서 알리고 규격 값으로 넘긴다', async () => {
    // 라벨 사진의 판독은 「보이지 않음」이다. 새 버전으로 넘어왔다고 앱이 스스로
    // 올렸던 의심이 조용히 사라지면 안 된다.
    const result = readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: legacyDraft('suspected'),
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
    // 이전 버전의 판독 문장 자체는 되살리지 않는다.
    expect(screen.queryByText('가장자리에 균열')).not.toBeInTheDocument();

    // 의심이 Gate를 대신 채우지도, 진행을 대신 막지도 않는다 — 판단은 사람이 한다.
    expect(proceedButton()).toBeDisabled();
    answerWheelCondition();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    // 출처는 이전 버전의 확인이다. 이 사진의 판독(보이지 않음)은 출처에 끼지 않는다
    // — 결과 화면이 이 값으로 "이 사진에서 보인 것이 아니다"를 밝힌다.
    expect(result.current.wheel?.visibleDamageSources).toEqual(['legacy_exam']);
    // 라벨 사진의 OCR 원본은 건드리지 않는다.
    expect(result.current.wheelOcr?.visibleDamage).toBe('none_visible');
    expect(result.current.wheelOcr).not.toHaveProperty('visibleDamageSources');
  });

  it('이어받은 의심을 다시 저장한다 — 한 번 더 새로고침해도 사라지지 않는다', async () => {
    readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: legacyDraft('suspected'),
    });

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({ slot: 'wheel', legacyExam: 'suspected' });
      // 사진과 결과 자체는 다시 저장하지 않는다.
      expect(draft).not.toHaveProperty('exam');
    }
  });

  it('새 라벨 사진을 찍으면 이어받은 흔적을 지운다 — 다른 숫돌일 수 있다', async () => {
    const result = readyGrinder();
    formLoad.mockResolvedValueOnce({
      status: 'found',
      draft: legacyDraft('suspected'),
    });
    extractWheel.mockResolvedValue(OCR_BONDED);

    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_WARNING)).not.toBeInTheDocument();

    answerWheelCondition();
    fireEvent.click(proceedButton());
    expect(result.current.wheel?.visibleDamage).toBe('none_visible');
    // 의심이 아니면 출처 칸도 없다.
    expect(result.current.wheel).not.toHaveProperty('visibleDamageSources');
  });

  it('새로 저장하는 확인 화면 draft에는 다각도 확인 자리도, 이어받은 흔적도 없다', async () => {
    readyGrinder();
    extractWheel.mockResolvedValue(OCR_BONDED);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({ slot: 'wheel' });
      expect(draft).not.toHaveProperty('exam');
      expect(draft).not.toHaveProperty('legacyExam');
      expect(draft).not.toHaveProperty('carriedDamage');
      // 방금 읽은 OCR은 원본이다. 손댔다는 표시가 붙지 않는다.
      expect(draft).not.toHaveProperty('ocrAltered');
    }
  });
});

describe('숫돌 확인 화면 — 통째로 버린 OCR이 남은 draft', () => {
  // 저장된 OCR의 숫자·원문·신뢰도가 어긋나면 그 OCR은 살릴 수 없어 통째로 버린다.
  // 조용히 버리면 화면은 신뢰도 낮음과 종류 직접 확인 요구만 띄우고 이유를 말하지
  // 않으며, 그 OCR이 올린 외관 의심도 함께 사라진다. 버렸다고 알리고 의심은 이어간다.
  //
  // 버린 판독으로 확정한 점검은 제한 대조로 남긴다(2026-10-04). draft에 남은 출처
  // (server)는 그대로 두고, 버렸다는 흔적으로 낮춘다.
  function brokenOcrDraft(visibleDamage: 'suspected' | 'none_visible') {
    return {
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
      // 원문이 문자열이 아니다 — 살릴 뼈대가 없는 OCR이다.
      ocr: { ...OCR_BONDED, visibleDamage, confidence: 'low', rawText: null },
      analysisSource: 'server',
    };
  }

  const DROPPED_NOTICE =
    '⚠ 저장된 AI 판독 결과를 읽을 수 없어 복구하지 못했습니다. 이대로 진행하면 적합 판정을 받을 수 없습니다. 다시 촬영하거나, 결과 화면에서 서버로 다시 분석하세요.';
  const DAMAGE_WARNING =
    '⚠ AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.';

  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  /** 직접 확인을 체크하고 Gate에 답한다. AI 제안이 없어 종류도 직접 확인이 필요하다 */
  function confirmAndAnswer() {
    fireEvent.click(screen.getByRole('checkbox', { name: /라벨을 직접 보고/ }));
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
  }

  async function openDraft(draft: unknown) {
    const result = readyGrinder();
    formLoad.mockResolvedValueOnce({ status: 'found', draft });
    render(<WheelScanPage />);
    await screen.findByText('읽어낸 값을 확인하세요');
    return result;
  }

  it('버렸다는 것을 알리고 입력칸은 복원한다 — 의심하지 않았던 OCR이면 손상 경고를 지어내지 않는다', async () => {
    const result = await openDraft(brokenOcrDraft('none_visible'));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_WARNING)).not.toBeInTheDocument();
    // 확인·Gate는 여전히 다시 받는다.
    expect(proceedButton()).toBeDisabled();

    confirmAndAnswer();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    // 버린 판독의 「보이지 않음」도 되살리지 않는다 — 본 근거가 남아 있지 않다.
    expect(result.current.wheel?.visibleDamage).toBe('unknown');
    expect(result.current.wheel).not.toHaveProperty('visibleDamageSources');
    expect(result.current.wheelOcr).toBeNull();
  });

  it('그 OCR이 의심했던 숫돌이면 의심을 이어간다 — Gate에서 알리고 규격 값으로 넘긴다', async () => {
    const result = await openDraft(brokenOcrDraft('suspected'));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();

    // 의심이 Gate를 대신 채우지도, 진행을 대신 막지도 않는다 — 판단은 사람이 한다.
    expect(proceedButton()).toBeDisabled();
    confirmAndAnswer();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    // 그 판독은 기록에 남지 않는다. 의심이 거기서 왔다는 것만 규격에 적는다.
    expect(result.current.wheel?.visibleDamageSources).toEqual(['dropped_ocr']);
    // 읽을 수 없던 판독은 기록의 OCR 원본으로 남기지 않는다.
    expect(result.current.wheelOcr).toBeNull();
  });

  it('버린 판독으로 확정하면 제한 대조로 남긴다 — 직접 확인을 체크해도 온라인 대조로 나가지 않는다', async () => {
    // 화면에 내놓을 AI 판독이 없다. 확정한 값은 직접 입력과 내용이 같은데(OCR 원본
    // 없음·원문 없음), draft에 남은 출처(server)만 믿고 온라인으로 내보내면 작업자의
    // 확인만으로 적합까지 간다 — 직접 입력은 같은 값으로 적합을 받지 못한다.
    const result = await openDraft(brokenOcrDraft('none_visible'));

    confirmAndAnswer();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    // 직접 확인으로 신뢰도는 올라간다. 적합을 막는 것은 신뢰도가 아니라 판독 경로다.
    expect(result.current.wheel?.confidence).toBe('high');
    expect(result.current.wheel?.rawText).toBe('');
    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    // 서버 분석을 거친 점검이다. 직접 입력이나 로컬 OCR이었다고 남기지 않는다.
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'dropped_ocr',
    });
  });

  it('기기 안 OCR로 읽은 것이 확인된 판독이 버려진 draft는 까닭을 local_ocr로 남긴다 — 출처를 바꿔 적지 않는다', async () => {
    const result = await openDraft({
      ...brokenOcrDraft('none_visible'),
      analysisSource: 'local_ocr',
      localOcrConfirmed: true,
    });

    confirmAndAnswer();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'local_ocr',
    });
  });

  it('출처를 모르는 판독이 버려진 draft는 까닭을 적지 않는다 — 서버 판독을 버렸다고도, 기기에서 읽었다고도 하지 않는다', async () => {
    // 출처 값이 어긋난 draft다. 제한을 지키려고 local_ocr로 읽지만 실제 출처는 모른다.
    const result = await openDraft({
      ...brokenOcrDraft('none_visible'),
      analysisSource: 'cloud',
    });

    confirmAndAnswer();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'unknown',
    });
  });

  it('이어받은 의심을 다시 저장한다 — 한 번 더 새로고침해도 사라지지 않는다', async () => {
    await openDraft(brokenOcrDraft('suspected'));

    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      // 버린 판독 자체는 다시 저장하지 않는다. 흔적만 남긴다.
      expect(draft).toMatchObject({
        slot: 'wheel',
        ocr: null,
        droppedOcr: 'suspected',
        // 출처는 바꿔 적지 않는다. 서버 분석을 거친 것은 사실이고, 로컬 판독이나
        // 직접 입력이었다고 적으면 화면이 사실과 다른 배지를 띄운다. 제한 대조는
        // 흔적이 정한다.
        analysisSource: 'server',
      });
    }
  });

  it('다시 저장된 draft(OCR 없음 + 흔적)에서도 알림과 의심이 그대로다', async () => {
    // 위 테스트가 저장하는 모양이다. ocr은 null이라 흔적이 유일한 근거다.
    await openDraft({
      ...brokenOcrDraft('suspected'),
      ocr: null,
      droppedOcr: 'suspected',
    });

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
  });

  it('다시 저장된 draft(OCR 없음 + 흔적)로 확정해도 제한 대조다 — 새로고침 한 번으로 풀리지 않는다', async () => {
    const result = await openDraft({
      ...brokenOcrDraft('none_visible'),
      ocr: null,
      droppedOcr: 'dropped',
    });

    confirmAndAnswer();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'dropped_ocr',
    });
  });

  it('출처가 server인 제한 대조에 로컬 OCR·직접 입력 배지를 띄우지 않는다 — 사실과 다른 말이다', async () => {
    await openDraft(brokenOcrDraft('none_visible'));

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    // 두 배지는 모두 「제한 대조 — 」로 시작한다. 위 「로컬 OCR 제한 판정」
    // 묶음이 같은 문구로 배지가 뜨는 것을 확인한다.
    expect(
      screen.queryByText('제한 대조 —', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('새 라벨 사진을 찍으면 흔적을 지운다 — 다른 숫돌일 수 있다', async () => {
    const result = await openDraft(brokenOcrDraft('suspected'));
    extractWheel.mockResolvedValue(OCR_BONDED);
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_WARNING)).not.toBeInTheDocument();

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
    fireEvent.click(proceedButton());
    expect(result.current.wheel?.visibleDamage).toBe('none_visible');
    expect(result.current.wheelOcr).toEqual(OCR_BONDED);
    // 새 판독이 화면에 있고 기록의 원본으로 남는다. 제한 대조도 함께 풀린다.
    expect(result.current.offlineSlots.wheel).toBe(false);
    expect(result.current.analysisMode).toBe('online');
  });

  it('종류를 바꿔도 흔적은 남는다 — 다시 저장되는 draft에 의심이 따라간다', async () => {
    await openDraft(brokenOcrDraft('suspected'));

    // 종류 변경은 이전 draft를 곧바로 치운다(의심이 있으면 의심만 담은 draft로
    // 바꿔 둔다). 그 뒤 다시 저장되는 draft가 흔적을 잃으면 새로고침 한 번에 의심이
    // 사라진다.
    fireEvent.change(screen.getByRole('combobox', { name: '숫돌 종류' }), {
      target: { value: 'flap_disc' },
    });
    formSave.mockClear();

    expect(screen.getByText(DROPPED_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    for (const [draft] of formSave.mock.calls) {
      expect(draft).toMatchObject({
        slot: 'wheel',
        fields: { wheelType: 'flap_disc' },
        droppedOcr: 'suspected',
      });
    }
  });

  it('되살린 OCR이 있는데 「의심」 흔적이 남은 draft — 의심은 이어가되, 복구하지 못했다고 알리지는 않는다', async () => {
    // 앱이 쓰는 모양은 아니다(흔적은 OCR을 버렸을 때만 저장되고, 그때 ocr은 null이다).
    // 그래도 의심은 덜어내지 않는다. 화면에 판독이 보이는데 복구하지 못했다고 말하지도
    // 않는다.
    const result = await openDraft({
      ...brokenOcrDraft('none_visible'),
      ocr: OCR_BONDED,
      droppedOcr: 'suspected',
    });

    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();

    // 알림과 제한 대조는 같은 조건이다 — 화면에 판독이 있으면 제한하지 않는다.
    // 복구하지 못했다고 알리지 않으면서 적합만 막으면 작업자는 이유를 알 수 없다.
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    // 화면에 남은 판독(보이지 않음)이 아니라 버린 판독이 올린 의심이다.
    expect(result.current.wheel?.visibleDamageSources).toEqual(['dropped_ocr']);
    expect(result.current.wheelOcr).toEqual(OCR_BONDED);
    expect(result.current.offlineSlots.wheel).toBe(false);
    expect(result.current.analysisMode).toBe('online');
  });

  it('OCR이 온전한 draft에는 알림이 없다 — 없던 일을 알리지 않는다', async () => {
    await openDraft({ ...brokenOcrDraft('none_visible'), ocr: OCR_BONDED });
    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
  });

  it('직접 입력으로 저장된 draft(OCR 없음)에도 알림이 없다', async () => {
    await openDraft({
      ...brokenOcrDraft('none_visible'),
      ocr: null,
      analysisSource: 'manual',
    });
    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
  });
});

describe('숫돌 확인 화면 — 확인 화면을 되살리지 못한 draft', () => {
  // 저장 공간이 모자라면 확인 화면 draft는 사진만 빼고 저장된다(draftStore의
  // savedWithoutPhoto). 저장된 사진 값이 손상돼 되살리지 못한 경우도 같다. 판독값을
  // 대조할 사진이 없어 확인 화면은 열리지 않고, 작업자는 라벨을 다시 찍어야 한다.
  //
  // 손상 의심은 확인 화면에서만 그려지므로, 그런 draft의 의심은 한 번도 보이지 않은
  // 채 다시 찍는 순간 지워졌다. 보인 적 없는 의심은 새 사진을 찍어도 이어간다 — 그
  // 사진은 작업자가 고른 것이 아니라 앱이 요구한 것이다. 확인 화면에서 경고를 본 뒤
  // 스스로 다시 찍으면 다른 흔적처럼 지운다(다른 숫돌일 수 있다).
  function photolessDraft(extra: Record<string, unknown> = {}) {
    return {
      slot: 'wheel',
      schemaVersion: 1,
      savedAt: '2026-09-17T00:00:00.000Z',
      fields: {
        maxRPM: '9900',
        diameter: '125',
        thickness: '1.6',
        purpose: 'cutting',
        expiry: '',
        wheelType: 'bonded_abrasive',
        accessoryName: '',
      },
      photo: null,
      ocr: OCR_BONDED,
      analysisSource: 'server',
      ...extra,
    };
  }

  /** 손상 의심만 담은 draft — 저장된 draft가 없어진 자리에 화면이 남기는 모양 */
  const CARRY_ONLY_DRAFT = {
    slot: 'wheel',
    schemaVersion: 1,
    savedAt: expect.any(String),
    fields: {
      maxRPM: '',
      diameter: '',
      thickness: '',
      purpose: 'unknown',
      expiry: '',
      wheelType: 'unknown',
      accessoryName: '',
    },
    photo: null,
    ocr: null,
    analysisSource: 'local_ocr',
    carriedDamage: 'suspected',
  };

  const CARRIED_NOTICE =
    '⚠ 이 사진을 찍기 전에 저장돼 있던 숫돌 확인에 AI의 손상 의심이 있었습니다. 그 의심은 지우지 않고 이어갑니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.';
  const DAMAGE_WARNING =
    '⚠ AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.';
  // 이 두 알림은 이 묶음에서 「뜨지 않는다」로만 단정한다. 문장을 여기 따로 적어
  // 두면 문구가 바뀔 때 그 단정이 조용히 아무것도 보지 않게 된다 — 실제로 한 번
  // 그렇게 됐다. 문구 표에서 그대로 가져온다. 문장 자체는 위 두 묶음이 고정한다.
  const EXAM_DROPPED_NOTICE = `⚠ ${ko['draft.warn.exam']}`;
  const OCR_DROPPED_NOTICE = `⚠ ${ko['draft.warn.ocr']}`;

  /** 흐림 경고가 나오는 측정값 */
  const BLURRY: CaptureQualityMetrics = {
    ...EMPTY_CAPTURE_METRICS,
    originalWidth: 4032,
    originalHeight: 3024,
    meanBrightness: 130,
    darkPixelRatio: 0.05,
    brightPixelRatio: 0.05,
    blurMetric: 1,
  };

  /**
   * 손상 의심이 화면 어디에도 없다.
   *
   * 두 문구의 부재를 그대로 고정한다. 경고·알림 자리에 「의심」이라는 말이 있는지도
   * 함께 본다 — 문구를 바꾸면서 이 단정이 조용히 아무것도 보지 않게 되는 것을 막는다.
   */
  function expectNoSuspicion() {
    expect(screen.queryByText(CARRIED_NOTICE)).not.toBeInTheDocument();
    expect(screen.queryByText(DAMAGE_WARNING)).not.toBeInTheDocument();
    const mentions = [
      ...screen.queryAllByRole('alert'),
      ...screen.queryAllByRole('status'),
    ].filter((element) => element.textContent?.includes('의심') ?? false);
    expect(mentions).toHaveLength(0);
  }

  function expectCarriedSuspicion() {
    expect(screen.getByText(CARRIED_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
  }

  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  const pickPhoto = () =>
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));

  const changeWheelType = (value: string) =>
    fireEvent.change(screen.getByRole('combobox', { name: '숫돌 종류' }), {
      target: { value },
    });

  function answerWheelCondition() {
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
  }

  async function openDraft(draft: unknown) {
    const result = readyGrinder();
    formLoad.mockResolvedValueOnce({ status: 'found', draft });
    // 다시 찍은 라벨 사진의 판독은 「보이지 않음」이다.
    extractWheel.mockResolvedValue(OCR_BONDED);
    render(<WheelScanPage />);
    // 사진 없는 draft는 화면이 바뀌지 않아 기다릴 문구가 없다. 저장소에서 읽은 값이
    // 화면 상태에 반영될 때까지만 기다린다.
    await waitFor(() => expect(formLoad).toHaveBeenCalledWith('wheel'));
    await act(async () => {});
    return result;
  }

  /** 라벨을 다시 찍어 확인 화면까지 간다 */
  async function retakeLabel() {
    pickPhoto();
    await screen.findByText('읽어낸 값을 확인하세요');
  }

  /** 지금 확인 화면이 저장하는 draft들 */
  async function savedDrafts() {
    formSave.mockClear();
    await waitFor(() => expect(formSave).toHaveBeenCalled(), {
      timeout: 3000,
    });
    return formSave.mock.calls.map(([draft]) => draft);
  }

  it('대조할 사진이 없으면 확인 화면을 열지 않는다 — 라벨을 다시 찍게 하고, 촬영 화면에는 알림을 얹지 않는다', async () => {
    await openDraft(photolessDraft({ legacyExam: 'suspected' }));

    expect(
      screen.queryByText('읽어낸 값을 확인하세요'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '테스트 사진 고르기' }),
    ).toBeInTheDocument();
    // 의심은 다시 찍은 뒤의 확인 화면에서 알린다. 촬영 화면의 배치는 그대로다.
    expectNoSuspicion();
    // 의심이 남아 있는 저장된 draft는 그대로 둔다. 다시 쓰지도 지우지도 않는다.
    expect(formSave).not.toHaveBeenCalled();
    expect(formRemove).not.toHaveBeenCalled();
  });

  it.each<[string, Record<string, unknown>]>([
    ['이전 버전의 다각도 확인', { legacyExam: 'suspected' }],
    ['통째로 버린 OCR의 흔적', { ocr: null, droppedOcr: 'suspected' }],
    [
      '읽을 수 없어 통째로 버리는 OCR',
      { ocr: { ...OCR_BONDED, visibleDamage: 'suspected', rawText: null } },
    ],
    ['온전한 OCR', { ocr: { ...OCR_BONDED, visibleDamage: 'suspected' } }],
    [
      '일부만 모름으로 읽은 OCR',
      {
        ocr: {
          ...OCR_BONDED,
          wheelType: 'resin_wheel',
          visibleDamage: 'suspected',
        },
      },
    ],
    [
      '앞서 이어받은 의심(사진이 또 빠진 draft)',
      { carriedDamage: 'suspected' },
    ],
  ])(
    '%s — 그 의심은 다시 찍은 뒤에도 이어간다. Gate에서 알리고 규격 값으로 넘긴다',
    async (_name, extra) => {
      const result = await openDraft(photolessDraft(extra));

      await retakeLabel();

      expectCarriedSuspicion();
      // 값은 새 사진에서 다시 읽었다. 저장돼 있던 입력을 되살리지도, 그 draft에서
      // 버린 것을 이제 와서 알리지도 않는다.
      expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('9900')).not.toBeInTheDocument();
      expect(screen.queryByText(EXAM_DROPPED_NOTICE)).not.toBeInTheDocument();
      expect(screen.queryByText(OCR_DROPPED_NOTICE)).not.toBeInTheDocument();

      // 의심이 Gate를 대신 채우지도, 진행을 대신 막지도 않는다 — 판단은 사람이 한다.
      expect(proceedButton()).toBeDisabled();
      answerWheelCondition();
      fireEvent.click(proceedButton());

      expect(push).toHaveBeenCalledWith('/result');
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      // 다시 찍기 전의 의심이 어디서 왔든 출처는 「이어받음」 하나다. 다시 찍은 사진의
      // 판독(보이지 않음)은 출처에 끼지 않는다 — 결과 화면이 이 값으로 그 의심이 이
      // 사진에서 나온 것이 아니고 다른 숫돌일 수 있음을 밝힌다.
      expect(result.current.wheel?.visibleDamageSources).toEqual(['carried']);
      // 다시 찍은 사진의 판독은 모델이 읽은 그대로 기록한다. 이어받은 의심을 그
      // 판독에 섞어 넣지 않는다.
      expect(result.current.wheelOcr).toEqual(OCR_BONDED);
    },
  );

  it('다시 찍는 동안 저장된 draft를 지우지 않는다 — 판독 중에 새로고침해도 의심이 남는다', async () => {
    await openDraft(photolessDraft({ legacyExam: 'suspected' }));

    await retakeLabel();

    // 의심이 남은 곳이 그 draft뿐이다. 새 확인 화면이 저장되며 덮어쓸 때까지 둔다.
    expect(formRemove).not.toHaveBeenCalled();
  });

  it('이어받은 의심을 새 확인 화면 draft에 저장한다 — 한 번 더 새로고침해도 사라지지 않는다', async () => {
    await openDraft(photolessDraft({ legacyExam: 'suspected' }));
    await retakeLabel();

    for (const draft of await savedDrafts()) {
      expect(draft).toMatchObject({
        slot: 'wheel',
        ocr: OCR_BONDED,
        carriedDamage: 'suspected',
      });
      expect(draft.photo).toBeInstanceOf(Blob);
      // 다시 찍기 전 draft의 흔적은 따라가지 않는다. 그 판독과 사진은 이미 없다.
      expect(draft).not.toHaveProperty('legacyExam');
      expect(draft).not.toHaveProperty('droppedOcr');
    }
  });

  it('다시 저장된 draft(새 사진 + 이어받은 의심)에서도 알림과 의심이 그대로다', async () => {
    // 위 테스트가 저장하는 모양이다. 사진이 있어 확인 화면이 바로 열린다.
    await openDraft(
      photolessDraft({
        photo: new Blob(['label']),
        carriedDamage: 'suspected',
      }),
    );
    await screen.findByText('읽어낸 값을 확인하세요');

    expectCarriedSuspicion();
    for (const draft of await savedDrafts()) {
      expect(draft).toMatchObject({ carriedDamage: 'suspected' });
    }
  });

  it('확인 화면에서 경고를 본 뒤 스스로 다시 찍으면 지운다 — 다른 숫돌일 수 있다', async () => {
    const result = await openDraft(photolessDraft({ legacyExam: 'suspected' }));
    await retakeLabel();
    expectCarriedSuspicion();

    fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
    // 「재촬영」을 누른 것만으로는 저장된 draft를 지우지 않는다. 찍지 않고
    // 새로고침하면 그 draft에서 의심이 그대로 되살아나야 한다.
    expect(formRemove).not.toHaveBeenCalled();

    pickPhoto();
    await screen.findByText('읽어낸 값을 확인하세요');

    expect(formRemove).toHaveBeenCalledWith('wheel');
    expectNoSuspicion();
    for (const draft of await savedDrafts()) {
      expect(draft).not.toHaveProperty('carriedDamage');
    }

    answerWheelCondition();
    fireEvent.click(proceedButton());
    expect(result.current.wheel?.visibleDamage).toBe('none_visible');
    expect(result.current.wheel).not.toHaveProperty('visibleDamageSources');
  });

  it('판독에 실패해 다시 찍어도 이어간다 — 그 의심은 아직 한 번도 보이지 않았다', async () => {
    await openDraft(photolessDraft({ legacyExam: 'suspected' }));
    extractWheel.mockRejectedValueOnce(new ExtractError('upstream', 502));

    pickPhoto();
    await screen.findByRole('button', { name: '같은 사진으로 다시 분석' });
    // 오류 화면의 「재촬영」은 확인 화면을 본 뒤의 선택이 아니다.
    fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
    await retakeLabel();

    expectCarriedSuspicion();
    expect(formRemove).not.toHaveBeenCalled();
  });

  it('사진 상태 확인에서 다시 찍어도, 경고를 보고 그 사진을 써도 이어간다', async () => {
    await openDraft(photolessDraft({ legacyExam: 'suspected' }));

    // 1번째 사진: 열지 못했다 → 다시 찍기. 확인 화면을 본 뒤의 선택이 아니다.
    decodeLabel.mockRejectedValueOnce(new ImageDecodeError());
    pickPhoto();
    fireEvent.click(await screen.findByRole('button', { name: '다시 찍기' }));

    // 2번째 사진: 흐림 경고 → 그래도 사용.
    measureLabel.mockResolvedValueOnce(BLURRY);
    pickPhoto();
    fireEvent.click(
      await screen.findByRole('button', { name: '그래도 이 사진 사용' }),
    );
    await screen.findByText('읽어낸 값을 확인하세요');

    expectCarriedSuspicion();
    expect(formRemove).not.toHaveBeenCalled();
  });

  it('서버에 닿지 못해 직접 입력으로 넘어가도 이어간다', async () => {
    await openDraft(photolessDraft({ legacyExam: 'suspected' }));
    extractWheel.mockRejectedValueOnce(new ExtractError('network'));

    pickPhoto();
    fireEvent.click(
      await screen.findByRole('button', {
        name: '제한 대조로 직접 입력',
      }),
    );
    await screen.findByText('읽어낸 값을 확인하세요');

    expectCarriedSuspicion();
    for (const draft of await savedDrafts()) {
      expect(draft).toMatchObject({
        ocr: null,
        analysisSource: 'manual',
        carriedDamage: 'suspected',
      });
    }
  });

  it.each<[string, Record<string, unknown>]>([
    ['흔적이 없는 draft', {}],
    ['다각도 확인을 버렸다는 흔적만 있는 draft', { legacyExam: 'dropped' }],
    ['OCR을 버렸다는 흔적만 있는 draft', { ocr: null, droppedOcr: 'dropped' }],
    [
      '의심하지 않았던 OCR을 통째로 버리는 draft',
      { ocr: { ...OCR_BONDED, rawText: null } },
    ],
    [
      '외관을 모름으로 읽은 OCR이 남은 draft',
      { ocr: { ...OCR_BONDED, visibleDamage: 'unknown' } },
    ],
    ['목록에 없는 흔적 값이 남은 draft', { carriedDamage: 'cleared' }],
  ])(
    '%s — 의심이 없었으면 다시 찍어도 손상 경고를 지어내지 않는다',
    async (_name, extra) => {
      const result = await openDraft(photolessDraft(extra));

      await retakeLabel();

      expectNoSuspicion();
      expect(screen.queryByText(EXAM_DROPPED_NOTICE)).not.toBeInTheDocument();
      expect(screen.queryByText(OCR_DROPPED_NOTICE)).not.toBeInTheDocument();
      // 이어갈 것이 없는 draft는 지금까지처럼 새 사진과 함께 지운다.
      expect(formRemove).toHaveBeenCalledWith('wheel');

      answerWheelCondition();
      fireEvent.click(proceedButton());
      expect(result.current.wheel?.visibleDamage).toBe('none_visible');
    },
  );

  describe('손상 의심이 올라와 있는 확인 화면에서 종류를 바꾸면', () => {
    // 종류를 바꾸면 이전 종류의 입력이 섞이지 않게 저장된 draft를 곧바로 지우고, 새
    // draft는 1초쯤 뒤에 저장된다. 통째로 지우면 그 사이의 새로고침에 의심까지
    // 사라지고, 작업자는 경고 없이 라벨을 다시 찍게 된다.
    it.each<[string, Record<string, unknown>]>([
      ['이전 버전의 다각도 확인이 의심했던 draft', { legacyExam: 'suspected' }],
      [
        '통째로 버린 OCR이 의심했던 draft',
        { ocr: null, droppedOcr: 'suspected' },
      ],
      [
        '지금 사진의 판독이 의심한 draft',
        { ocr: { ...OCR_BONDED, visibleDamage: 'suspected' } },
      ],
      ['다시 찍기 전의 의심을 이어받은 draft', { carriedDamage: 'suspected' }],
    ])(
      '%s — 지우는 대신 의심만 담은 draft로 바꿔 둔다',
      async (_name, extra) => {
        await openDraft(
          photolessDraft({ photo: new Blob(['label']), ...extra }),
        );
        await screen.findByText('읽어낸 값을 확인하세요');
        expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
        formSave.mockClear();

        changeWheelType('flap_disc');

        expect(formRemove).not.toHaveBeenCalled();
        // 이전 종류의 입력·사진·판독은 남기지 않는다. 남는 것은 의심 하나다.
        expect(formSave.mock.calls).toEqual([[CARRY_ONLY_DRAFT]]);
        expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
      },
    );

    it('이어받은 의심은 새 종류로 다시 저장되는 draft에도 따라간다', async () => {
      await openDraft(photolessDraft({ legacyExam: 'suspected' }));
      await retakeLabel();

      changeWheelType('flap_disc');

      expectCarriedSuspicion();
      for (const draft of await savedDrafts()) {
        expect(draft).toMatchObject({
          slot: 'wheel',
          fields: { wheelType: 'flap_disc' },
          carriedDamage: 'suspected',
        });
      }
    });

    it('의심만 담은 draft로 돌아오면 — 확인 화면은 열지 않고, 다시 찍은 뒤 의심을 이어간다', async () => {
      // 종류를 바꾼 직후 새로고침한 경우다. 위 테스트가 저장하는 모양 그대로 읽는다.
      const result = await openDraft(
        carriedDamageOnlyDraft('2026-09-17T00:00:00.000Z'),
      );
      expect(
        screen.queryByText('읽어낸 값을 확인하세요'),
      ).not.toBeInTheDocument();

      await retakeLabel();

      expectCarriedSuspicion();
      answerWheelCondition();
      fireEvent.click(proceedButton());
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
    });

    it('의심이 없으면 지금까지처럼 지운다 — 없는 의심을 저장하지 않는다', async () => {
      await openDraft(photolessDraft({ photo: new Blob(['label']) }));
      await screen.findByText('읽어낸 값을 확인하세요');
      formSave.mockClear();

      changeWheelType('flap_disc');

      expect(formRemove).toHaveBeenCalledWith('wheel');
      expect(formSave).not.toHaveBeenCalled();
    });
  });

  describe('입력칸 자리가 어긋나 통째로 읽지 못한 draft', () => {
    // 되살릴 화면이 없다(recoverWheelFormDraft가 null을 돌려준다). 사진이 남아 있어도
    // 확인 화면은 열지 않는다. 그 안에 남은 의심만 이어간다.
    const unreadableDraft = (extra: Record<string, unknown>) => ({
      ...photolessDraft({ photo: new Blob(['label']), ...extra }),
      fields: null,
    });

    it('화면은 되살리지 않고 그 안의 의심만 이어간다', async () => {
      const result = await openDraft(
        unreadableDraft({
          ocr: { ...OCR_BONDED, visibleDamage: 'suspected' },
        }),
      );
      expect(
        screen.queryByText('읽어낸 값을 확인하세요'),
      ).not.toBeInTheDocument();

      await retakeLabel();

      expectCarriedSuspicion();
      answerWheelCondition();
      fireEvent.click(proceedButton());
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      expect(result.current.wheelOcr).toEqual(OCR_BONDED);
    });

    it('의심이 없었으면 아무것도 이어가지 않는다', async () => {
      await openDraft(unreadableDraft({}));
      expect(
        screen.queryByText('읽어낸 값을 확인하세요'),
      ).not.toBeInTheDocument();

      await retakeLabel();

      expectNoSuspicion();
      expect(formRemove).toHaveBeenCalledWith('wheel');
    });
  });

  describe('작업자가 복원보다 먼저 새 사진을 찍었으면', () => {
    // 저장소 읽기가 늦게 끝난 경우다. 뒤늦게 도착한 입력칸은 적용하지 않는다 —
    // 작업자의 새 촬영이 우선한다. 그 draft의 의심도 작업자는 본 적이 없다.
    //
    // 그 draft는 새 사진이 들어올 때 이미 지워졌다(그때는 의심이 든 draft인 줄 알 수
    // 없었다). 의심이 화면 상태에만 남으면 새로고침 한 번에 사라지므로, 의심만 담은
    // draft를 다시 남긴다.
    const OLD_DRAFT = photolessDraft({
      photo: new Blob(['old label']),
      legacyExam: 'suspected',
    });

    /** 저장소 읽기를 붙잡아 둔 채 화면을 연다. 돌려받은 함수로 읽기를 끝낸다 */
    function openWithSlowLoad() {
      const result = readyGrinder();
      let finishLoad: (value: unknown) => void = () => {};
      formLoad.mockReturnValueOnce(
        new Promise((resolve) => {
          finishLoad = resolve;
        }),
      );
      extractWheel.mockResolvedValue(OCR_BONDED);
      render(<WheelScanPage />);
      const arrive = (draft: unknown) =>
        act(async () => {
          finishLoad({ status: 'found', draft });
        });
      return { result, arrive };
    }

    it('입력칸은 되살리지 않고, 그 draft의 의심만 이어간다', async () => {
      const { result, arrive } = openWithSlowLoad();
      await retakeLabel();
      expectNoSuspicion();
      expect(formRemove).toHaveBeenCalledWith('wheel');
      formSave.mockClear();

      await arrive(OLD_DRAFT);

      expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('9900')).not.toBeInTheDocument();
      expectCarriedSuspicion();
      // 화면이 다시 저장하기 전에도 의심이 저장소에 남아 있다.
      expect(formSave.mock.calls).toEqual([[CARRY_ONLY_DRAFT]]);
      for (const draft of await savedDrafts()) {
        expect(draft).toMatchObject({
          ocr: OCR_BONDED,
          carriedDamage: 'suspected',
        });
        expect(draft.photo).toBeInstanceOf(Blob);
      }

      answerWheelCondition();
      fireEvent.click(proceedButton());
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
    });

    it('판독에 실패한 화면에서 도착해도 의심을 저장소에 남긴다 — 새로고침해도 사라지지 않는다', async () => {
      const { arrive } = openWithSlowLoad();
      extractWheel.mockRejectedValueOnce(new ExtractError('upstream', 502));
      pickPhoto();
      await screen.findByRole('button', { name: '같은 사진으로 다시 분석' });
      expect(formRemove).toHaveBeenCalledWith('wheel');

      await arrive(OLD_DRAFT);

      // 오류 화면은 draft를 저장하지 않는다. 의심만 담은 draft가 그 자리를 지킨다.
      expect(formSave.mock.calls).toEqual([[CARRY_ONLY_DRAFT]]);

      // 그 뒤 다시 찍어도 그 draft를 지우지 않고 의심을 이어간다.
      formRemove.mockClear();
      fireEvent.click(screen.getByRole('button', { name: '재촬영' }));
      await retakeLabel();

      expect(formRemove).not.toHaveBeenCalled();
      expectCarriedSuspicion();
    });

    it('의심이 없던 draft면 아무것도 적용하지 않는다', async () => {
      const { arrive } = openWithSlowLoad();
      await retakeLabel();
      formSave.mockClear();

      await arrive(photolessDraft({ photo: new Blob(['old label']) }));

      expect(screen.getByDisplayValue('12200')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('9900')).not.toBeInTheDocument();
      expectNoSuspicion();
      expect(formSave).not.toHaveBeenCalled();
    });
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

  it('용도 선택칸에서 선택지에 없는 값이 오면 받지 않는다 — 고른 용도가 그대로 대조로 넘어간다', async () => {
    // 입력칸 변경은 칸 이름과 문자열로만 전달돼 타입 검사가 걸러 주지 않는다.
    // 목록에 없는 값이 화면 상태에 들어가면 선택칸이 보여주는 용도와 규칙엔진이
    // 받는 용도가 달라진다.
    const result = readyGrinder();
    extractWheel.mockResolvedValue(OCR_BONDED);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByText('읽어낸 값을 확인하세요');
    const purposeSelect = screen.getByRole('combobox', { name: /^용도/ });
    expect(purposeSelect).toHaveValue('cutting');

    fireEvent.change(purposeSelect, { target: { value: 'polishing' } });

    expect(purposeSelect).toHaveValue('cutting');
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));
    expect(result.current.wheel?.purpose).toBe('cutting');
  });

  it('other로 옮기면 부속품 이름 입력이 비어 있다', async () => {
    await openConfirm();

    fireEvent.change(typeSelect(), { target: { value: 'other' } });

    expect(screen.getByRole('textbox', { name: /부속품 이름/ })).toHaveValue(
      '',
    );
  });
});
