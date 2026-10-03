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
    // 라벨 사진의 OCR 원본은 건드리지 않는다.
    expect(result.current.wheelOcr?.visibleDamage).toBe('none_visible');
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
      // 방금 읽은 OCR은 원본이다. 손댔다는 표시가 붙지 않는다.
      expect(draft).not.toHaveProperty('ocrAltered');
    }
  });
});

describe('숫돌 확인 화면 — 통째로 버린 OCR이 남은 draft', () => {
  // 저장된 OCR의 숫자·원문·신뢰도가 어긋나면 그 OCR은 살릴 수 없어 통째로 버린다.
  // 조용히 버리면 화면은 신뢰도 낮음과 종류 직접 확인 요구만 띄우고 이유를 말하지
  // 않으며, 그 OCR이 올린 외관 의심도 함께 사라진다. 버렸다고 알리고 의심은 이어간다.
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
    '⚠ 저장된 AI 판독 결과를 읽을 수 없어 복구하지 못했습니다. 아래 값을 사진 속 표기와 직접 대조하거나 다시 촬영하세요.';
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
    // 읽을 수 없던 판독은 기록의 OCR 원본으로 남기지 않는다.
    expect(result.current.wheelOcr).toBeNull();
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
  });

  it('종류를 바꿔도 흔적은 남는다 — 다시 저장되는 draft에 의심이 따라간다', async () => {
    await openDraft(brokenOcrDraft('suspected'));

    // 종류 변경은 이전 draft를 곧바로 지운다. 그 뒤 다시 저장되는 draft가 흔적을
    // 잃으면 새로고침 한 번에 의심이 사라진다.
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
    await openDraft({
      ...brokenOcrDraft('none_visible'),
      ocr: OCR_BONDED,
      droppedOcr: 'suspected',
    });

    expect(screen.getByText(DAMAGE_WARNING)).toBeInTheDocument();
    expect(screen.queryByText(DROPPED_NOTICE)).not.toBeInTheDocument();
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
