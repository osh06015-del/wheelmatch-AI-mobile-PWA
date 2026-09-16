import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryList } from './HistoryList';
import type { InspectionRecord } from '@/lib/rules/types';

function record(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: 1,
    grinder: {
      model: 'GWS 750-125',
      noLoadRPM: 11000,
      maxWheelDiameter: 125,
      rawText: '',
      confidence: 'high',
    },
    wheel: {
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      visibleDamage: 'none_visible',
      rawText: '',
      confidence: 'high',
    },
    result: {
      verdict: 'COMPATIBLE',
      checks: [
        {
          rule: 'RPM 안전',
          passed: true,
          reason: '숫돌이 더 빠릅니다.',
          grinderValue: '11000rpm',
          wheelValue: '12200rpm',
        },
      ],
      timestamp: '2026-09-01T09:00:00.000Z',
    },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    },
    declaredPurpose: 'cutting',
    elapsedMs: 28_400,
    createdAt: '2026-09-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('HistoryList', () => {
  it('작업 종류와 걸린 시간을 함께 보여준다', () => {
    render(<HistoryList records={[record()]} />);
    expect(screen.getByText('절단')).toBeInTheDocument();
    expect(screen.getByText(/점검에 28초 걸림/)).toBeInTheDocument();
  });

  it('사전점검 시간을 전체 시간과 따로 보여준다', () => {
    render(
      <HistoryList
        records={[
          record({
            elapsedMs: 250_000,
            preTrialElapsedMs: 22_000,
            trialRun: {
              wheelReplaced: false,
              requiredSeconds: 60,
              startedAt: '2026-09-01T09:00:22.000Z',
              finishedAt: '2026-09-01T09:01:30.000Z',
              elapsedSeconds: 68,
              outcome: 'normal',
              findings: [],
              completed: true,
            },
          }),
        ]}
      />,
    );
    expect(
      screen.getByText('점검에 4분 10초 걸림 (시험운전 포함)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('사전점검 22초 (시험운전 전까지)'),
    ).toBeInTheDocument();
  });

  it('30초는 사전점검 시간 목표이고 법정 시험운전은 별도라고 적는다', () => {
    render(<HistoryList records={[record()]} />);
    expect(
      screen.getByText(
        '「30초」는 사전점검 시간 목표입니다. 작업 선택부터 시험운전을 시작하기 직전까지를 잽니다. 법정 시험운전(1분·3분 이상)은 이 목표와 별도이며 줄이지 않습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('이 기능 도입 전 기록에도 깨지지 않는다', () => {
    render(
      <HistoryList
        records={[record({ declaredPurpose: undefined, elapsedMs: undefined })]}
      />,
    );
    expect(screen.queryByText('절단')).not.toBeInTheDocument();
    expect(screen.queryByText(/걸림/)).not.toBeInTheDocument();
    expect(screen.getByText(/GWS 750-125/)).toBeInTheDocument();
  });

  it('펼치면 저장된 사진을 보여준다', async () => {
    const user = userEvent.setup();
    render(
      <HistoryList
        records={[
          record({
            grinderImage: new Blob(['g'], { type: 'image/jpeg' }),
            wheelImage: new Blob(['w'], { type: 'image/jpeg' }),
          }),
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByAltText('그라인더 명판')).toBeInTheDocument();
    expect(screen.getByAltText('숫돌 라벨')).toBeInTheDocument();
  });

  it('사진 없이 저장된 기록은 없다고 알린다', async () => {
    const user = userEvent.setup();
    render(<HistoryList records={[record()]} />);

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('저장된 사진이 없습니다.')).toBeInTheDocument();
  });

  it('부적합 기록은 부적합으로 표시한다', () => {
    // 판정이 뒤바뀌어 보이는 사고를 막는다.
    const bad = record({
      result: { ...record().result, verdict: 'INCOMPATIBLE' },
    });
    render(<HistoryList records={[bad]} />);
    expect(screen.getByText('부적합')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
  });
});

describe('저장된 사진 표시', () => {
  // happy-dom에는 object URL 구현이 없다. 만들고 해제한 순서를 직접 본다.
  const created: string[] = [];
  const revoked: string[] = [];

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    let n = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => {
        const url = `blob:test/${(n += 1)}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => {
        revoked.push(url);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('StrictMode에서 다시 마운트해도 살아 있는 URL을 쓴다', async () => {
    // 예전 구현은 useMemo로 만든 URL을 effect 정리에서 해제해, 두 번째 마운트에
    // 이미 해제된 URL이 남아 사진이 빈 칸으로 떴다.
    const user = userEvent.setup();
    render(
      <StrictMode>
        <HistoryList
          records={[
            record({ grinderImage: new Blob(['g'], { type: 'image/png' }) }),
          ]}
        />
      </StrictMode>,
    );

    await user.click(screen.getByRole('button', { expanded: false }));

    const img = screen.getByAltText('그라인더 명판') as HTMLImageElement;
    const src = img.getAttribute('src');
    expect(src).not.toBeNull();
    expect(revoked).not.toContain(src);
  });

  it('사진을 닫으면 URL을 해제한다', async () => {
    const user = userEvent.setup();
    render(
      <HistoryList
        records={[
          record({ grinderImage: new Blob(['g'], { type: 'image/png' }) }),
        ]}
      />,
    );

    const toggle = screen.getByRole('button', { expanded: false });
    await user.click(toggle);
    expect(created).toHaveLength(1);

    await user.click(toggle);
    expect(revoked).toEqual(created);
  });
});

describe('이력 상세 — 다각도 외관 확인', () => {
  const EXAM = {
    status: 'suspected' as const,
    findings: [
      {
        kind: 'chip' as const,
        view: 'back' as const,
        reason: '뒷면 4시 방향에 조각이 떨어진 자국.',
        confidence: 'medium' as const,
      },
    ],
    photoQuality: (['front', 'back', 'edge', 'bore'] as const).map((view) => ({
      view,
      issues: [],
      readable: true,
    })),
    model: 'claude-sonnet-5',
    promptVersion: '2026.09.16-r1',
    analyzedAt: '2026-09-01T09:00:00.000Z',
  };

  it('AI가 본 것을 규칙 판정 항목과 섞지 않는다', async () => {
    const user = userEvent.setup();
    render(
      <HistoryList
        records={[record({ wheelExam: EXAM, wheelExamAcknowledged: true })]}
      />,
    );
    await user.click(screen.getByRole('button', { expanded: false }));

    // 규칙엔진이 낸 항목 수는 그대로다 — AI 결과가 확인된 항목으로 세어지지 않는다.
    expect(screen.getByText(/RPM 안전/)).toBeInTheDocument();
    expect(screen.getByText('다각도 외관 확인 기록')).toBeInTheDocument();
    expect(
      screen.getByText(
        'AI가 사진에서 본 것입니다. 작업자가 직접 확인하는 항목에는 들어가지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('깨짐·조각 떨어짐 의심 · 뒷면 전체'),
    ).toBeInTheDocument();
  });

  it('확인하지 못한 채 진행한 기록은 미실행으로 남는다', async () => {
    const user = userEvent.setup();
    render(
      <HistoryList
        records={[
          record({
            wheelExamNotRun: {
              reason: 'offline',
              acknowledgedAt: '2026-09-01T09:00:00.000Z',
            },
          }),
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { expanded: false }));

    expect(
      screen.getByText('AI 확인 미실행 — 작업자 직접점검으로 진행함'),
    ).toBeInTheDocument();
  });

  it('이 기능 도입 전 기록에는 카드를 그리지 않는다', async () => {
    const user = userEvent.setup();
    render(<HistoryList records={[record()]} />);
    await user.click(screen.getByRole('button', { expanded: false }));

    expect(screen.queryByText('다각도 외관 확인 기록')).not.toBeInTheDocument();
  });

  it('다각도 사진이 없는 기록도 오류 없이 펼쳐진다', async () => {
    const user = userEvent.setup();
    render(<HistoryList records={[record({ wheelExam: EXAM })]} />);
    await user.click(screen.getByRole('button', { expanded: false }));

    expect(
      screen.getByText('이 기록에는 다각도 사진이 저장되어 있지 않습니다.'),
    ).toBeInTheDocument();
  });
});

describe('이력 상세 — 기록별 삭제', () => {
  it('삭제 전에 한 번 더 묻는다', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<HistoryList records={[record()]} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { expanded: false }));

    await user.click(screen.getByRole('button', { name: '이 기록 삭제' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        '이 기록 한 건을 지웁니다. 함께 저장된 사진도 지워지고 되살릴 수 없습니다.',
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '이 기록을 지웁니다' }),
    );
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('취소하면 지우지 않는다', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<HistoryList records={[record()]} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { expanded: false }));

    await user.click(screen.getByRole('button', { name: '이 기록 삭제' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: '이 기록 삭제' }),
    ).toBeInTheDocument();
  });

  it('삭제 수단을 주지 않은 화면에는 버튼을 그리지 않는다', async () => {
    const user = userEvent.setup();
    render(<HistoryList records={[record()]} />);
    await user.click(screen.getByRole('button', { expanded: false }));

    expect(
      screen.queryByRole('button', { name: '이 기록 삭제' }),
    ).not.toBeInTheDocument();
  });
});
