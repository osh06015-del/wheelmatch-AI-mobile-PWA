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
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, push, extractWheel, examine } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  extractWheel: vi.fn(),
  examine: vi.fn(),
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
vi.mock('@/lib/image/optimize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/optimize')>()),
  optimizeForUpload: async (blob: Blob) => blob,
}));

// 다각도 외관 확인 결과도 테스트가 정한다. 실제 모델을 부르지 않는다.
vi.mock('@/lib/vision/wheelExam', () => ({
  getWheelExaminer: () => ({ examine }),
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
import { ExtractError } from '@/lib/ocr/errors';
import { useInspection } from '@/lib/state/inspection';
import type {
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

/** 네 장을 모두 살펴봤지만 찾지 못한 결과. 손상 없음이라는 뜻이 아니다. */
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

  /** 다각도 확인: 뒷면·가장자리·중심구멍 사진을 넣고 확인을 누른다. */
  async function completeExam(exam: WheelExamResult = EXAM_NOT_OBSERVED) {
    examine.mockResolvedValue(exam);
    // 자리마다 촬영·갤러리 두 입력이 있다. 자리당 앞의 것에 넣는다.
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>('input[type=file]'),
    ];
    for (const index of [0, 1, 2]) {
      await act(async () => {
        fireEvent.change(inputs[index * 2], {
          target: {
            files: [new File(['x'], `${index}.jpg`, { type: 'image/jpeg' })],
          },
        });
      });
    }
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
      );
    });
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
        '일반 결합숫돌은 이 앱이 회전속도·지름을 대조하는 종류입니다. 실물을 보고 직접 확인해 고르세요.',
      ),
    ).toBeInTheDocument();

    // 일반 결합숫돌은 다각도 확인을 마쳐야 넘어갈 수 있다.
    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();

    await completeExam();
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheelOcr?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheelExam?.status).toBe('not_observed');
  });

  it('AI가 기타로 읽으면 RPM·지름은 대조하는 종류라고 알리고 그 종류로 넘긴다', async () => {
    // 기타도 대체 Profile로 RPM·지름은 대조한다(scope: 'limited'). 적합에는
    // 이르지 못하지만 판정 자체를 거부하지는 않는다.
    const result = await openConfirm({ ...OCR, wheelType: 'other' });

    expect(typeSelect()).toHaveValue('other');
    expect(
      screen.getByText(
        '이 종류는 회전속도·지름을 대조합니다. 종류별 상태 확인은 작업자가 직접 해야 합니다.',
      ),
    ).toBeInTheDocument();

    answerWheelCondition();
    fireEvent.click(proceedButton());

    expect(result.current.wheel?.wheelType).toBe('other');
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
    await completeExam();
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

  it('종류를 바꾸면 이전 종류에서 확인한 상태 Gate 항목이 새 종류에서 이미 확인된 것처럼 남지 않는다', async () => {
    // 결합숫돌과 플랩디스크는 둘 다 damageFree를 묻는다(공통 항목). 이전
    // 종류에서 확인한 값이 그대로 남으면 새 종류에서 다시 누르지 않아도
    // 확인된 것처럼 보인다.
    await openConfirm(OCR); // bonded_abrasive
    answerWheelCondition();

    const damageGroup = () =>
      screen.getByRole('group', {
        name: '깨짐·갈라짐·잔금·모서리 파손이 없는가?',
      });
    expect(
      within(damageGroup()).getByRole('button', { name: /확인함/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(typeSelect(), { target: { value: 'flap_disc' } });

    expect(
      within(damageGroup()).getByRole('button', { name: /확인함/ }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(proceedButton()).toBeDisabled();
  });

  it('종류를 바꾸면 이전 종류에서 마친 다각도 확인 결과가 새 종류의 기록에 섞이지 않는다', async () => {
    // 결합숫돌은 다각도 확인을 요구하지만 플랩디스크는 요구하지 않는다.
    // 결합숫돌로 확인을 마친 뒤 플랩디스크로 바꾸면, 화면에서 패널은
    // 사라져도 내부 상태가 남아 있으면 그 결과가 플랩디스크 기록으로
    // 저장될 수 있다.
    const result = await openConfirm(OCR); // bonded_abrasive
    answerWheelCondition();
    await completeExam();

    fireEvent.change(typeSelect(), { target: { value: 'flap_disc' } });
    fireEvent.click(manualToggle());
    answerWheelCondition();
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('flap_disc');
    expect(result.current.wheelExam).toBeNull();
    expect(result.current.wheelExamNotRun).toBeNull();
  });

  it('종류를 바꾸면 부속품 이름 입력이 새 종류로 넘어가지 않는다', async () => {
    const result = await openConfirm({ ...OCR, wheelType: 'other' });
    const nameInput = () => screen.getByLabelText('부속품 이름(선택)');
    fireEvent.change(nameInput(), { target: { value: '수동 연마 롤러' } });
    expect(nameInput()).toHaveValue('수동 연마 롤러');

    fireEvent.change(typeSelect(), { target: { value: 'unknown' } });

    expect(nameInput()).toHaveValue('');

    fireEvent.click(manualToggle());
    answerWheelCondition();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('unknown');
    expect(result.current.wheel?.accessoryName).toBeNull();
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
        '이 종류는 회전속도·지름을 대조합니다. 종류별 상태 확인은 작업자가 직접 해야 합니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(typeSelect(), { target: { value: 'bonded_abrasive' } });
    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();

    fireEvent.click(manualToggle());
    // 일반 결합숫돌로 고른 순간부터 다각도 확인도 요구된다.
    await completeExam();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheel?.confidence).toBe('high');
    expect(result.current.wheelOcr?.wheelType).toBe('unknown');
  });
});

describe('숫돌 촬영 화면 — 다각도 외관 이상 징후 확인', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    extractWheel.mockReset();
    examine.mockReset();
    const result = store();
    act(() => result.current.reset());
  });

  /** 그라인더 Gate를 통과하고 사진을 골라 값 확인 화면까지 연다. */
  async function openConfirm(ocr: WheelSpec = OCR) {
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

  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  async function addExamPhotos() {
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>('input[type=file]'),
    ];
    for (const index of [0, 1, 2]) {
      await act(async () => {
        fireEvent.change(inputs[index * 2], {
          target: {
            files: [new File(['x'], `${index}.jpg`, { type: 'image/jpeg' })],
          },
        });
      });
    }
  }

  async function runExam(exam: WheelExamResult | Error) {
    if (exam instanceof Error) examine.mockRejectedValue(exam);
    else examine.mockResolvedValue(exam);
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
      );
    });
  }

  function suspected(
    kind: WheelExamResult['findings'][number]['kind'],
    view: WheelExamResult['findings'][number]['view'],
    reason: string,
  ): WheelExamResult {
    return {
      ...EXAM_NOT_OBSERVED,
      status: 'suspected',
      findings: [{ kind, view, reason, confidence: 'high' }],
    };
  }

  it('경계 문구는 결과와 무관하게 항상 보인다', async () => {
    await openConfirm();

    expect(
      screen.getByText(
        'AI는 사진에서 보이는 이상 징후만 찾습니다. 손상 없음이나 사용 안전을 확인하지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/미세균열과 내부 균열은 사진으로 확인할 수 없습니다/),
    ).toBeInTheDocument();
  });

  it('사진 3장을 넣기 전에는 확인 버튼이 열리지 않는다', async () => {
    await openConfirm();

    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        '뒷면·가장자리·중심구멍 사진을 모두 넣어야 확인할 수 있습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('정상 사진 — 찾지 못해도 작업자 확인 Gate는 자동으로 채워지지 않는다', async () => {
    // 이 기능에서 가장 위험한 실패는 "AI가 못 찾았으니 통과"다.
    await openConfirm();
    await addExamPhotos();
    await runExam(EXAM_NOT_OBSERVED);

    expect(
      screen.getByText(
        '뚜렷한 이상을 찾지 못했습니다. 실제 숫돌의 앞·뒤·가장자리와 중심구멍을 직접 확인하세요.',
      ),
    ).toBeInTheDocument();
    // 다섯 항목이 그대로 미확인이라 진행이 막혀 있다.
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([]);
    expect(proceedButton()).toBeDisabled();

    answerWheelCondition();
    expect(proceedButton()).toBeEnabled();
  });

  // 파일 이름은 실물 촬영 세트의 시나리오 이름을 그대로 쓴다. 이 테스트는
  // 모델이 그 사진에서 실제로 무엇을 찾는지가 아니라, 찾았다고 했을 때 화면과
  // Gate가 어떻게 움직이는지를 고정한다.
  it('11-wheel-edge-crack-chip — 가장자리 손상 의심이면 위치·이유를 보이고 진행을 막는다', async () => {
    const result = await openConfirm();
    await addExamPhotos();
    await runExam(
      suspected('edge_break', 'edge', '가장자리 2시 방향에 조각이 떨어진 자국'),
    );

    expect(
      screen.getByText(/사진에서 이상 징후가 보입니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('가장자리 파손 의심 · 가장자리'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('가장자리 2시 방향에 조각이 떨어진 자국'),
    ).toBeInTheDocument();

    // 다섯 항목을 다 눌러도 확인 표시 전에는 넘어가지 못한다.
    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();
    expect(
      screen.getByText(
        '이상 징후를 실물에서 확인했다고 표시해야 다음으로 넘어갈 수 있습니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /표시된 위치를 실물에서 직접 확인했습니다/,
      }),
    );
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    // 의심은 규칙엔진이 보는 값으로도 넘어간다.
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
    expect(result.current.wheelExam?.status).toBe('suspected');
    expect(result.current.wheelExamAcknowledged).toBe(true);
  });

  it('12-wheel-warped — 변형 의심도 같은 방식으로 막는다', async () => {
    const result = await openConfirm();
    await addExamPhotos();
    await runExam(
      suspected('deformation', 'back', '뒷면이 한쪽으로 휘어 보입니다'),
    );

    expect(screen.getByText('휨·변형 의심 · 뒷면 전체')).toBeInTheDocument();
    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /표시된 위치를 실물에서 직접 확인했습니다/,
      }),
    );
    fireEvent.click(proceedButton());
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
  });

  it('13-wheel-center-hole-damaged — 중심구멍 손상 의심을 그 부위로 알린다', async () => {
    await openConfirm();
    await addExamPhotos();
    await runExam(
      suspected('bore_damage', 'bore', '중심구멍 둘레가 눌려 있습니다'),
    );

    expect(
      screen.getByText('중심구멍·장착부 손상 의심 · 중심구멍·장착부'),
    ).toBeInTheDocument();
    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();
  });

  it('흐린 사진 — 판단할 수 없다고 알리고 그 사진을 다시 찍게 막는다', async () => {
    await openConfirm();
    await addExamPhotos();
    await runExam({
      ...EXAM_NOT_OBSERVED,
      status: 'unassessable',
      photoQuality: [
        { view: 'front', issues: [], readable: true },
        { view: 'back', issues: ['blur'], readable: false },
        { view: 'edge', issues: [], readable: true },
        { view: 'bore', issues: ['darkness'], readable: false },
      ],
    });

    expect(
      screen.getByText(/사진으로는 판단할 수 없습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '판독할 수 없는 사진이 있습니다. 아래 사진을 다시 찍으세요.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('뒷면 전체 — 흐림')).toBeInTheDocument();
    expect(screen.getByText('중심구멍·장착부 — 어두움')).toBeInTheDocument();

    answerWheelCondition();
    expect(proceedButton()).toBeDisabled();
    expect(
      screen.getByText(
        '판독할 수 없는 사진을 다시 찍어야 다음으로 넘어갈 수 있습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('AI 확인이 실패하면 확인하지 못했다고 알리되 사람의 점검까지 막지는 않는다', async () => {
    // AI가 돌지 않았다고 법정 점검까지 막으면 앱이 점검을 가로막는 셈이다.
    // 실패는 아무것도 승인하지 않는다 — 작업자 확인 Gate는 그대로 남는다.
    const result = await openConfirm();
    await addExamPhotos();
    await runExam(new ExtractError('network'));

    // 무엇이 실패했는지(네트워크)와 그래서 무엇을 해야 하는지를 함께 알린다.
    expect(screen.getByRole('alert')).toHaveTextContent(
      '서버에 연결하지 못했습니다.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'AI 확인 없이 진행합니다. 숫돌 앞·뒤·가장자리와 중심구멍을 작업자가 직접 확인하세요.',
    );

    answerWheelCondition();
    // 실패했다고 조용히 지나가지 않는다. 확인 없이는 다음으로 갈 수 없다.
    expect(proceedButton()).toBeDisabled();
    expect(
      screen.getByText(
        'AI 확인 없이 작업자 직접점검으로 진행하겠다고 표시해야 다음으로 넘어갈 수 있습니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'AI 확인 없이 작업자 직접점검으로 진행합니다.',
      }),
    );
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    // 실패는 결과로 남지 않는다. 확인하지 못한 것은 확인하지 못한 채로 둔다.
    expect(result.current.wheelExam).toBeNull();
    // 대신 실행되지 않았다는 사실과 그 이유가 남는다. not_observed로 바꾸지 않는다.
    expect(result.current.wheelExamNotRun?.reason).toBe('network_error');
    expect(result.current.wheel?.visibleDamage).not.toBe('suspected');
  });

  it('작업자가 문제 있음을 고르면 규격과 무관하게 사용 금지로 끝난다', async () => {
    await openConfirm();
    await addExamPhotos();
    await runExam(EXAM_NOT_OBSERVED);

    // AI가 찾지 못했더라도 작업자의 "문제 있음"이 이긴다.
    const issues = screen.getAllByRole('button', { name: /문제 있음/ });
    fireEvent.click(issues[0]);

    expect(screen.getByText('이 숫돌을 사용하지 마십시오')).toBeInTheDocument();
    expect(proceedButton()).toBeDisabled();
  });

  it('사진을 바꾸면 이전 분석 결과를 버린다 — 다른 사진의 결과로 넘어가지 않는다', async () => {
    await openConfirm();
    await addExamPhotos();
    await runExam(EXAM_NOT_OBSERVED);
    answerWheelCondition();
    expect(proceedButton()).toBeEnabled();

    // 뒷면 사진만 다시 넣는다.
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>('input[type=file]'),
    ];
    await act(async () => {
      fireEvent.change(inputs[0], {
        target: {
          files: [new File(['new'], 'back2.jpg', { type: 'image/jpeg' })],
        },
      });
    });

    expect(proceedButton()).toBeDisabled();
    expect(
      screen.getByText(
        '넣은 사진으로 확인하기를 누른 뒤에 다음으로 넘어갈 수 있습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('미지원 종류에는 다각도 확인을 요구하지 않는다 — 판정불가는 그대로다', async () => {
    const result = await openConfirm({ ...OCR, wheelType: 'diamond' });

    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();
    answerWheelCondition();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('diamond');
    expect(result.current.wheelExam).toBeNull();
  });
});

describe('숫돌 촬영 화면 — 종류별 상태 확인 항목', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    extractWheel.mockReset();
    const result = store();
    act(() => result.current.reset());
  });

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

  const typeSelect = () => screen.getByRole('combobox', { name: '숫돌 종류' });
  const proceedButton = () =>
    screen.getByRole('button', { name: '확인 후 규격 대조' });

  it('AI가 다이아몬드로 본 것을 세그먼트형으로 좁히면 직접 확인 없이, 세그먼트 항목까지 답해야 넘어간다', async () => {
    const result = await openConfirm({ ...OCR, wheelType: 'diamond' });

    // 굵은 분류 그대로는 세부 형식을 고르라고 알린다.
    expect(
      screen.getByText(
        '세부 종류를 골라야 규격을 대조합니다. 이대로면 판정불가로 끝납니다.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(typeSelect(), { target: { value: 'diamond_segmented' } });

    // 좁힌 것이라 차이 경고가 없다.
    expect(
      screen.queryByText(/AI 제안\(.*\)과 선택한 종류/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: '세그먼트나 림이 떨어지거나 깨지지 않았는가?',
      }),
    ).toBeInTheDocument();
    // 유효기한 근거가 없는 종류라 유효기한 항목을 묻지 않는다.
    expect(
      screen.queryByText(/라벨의 유효기한이 남아 있는가/),
    ).not.toBeInTheDocument();
    // 다이아몬드 날은 다각도 사진을 요구하지 않는다.
    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('diamond_segmented');
    expect(result.current.wheelCondition).toEqual({
      damageFree: true,
      notDeformed: true,
      mountingAreaUndamaged: true,
      labelLegible: true,
      expiryValid: null,
      diamondRimIntact: true,
    });
  });

  it('종류별 항목 하나라도 문제 있음이면 넘어가지 못한다', async () => {
    await openConfirm({ ...OCR, wheelType: 'wire_brush' });

    const confirms = screen.getAllByRole('button', { name: /확인함/ });
    const issues = screen.getAllByRole('button', { name: /문제 있음/ });
    for (const button of confirms) fireEvent.click(button);
    // 마지막 항목(끊어지거나 풀린 와이어)을 문제 있음으로 바꾼다.
    fireEvent.click(issues[issues.length - 1]);

    expect(screen.getByText('이 숫돌을 사용하지 마십시오')).toBeInTheDocument();
    expect(proceedButton()).toBeDisabled();
  });
});

