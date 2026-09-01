// OCR 결과 확인 화면 테스트.
//
// 여기가 "값을 지어내지 않는다"는 원칙이 사용자에게 드러나는 지점이다.
// 인식하지 못한 값은 0이나 빈칸으로 얼버무리지 않고, 직접 입력하라고 말해야 한다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GRINDER_FIELD_GUIDE } from '@/lib/guide/fieldGuide';
import {
  FieldConfirm,
  fromNumber,
  toNumberOrNull,
  toTextOrNull,
  type FieldSpec,
} from './FieldConfirm';

const fields: FieldSpec[] = [
  { key: 'model', label: '모델명', kind: 'text', value: 'GWS 750-125' },
  {
    key: 'noLoadRPM',
    label: '무부하 회전속도',
    unit: 'rpm',
    kind: 'number',
    value: '11000',
  },
];

describe('값 변환 헬퍼', () => {
  it('빈 입력은 null로 남긴다 — 0으로 채우지 않는다', () => {
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull('   ')).toBeNull();
    expect(toTextOrNull('')).toBeNull();
  });

  it('숫자가 아니거나 0 이하면 null이다', () => {
    expect(toNumberOrNull('abc')).toBeNull();
    expect(toNumberOrNull('0')).toBeNull();
    expect(toNumberOrNull('-100')).toBeNull();
  });

  it('정상 값은 그대로 숫자가 된다', () => {
    expect(toNumberOrNull('11000')).toBe(11000);
    expect(toNumberOrNull(' 1.6 ')).toBe(1.6);
  });

  it('null은 빈 문자열로 표시한다', () => {
    expect(fromNumber(null)).toBe('');
    expect(fromNumber(125)).toBe('125');
  });
});

describe('FieldConfirm — 신뢰도 안내', () => {
  it('신뢰도가 낮으면 재촬영·직접 입력을 안내한다', () => {
    render(
      <FieldConfirm
        title="읽어낸 값을 확인하세요"
        fields={fields}
        confidence="low"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/인식 신뢰도 낮음/)).toBeInTheDocument();
    expect(screen.getByText(/재촬영하거나 직접 입력/)).toBeInTheDocument();
  });

  it('신뢰도가 높으면 경고를 띄우지 않는다', () => {
    render(
      <FieldConfirm
        title="읽어낸 값을 확인하세요"
        fields={fields}
        confidence="high"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/인식 신뢰도 높음/)).toBeInTheDocument();
    expect(screen.queryByText(/신뢰도 낮음/)).not.toBeInTheDocument();
  });
});

describe('FieldConfirm — 작업자용 설명', () => {
  it('항목마다 무엇인지 설명을 함께 보여준다', () => {
    render(
      <FieldConfirm
        title="확인"
        fields={[
          {
            key: 'noLoadRPM',
            label: '무부하 회전속도',
            unit: 'rpm',
            kind: 'number',
            value: '11000',
            guide: GRINDER_FIELD_GUIDE.noLoadRPM,
          },
        ]}
        confidence="high"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    // 용어만 던져놓으면 처음 쓰는 사람은 무엇을 확인해야 할지 모른다.
    expect(
      screen.getByText(/숫돌이 이 속도를 견뎌야 합니다/),
    ).toBeInTheDocument();
  });

  it('값을 읽은 항목에는 위치 안내를 띄우지 않는다', () => {
    render(
      <FieldConfirm
        title="확인"
        fields={[
          {
            key: 'noLoadRPM',
            label: '무부하 회전속도',
            kind: 'number',
            value: '11000',
            guide: GRINDER_FIELD_GUIDE.noLoadRPM,
          },
        ]}
        confidence="high"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    // 이미 값이 있으면 화면만 길어진다.
    expect(screen.queryByText(/no load speed/)).not.toBeInTheDocument();
  });

  it('값을 읽지 못한 항목에만 어디를 봐야 하는지 알려준다', () => {
    render(
      <FieldConfirm
        title="확인"
        fields={[
          {
            key: 'noLoadRPM',
            label: '무부하 회전속도',
            kind: 'number',
            value: '',
            guide: GRINDER_FIELD_GUIDE.noLoadRPM,
          },
        ]}
        confidence="low"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    // 직접 입력해야 하는 순간에 정확히 필요한 정보다.
    expect(screen.getByText(/no load speed/)).toBeInTheDocument();
  });

  it('설명이 없는 항목도 그대로 동작한다', () => {
    render(
      <FieldConfirm
        title="확인"
        fields={[{ key: 'model', label: '모델명', kind: 'text', value: '' }]}
        confidence="high"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('모델명')).toBeInTheDocument();
  });
});

describe('FieldConfirm — 입력', () => {
  it('인식하지 못한 값에는 직접 입력하라는 안내가 보인다', () => {
    render(
      <FieldConfirm
        title="확인"
        fields={[{ ...fields[1], value: '' }]}
        confidence="medium"
        rawText=""
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByPlaceholderText('인식하지 못함 — 직접 입력'),
    ).toBeInTheDocument();
  });

  it('값을 고치면 해당 key로 onChange를 호출한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldConfirm
        title="확인"
        fields={[{ ...fields[1], value: '' }]}
        confidence="medium"
        rawText=""
        onChange={onChange}
      />,
    );

    await user.type(screen.getByRole('spinbutton'), '9');

    expect(onChange).toHaveBeenCalledWith('noLoadRPM', '9');
  });

  it('원문이 없으면 "원문 보기" 버튼을 숨긴다', () => {
    render(
      <FieldConfirm
        title="확인"
        fields={fields}
        confidence="high"
        rawText="   "
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/원문 보기/)).not.toBeInTheDocument();
  });
});
