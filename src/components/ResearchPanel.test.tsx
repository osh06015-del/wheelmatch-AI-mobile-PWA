// 연구 패널 — CSV 내보내기 건수 표시 테스트.
//
// "최근 50건" 상한이 있던 시절, CSV도 그 상한에 걸려 오래된 기록이 조용히
// 빠졌다. 이 패널이 받는 records를 그대로 내보내므로, 여기서는 "받은 만큼
// 정확히 내보냈다고 밝히는지"만 본다 — 상한을 없앤 것은 history/page.tsx가
// records를 어떻게 모으는지의 문제이고 그쪽 테스트가 51건으로 고정한다.

import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResearchPanel } from './ResearchPanel';
import { useResearchMode } from '@/lib/record/researchMode';
import type {
  GrinderSpec,
  InspectionRecord,
  WheelSpec,
} from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

function records(count: number): InspectionRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    grinder: GRINDER,
    wheel: WHEEL,
    result: { verdict: 'COMPATIBLE', checks: [], timestamp: '' },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    createdAt: new Date(2026, 0, 1 + i).toISOString(),
  }));
}

async function enableResearchMode() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox', { name: /연구·실험 모드/ }));
}

const TRUTH = {
  recordId: 1,
  grinderRPM: 11000,
  grinderMaxDiameter: 125,
  wheelMaxRPM: 12200,
  wheelDiameter: 125,
  verdict: 'INCOMPATIBLE',
};

function truthFile(name: string, rows: unknown[] = [TRUTH]) {
  return new File([JSON.stringify(rows)], name, { type: 'application/json' });
}

