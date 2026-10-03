import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WheelExpiryReview } from './WheelExpiryReview';

describe('사용기한 직접 확인', () => {
  it('처음에는 날짜 입력을 숨기며 응답을 대신 선택하지 않는다', async () => {
    const onReview = vi.fn();
    render(
      <WheelExpiryReview
        text=""
        value={undefined}
        onReview={onReview}
        onText={vi.fn()}
      />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onReview).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: '표시를 찾지 못함' }),
    );
    expect(onReview).toHaveBeenCalledWith('not_found');
  });
  it('표시 없음 선택이 이미 읽은 날짜를 숨기거나 지우지 않는다', async () => {
    const onText = vi.fn();
    render(
      <WheelExpiryReview
        text="04/2020"
        value="not_found"
        onReview={vi.fn()}
        onText={onText}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('04/2020');
    expect(screen.getByRole('status')).toHaveTextContent(
      '입력된 날짜의 만료 검사는 유지됩니다.',
    );
    expect(onText).not.toHaveBeenCalled();
  });
  it('읽기 어려움은 유효함이 아니라 미확인으로 표시한다', () => {
    render(
      <WheelExpiryReview
        text=""
        value="unreadable"
        onReview={vi.fn()}
        onText={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('사용기한 미확인');
  });
});
