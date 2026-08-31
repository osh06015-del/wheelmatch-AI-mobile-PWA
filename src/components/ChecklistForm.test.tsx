// 안전 체크리스트 테스트.
//
// 규격이 적합해도 방호덮개나 보호구를 확인하지 않으면 저장할 수 없어야 한다.
// isChecklistComplete가 느슨해지면 이 관문이 조용히 열린다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CHECKLIST_ITEMS,
  ChecklistForm,
  EMPTY_CHECKLIST,
  isChecklistComplete,
} from './ChecklistForm';
import type { SafetyChecklist } from '@/lib/rules/types';

const ALL_CHECKED: SafetyChecklist = {
  guardCover: true,
  auxiliaryHandle: true,
  wheelDamage: true,
  sparkDirection: true,
  ppe: true,
};

describe('isChecklistComplete', () => {
  it('빈 체크리스트는 미완료다', () => {
    expect(isChecklistComplete(EMPTY_CHECKLIST)).toBe(false);
  });

  it('5개를 모두 체크해야 완료다', () => {
    expect(isChecklistComplete(ALL_CHECKED)).toBe(true);
  });

  it('하나라도 빠지면 미완료다', () => {
    for (const item of CHECKLIST_ITEMS) {
      expect(isChecklistComplete({ ...ALL_CHECKED, [item.key]: null })).toBe(
        false,
      );
    }
  });

  it('false는 체크한 것으로 치지 않는다', () => {
    // null(미확인)과 false(확인했는데 문제 있음) 둘 다 통과시키면 안 된다.
    expect(isChecklistComplete({ ...ALL_CHECKED, ppe: false })).toBe(false);
  });
});

describe('ChecklistForm', () => {
  it('5개 항목을 모두 렌더한다', () => {
    render(<ChecklistForm checklist={EMPTY_CHECKLIST} onToggle={vi.fn()} />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    for (const item of CHECKLIST_ITEMS) {
      expect(
        screen.getByRole('checkbox', { name: new RegExp(item.label) }),
      ).toBeInTheDocument();
    }
  });

  it('체크하면 해당 항목 key로 onToggle을 호출한다', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ChecklistForm checklist={EMPTY_CHECKLIST} onToggle={onToggle} />);

    await user.click(screen.getByRole('checkbox', { name: /방호덮개 장착/ }));

    expect(onToggle).toHaveBeenCalledWith('guardCover', true);
  });

  it('이미 체크된 항목은 checked 상태로 보인다', () => {
    render(<ChecklistForm checklist={ALL_CHECKED} onToggle={vi.fn()} />);

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeChecked();
    }
  });
});
