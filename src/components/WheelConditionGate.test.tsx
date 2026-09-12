import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  WHEEL_CONDITION_ITEMS,
  WheelConditionGate,
} from './WheelConditionGate';
import { EMPTY_WHEEL_CONDITION } from '@/lib/safety/wheelCondition';

describe('WheelConditionGate', () => {
  it('AI 결과와 관계없이 모든 항목은 미선택으로 시작한다', () => {
    const onChange = vi.fn();
    render(
      <WheelConditionGate
        condition={EMPTY_WHEEL_CONDITION}
        visibleDamage="none_visible"
        labelNeedsReview={false}
        expiryNeedsReview={false}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByRole('group')).toHaveLength(
      WHEEL_CONDITION_ITEMS.length,
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(/AI는.*정상으로 확정하지 않습니다/),
    ).toBeInTheDocument();
  });

  it('사진에서 손상이 의심될 때 경고만 하고 자동 선택하지 않는다', () => {
    const onChange = vi.fn();
    render(
      <WheelConditionGate
        condition={EMPTY_WHEEL_CONDITION}
        visibleDamage="suspected"
        labelNeedsReview={false}
        expiryNeedsReview={false}
        onChange={onChange}
      />,
    );

    expect(screen.getByText(/손상 징후를 의심했습니다/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('작업자가 문제 있음을 누르면 사용 중지 안내를 표시한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <WheelConditionGate
        condition={{ ...EMPTY_WHEEL_CONDITION, damageFree: false }}
        visibleDamage="unknown"
        labelNeedsReview={false}
        expiryNeedsReview={false}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('이 숫돌을 사용하지 마십시오')).toBeInTheDocument();

    const firstGroup = screen.getAllByRole('group')[0];
    await user.click(
      Array.from(firstGroup.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('확인함'),
      )!,
    );
    expect(onChange).toHaveBeenCalledWith('damageFree', true);
  });

  it('라벨이나 유효기한을 AI가 못 읽으면 직접 확인 경고를 낸다', () => {
    render(
      <WheelConditionGate
        condition={EMPTY_WHEEL_CONDITION}
        visibleDamage="unknown"
        labelNeedsReview
        expiryNeedsReview
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/라벨 정보를 충분히 읽지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText(/유효기한을 읽지 못했습니다/)).toBeInTheDocument();
  });
});
