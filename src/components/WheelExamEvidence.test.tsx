// 다각도 외관 확인 근거 카드 테스트.
//
// 이 카드가 "정상"·"안전"·"통과"로 읽히면 기능 전체가 위험해진다. 그래서
// 문구를 문자열 그대로 고정한다 — 조용히 바뀌는 것을 막기 위해서다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { WheelExamEvidence } from './WheelExamEvidence';
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
    promptVersion: '2026.09.16-r1',
    analyzedAt: '2026-09-16T03:04:00.000Z',
    ...overrides,
  };
}

describe('WheelExamEvidence — 상태 표시', () => {
  it('찾지 못한 경우를 정상·안전·통과로 적지 않는다', () => {
    render(<WheelExamEvidence exam={exam()} />);

    expect(
      screen.getByText('뚜렷한 이상 미탐지 — 직접 확인 필요'),
    ).toBeInTheDocument();
    // 승인으로 읽히는 말이 한 군데도 없어야 한다.
    expect(
      screen.queryByText(/안전합니다|사용해도 됩니다|정상입니다|검사 통과/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('손상 없음')).not.toBeInTheDocument();
    expect(screen.queryByText('이상 없음')).not.toBeInTheDocument();
  });

  it('의심되는 경우 사진 위치·유형·이유를 함께 적는다', () => {
    render(
      <WheelExamEvidence
        exam={exam({
          status: 'suspected',
          findings: [
            {
              kind: 'edge_break',
              view: 'edge',
              reason: '가장자리 2시 방향에 약 5mm 조각이 떨어진 자국.',
              confidence: 'medium',
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByText('이상 징후 의심 — 실물을 직접 확인하세요'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('가장자리 파손 의심 · 가장자리'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('가장자리 2시 방향에 약 5mm 조각이 떨어진 자국.'),
    ).toBeInTheDocument();
    expect(screen.getByText('AI 확신 정도: 보통')).toBeInTheDocument();
  });

  it('판단할 수 없는 경우 어느 사진을 판독하지 못했는지 적는다', () => {
    render(
      <WheelExamEvidence
        exam={exam({
          status: 'unassessable',
          photoQuality: [
            { view: 'front', issues: [], readable: true },
            { view: 'back', issues: ['blur'], readable: false },
            { view: 'edge', issues: [], readable: true },
            { view: 'bore', issues: ['darkness'], readable: false },
          ],
        })}
      />,
    );

    expect(
      screen.getByText('사진으로 판단 불가 — 직접 확인 필요'),
    ).toBeInTheDocument();
    expect(screen.getByText('판독하지 못한 사진')).toBeInTheDocument();
    expect(screen.getByText('뒷면 전체 — 흐림')).toBeInTheDocument();
    expect(screen.getByText('중심구멍·장착부 — 어두움')).toBeInTheDocument();
  });

  it('실행되지 않은 경우를 결과가 아니라 미실행으로 적는다', () => {
    render(
      <WheelExamEvidence
        notRun={{
          reason: 'network_error',
          acknowledgedAt: '2026-09-16T03:05:00.000Z',
        }}
      />,
    );

    expect(
      screen.getByText('AI 확인 미실행 — 작업자 직접점검으로 진행함'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('서버에 닿지 못해 AI가 사진을 확인하지 못했습니다.'),
    ).toBeInTheDocument();
    // 실패를 "찾지 못했다"·"판단할 수 없다"로 바꾸지 않는다.
    expect(
      screen.queryByText('뚜렷한 이상 미탐지 — 직접 확인 필요'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('사진으로 판단 불가 — 직접 확인 필요'),
    ).not.toBeInTheDocument();
  });

  it('오프라인과 원인 불명을 서로 다른 이유로 적는다', () => {
    const { unmount } = render(
      <WheelExamEvidence
        notRun={{ reason: 'offline', acknowledgedAt: '2026-09-16T03:05:00Z' }}
      />,
    );
    expect(
      screen.getByText(
        '기기가 오프라인이어서 AI가 사진을 확인하지 못했습니다.',
      ),
    ).toBeInTheDocument();
    unmount();

    render(
      <WheelExamEvidence
        notRun={{
          reason: 'user_manual_continue',
          acknowledgedAt: '2026-09-16T03:05:00Z',
        }}
      />,
    );
    expect(
      screen.getByText(
        'AI가 사진을 확인하지 못했습니다. 원인은 기록되지 않았습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('AI가 본 것이 작업자 직접 확인 항목이 아니라고 적는다', () => {
    // 이 줄이 없으면 카드 하나가 "확인됨" 항목처럼 읽힌다.
    render(<WheelExamEvidence exam={exam()} />);

    expect(
      screen.getByText(
        'AI가 사진에서 본 것입니다. 작업자가 직접 확인하는 항목에는 들어가지 않습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('어느 모델이 언제 어느 지시문으로 보았는지 남긴다', () => {
    render(<WheelExamEvidence exam={exam()} />);

    expect(
      screen.getByText(
        /확인 2026-09-16 .*· 모델 claude-sonnet-5 · 지시문 2026\.09\.16-r1/,
      ),
    ).toBeInTheDocument();
  });
});

describe('WheelExamEvidence — 구기록과 사진', () => {
  it('확인 기록이 없는 구기록에는 아무것도 그리지 않는다', () => {
    const { container } = render(<WheelExamEvidence />);
    expect(container).toBeEmptyDOMElement();
  });

  it('사진이 저장되지 않은 기록도 오류 없이 열린다', () => {
    render(<WheelExamEvidence exam={exam()} />);

    expect(
      screen.getByText('이 기록에는 다각도 사진이 저장되어 있지 않습니다.'),
    ).toBeInTheDocument();
  });

  it('일부 사진만 있는 기록은 있는 것만 보여준다', () => {
    render(
      <WheelExamEvidence
        exam={exam()}
        photos={{ front: PHOTO, back: null, edge: PHOTO, bore: undefined }}
      />,
    );

    expect(screen.getByAltText('앞면(라벨)')).toBeInTheDocument();
    expect(screen.getByAltText('가장자리')).toBeInTheDocument();
    expect(screen.queryByAltText('뒷면 전체')).not.toBeInTheDocument();
    expect(screen.queryByAltText('중심구멍·장착부')).not.toBeInTheDocument();
    expect(
      screen.queryByText('이 기록에는 다각도 사진이 저장되어 있지 않습니다.'),
    ).not.toBeInTheDocument();
  });

  it('사진을 눌러 크게 볼 수 있다', async () => {
    const user = userEvent.setup();
    render(
      <WheelExamEvidence
        exam={exam()}
        photos={{ front: PHOTO, back: PHOTO, edge: PHOTO, bore: PHOTO }}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: '중심구멍·장착부 크게 보기' }),
    );
    expect(
      screen.getByRole('dialog', { name: '중심구멍·장착부' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '크게 보기 닫기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
