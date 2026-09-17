// 부속품 조건 표 테스트.
//
// 이 표가 "맞다"·"적합"으로 읽히면 규격 판정과 헷갈린다. 모름·직접 확인·어긋남
// 셋만 보이는지, 어긋남이 먼저 보이는지 확인한다.

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfileConditionsPanel } from './ProfileConditionsPanel';
import type { ProfileCondition } from '@/lib/rules/types';

const REF = { type: 'bonded_abrasive' as const, version: '2026.09.17-r1' };

const CONDITIONS: ProfileCondition[] = [
  { key: 'material', status: 'unknown', code: 'material.unknown' },
  { key: 'spindle', status: 'manual_check', code: 'spindle.manualCheck' },
  { key: 'guard', status: 'conflict', code: 'guard.missing' },
];

describe('ProfileConditionsPanel', () => {
  it('규격 판정에 들어가지 않으며 맞다고 추정하지 않는다고 적는다', () => {
    render(<ProfileConditionsPanel profile={REF} conditions={CONDITIONS} />);

    expect(
      screen.getByRole('heading', { name: '장착·작업 조건 확인' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '덮개 어긋남은 판정을 판정불가로 막습니다. 나머지 항목은 규격 판정에 들어가지 않으며, 앱이 맞다고 추정하지 않으니 직접 확인하세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/적합|안전합니다|맞습니다/),
    ).not.toBeInTheDocument();
  });

  it('어긋남을 가장 먼저 보이고, 무엇을 해야 하는지 적는다', () => {
    render(<ProfileConditionsPanel profile={REF} conditions={CONDITIONS} />);

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('⚠ 덮개 · 어긋남');
    expect(items[0]).toHaveTextContent(
      '덮개가 없다고 고르셨습니다. 이 종류는 덮개가 필요합니다. 덮개를 달기 전에는 작업하지 마십시오.',
    );
    expect(items[1]).toHaveTextContent('재료 · 모름');
    expect(items[2]).toHaveTextContent('스핀들(축) · 직접 확인');
  });

  it('어느 Profile·버전으로 보았는지 남긴다', () => {
    render(<ProfileConditionsPanel profile={REF} conditions={CONDITIONS} />);

    expect(
      screen.getByText('적용 조건표: 일반 결합숫돌 · 2026.09.17-r1'),
    ).toBeInTheDocument();
  });

  it('Profile이 없는 종류는 조건표가 없다고만 알린다', () => {
    render(<ProfileConditionsPanel profile={null} conditions={null} />);

    expect(
      screen.getByText(
        '이 종류에 적용할 조건표가 없습니다. 제조사 취급설명서를 확인하세요.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
