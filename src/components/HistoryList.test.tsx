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
