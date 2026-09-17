// 판정 근거 화면 테스트.
//
// 이 컴포넌트가 지켜야 할 것은 세 가지다.
//   1. 기본은 접혀 있고, 눌러야 펼쳐진다 (재촬영 없이 조회만 하는 기능이다)
//   2. 구기록(OCR 원본이 없는 기록)의 없는 값은 '미기록'으로 적는다
//   3. 시스템 프롬프트·API 원문·비밀값이 없고, 「적합」을 안전 승인으로,
//      「손상 없음」을 사실로 바꿔 말하지 않는다

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { EvidencePanel } from './EvidencePanel';
import { matchSpecs } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import { BONDED_ABRASIVE_PROFILE } from '@/lib/rules/profiles';

const TODAY = '2026-09-16';

function grinder(overrides: Partial<GrinderSpec> = {}): GrinderSpec {
  return {
    model: 'GWS 750-125',
    noLoadRPM: 11000,
    maxWheelDiameter: 125,
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

function wheel(overrides: Partial<WheelSpec> = {}): WheelSpec {
  return {
    maxRPM: 12200,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    expiry: { year: 2027, month: 4 },
    rawText: '',
    confidence: 'high',
    ...overrides,
  };
}

describe('EvidencePanel — 펼치고 접기', () => {
  it('기본은 접혀 있다', () => {
    const g = grinder();
    const w = wheel();
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    expect(screen.getByRole('button', { name: '근거 보기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('규격 값 근거')).not.toBeInTheDocument();
  });

  it('누르면 펼쳐지고 다시 누르면 접힌다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel();
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));
    expect(screen.getByText('규격 값 근거')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '근거 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(screen.getByRole('button', { name: '근거 접기' }));
    expect(screen.queryByText('규격 값 근거')).not.toBeInTheDocument();
  });
});

describe('EvidencePanel — 구기록의 없는 값', () => {
  it('OCR 원본이 없으면 미기록으로 적는다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel();
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        // grinderOcr·wheelOcr을 넘기지 않는다 — 이 기능 도입 전 기록과 같다.
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const modelRow = screen.getByText('모델명').closest('li');
    expect(modelRow).toHaveTextContent('미기록');
    // 최종값은 그대로 남는다 — 구기록이라고 최종값까지 지우지 않는다.
    expect(modelRow).toHaveTextContent('GWS 750-125');
  });

  it('OCR 원본이 있으면 최종값과 비교해 출처를 AI 또는 작업자 입력으로 적는다', async () => {
    const user = userEvent.setup();
    const ocrGrinder = grinder();
    const finalGrinder = grinder({ noLoadRPM: 10500 }); // 작업자가 고쳤다
    const w = wheel();
    render(
      <EvidencePanel
        grinder={finalGrinder}
        wheel={w}
        result={matchSpecs(finalGrinder, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={ocrGrinder}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const rpmRow = screen.getByText('무부하 회전속도').closest('li');
    expect(rpmRow).toHaveTextContent('작업자 입력');

    const modelRow = screen.getByText('모델명').closest('li');
    expect(modelRow).toHaveTextContent('AI 인식');
  });
});

describe('EvidencePanel — 부속품 입력값(accessoryName)', () => {
  it('이 필드가 없는 기록(도입 전)은 미기록으로 적는다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel({ wheelType: 'other' });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const row = screen.getByText('부속품 이름(선택)').closest('li');
    expect(row).toHaveTextContent('미기록');
  });

  it('작업자가 적은 이름을 최종값·출처와 함께 보여준다 — OCR은 이 값을 읽은 적이 없다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel({ wheelType: 'other', accessoryName: '수동 연마 롤러' });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const row = screen.getByText('부속품 이름(선택)').closest('li');
    expect(row).toHaveTextContent('수동 연마 롤러');
    expect(row).toHaveTextContent('작업자 입력');
    // raw·normalized는 OCR이 읽은 적 없는 필드라 항상 미기록이다.
    expect(row).toHaveTextContent('미기록');
  });
});

describe('EvidencePanel — 안전 경계', () => {
  it('시스템 프롬프트나 API 원문을 노출하지 않는다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel({
      rawText: 'RAW OCR TEXT SHOULD NOT LEAK secret-system-prompt-marker',
    });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    expect(
      screen.queryByText(/secret-system-prompt-marker/),
    ).not.toBeInTheDocument();
  });

  it('「적합」을 안전 승인으로 바꾸지 않는다 — 항상 참고 문구를 함께 보여준다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel();
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    expect(screen.getByText(/안전 승인이 아닙니다/)).toBeInTheDocument();
  });

  it('사진으로 손상이 안 보인다고 「손상 없음」이라 말하지 않는다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel({ visibleDamage: 'none_visible' });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    // 한계 문구 안에서 "이렇게 말하지 않는다"고 인용하는 것은 허용한다.
    // 상태를 단정하는 문장으로 "손상 없음"이 따로 나오면 안 된다는 뜻이다.
    expect(screen.queryByText('손상 없음')).not.toBeInTheDocument();
    expect(
      screen.getByText(/미세균열은 사진으로 보이지 않습니다/),
    ).toBeInTheDocument();
  });
});

describe('EvidencePanel — 계산식과 차이', () => {
  it('RPM 안전 항목에 계산식과 여유율을 함께 보여준다', async () => {
    const user = userEvent.setup();
    const g = grinder({ noLoadRPM: 11000 });
    const w = wheel({ maxRPM: 12200 });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const rpmRule = screen.getByText('RPM 안전').closest('li');
    expect(rpmRule).toHaveTextContent('계산식');
    expect(rpmRule).toHaveTextContent('차이');
    expect(rpmRule).toHaveTextContent('근거 문서');
    expect(rpmRule).toHaveTextContent('적용 한계');
  });
});
