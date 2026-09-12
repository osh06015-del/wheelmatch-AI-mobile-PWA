// 부적합일 때 "지금 무엇을 해야 하는가"가 화면에 뜨는지.
//
// 이 화면은 작업자가 부적합을 만났을 때 마지막으로 보는 지시다. 조치 문장이
// 사라지거나 조용히 다른 문구로 바뀌면 화면상으로는 티가 안 난다.
//
// 조치 문장은 AI가 만들지 않고 규칙별로 고정돼 있다. 그 고정을 여기서 지킨다.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActionGuide } from './ActionGuide';
import { RULE } from '@/lib/rules/engine';
import type { CheckItem } from '@/lib/rules/types';

function failure(overrides: Partial<CheckItem> = {}): CheckItem {
  return {
    rule: RULE.RPM_SAFETY,
    passed: false,
    reason: '숫돌이 그라인더보다 느립니다.',
    grinderValue: '11000rpm',
    wheelValue: '8500rpm',
    ...overrides,
  };
}

describe('부적합이 없을 때', () => {
  it('아무것도 그리지 않는다', () => {
    // 통과한 점검에 빨간 경고 상자가 남아 있으면 안 된다.
    const { container } = render(<ActionGuide failures={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('부적합이 있을 때', () => {
  it('사용하지 말라는 제목을 띄운다', () => {
    render(<ActionGuide failures={[failure()]} />);
    expect(screen.getByText('사용하지 마십시오')).toBeInTheDocument();
  });

  it('회전속도 위반에는 정해진 조치 문장이 나온다', () => {
    // 문장을 통째로 고정한다. 조용히 바뀌면 현장 지시가 달라진다.
    render(<ActionGuide failures={[failure()]} />);
    expect(
      screen.getByText(
        /이 숫돌을 장착하지 마세요\. 그라인더 회전속도 이상을 견디는 숫돌로 교체해야 합니다\./,
      ),
    ).toBeInTheDocument();
  });

  it('지름 위반에는 지름에 맞는 조치 문장이 나온다', () => {
    render(
      <ActionGuide
        failures={[
          failure({
            rule: RULE.DIAMETER_FIT,
            grinderValue: 'Φ125mm',
            wheelValue: 'Φ180mm',
          }),
        ]}
      />,
    );
    expect(
      screen.getByText(
        /그라인더가 허용하는 지름 이하의 숫돌로 교체해야 합니다\./,
      ),
    ).toBeInTheDocument();
  });

  it('양쪽 값을 나란히 보여준다', () => {
    // 차이를 눈으로 봐야 "얼마나" 위험한지 전달된다.
    render(<ActionGuide failures={[failure()]} />);
    expect(screen.getByText('11000rpm')).toBeInTheDocument();
    expect(screen.getByText('8500rpm')).toBeInTheDocument();
  });

  it('조치 문장이 없는 규칙에도 지시를 준다', () => {
    // 규칙마다 전용 문장을 두지 않았어도 화면이 비면 안 된다.
    render(
      <ActionGuide failures={[failure({ rule: RULE.REQUIRED_VALUES })]} />,
    );
    expect(screen.getByText(/장착하지 마세요/)).toBeInTheDocument();
  });

  it('여러 건이면 모두 보여준다', () => {
    // 하나만 고치고 작업에 들어가는 것을 막는다.
    render(
      <ActionGuide
        failures={[
          failure(),
          failure({
            rule: RULE.DIAMETER_FIT,
            grinderValue: 'Φ125mm',
            wheelValue: 'Φ180mm',
          }),
        ]}
      />,
    );
    expect(screen.getAllByText(/장착하지 마세요/).length).toBe(2);
  });

  it('"안전하다"는 말이 어디에도 없다', () => {
    // 부적합 화면에 승인처럼 읽히는 문구가 섞이면 안 된다.
    const { container } = render(<ActionGuide failures={[failure()]} />);
    expect(container.textContent).not.toMatch(/안전합니다|사용해도/);
  });
});