describe('ResearchPanel — 정답 파일 교체', () => {
  it('새 파일 읽기가 실패하면 이전 정답과 수치를 남기지 않는다', async () => {
    const user = userEvent.setup();
    render(<ResearchPanel records={records(1)} />);
    await enableResearchMode();
    const input = screen.getByLabelText(/정답\(Ground Truth\) 파일/);
    await user.upload(input, truthFile('first.json'));
    expect(await screen.findByText(/정답을 넣은 기록 1건/)).toBeInTheDocument();
    const unreadable = truthFile('broken.json');
    vi.spyOn(unreadable, 'text').mockRejectedValue(new Error('read failed'));
    await user.upload(input, unreadable);
    expect(await screen.findByText(/정답을 넣은 기록 0건/)).toBeInTheDocument();
    expect(screen.queryByText(/False-Safe 기록 id:/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/N\/A/)).toHaveLength(4);
  });

  it('늦게 읽힌 이전 파일이 마지막으로 선택한 파일을 덮어쓰지 않는다', async () => {
    const user = userEvent.setup();
    render(<ResearchPanel records={records(1)} />);
    await enableResearchMode();
    const input = screen.getByLabelText(/정답\(Ground Truth\) 파일/);
    const slow = truthFile('slow.json');
    let finish!: (value: string) => void;
    vi.spyOn(slow, 'text').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await user.upload(input, slow);
    await user.upload(
      input,
      truthFile('latest.json', [{ ...TRUTH, verdict: 'COMPATIBLE' }]),
    );
    expect(await screen.findByText(/정답을 넣은 기록 1건/)).toBeInTheDocument();
    await act(async () => finish(JSON.stringify([TRUTH])));
    expect(screen.queryByText(/False-Safe 기록 id:/)).not.toBeInTheDocument();
  });

  it('중복된 정답은 평가하지 않고 제외 수를 알려준다', async () => {
    const user = userEvent.setup();
    render(<ResearchPanel records={records(1)} />);
    await enableResearchMode();
    await user.upload(
      screen.getByLabelText(/정답\(Ground Truth\) 파일/),
      truthFile('duplicates.json', [
        TRUTH,
        { ...TRUTH, verdict: 'COMPATIBLE' },
      ]),
    );
    expect(await screen.findByText(/정답을 넣은 기록 0건/)).toBeInTheDocument();
    expect(screen.getByText(/2줄.*제외/)).toBeInTheDocument();
  });

  it('이전 파일의 늦은 실패가 새 파일의 결과에 오류를 붙이지 않는다', async () => {
    const user = userEvent.setup();
    render(<ResearchPanel records={records(1)} />);
    await enableResearchMode();
    const input = screen.getByLabelText(/정답\(Ground Truth\) 파일/);
    const slow = truthFile('slow.json');
    let fail!: (reason: Error) => void;
    vi.spyOn(slow, 'text').mockReturnValue(
      new Promise((_, reject) => {
        fail = reject;
      }),
    );
    await user.upload(input, slow);
    expect(
      screen.getByText('정답 파일 읽는 중: slow.json'),
    ).toBeInTheDocument();
    await user.upload(
      input,
      truthFile('latest.json', [{ ...TRUTH, verdict: 'COMPATIBLE' }]),
    );
    await act(async () => fail(new Error('late failure')));
    expect(
      screen.getByText('선택한 정답 파일: latest.json'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('정답 파일을 읽지 못했습니다.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/정답을 넣은 기록 1건/)).toBeInTheDocument();
  });

  it('동일 파일을 다시 골라도 다시 읽는다', async () => {
    const user = userEvent.setup();
    render(<ResearchPanel records={records(1)} />);
    await enableResearchMode();
    const input = screen.getByLabelText(/정답\(Ground Truth\) 파일/);
    const file = truthFile('retry.json');
    const read = vi
      .spyOn(file, 'text')
      .mockRejectedValueOnce(new Error('first read failed'))
      .mockResolvedValueOnce(JSON.stringify([TRUTH]));
    await user.upload(input, file);
    expect(
      await screen.findByText('정답 파일을 읽지 못했습니다.'),
    ).toBeInTheDocument();
    await user.upload(input, file);
    expect(await screen.findByText(/정답을 넣은 기록 1건/)).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText('정답 파일을 읽지 못했습니다.'),
    ).not.toBeInTheDocument();
  });
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  // 검증 모드 스위치는 localStorage에 남는다. 다음 테스트로 새지 않게 되돌린다.
  const { result } = renderHook(() => useResearchMode());
  act(() => result.current[1](false));
});

describe('ResearchPanel — 내보낸 건수 표시', () => {
  it('스위치를 켜기 전에는 CSV 버튼이 없다', () => {
    render(<ResearchPanel records={records(3)} />);
    expect(
      screen.queryByRole('button', { name: /CSV 내려받기/ }),
    ).not.toBeInTheDocument();
  });

  it('내려받기 전에는 내보낸 건수 문구가 없다', async () => {
    render(<ResearchPanel records={records(3)} />);
    await enableResearchMode();

    expect(screen.queryByText(/CSV로 내보냈습니다/)).not.toBeInTheDocument();
  });

  it('받은 records를 상한 없이 그대로 내보내고 건수를 밝힌다 (51건)', async () => {
    const user = userEvent.setup();
    render(<ResearchPanel records={records(51)} />);
    await enableResearchMode();

    expect(
      screen.getByRole('button', { name: 'CSV 내려받기 (51건)' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'CSV 내려받기 (51건)' }),
    );

    expect(
      screen.getByText('전체 51건을 CSV로 내보냈습니다.'),
    ).toBeInTheDocument();
  });

  it('기록이 없으면 버튼을 막고 0건이라고 지어내지 않는다', async () => {
    render(<ResearchPanel records={[]} />);
    await enableResearchMode();

    expect(
      screen.getByRole('button', { name: 'CSV 내려받기 (0건)' }),
    ).toBeDisabled();
  });
});

describe('ResearchPanel — 접근성', () => {
  it('연구 모드 스위치와 정답 파일 입력에 접근 가능한 이름이 있다', async () => {
    render(<ResearchPanel records={records(3)} />);
    expect(
      screen.getByRole('checkbox', { name: /연구·실험 모드/ }),
    ).toBeInTheDocument();

    await enableResearchMode();
    expect(
      screen.getByLabelText(/정답\(Ground Truth\) 파일/),
    ).toBeInTheDocument();
  });
});
