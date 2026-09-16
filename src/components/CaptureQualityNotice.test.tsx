// 사진 상태 경고 안내 테스트.
//
// 이 안내가 "숫돌이 없다"·"손상됐다"·"안전하다"로 읽히면 안 된다. 사진 상태만
// 말한다. 문구는 문자열 그대로 고정한다 — 조용히 바뀌는 것을 막기 위해서다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CaptureQualityNotice } from './CaptureQualityNotice';
import type { CaptureReview } from '@/lib/image/captureCheck';

function review(overrides: Partial<CaptureReview> = {}): CaptureReview {
  return {
    decodeFailed: false,
    warnings: ['blur', 'overexposed'],
    usedDespiteWarning: false,
    attempts: 1,
    ...overrides,
  };
}

describe('CaptureQualityNotice — 경고', () => {
  it('경고마다 무엇이 문제인지와 어떻게 다시 찍을지를 함께 적는다', () => {
    render(<CaptureQualityNotice review={review()} onUseAnyway={vi.fn()} />);

    expect(screen.getByText('⚠ 사진이 흐릿해 보입니다.')).toBeInTheDocument();
    expect(
      screen.getByText(
        '휴대폰을 움직이지 말고, 글자에 초점이 맞은 뒤에 찍으세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('⚠ 사진이 너무 밝거나 빛 반사가 강합니다.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('비스듬히 찍거나 위치를 옮겨 반사되는 빛을 피하세요.'),
    ).toBeInTheDocument();
  });

  it('검증되지 않은 기준이며 사진 상태만 본다고 적는다', () => {
    render(<CaptureQualityNotice review={review()} onUseAnyway={vi.fn()} />);

    expect(
      screen.getByText(
        '검증되지 않은 기준으로 낸 참고용 경고입니다. 다시 찍거나 그대로 쓸 수 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '사진이 읽기 좋은 상태인지만 봅니다. 명판·숫돌의 상태나 사용 안전은 판단하지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/안전합니다|사용해도 됩니다|손상|숫돌이 없/),
    ).not.toBeInTheDocument();
  });

  it('다시 찍기와 그래도 사용 중에서 고를 수 있다', async () => {
    const user = userEvent.setup();
    const onRetake = vi.fn();
    const onUseAnyway = vi.fn();
    render(
      <CaptureQualityNotice
        review={review()}
        onRetake={onRetake}
        onUseAnyway={onUseAnyway}
      />,
    );

    await user.click(screen.getByRole('button', { name: '다시 찍기' }));
    expect(onRetake).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: '그래도 이 사진 사용' }),
    );
    expect(onUseAnyway).toHaveBeenCalledTimes(1);
  });

  it('경고 목록은 alert로 알린다', () => {
    render(<CaptureQualityNotice review={review()} onUseAnyway={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '사진이 흐릿해 보입니다.',
    );
  });

  it('여러 장이 있는 화면에서는 어느 사진인지 이름에 붙인다', () => {
    render(
      <CaptureQualityNotice
        review={review()}
        subject="가장자리"
        onUseAnyway={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('region', { name: '가장자리 사진 상태 확인' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '가장자리 사진을 그래도 사용' }),
    ).toBeInTheDocument();
    // 다시 찍기를 넘기지 않으면 버튼을 두지 않는다(자리 버튼이 이미 있다).
    expect(
      screen.queryByRole('button', { name: '다시 찍기' }),
    ).not.toBeInTheDocument();
  });

  it('그래도 사용을 고른 뒤에는 버튼을 거두고 고른 사실을 남긴다', () => {
    render(
      <CaptureQualityNotice
        review={review({ usedDespiteWarning: true })}
        onUseAnyway={vi.fn()}
      />,
    );

    expect(
      screen.getByText('경고를 확인하고 이 사진을 쓰기로 했습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '그래도 이 사진 사용' }),
    ).not.toBeInTheDocument();
    // 경고 내용은 그대로 보인다.
    expect(screen.getByText('⚠ 사진이 흐릿해 보입니다.')).toBeInTheDocument();
  });
});

describe('CaptureQualityNotice — 경고가 없을 때와 열지 못했을 때', () => {
  it('경고가 없으면 아무것도 그리지 않는다 — "좋은 사진"이라고 말하지 않는다', () => {
    const { container } = render(
      <CaptureQualityNotice
        review={review({ warnings: [] })}
        onUseAnyway={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('아직 사진이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(
      <CaptureQualityNotice review={null} onUseAnyway={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('열지 못한 사진은 그래도 사용할 수 없다', async () => {
    const user = userEvent.setup();
    const onRetake = vi.fn();
    render(
      <CaptureQualityNotice
        review={review({ decodeFailed: true, warnings: [] })}
        onRetake={onRetake}
        onUseAnyway={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '이 사진 형식을 읽지 못했습니다.',
    );
    expect(
      screen.getByText(
        '열 수 없는 사진으로는 진행할 수 없습니다. 다시 찍거나 다른 사진을 고르세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /그래도/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 찍기' }));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });
});
