// 결과 카드 렌더링 테스트.
//
// 이 화면이 판정을 잘못 표시하면 사람이 다친다.
// 부적합인데 "적합"이 뜨는 것이 이 프로젝트 최악의 버그다.
// 규칙엔진이 낸 결과를 화면이 그대로 보여주는지만 확인한다.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResultCard } from './ResultCard';
import { matchSpecs } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

function grinder(overrides: Partial<GrinderSpec> = {}): GrinderSpec {
  return {
    model: 'GWS 750-125',
    noLoadRPM: 11000,
    maxWheelDiameter: 125,
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

function wheel(overrides: Partial<WheelSpec> = {}): WheelSpec {
  return {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

describe('ResultCard — 판정 표시', () => {
  it('적합이면 "적합"만 표시하고 "부적합"은 표시하지 않는다', () => {
    render(<ResultCard result={matchSpecs(grinder(), wheel())} />);

    expect(screen.getByText('적합')).toBeInTheDocument();
    expect(screen.queryByText('부적합')).not.toBeInTheDocument();
    expect(screen.queryByText('판정불가')).not.toBeInTheDocument();
  });

  it('RPM 위반이면 "부적합"과 그 사유를 표시한다', () => {
    render(
      <ResultCard result={matchSpecs(grinder(), wheel({ maxRPM: 8500 }))} />,
    );

    expect(screen.getByText('부적합')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(
      screen.getByText(/숫돌 최고사용회전속도\(8500rpm\)가/),
    ).toBeInTheDocument();
    expect(screen.getByText(/파손·비산 위험/)).toBeInTheDocument();
  });

  it('값이 없으면 "판정불가"를 표시한다', () => {
    render(
      <ResultCard result={matchSpecs(grinder({ noLoadRPM: null }), wheel())} />,
    );

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
  });

  it('지름 위반 사유에 두 값이 모두 나온다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder({ maxWheelDiameter: 100 }), wheel())}
      />,
    );

    expect(
      screen.getByText(
        '숫돌 지름(125mm)이 그라인더 허용 최대 지름(100mm)을 초과합니다.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ResultCard — 검사 항목', () => {
  it('5개 검사 항목을 모두 보여준다', () => {
    render(<ResultCard result={matchSpecs(grinder(), wheel())} />);

    for (const rule of [
      '필수값 존재',
      'RPM 안전',
      '지름 호환',
      '용도 확인',
      '신뢰도 검증',
    ]) {
      expect(screen.getByText(rule)).toBeInTheDocument();
    }
  });

  it('그라인더와 숫돌 값을 나란히 보여준다', () => {
    render(<ResultCard result={matchSpecs(grinder(), wheel())} />);

    expect(
      screen.getAllByText('그라인더 11000rpm / 숫돌 12200rpm').length,
    ).toBeGreaterThan(0);
  });

  it('값이 없는 항목은 —로 표시한다', () => {
    render(
      <ResultCard result={matchSpecs(grinder({ noLoadRPM: null }), wheel())} />,
    );

    expect(
      screen.getAllByText('그라인더 — / 숫돌 12200rpm').length,
    ).toBeGreaterThan(0);
  });
});
