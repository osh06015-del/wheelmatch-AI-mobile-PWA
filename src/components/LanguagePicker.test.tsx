// 언어 전환이 실제로 화면을 바꾸는지 확인한다.
//
// 문구 파일이 다 있어도 화면이 갈아끼우지 않으면 소용이 없다.
// 언어 저장소는 모듈 단위라 테스트마다 쓸 언어를 직접 고른다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LanguagePicker } from './LanguagePicker';
import { ResultCard } from './ResultCard';
import type { MatchResult } from '@/lib/rules/types';

const INCOMPATIBLE: MatchResult = {
  verdict: 'INCOMPATIBLE',
  checks: [
    {
      rule: 'RPM 안전',
      passed: false,
      reason: '숫돌이 더 느립니다.',
      grinderValue: '11000rpm',
      wheelValue: '8500rpm',
    },
  ],
  timestamp: '2026-09-01T00:00:00.000Z',
};

async function choose(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: label }));
}

describe('LanguagePicker', () => {
  it('언어를 그 언어로 적는다', async () => {
    render(<LanguagePicker />);
    await choose('한국어');

    // 자기 언어를 못 읽는 상태에서도 글자 모양으로 찾을 수 있어야 한다.
    for (const label of ['한국어', 'English', 'Tiếng Việt', '中文']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('고른 언어로 판정 문구가 바뀐다', async () => {
    render(
      <>
        <LanguagePicker />
        <ResultCard result={INCOMPATIBLE} />
      </>,
    );

    await choose('한국어');
    expect(screen.getByText('부적합')).toBeInTheDocument();

    await choose('English');
    expect(screen.getByText('SPECS DO NOT MATCH')).toBeInTheDocument();
    expect(screen.queryByText('부적합')).not.toBeInTheDocument();

    await choose('Tiếng Việt');
    expect(screen.getByText('THÔNG SỐ KHÔNG PHÙ HỢP')).toBeInTheDocument();
  });

  it('규칙 이름도 함께 바뀐다', async () => {
    render(
      <>
        <LanguagePicker />
        <ResultCard result={INCOMPATIBLE} />
      </>,
    );

    await choose('English');
    expect(screen.getByText('Speed rating')).toBeInTheDocument();
    expect(screen.queryByText('RPM 안전')).not.toBeInTheDocument();
  });

  it('한국어가 아니면 검수 전이라고 알린다', async () => {
    // 번역을 그대로 믿고 작업하면 안 된다는 것을 화면에서 말해야 한다.
    render(<LanguagePicker />);

    await choose('한국어');
    expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();

    await choose('Indonesia');
    expect(screen.getByText(/belum diperiksa/)).toBeInTheDocument();
  });

  it('고른 언어를 저장해 다음에도 쓴다', async () => {
    render(<LanguagePicker />);
    await choose('中文');

    expect(localStorage.getItem('wheelmatch.locale')).toBe('zh');
  });

  it('현재 언어를 눌린 상태로 표시한다', async () => {
    render(<LanguagePicker />);
    await choose('English');

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '한국어' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
