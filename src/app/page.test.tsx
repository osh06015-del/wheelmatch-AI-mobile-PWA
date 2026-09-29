// 메인 화면 — 작업 선택과 작업 조건.
//
// 재료·건식/습식은 고르지 않아도 시작할 수 있어야 하고(모름으로 남는다),
// 고른 값은 작업을 누르는 순간 함께 넘어가야 한다.

import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, formRemove } = vi.hoisted(() => ({
  push: vi.fn(),
  formRemove: vi.fn(),
}));

vi.mock('@/lib/draft/draftStore', () => ({
  formDraftStore: { remove: formRemove },
}));

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
  formRemove.mockReset().mockResolvedValue(true);
  const result = store();
  act(() => result.current.reset());
});

describe('메인 화면 — 새 점검 준비 실패와 다시 시도', () => {
  const PREP_FAILED =
    '이전 점검의 입력값을 정리하지 못해 새 점검을 시작하지 않았습니다. 이전 입력이 새 점검에 섞이지 않게 하기 위해서입니다. 다시 시도하세요.';

  it('입력 draft 삭제가 실패하면 시작을 막고 상태를 바꾸지 않으며 전용 안내와 다시 시도를 보인다', async () => {
    formRemove.mockResolvedValue(false);
    const result = store();
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole('button', { name: /연삭/ }));

    expect(push).not.toHaveBeenCalled();
    // 준비가 끝나기 전에는 작업을 확정하지 않는다.
    expect(result.current.declaredPurpose).toBeNull();
    expect(result.current.startedAt).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(PREP_FAILED);
    expect(
      screen.getByRole('button', { name: '연삭 작업으로 다시 시도' }),
    ).toBeEnabled();
    // 진행 상태 삭제 문구(이어하기 대화상자용)를 쓰지 않는다.
    expect(
      screen.queryByText('진행 상태를 삭제하지 못했습니다. 다시 시도하세요.'),
    ).not.toBeInTheDocument();
  });

  it('다시 시도가 성공하면 처음 고른 작업(연삭)으로 시작한다', async () => {
    formRemove.mockResolvedValue(false);
    const result = store();
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole('button', { name: /연삭/ }));

    formRemove.mockResolvedValue(true);
    await user.click(
      screen.getByRole('button', { name: '연삭 작업으로 다시 시도' }),
    );

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/scan/grinder');
    expect(result.current.declaredPurpose).toBe('grinding');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('준비 중 연속 클릭은 한 번만 실행한다 — 작업 버튼·다시 시도 모두', async () => {
    const resolvers: Array<(removed: boolean) => void> = [];
    formRemove.mockImplementation(
      () => new Promise<boolean>((resolve) => resolvers.push(resolve)),
    );
    render(<Home />);
    const cutting = screen.getByRole('button', { name: /자르기/ });
    // 다음 렌더 전에 같은 틱에서 두 번 누른 경우다.
    act(() => {
      cutting.click();
      cutting.click();
    });
    expect(formRemove).toHaveBeenCalledTimes(2); // grinder + wheel, 한 번분
    await act(async () => {
      resolvers.splice(0).forEach((resolve) => resolve(false));
    });

    const retry = screen.getByRole('button', {
      name: '절단 작업으로 다시 시도',
    });
    act(() => {
      retry.click();
      retry.click();
    });
    expect(formRemove).toHaveBeenCalledTimes(4);
    // 다시 시도하는 동안에는 안내를 거두고 작업 버튼을 잠근다.
    expect(retry).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /자르기/ })).toBeDisabled();
    await act(async () => {
      resolvers.splice(0).forEach((resolve) => resolve(true));
    });
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe('메인 화면 — 작업 조건', () => {
  it('홈 방문만으로 입력 draft를 지우지 않고 새 작업을 고른 뒤 정리한다', async () => {
    const user = userEvent.setup();
    render(<Home />);
    expect(formRemove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /절단/ }));
    expect(formRemove).toHaveBeenCalledWith('grinder');
    expect(formRemove).toHaveBeenCalledWith('wheel');
    expect(push).toHaveBeenCalledWith('/scan/grinder');
  });

  it('이전 입력 삭제가 끝나기 전에는 촬영 화면을 열지 않는다', async () => {
    const resolvers: Array<(removed: boolean) => void> = [];
    formRemove.mockImplementation(
      () => new Promise<boolean>((resolve) => resolvers.push(resolve)),
    );
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole('button', { name: /절단/ }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /절단/ })).toBeDisabled();
    await act(async () => {
      resolvers.forEach((resolve) => resolve(true));
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('이전 입력 삭제 실패 시 새 점검에 섞지 않고 재시도할 수 있다', async () => {
    formRemove.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole('button', { name: /절단/ }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /자르기/ })).toBeEnabled();
    formRemove.mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: /자르기/ }));
    expect(push).toHaveBeenCalledWith('/scan/grinder');
  });
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
