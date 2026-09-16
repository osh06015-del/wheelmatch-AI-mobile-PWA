// 메인 화면 — 작업 선택과 작업 조건.
//
// 재료·건식/습식은 고르지 않아도 시작할 수 있어야 하고(모름으로 남는다),
// 고른 값은 작업을 누르는 순간 함께 넘어가야 한다.

import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import Home from './page';
import { useInspection } from '@/lib/state/inspection';

function store() {
  return renderHook(() => useInspection()).result;
}

beforeEach(() => {
  push.mockClear();
  const result = store();
  act(() => result.current.reset());
});

describe('메인 화면 — 작업 조건', () => {
  it('고르지 않고 시작하면 모름으로 남는다', async () => {
    const user = userEvent.setup();
    const result = store();
    render(<Home />);

    await user.click(screen.getByRole('button', { name: /절단/ }));

    expect(push).toHaveBeenCalledWith('/scan/grinder');
    expect(result.current.declaredPurpose).toBe('cutting');
    expect(result.current.workConditions).toEqual({
      material: 'unknown',
      cooling: 'unknown',
    });
  });

  it('고른 재료·건식/습식을 작업과 함께 넘긴다', async () => {
    const user = userEvent.setup();
    const result = store();
    render(<Home />);

    await user.selectOptions(screen.getByLabelText('재료'), '석재·콘크리트');
    await user.selectOptions(screen.getByLabelText('건식/습식'), '습식');
    await user.click(screen.getByRole('button', { name: /연삭/ }));

    expect(result.current.declaredPurpose).toBe('grinding');
    expect(result.current.workConditions).toEqual({
      material: 'stone_concrete',
      cooling: 'wet',
    });
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.workConditions') ?? 'null'),
    ).toEqual({ material: 'stone_concrete', cooling: 'wet' });
  });
});
