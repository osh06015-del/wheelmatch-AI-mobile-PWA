// 작업 조건·그라인더 장착 입력 테스트.
//
// 기본값은 모름이고, 고른 값이 그대로 넘어가며, 조작 요소에 이름이 붙어 있는지 본다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  GrinderMountingInputs,
  UNKNOWN_GRINDER_MOUNTING,
} from './GrinderMountingInputs';
import { WorkConditionsPicker } from './WorkConditionsPicker';
import { UNKNOWN_WORK_CONDITIONS } from '@/lib/rules/profiles';

describe('WorkConditionsPicker', () => {
  it('재료와 건식/습식의 기본값은 모름이다', () => {
    render(
      <WorkConditionsPicker
        value={UNKNOWN_WORK_CONDITIONS}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('재료')).toHaveValue('unknown');
    expect(screen.getByLabelText('건식/습식')).toHaveValue('unknown');
    expect(
      screen.getByText(
        '모르면 모름으로 두세요. 모르는 값을 맞는 것으로 추정하지 않습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('고른 값을 넘긴다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <WorkConditionsPicker
        value={UNKNOWN_WORK_CONDITIONS}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('재료'), '스테인리스');
    expect(onChange).toHaveBeenLastCalledWith({
      material: 'stainless',
      cooling: 'unknown',
    });
    await user.selectOptions(screen.getByLabelText('건식/습식'), '습식');
    expect(onChange).toHaveBeenLastCalledWith({
      material: 'unknown',
      cooling: 'wet',
    });
  });
});

describe('GrinderMountingInputs', () => {
  it('스핀들·덮개 종류는 모름, 덮개 크기는 빈 칸으로 시작한다', () => {
    render(
      <GrinderMountingInputs
        value={UNKNOWN_GRINDER_MOUNTING}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('스핀들(축) 나사')).toHaveValue('unknown');
    expect(screen.getByLabelText('덮개 종류')).toHaveValue('unknown');
    expect(screen.getByLabelText('덮개 크기(맞는 숫돌 지름)')).toHaveValue(
      null,
    );
    expect(
      screen.getByRole('region', { name: '축·덮개 정보' }),
    ).toBeInTheDocument();
  });

  it('고른 값을 넘긴다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GrinderMountingInputs
        value={UNKNOWN_GRINDER_MOUNTING}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('스핀들(축) 나사'), 'M14');
    expect(onChange).toHaveBeenLastCalledWith({
      ...UNKNOWN_GRINDER_MOUNTING,
      spindleThread: 'M14',
    });
    await user.selectOptions(screen.getByLabelText('덮개 종류'), '덮개 없음');
    expect(onChange).toHaveBeenLastCalledWith({
      ...UNKNOWN_GRINDER_MOUNTING,
      guardType: 'none',
    });
    await user.type(screen.getByLabelText('덮개 크기(맞는 숫돌 지름)'), '5');
    expect(onChange).toHaveBeenLastCalledWith({
      ...UNKNOWN_GRINDER_MOUNTING,
      guardSize: '5',
    });
  });
});
