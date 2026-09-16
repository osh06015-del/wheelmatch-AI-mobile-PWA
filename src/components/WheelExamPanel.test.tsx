// 다각도 외관 확인 화면 테스트.
//
// 이 화면이 "손상 없음"으로 읽히면 기능 전체가 위험해진다. 그래서 여기서는
// 문구를 문자열 그대로 고정한다 — 조용히 바뀌는 것을 막기 위해서다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WheelExamPanel } from './WheelExamPanel';
import type { WheelExamResult } from '@/lib/rules/types';

const PHOTO = new Blob(['x'], { type: 'image/jpeg' });

function exam(overrides: Partial<WheelExamResult> = {}): WheelExamResult {
  return {
    status: 'not_observed',
    findings: [],
    photoQuality: (['front', 'back', 'edge', 'bore'] as const).map((view) => ({
      view,
      issues: [],
      readable: true,
    })),
    model: 'claude-sonnet-5',
    promptVersion: 'test',
    analyzedAt: '2026-09-16T03:00:00.000Z',
    ...overrides,
  };
}

function renderPanel(
  props: Partial<React.ComponentProps<typeof WheelExamPanel>> = {},
) {
  return render(
    <WheelExamPanel
      photos={{ back: null, edge: null, bore: null }}
      onPick={vi.fn()}
      onAnalyze={vi.fn()}
      analyzing={false}
      exam={null}
      failureText={null}
      acknowledged={false}
      onAcknowledge={vi.fn()}
      manualContinue={false}
      onManualContinue={vi.fn()}
      {...props}
    />,
  );
}

