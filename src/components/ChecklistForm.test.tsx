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
  PRE_WORK_REMINDER_KEY,
  isChecklistComplete,
} from './ChecklistForm';
import { translate } from '@/lib/i18n';
import type { SafetyChecklist } from '@/lib/rules/types';

const ALL_CHECKED: SafetyChecklist = {
  guardCover: true,
  auxiliaryHandle: true,
  wheelDamage: true,
  ppe: true,
  workpieceSecured: true,
  surroundingsClear: true,
};

describe('안전 체크리스트 구성', () => {
  it('숫돌 손상은 별도 Wheel Condition Gate로 옮겨 중복 확인하지 않는다', () => {
    expect(CHECKLIST_ITEMS.map((i) => i.key)).not.toContain('wheelDamage');
  });

  it('방호덮개·보조손잡이는 Grinder Condition Gate로 옮겨 중복 확인하지 않는다', () => {
    // 같은 것을 두 번 물으면 두 번째는 읽지 않고 누르게 된다.
    const keys = CHECKLIST_ITEMS.map((item) => item.key);
    expect(keys).not.toContain('guardCover');
    expect(keys).not.toContain('auxiliaryHandle');
  });

  it('기계·숫돌이 아닌 항목만 최종 체크리스트에 남는다', () => {
    // 기계는 Grinder Gate, 숫돌은 Wheel Gate가 맡는다. 여기 남는 것은
    // 작업자 본인(보호구)과 작업 환경(고정·주변)이다.
    expect(CHECKLIST_ITEMS.map((item) => item.key)).toEqual([
      'ppe',
      'workpieceSecured',
      'surroundingsClear',
    ]);
  });

  it('세 항목을 모두 확인해야 완료다', () => {
    for (const item of CHECKLIST_ITEMS) {
      expect(isChecklistComplete({ ...ALL_CHECKED, [item.key]: null })).toBe(
        false,
      );
      expect(isChecklistComplete({ ...ALL_CHECKED, [item.key]: false })).toBe(
        false,
      );
    }
    expect(isChecklistComplete(ALL_CHECKED)).toBe(true);
  });

  it('불꽃 방향은 여전히 체크박스가 아니라 작업 직전 안내다', () => {
    expect(CHECKLIST_ITEMS.map((item) => item.key)).not.toContain(
      'sparkDirection',
    );
    expect(PRE_WORK_REMINDER_KEY).toBe('checklist.preWork');
  });

  it('새 항목이 없는 과거 기록도 읽을 수 있다', () => {
    // 선택 필드라 Gate 도입 전 기록에 없어도 타입이 성립한다.
    const legacy: SafetyChecklist = {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
    };
    // 새 항목이 없으므로 완료로 보지 않는다. 확인하지 않은 것을 통과시키지 않는다.
    expect(isChecklistComplete(legacy)).toBe(false);
  });

  it('과거 기록을 읽을 수 있도록 체크리스트 타입 필드는 남겨둔다', () => {
    // 화면에서 뺀 것과 저장 구조에서 지우는 것은 다르다.
    // 지우면 Gate 도입 전 IndexedDB 기록을 해석할 수 없다.
    expect(EMPTY_CHECKLIST).toHaveProperty('guardCover');
    expect(EMPTY_CHECKLIST).toHaveProperty('auxiliaryHandle');
    expect(EMPTY_CHECKLIST).toHaveProperty('wheelDamage');
  });

  it('불꽃 방향은 체크박스에서 뺀다', () => {
    // 장착 전에 예/아니오로 답할 수 있는 항목이 아니다.
    // 작업 직전 안내(PRE_WORK_REMINDER_KEY)로 따로 띄운다.
    expect(CHECKLIST_ITEMS.map((i) => i.key)).not.toContain('sparkDirection');
    expect(translate('ko', PRE_WORK_REMINDER_KEY)).toContain('불꽃');
  });
});

describe('isChecklistComplete', () => {
  it('빈 체크리스트는 미완료다', () => {
    expect(isChecklistComplete(EMPTY_CHECKLIST)).toBe(false);
  });

  it('정의된 항목을 모두 체크해야 완료다', () => {
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
  it('정의된 항목을 모두 렌더한다', () => {
    render(<ChecklistForm checklist={EMPTY_CHECKLIST} onToggle={vi.fn()} />);

    // 개수를 숫자로 박지 않는다. 항목이 늘거나 줄 때 테스트가 조용히 어긋난다.
    expect(screen.getAllByRole('checkbox')).toHaveLength(
      CHECKLIST_ITEMS.length,
    );
    for (const item of CHECKLIST_ITEMS) {
      expect(
        screen.getByRole('checkbox', {
          name: new RegExp(translate('ko', item.labelKey)),
        }),
      ).toBeInTheDocument();
    }
  });

  it('체크하면 해당 항목 key로 onToggle을 호출한다', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ChecklistForm checklist={EMPTY_CHECKLIST} onToggle={onToggle} />);

    // 방호덮개·보조손잡이는 Grinder Condition Gate로, 숫돌 손상은 Wheel
    // Condition Gate로 옮겼다. 여기 남은 것은 보호구뿐이다.
    await user.click(screen.getByRole('checkbox', { name: /보호구 착용/ }));

    expect(onToggle).toHaveBeenCalledWith('ppe', true);
  });

  it('이미 체크된 항목은 checked 상태로 보인다', () => {
    render(<ChecklistForm checklist={ALL_CHECKED} onToggle={vi.fn()} />);

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeChecked();
    }
  });
});