describe('숫돌 촬영 화면 — 오프라인 제한 대조로 직접 입력', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    extractWheel.mockReset();
    const result = store();
    act(() => result.current.reset());
  });

  async function openFailure(error: unknown) {
    const result = store();
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });
    extractWheel.mockRejectedValue(error);
    render(<WheelScanPage />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 사진 고르기' }));
    await screen.findByRole('alert');
    return result;
  }

  it('서버에 닿지 못했을 때만 직접 입력을 제안하고, 값을 지어내지 않는다', async () => {
    const result = await openFailure(new ExtractError('network'));

    expect(
      screen.getByText(
        '서버에 닿지 못했습니다. 값을 직접 입력해 계속할 수 있지만, 이 점검은 적합 판정을 받을 수 없습니다.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: '오프라인 제한 대조로 직접 입력' }),
    );

    await screen.findByText('읽어낸 값을 확인하세요');
    expect(screen.getByRole('status')).toHaveTextContent(
      '오프라인 제한 대조 — 사진을 서버로 분석하지 못했습니다.',
    );
    // 입력칸은 비어 있다. 추정값으로 채우지 않는다.
    for (const input of screen.getAllByPlaceholderText(
      '인식하지 못함 — 직접 입력',
    )) {
      expect(input).toHaveValue(
        input.getAttribute('type') === 'number' ? null : '',
      );
    }
    expect(extractWheel).toHaveBeenCalledTimes(1);

    // 작업자가 라벨을 보고 직접 넣는다.
    const [maxRPM, diameter] =
      screen.getAllByPlaceholderText('인식하지 못함 — 직접 입력');
    fireEvent.change(maxRPM, { target: { value: '12200' } });
    fireEvent.change(diameter, { target: { value: '125' } });
    fireEvent.change(screen.getByRole('combobox', { name: '숫돌 종류' }), {
      target: { value: 'flap_disc' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /라벨을 직접 보고 위 값을 확인했습니다/,
      }),
    );
    for (const button of screen.getAllByRole('button', { name: /확인함/ })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: '확인 후 규격 대조' }));

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.maxRPM).toBe(12200);
    // OCR 원본이 없다 — AI가 읽은 것처럼 남기지 않는다.
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.offlineSlots.wheel).toBe(true);
    expect(result.current.analysisMode).toBe('offline_limited');
  });

  it('서버가 오류를 돌려준 경우(연결 문제가 아님)에는 직접 입력을 제안하지 않는다', async () => {
    await openFailure(new ExtractError('rate_limited', 429));

    expect(
      screen.queryByRole('button', { name: '오프라인 제한 대조로 직접 입력' }),
    ).not.toBeInTheDocument();
  });
});
