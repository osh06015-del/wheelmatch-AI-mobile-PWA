// 그라인더 상태 Gate 렌더링 테스트.
//
// 이 화면이 하나라도 자동으로 눌러주면 작업자는 보지 않은 것을 봤다고
// 기록하게 된다. 그래서 "아무것도 눌려 있지 않다"가 가장 중요한 단언이다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  GRINDER_CONDITION_ITEMS,
  GrinderConditionGate,
} from './GrinderConditionGate';
import { EMPTY_GRINDER_CONDITION } from '@/lib/safety/grinderCondition';
import type { GrinderCondition } from '@/lib/rules/types';

const CONFIRMED: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

function groupOf(index: number): HTMLElement {
  return screen.getAllByRole('group')[index];
}

function buttonIn(group: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(group.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
  if (!found) throw new Error(`버튼을 찾지 못했다: ${text}`);
  return found;
}

describe('GrinderConditionGate', () => {
  it('다섯 개 질문을 모두 보여준다', () => {
    render(
      <GrinderConditionGate
        condition={EMPTY_GRINDER_CONDITION}
        onChange={vi.fn()}
      />,
    );

    expect(GRINDER_CONDITION_ITEMS).toHaveLength(5);
    expect(screen.getAllByRole('group')).toHaveLength(5);
    // fieldset의 접근 가능한 이름은 legend에서 온다. 질문이 스크린리더에도
    // 그대로 들리는지까지 함께 고정한다.
    for (const name of [
      /전원선과 플러그/,
      /본체에 균열/,
      /방호덮개가 장착/,
      /보조손잡이가 장착/,
      /스핀들·플랜지·고정너트/,
    ]) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
  });

  it('초기에는 어떤 버튼도 선택되어 있지 않다', () => {
    const onChange = vi.fn();
    render(
      <GrinderConditionGate
        condition={EMPTY_GRINDER_CONDITION}
        onChange={onChange}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(10);
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it('AI 역할 경계를 항상 표시한다', () => {
    render(
      <GrinderConditionGate
        condition={EMPTY_GRINDER_CONDITION}
        onChange={vi.fn()}
      />,
    );

    // 명판 사진으로 장비 전체가 정상이라고 말하지 않는다.
    expect(
      screen.getByText(/AI는 명판의 규격 정보만 읽습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/작업자가 직접 확인해야 합니다/),
    ).toBeInTheDocument();
  });

  it('확인함을 누르면 해당 항목에 true를 낸다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GrinderConditionGate
        condition={EMPTY_GRINDER_CONDITION}
        onChange={onChange}
      />,
    );

    await user.click(buttonIn(groupOf(2), '확인함'));
    expect(onChange).toHaveBeenCalledWith('guardSecure', true);
  });

  it('문제 있음을 누르면 해당 항목에 false를 낸다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GrinderConditionGate
        condition={EMPTY_GRINDER_CONDITION}
        onChange={onChange}
      />,
    );

    await user.click(buttonIn(groupOf(0), '문제 있음'));
    expect(onChange).toHaveBeenCalledWith('cordAndPlugUndamaged', false);
  });

  it('선택 상태가 버튼에 드러난다', () => {
    render(
      <GrinderConditionGate
        condition={{ ...EMPTY_GRINDER_CONDITION, bodyUndamaged: true }}
        onChange={vi.fn()}
      />,
    );

    expect(buttonIn(groupOf(1), '확인함')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(buttonIn(groupOf(1), '문제 있음')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('문제를 하나라도 발견하면 사용 중지 안내를 띄운다', () => {
    render(
      <GrinderConditionGate
        condition={{ ...CONFIRMED, spindleAssemblyUndamaged: false }}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText('그라인더를 사용하지 마십시오'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/점검·정비/);
  });

  it('문제가 있어도 다른 항목의 응답은 그대로 남는다', () => {
    // 하나를 잘못 눌렀다고 나머지를 다시 받으면 작업자가 대충 누르게 된다.
    render(
      <GrinderConditionGate
        condition={{ ...CONFIRMED, guardSecure: false }}
        onChange={vi.fn()}
      />,
    );

    expect(buttonIn(groupOf(0), '확인함')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(buttonIn(groupOf(2), '문제 있음')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('남은 항목 수를 알려주고, 다 채우면 안내가 사라진다', () => {
    const { rerender } = render(
      <GrinderConditionGate
        condition={{ ...CONFIRMED, guardSecure: null }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/남은 1개 항목/)).toBeInTheDocument();

    rerender(<GrinderConditionGate condition={CONFIRMED} onChange={vi.fn()} />);
    expect(screen.queryByText(/남은/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
