// 이력 필터 UI 테스트.
//
// 이 컴포넌트는 상태를 갖지 않는다 — onChange로 부모에 새 필터 값을 보고할
// 뿐이다. 그래서 "필터를 고르면 올바른 값으로 onChange가 불린다"만 보면 된다.
// 실제로 걸러지는지는 historyFilter.test.ts가 순수 함수로 이미 검증한다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HistoryFilters } from './HistoryFilters';
import { EMPTY_HISTORY_FILTER } from '@/lib/record/historyFilter';

describe('HistoryFilters', () => {
  it('빈 필터에서는 초기화 버튼이 비활성이다', () => {
    render(
      <HistoryFilters
        filter={EMPTY_HISTORY_FILTER}
        onChange={vi.fn()}
        total={5}
        count={5}
      />,
    );

    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeDisabled();
  });

  it('필터가 걸려 있으면 초기화 버튼이 눌리고, 누르면 빈 필터로 되돌린다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <HistoryFilters
        filter={{ ...EMPTY_HISTORY_FILTER, purpose: 'cutting' }}
        onChange={onChange}
        total={5}
        count={2}
      />,
    );

    const reset = screen.getByRole('button', { name: '필터 초기화' });
    expect(reset).toBeEnabled();
    await user.click(reset);

    expect(onChange).toHaveBeenCalledWith(EMPTY_HISTORY_FILTER);
  });

  it('작업을 고르면 다른 필드는 그대로 둔 채 onChange를 부른다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filter = { ...EMPTY_HISTORY_FILTER, verdict: 'COMPATIBLE' as const };
    render(
      <HistoryFilters
        filter={filter}
        onChange={onChange}
        total={5}
        count={3}
      />,
    );

    await user.selectOptions(screen.getByLabelText('작업'), '연삭');

    expect(onChange).toHaveBeenCalledWith({ ...filter, purpose: 'grinding' });
  });

  it('필터가 없을 때는 전체 건수만, 걸려 있을 때는 전체 중 건수를 보여준다', () => {
    const { rerender } = render(
      <HistoryFilters
        filter={EMPTY_HISTORY_FILTER}
        onChange={vi.fn()}
        total={5}
        count={5}
      />,
    );
    expect(screen.getByText('5건')).toBeInTheDocument();

    rerender(
      <HistoryFilters
        filter={{ ...EMPTY_HISTORY_FILTER, purpose: 'cutting' }}
        onChange={vi.fn()}
        total={5}
        count={2}
      />,
    );
    expect(screen.getByText('전체 5건 중 2건')).toBeInTheDocument();
  });

  it('모든 조작 요소에 접근 가능한 이름이 있다', () => {
    render(
      <HistoryFilters
        filter={EMPTY_HISTORY_FILTER}
        onChange={vi.fn()}
        total={0}
        count={0}
      />,
    );

    expect(screen.getByLabelText('작업')).toBeInTheDocument();
    expect(screen.getByLabelText('판정')).toBeInTheDocument();
    expect(screen.getByLabelText('숫돌 종류')).toBeInTheDocument();
    expect(screen.getByLabelText('판정 범위')).toBeInTheDocument();
    expect(screen.getByLabelText('Trial Run 결과')).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toBeInTheDocument();
    expect(screen.getByLabelText('종료일')).toBeInTheDocument();
  });

  it('판정 범위(full/limited)를 고르면 다른 필드는 그대로 둔 채 onChange를 부른다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filter = {
      ...EMPTY_HISTORY_FILTER,
      verdict: 'UNDETERMINED' as const,
    };
    render(
      <HistoryFilters
        filter={filter}
        onChange={onChange}
        total={5}
        count={3}
      />,
    );

    await user.selectOptions(screen.getByLabelText('판정 범위'), '제한적');

    expect(onChange).toHaveBeenCalledWith({ ...filter, scope: 'limited' });
  });
});
