// 시험운전 화면 테스트.
//
// 실제 60초·180초를 기다리지 않는다. 진행 상태를 직접 만들어 넘긴다 —
// 컴포넌트가 시각을 인자로 받은 종료시각에서 계산하기 때문에 가능하다.
// 운영 코드의 시간은 줄이지 않는다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TrialRunPanel, TrialRunStopNotice } from './TrialRunPanel';
import type { TrialRunProgress } from '@/lib/safety/trialRun';

const NOW = new Date('2026-09-12T09:00:00.000Z');

/** 남은 초를 지정해 진행 상태를 만든다. */
function progress(
  leftSeconds: number,
  wheelReplaced = false,
): TrialRunProgress {
  return {
    wheelReplaced,
    requiredSeconds: wheelReplaced ? 180 : 60,
    startedAt: new Date(
      NOW.getTime() - ((wheelReplaced ? 180 : 60) - leftSeconds) * 1000,
    ).toISOString(),
    endsAt: new Date(NOW.getTime() + leftSeconds * 1000).toISOString(),
  };
}

function noop() {
  /* 테스트에서 쓰지 않는 콜백 */
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TrialRunPanel — 시작 전', () => {
  it('숫돌 교체 여부를 묻고 두 시간을 각각 보여준다', () => {
    render(
      <TrialRunPanel
        progress={null}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getByText('숫돌을 방금 교체했습니까?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /180초/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /60초/ })).toBeInTheDocument();
  });

  it('법령 근거와 위험구역 안내를 항상 표시한다', () => {
    render(
      <TrialRunPanel
        progress={null}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getByText(/제122조 ②/)).toBeInTheDocument();
    expect(
      screen.getByText(/법정 절차를 대신하지 않습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/회전 방향 위험구역/);
  });

  it('교체했다고 답하면 3분, 아니면 1분으로 시작한다', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <TrialRunPanel
        progress={null}
        findings={[]}
        onStart={onStart}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    await user.click(screen.getByRole('button', { name: /180초/ }));
    expect(onStart).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: /60초/ }));
    expect(onStart).toHaveBeenCalledWith(false);
  });
});

describe('TrialRunPanel — 진행 중', () => {
  it('남은 시간이 끝나기 전에는 어느 답도 누를 수 없다', () => {
    vi.useFakeTimers({ now: NOW });
    render(
      <TrialRunPanel
        progress={progress(45)}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getByText('00:45')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /이상 없음 확인/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /이상 있음/ })).toBeDisabled();
    expect(screen.getByText(/요구 시간을 채운 뒤에/)).toBeInTheDocument();
  });

  it('이상 항목 체크박스도 시간이 끝나기 전에는 잠겨 있다', () => {
    vi.useFakeTimers({ now: NOW });
    render(
      <TrialRunPanel
        progress={progress(10, true)}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeDisabled();
    }
  });

  it('어느 시험운전인지 화면에 남는다', () => {
    vi.useFakeTimers({ now: NOW });
    render(
      <TrialRunPanel
        progress={progress(120, true)}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getByText('숫돌 교체 후 시험운전')).toBeInTheDocument();
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });
});

describe('TrialRunPanel — 시간이 끝난 뒤', () => {
  it('다섯 가지 확인 항목을 보여준다', () => {
    vi.useFakeTimers({ now: NOW });
    render(
      <TrialRunPanel
        progress={progress(0)}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.getByText('비정상 진동')).toBeInTheDocument();
    expect(screen.getByText('비정상 소음')).toBeInTheDocument();
    expect(screen.getByText('숫돌 흔들림')).toBeInTheDocument();
    expect(screen.getByText('숫돌 파손·이탈 징후')).toBeInTheDocument();
    expect(screen.getByText('장비 이상')).toBeInTheDocument();
  });

  it('이상 없음과 이상 있음을 모두 누를 수 있다', () => {
    vi.useFakeTimers({ now: NOW });
    render(
      <TrialRunPanel
        progress={progress(0)}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(
      screen.getByRole('button', { name: /이상 없음 확인/ }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: /이상 있음/ })).toBeEnabled();
  });

  it('이상 항목을 하나라도 고르면 이상 없음을 누를 수 없다', () => {
    // 서로 어긋나는 기록을 만들지 않는다.
    vi.useFakeTimers({ now: NOW });
    render(
      <TrialRunPanel
        progress={progress(0)}
        findings={['noise']}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={noop}
      />,
    );

    expect(
      screen.getByRole('button', { name: /이상 없음 확인/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /이상 있음/ })).toBeEnabled();
  });

  it('작업자가 누른 결과를 그대로 올린다', async () => {
    // 이 테스트만 실제 시계를 쓴다. 가짜 타이머와 userEvent를 함께 돌리면
    // 서로 기다리다 멈춘다. 종료시각을 이미 지난 값으로 주면 같은 상태가 된다.
    const ended: TrialRunProgress = {
      wheelReplaced: false,
      requiredSeconds: 60,
      startedAt: new Date(Date.now() - 65_000).toISOString(),
      endsAt: new Date(Date.now() - 5_000).toISOString(),
    };
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const onToggleFinding = vi.fn();
    render(
      <TrialRunPanel
        progress={ended}
        findings={[]}
        onStart={noop}
        onToggleFinding={onToggleFinding}
        onResolve={onResolve}
      />,
    );

    await user.click(screen.getAllByRole('checkbox')[2]);
    expect(onToggleFinding).toHaveBeenCalledWith('wobble');

    await user.click(screen.getByRole('button', { name: /이상 있음/ }));
    expect(onResolve).toHaveBeenCalledWith('abnormal');
  });

  it('AI가 결과를 대신 고르지 않는다', () => {
    vi.useFakeTimers({ now: NOW });
    const onResolve = vi.fn();
    render(
      <TrialRunPanel
        progress={progress(0)}
        findings={[]}
        onStart={noop}
        onToggleFinding={noop}
        onResolve={onResolve}
      />,
    );

    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toBeChecked();
    }
    expect(onResolve).not.toHaveBeenCalled();
  });
});

describe('TrialRunStopNotice', () => {
  it('작업 중지와 조치를 함께 알린다', () => {
    render(<TrialRunStopNotice />);

    expect(screen.getByText('작업하지 마십시오')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/전원을 차단/);
  });
});
