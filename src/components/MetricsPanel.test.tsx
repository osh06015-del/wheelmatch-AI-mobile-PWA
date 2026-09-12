// 평가 지표 화면 테스트.
//
// 가장 중요한 것: **분모가 없는데 0%로 적지 않는다.** 위험 조합을 하나도
// 재지 않았는데 False-Safe Rate가 0%로 보이면 "0%를 달성했다"로 읽힌다.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MetricsPanel } from './MetricsPanel';
import { evaluate, type GroundTruth } from '@/lib/record/metrics';
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

function record(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: 1,
    grinder: GRINDER,
    wheel: WHEEL,
    result: {
      verdict: 'COMPATIBLE',
      checks: [],
      timestamp: '2026-09-12T00:00:00.000Z',
    },
    checklist: {
      guardCover: null,
      auxiliaryHandle: null,
      wheelDamage: null,
      ppe: true,
    },
    createdAt: '2026-09-12T00:00:00.000Z',
    ...overrides,
  };
}

function truth(overrides: Partial<GroundTruth> = {}): GroundTruth {
  return {
    recordId: 1,
    grinderRPM: 11000,
    grinderMaxDiameter: 125,
    wheelMaxRPM: 12200,
    wheelDiameter: 125,
    verdict: 'COMPATIBLE',
    ...overrides,
  };
}

describe('MetricsPanel — 분모가 없을 때', () => {
  it('기록이 없으면 어느 지표도 0%로 적지 않는다', () => {
    render(<MetricsPanel records={[]} truths={[]} />);

    const notAvailable = screen.getAllByText(/N\/A — 계산할 데이터 없음/);
    expect(notAvailable.length).toBe(4);
    expect(screen.queryByText(/0\.0%/)).not.toBeInTheDocument();
  });

  it('정답이 없으면 기록이 있어도 계산하지 않는다', () => {
    // 정답 없이는 무엇이 맞았는지 알 수 없다.
    render(<MetricsPanel records={[record()]} truths={[]} />);

    expect(screen.getAllByText(/N\/A/).length).toBe(4);
    expect(screen.getByText(/정답을 넣은 기록 0건/)).toBeInTheDocument();
  });

  it('환산 기록이 없으면 단위 정규화 오류를 0%로 적지 않는다', () => {
    // 라벨에 rpm이 적혀 있던 기록만 있으면 환산 자체를 하지 않았다.
    render(
      <MetricsPanel
        records={[record({ wheelOcr: { ...WHEEL, rpmSource: 'label' } })]}
        truths={[truth()]}
      />,
    );

    expect(screen.getByText(/0 \/ 0건/)).toBeInTheDocument();
  });
});

describe('MetricsPanel — 분자와 분모를 함께 보여준다', () => {
  it('네 지표를 모두 이름과 정의와 함께 낸다', () => {
    render(<MetricsPanel records={[record()]} truths={[truth()]} />);

    expect(screen.getByText('False-Safe Rate')).toBeInTheDocument();
    expect(screen.getByText('판정불가율')).toBeInTheDocument();
    expect(screen.getByText('필드 추출 정확도')).toBeInTheDocument();
    expect(screen.getByText('단위 정규화 오류')).toBeInTheDocument();
    expect(
      screen.getByText(/0이 아니면 출시하지 않습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText(/설계된 동작입니다/)).toBeInTheDocument();
  });

  it('실제로 놓친 위험 조합이 있으면 비율과 기록 id를 함께 낸다', () => {
    const records = [
      record({ id: 1 }),
      record({
        id: 2,
        result: {
          verdict: 'COMPATIBLE',
          checks: [],
          timestamp: '2026-09-12T00:00:00.000Z',
        },
      }),
    ];
    const truths = [
      truth({ recordId: 1 }),
      truth({ recordId: 2, verdict: 'INCOMPATIBLE' }),
    ];

    render(<MetricsPanel records={records} truths={truths} />);

    expect(screen.getByText(/1 \/ 2건/)).toBeInTheDocument();
    expect(screen.getByText(/50\.0%/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/id: 2/);
  });

  it('화면 값이 evaluate()의 계산과 같다', () => {
    // 화면이 따로 계산하면 논문 숫자가 어느 쪽인지 알 수 없게 된다.
    const records = [record({ id: 1 }), record({ id: 2 })];
    const truths = [
      truth({ recordId: 1 }),
      truth({ recordId: 2, verdict: 'INCOMPATIBLE' }),
    ];
    const report = evaluate(records, truths);

    render(<MetricsPanel records={records} truths={truths} />);

    expect(report.falseSafe.count).toBe(1);
    expect(report.scored).toBe(2);
    expect(
      screen.getByText(
        new RegExp(`${report.falseSafe.count} / ${report.scored}건`),
      ),
    ).toBeInTheDocument();
  });

  it('OCR 원본값으로 정확도를 잰다 — 사용자가 고친 값이 아니다', () => {
    // 최종값으로 재면 사람이 고친 것까지 모델이 맞힌 것으로 계산된다.
    const records = [
      record({
        wheel: { ...WHEEL, maxRPM: 12200 },
        wheelOcr: { ...WHEEL, maxRPM: 1220 },
      }),
    ];
    const report = evaluate(records, [truth()]);
    const wheelRpm = report.fieldAccuracy.fields.find(
      (field) => field.field === 'wheelMaxRPM',
    );

    expect(wheelRpm?.wrong).toBe(1);
    expect(wheelRpm?.correct).toBe(0);
  });
});
