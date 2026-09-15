// 숫돌 종류 직접 확인 화면 테스트.
//
// AI가 본 종류는 제안일 뿐이다. 작업자가 고른 값과 다르면 그 차이가 화면에서
// 사라지면 안 되고, 일반 결합숫돌이 아니면 판정불가로 끝난다는 것을 고르는
// 순간 알려야 한다.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WHEEL_TYPE_OPTIONS, WheelTypeConfirm } from './WheelTypeConfirm';
import { LOCALES, translate } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n';
import type { WheelType } from '@/lib/rules/types';

const ALL_TYPES: WheelType[] = [
  'bonded_abrasive',
  'flap_disc',
  'cup_wheel',
  'diamond',
  'wire_brush',
  'other',
  'unknown',
];

const CONFIRM_KEYS: MessageKey[] = [
  'wheelTypeConfirm.label',
  'wheelTypeConfirm.hint',
  'wheelTypeConfirm.aiSuggestion',
  'wheelTypeConfirm.supported',
  'wheelTypeConfirm.unknown',
  'wheelTypeConfirm.unsupported',
  'wheelTypeConfirm.differs',
  'wheelTypeConfirm.needsConfirm',
];

function select() {
  return screen.getByRole('combobox', { name: '숫돌 종류' });
}

describe('WheelTypeConfirm — 선택지', () => {
  it('WheelType 일곱 가지를 모두 같은 순서로 고를 수 있다', () => {
    render(
      <WheelTypeConfirm
        value="unknown"
        suggested="unknown"
        onChange={vi.fn()}
      />,
    );

    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((option) => option.value)).toEqual(ALL_TYPES);
    expect(options.map((option) => option.textContent)).toEqual([
      '일반 결합숫돌',
      '플랩디스크',
      '컵휠',
      '다이아몬드 휠',
      '와이어 브러시',
      '기타',
      '모르겠음',
    ]);
  });

  it('고른 값을 그대로 넘긴다', () => {
    const onChange = vi.fn();
    render(
      <WheelTypeConfirm
        value="unknown"
        suggested="unknown"
        onChange={onChange}
      />,
    );

    fireEvent.change(select(), { target: { value: 'bonded_abrasive' } });

    expect(onChange).toHaveBeenCalledWith('bonded_abrasive');
  });
});

describe('WheelTypeConfirm — AI 제안과 적용 대상 안내', () => {
  it('AI 결과는 초기 제안값이라고 적는다', () => {
    render(
      <WheelTypeConfirm
        value="flap_disc"
        suggested="flap_disc"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        'AI 제안: 플랩디스크 — 사진으로 본 초기 제안값일 뿐입니다.',
      ),
    ).toBeInTheDocument();
  });

  it('일반 결합숫돌일 때만 규격 대조 대상이라고 적는다', () => {
    render(
      <WheelTypeConfirm
        value="bonded_abrasive"
        suggested="bonded_abrasive"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        '일반 결합숫돌로 직접 확인한 경우에만 이 앱이 규격을 대조합니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    'flap_disc',
    'cup_wheel',
    'diamond',
    'wire_brush',
    'other',
  ] as const)('%s 를 고르면 판정불가로 끝난다고 적는다', (type) => {
    render(
      <WheelTypeConfirm value={type} suggested={type} onChange={vi.fn()} />,
    );

    expect(
      screen.getByText(
        '이 앱이 판정하지 않는 종류입니다. 규격 대조는 판정불가로 끝납니다. 제조사 취급설명서를 확인하세요.',
      ),
    ).toBeInTheDocument();
  });

  it('모르겠음을 고르면 판정불가로 끝난다고 적는다', () => {
    render(
      <WheelTypeConfirm
        value="unknown"
        suggested="unknown"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        '종류를 확인하지 못하면 규격 대조가 판정불가로 끝납니다. 실물을 보고 고르세요.',
      ),
    ).toBeInTheDocument();
  });
});

describe('WheelTypeConfirm — AI 제안과 다른 선택', () => {
  it('차이를 숨기지 않고 두 값을 함께 보여준다', () => {
    render(
      <WheelTypeConfirm
        value="bonded_abrasive"
        suggested="flap_disc"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert').textContent).toBe(
      '⚠ AI 제안(플랩디스크)과 선택한 종류(일반 결합숫돌)가 다릅니다. 실물을 다시 보고 아래 직접 확인을 체크해야 진행할 수 있습니다.',
    );
  });

  it('같으면 차이 경고를 띄우지 않는다', () => {
    render(
      <WheelTypeConfirm
        value="flap_disc"
        suggested="flap_disc"
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('숫돌 종류 문구 — 5개 언어', () => {
  it.each(LOCALES)(
    '$label: 선택지와 안내 문구가 빠지거나 한국어로 남지 않았다',
    ({ code }) => {
      // 빠진 번역은 한국어로 되돌아가 뜬다. 한국어를 모르는 작업자에게는 빈 칸과 같다.
      const keys = [
        ...WHEEL_TYPE_OPTIONS.map((option) => option.labelKey),
        ...CONFIRM_KEYS,
      ];
      for (const key of keys) {
        const text = translate(code, key);
        expect(text.trim()).not.toBe('');
        if (code !== 'ko') expect(text).not.toMatch(/[가-힣]/);
      }
    },
  );
});