describe('WheelExamPanel — 경계 문구', () => {
  it('결과가 없을 때도 AI가 무엇을 하지 않는지 적는다', () => {
    renderPanel();

    expect(
      screen.getByText(
        'AI는 사진에서 보이는 이상 징후만 찾습니다. 손상 없음이나 사용 안전을 확인하지 않습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('찾지 못한 경우에도 실물을 직접 확인하라고 적는다', () => {
    renderPanel({ exam: exam() });

    expect(
      screen.getByText(
        '뚜렷한 이상을 찾지 못했습니다. 실제 숫돌의 앞·뒤·가장자리와 중심구멍을 직접 확인하세요.',
      ),
    ).toBeInTheDocument();
  });

  it('어떤 결과에서도 승인 문구를 쓰지 않는다', () => {
    renderPanel({ exam: exam() });

    // 이 화면이 승인처럼 읽히면 작업자의 다른 확인 절차가 사라진다.
    // "손상 없음이나 사용 안전을 확인하지 않습니다"처럼 **부정문 안에서**
    // 그 낱말이 나오는 것은 경계 문구다. 상태를 단정하는 문장이 없어야 한다.
    expect(screen.queryByText('손상 없음')).not.toBeInTheDocument();
    expect(screen.queryByText('이상 없음')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /안전합니다|사용해도 됩니다|정상입니다|검사 통과/,
    );
  });

  it('미세균열은 사진으로 확인할 수 없다고 항상 적는다', () => {
    renderPanel({ exam: exam({ status: 'suspected' }) });

    expect(
      screen.getByText(/미세균열과 내부 균열은 사진으로 확인할 수 없습니다/),
    ).toBeInTheDocument();
  });
});

describe('WheelExamPanel — 사진 넣기', () => {
  it('세 자리를 모두 보여주고 아직 없는 사진을 알린다', () => {
    renderPanel();

    expect(screen.getByText('뒷면 전체')).toBeInTheDocument();
    expect(screen.getByText('가장자리')).toBeInTheDocument();
    expect(screen.getByText('중심구멍·장착부')).toBeInTheDocument();
    expect(screen.getAllByText('아직 없음')).toHaveLength(3);
  });

  it('사진이 다 차기 전에는 확인 버튼을 막는다', () => {
    renderPanel({ photos: { back: PHOTO, edge: PHOTO, bore: null } });

    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeDisabled();
  });

  it('세 장이 모두 차면 확인 버튼이 열린다', () => {
    renderPanel({ photos: { back: PHOTO, edge: PHOTO, bore: PHOTO } });

    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeEnabled();
    expect(screen.getAllByText('사진 있음')).toHaveLength(3);
  });
});

describe('WheelExamPanel — 이상 징후', () => {
  const suspected = exam({
    status: 'suspected',
    findings: [
      {
        kind: 'chip',
        view: 'edge',
        reason: '가장자리 4시 방향에 약 5mm 조각이 떨어졌습니다.',
        confidence: 'high',
      },
    ],
  });

  it('종류·부위·이유·확신 정도를 함께 보여준다', () => {
    renderPanel({ exam: suspected });

    expect(
      screen.getByText('깨짐·조각 떨어짐 의심 · 가장자리'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('가장자리 4시 방향에 약 5mm 조각이 떨어졌습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('AI 확신 정도: 높음')).toBeInTheDocument();
  });

  it('확인 체크 전에는 막혔다고 알린다', () => {
    renderPanel({ exam: suspected });

    expect(
      screen.getByText('이상 징후를 확인한 뒤에 다음으로 넘어갈 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('확인을 누르면 상위로 알린다', async () => {
    const onAcknowledge = vi.fn();
    const user = userEvent.setup();
    renderPanel({ exam: suspected, onAcknowledge });

    await user.click(
      screen.getByRole('checkbox', {
        name: /표시된 위치를 실물에서 직접 확인했습니다/,
      }),
    );

    expect(onAcknowledge).toHaveBeenCalledWith(true);
  });
});

describe('WheelExamPanel — 판독할 수 없는 사진', () => {
  it('어느 사진을 왜 다시 찍어야 하는지 적는다', () => {
    renderPanel({
      exam: exam({
        status: 'unassessable',
        photoQuality: [
          { view: 'front', issues: [], readable: true },
          { view: 'back', issues: ['blur', 'glare'], readable: false },
          { view: 'edge', issues: [], readable: true },
          { view: 'bore', issues: [], readable: true },
        ],
      }),
    });

    expect(
      screen.getByText(
        '판독할 수 없는 사진이 있습니다. 아래 사진을 다시 찍으세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('뒷면 전체 — 흐림, 반사·번쩍임'),
    ).toBeInTheDocument();
  });

  it('판독은 됐지만 품질 문제만 있는 사진은 다시 찍게 하지 않는다', () => {
    renderPanel({
      exam: exam({
        photoQuality: [
          { view: 'front', issues: [], readable: true },
          { view: 'back', issues: ['glare'], readable: true },
          { view: 'edge', issues: [], readable: true },
          { view: 'bore', issues: [], readable: true },
        ],
      }),
    });

    expect(
      screen.queryByText(/판독할 수 없는 사진이 있습니다/),
    ).not.toBeInTheDocument();
  });
});

describe('WheelExamPanel — 접근성', () => {
  it('제목과 연결된 영역이고, 조작 요소에 이름이 있다', () => {
    renderPanel({ photos: { back: PHOTO, edge: PHOTO, bore: PHOTO } });

    expect(
      screen.getByRole('region', { name: '다각도 외관 확인' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeInTheDocument();
    // 자리마다 촬영·갤러리 두 개, 사진이 있으면 "다시 찍기"로 바뀐다.
    expect(screen.getAllByText('갤러리')).toHaveLength(3);
    expect(screen.getByText('뒷면 전체 다시 찍기')).toBeInTheDocument();
  });

  it('실패 문구는 alert으로 알린다', () => {
    renderPanel({ failureText: '테스트 실패 문구' });

    expect(screen.getByRole('alert')).toHaveTextContent('테스트 실패 문구');
  });
});

describe('WheelExamPanel — 촬영 흐름', () => {
  it('세 장 중 몇 장을 넣었는지 알려준다', () => {
    const { unmount } = renderPanel();
    expect(screen.getByText('추가 사진 0 / 3장 준비됨')).toBeInTheDocument();
    unmount();

    renderPanel({ photos: { back: PHOTO, edge: null, bore: PHOTO } });
    expect(screen.getByText('추가 사진 2 / 3장 준비됨')).toBeInTheDocument();
  });

  it('넣은 사진을 그 자리에서 보여주고 크게 볼 수 있다', async () => {
    const user = userEvent.setup();
    renderPanel({ photos: { back: PHOTO, edge: null, bore: null } });

    expect(screen.getByAltText('뒷면 전체')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: '뒷면 전체 크게 보기' }),
    );
    expect(
      screen.getByRole('dialog', { name: '뒷면 전체' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '크게 보기 닫기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('자리마다 이름이 다른 촬영·갤러리 버튼을 둔다 — 한 장만 다시 넣을 수 있다', () => {
    renderPanel({ photos: { back: PHOTO, edge: null, bore: null } });

    for (const view of ['뒷면 전체', '가장자리', '중심구멍·장착부']) {
      expect(screen.getByLabelText(`${view} 촬영`)).toBeInTheDocument();
      expect(
        screen.getByLabelText(`${view} 갤러리에서 고르기`),
      ).toBeInTheDocument();
    }
  });

  it('사진을 바꾸면 앞선 확인이 지워진다고 미리 알린다', () => {
    renderPanel();

    expect(
      screen.getByText(
        '사진을 바꾸면 그 사진으로 낸 확인 결과와 확인 표시가 지워집니다. 다시 확인해야 합니다.',
      ),
    ).toBeInTheDocument();
  });
});

describe('WheelExamPanel — AI 확인 실패', () => {
  it('실패하면 직접점검으로 진행하겠다는 확인을 받는다', async () => {
    const user = userEvent.setup();
    const onManualContinue = vi.fn();
    renderPanel({ failureText: '테스트 실패 문구', onManualContinue });

    const box = screen.getByRole('checkbox', {
      name: 'AI 확인 없이 작업자 직접점검으로 진행합니다.',
    });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(onManualContinue).toHaveBeenCalledWith(true);

    expect(
      screen.getByText(
        '숫돌의 앞·뒤·가장자리와 중심구멍을 작업자가 직접 보고 확인하세요. AI는 아무것도 확인해주지 않았습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('실패를 찾지 못했다·판단할 수 없다로 바꾸지 않는다', () => {
    renderPanel({ failureText: '테스트 실패 문구', exam: null });

    expect(
      screen.queryByText(/뚜렷한 이상을 찾지 못했습니다/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/사진으로는 판단할 수 없습니다/),
    ).not.toBeInTheDocument();
  });

  it('실패하지 않았으면 직접점검 확인을 묻지 않는다', () => {
    renderPanel({ photos: { back: PHOTO, edge: PHOTO, bore: PHOTO } });

    expect(
      screen.queryByRole('checkbox', {
        name: 'AI 확인 없이 작업자 직접점검으로 진행합니다.',
      }),
    ).not.toBeInTheDocument();
  });
});

describe('WheelExamPanel — 사진 상태 경고', () => {
  const warned = {
    decodeFailed: false,
    warnings: ['too_dark' as const],
    usedDespiteWarning: false,
    attempts: 1,
  };

  it('경고가 붙은 자리에 경고를 보이고, 그래도 사용하기 전에는 확인하기를 막는다', async () => {
    const user = userEvent.setup();
    const onUseAnyway = vi.fn();
    renderPanel({
      photos: { back: PHOTO, edge: PHOTO, bore: PHOTO },
      reviews: { back: null, edge: warned, bore: null },
      onUseAnyway,
    });

    expect(
      screen.getByRole('region', { name: '가장자리 사진 상태 확인' }),
    ).toHaveTextContent('사진이 너무 어둡습니다.');
    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: '가장자리 사진을 그래도 사용' }),
    );
    expect(onUseAnyway).toHaveBeenCalledWith('edge');
  });

  it('그래도 사용을 고른 자리는 확인하기를 막지 않는다', () => {
    renderPanel({
      photos: { back: PHOTO, edge: PHOTO, bore: PHOTO },
      reviews: {
        back: null,
        edge: { ...warned, usedDespiteWarning: true },
        bore: null,
      },
    });

    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeEnabled();
  });

  it('열지 못한 자리는 비어 있고 그래도 사용할 수 없다', () => {
    renderPanel({
      photos: { back: PHOTO, edge: null, bore: PHOTO },
      reviews: {
        back: null,
        edge: { ...warned, decodeFailed: true, warnings: [] },
        bore: null,
      },
    });

    expect(
      screen.getByText(/가장자리 — 이 사진 형식을 읽지 못했습니다/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /그래도 사용/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '사진 4장으로 확인하기' }),
    ).toBeDisabled();
  });
});
