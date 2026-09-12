// 면책 문구.
//
// docs/safety-boundaries.md가 "메인과 결과 화면에 항상 표시한다. 접거나 숨기지
// 않는다"로 못박은 항목이다. 작은 컴포넌트라 조용히 지워지거나 접힘 처리로
// 바뀌기 쉬워서 여기서 고정한다.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Disclaimer } from './Disclaimer';

describe('Disclaimer', () => {
  it('규격 대조 결과만 제공한다고 밝힌다', () => {
    render(<Disclaimer />);
    expect(
      screen.getByText(/라벨에 표시된 규격의 대조 결과만/),
    ).toBeInTheDocument();
  });

  it('작업 안전성을 보증하지 않는다고 밝힌다', () => {
    render(<Disclaimer />);
    expect(
      screen.getByText(/작업 안전성을\s*보증하지 않으며/),
    ).toBeInTheDocument();
  });

  it('제조사 설명서와 사업장 수칙을 대체하지 않는다고 밝힌다', () => {
    render(<Disclaimer />);
    expect(screen.getByText(/대체할 수 없습니다/)).toBeInTheDocument();
  });

  it('접히지 않는다 — details/summary를 쓰지 않는다', () => {
    // 접어 두면 안 열어보고, 안 열어보면 없는 것과 같다.
    const { container } = render(<Disclaimer />);
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
  });

  it('숨김 처리되어 있지 않다', () => {
    const { container } = render(<Disclaimer />);
    expect(container.querySelector('[hidden]')).toBeNull();
  });
});
