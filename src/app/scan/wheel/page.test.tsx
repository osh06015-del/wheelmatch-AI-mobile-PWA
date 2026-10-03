// 숫돌 촬영 화면 테스트.
//
// 1. Grinder Condition Gate를 통과하지 않은 채 /scan/wheel로 들어오면
//    촬영 화면이 열려서는 안 된다. 열리면 장비 상태를 보지 않은 점검이
//    그대로 규격 대조까지 흘러간다.
// 2. 숫돌 종류는 작업자가 실물을 보고 고른다. AI가 본 종류는 제안값이고,
//    둘이 다르면 작업자가 직접 확인해야 넘어간다.
// 3. 확인 화면은 라벨 사진 한 장만 쓴다. 뒷면·가장자리·중심구멍 사진을 넣는
//    단계(다각도 외관 확인)는 뺐다 — 외관은 작업자 상태 확인 Gate가 묻는다.

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
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
vi.mock('@/lib/image/optimize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image/optimize')>()),
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
import { ExtractError } from '@/lib/ocr/errors';
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
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
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

  it('작업(절단/연삭)을 고르지 않았으면 그라인더가 준비돼 있어도 작업 선택으로 돌린다', () => {
    const result = store();
    act(() => {
      result.current.reset();
      result.current.setGrinder(GRINDER);
      result.current.setGrinderCondition(CONFIRMED);
    });

    render(<WheelScanPage />);

    expect(
      screen.getByText('오늘 할 작업(절단/연삭)을 먼저 고르세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('숫돌 라벨 촬영')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/');
    expect(replace).not.toHaveBeenCalledWith('/scan/grinder');
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
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
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
        '일반 결합숫돌은 이 앱이 회전속도·지름을 대조하는 종류입니다. 실물을 보고 직접 확인해 고르세요.',
      ),
    ).toBeInTheDocument();

    // 작업자 상태 확인에 답하기 전에는 넘어갈 수 없다.
    expect(proceedButton()).toBeDisabled();
    answerWheelCondition();
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheelOcr?.wheelType).toBe('bonded_abrasive');
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
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    expect(result.current.wheel?.confidence).toBe('high');
    expect(result.current.wheelOcr?.wheelType).toBe('unknown');
  });
});

describe('숫돌 촬영 화면 — 라벨 사진 한 장으로 확인한다(추가 사진 없음)', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    extractWheel.mockReset();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
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

  it('일반 결합숫돌도 뒷면·가장자리·중심구멍 사진을 받지 않는다', async () => {
    // 그 사진을 넣는 자리가 다시 생기면 이 테스트가 알린다.
    await openConfirm();

    expect(document.querySelectorAll('input[type=file]')).toHaveLength(0);
    expect(screen.queryByText('다각도 외관 확인')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '사진 4장으로 확인하기' }),
    ).not.toBeInTheDocument();
  });

  it('추가 사진이 없어도 작업자 상태 확인은 그대로 직접 답해야 넘어간다', async () => {
    // 사진 단계를 뺐다고 사람의 확인까지 줄지 않는다. 다섯 항목이 모두
    // 미확인인 채로 시작하고, 앱이 대신 채우지 않는다.
    const result = await openConfirm();

    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([]);
    expect(proceedButton()).toBeDisabled();

    answerWheelCondition();
    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('bonded_abrasive');
    // 라벨 사진의 판독값은 바꾸지 않고 그대로 넘긴다.
    expect(result.current.wheel?.visibleDamage).toBe('none_visible');
  });

  it('라벨 사진에서 손상이 의심되면 Gate에서 알리고, 의심을 규격 값으로 그대로 넘긴다', async () => {
    const result = await openConfirm({ ...OCR, visibleDamage: 'suspected' });

    expect(
      screen.getByText(
        '⚠ AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.',
      ),
    ).toBeInTheDocument();

    // 경고가 Gate를 대신 채우지도, 진행을 대신 막지도 않는다 — 판단은 사람이 한다.
    expect(proceedButton()).toBeDisabled();
    answerWheelCondition();
    fireEvent.click(proceedButton());

    // 의심은 규칙엔진이 보는 값으로 넘어가 결과 화면의 외관 손상 경고가 된다.
    expect(result.current.wheel?.visibleDamage).toBe('suspected');
  });

  it('작업자가 문제 있음을 고르면 규격과 무관하게 사용 금지로 끝난다', async () => {
    await openConfirm();

    const issues = screen.getAllByRole('button', { name: /문제 있음/ });
    fireEvent.click(issues[0]);

    expect(screen.getByText('이 숫돌을 사용하지 마십시오')).toBeInTheDocument();
    expect(proceedButton()).toBeDisabled();
  });

  it('세부 형식을 골라야 하는 굵은 분류(다이아몬드)도 같은 흐름으로 넘어간다 — 판정불가는 그대로다', async () => {
    const result = await openConfirm({ ...OCR, wheelType: 'diamond' });

    answerWheelCondition();
    fireEvent.click(proceedButton());

    expect(push).toHaveBeenCalledWith('/result');
    expect(result.current.wheel?.wheelType).toBe('diamond');
  });
});

describe('숫돌 촬영 화면 — 종류별 상태 확인 항목', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    extractWheel.mockReset();
    const result = store();
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
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
    act(() => {
      result.current.reset();
      // 실제 흐름은 작업 선택 화면에서 시작한다. 작업 미선택은 따로 잰다.
      result.current.setPurpose('cutting');
    });
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
