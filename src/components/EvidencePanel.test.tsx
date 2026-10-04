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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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
          declaredPurpose: 'cutting',
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

describe('EvidencePanel — 판정에 쓴 표기의 출처', () => {
  // 서버 재분석을 받아들이면 OCR 원본 자리에는 서버 판독이 들어간다. 확정값에 남은
  // 로컬 OCR의 표기는 계속 판정에 쓰이는데, 원본 자리만 보면 그 숫자가 어디서 왔는지
  // 알 수 없다. 판정을 막은 숫자의 출처가 화면에 없으면 작업자는 되짚을 수 없다.

  const SERVER_MARKINGS = {
    labeledRPM: 12200,
    peripheralSpeedMps: null,
    boreDiameter: 22.23,
    expiryRaw: '04/2027',
  };

  function renderWith(markings: WheelSpec['markings']) {
    const g = grinder();
    const w = wheel({ markings });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={wheel({ markings: SERVER_MARKINGS })}
      />,
    );
  }

  it('서버 판독에 없는 표기로 대조했으면 그 값과 출처를 따로 보여준다', async () => {
    const user = userEvent.setup();
    // 로컬 OCR이 m/s를 60으로 읽어 두었고, 서버는 그 칸을 읽지 못했다.
    renderWith({ ...SERVER_MARKINGS, peripheralSpeedMps: 60 });

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const row = screen
      .getByText('판정에 쓴 라벨 표기 중 OCR 원본과 다른 값')
      .closest('li');
    expect(row).toHaveTextContent(
      '원주속도 표기: 판정에 쓴 값 60m/s / OCR 원본 —',
    );
    expect(row).toHaveTextContent(
      '기록된 OCR 원본과 다른 값입니다. 서버로 다시 분석하기 전에 읽어 둔 표기로 보이며, 작업자가 확인한 값이 아닙니다.',
    );
    // 서버가 같게 읽은 칸은 나오지 않는다.
    expect(row).not.toHaveTextContent('회전속도 표기');
    expect(row).not.toHaveTextContent('내경 표기');
  });

  it('OCR 원본이 다르게 읽은 칸은 두 값을 나란히 보여준다', async () => {
    const user = userEvent.setup();
    // 표기 충돌을 막기 전에 전환한 기록 — 로컬 표기로 대조했고 서버는 다르게 읽었다.
    renderWith({ ...SERVER_MARKINGS, labeledRPM: 1220, boreDiameter: 16 });

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const row = screen
      .getByText('판정에 쓴 라벨 표기 중 OCR 원본과 다른 값')
      .closest('li');
    expect(row).toHaveTextContent(
      '회전속도 표기: 판정에 쓴 값 1220rpm / OCR 원본 12200rpm',
    );
    expect(row).toHaveTextContent(
      '내경 표기: 판정에 쓴 값 Φ16mm / OCR 원본 Φ22.23mm',
    );
  });

  it('확정값의 표기가 OCR 원본과 같으면 이 항목을 만들지 않는다', async () => {
    const user = userEvent.setup();
    renderWith({ ...SERVER_MARKINGS });

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    expect(
      screen.queryByText('판정에 쓴 라벨 표기 중 OCR 원본과 다른 값'),
    ).not.toBeInTheDocument();
  });

  it('OCR 원본이 없는 기록에서는 견줄 원본이 없어 이 항목을 만들지 않는다', async () => {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel({
      markings: { ...SERVER_MARKINGS, peripheralSpeedMps: 60 },
    });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        // wheelOcr을 넘기지 않는다 — OCR 원본을 남기지 않은 기록이다.
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    // 원본이 없으면 "원본과 다르다"고 말할 수 없다. 재분석 전 판독이라고 지어내지 않는다.
    expect(
      screen.queryByText('판정에 쓴 라벨 표기 중 OCR 원본과 다른 값'),
    ).not.toBeInTheDocument();
  });
});

describe('EvidencePanel — 계산식과 차이', () => {
  it('RPM 상한 대조 항목에 계산식과 여유율을 함께 보여준다', async () => {
    const user = userEvent.setup();
    const g = grinder({ noLoadRPM: 11000 });
    const w = wheel({ maxRPM: 12200 });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={w}
      />,
    );

    await user.click(screen.getByRole('button', { name: '근거 보기' }));

    const rpmRule = screen.getByText('RPM 상한 대조').closest('li');
    expect(rpmRule).toHaveTextContent('계산식');
    expect(rpmRule).toHaveTextContent('차이');
    expect(rpmRule).toHaveTextContent('근거 문서');
    expect(rpmRule).toHaveTextContent('적용 한계');
  });
});

describe('EvidencePanel — 외관 손상 의심의 출처', () => {
  async function open(w: WheelSpec, wheelOcr: WheelSpec) {
    const user = userEvent.setup();
    const g = grinder();
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
        grinderOcr={g}
        wheelOcr={wheelOcr}
      />,
    );
    await user.click(screen.getByRole('button', { name: '근거 보기' }));
  }

  it('이어받은 의심이면 사유 아래에 출처를 함께 적는다', async () => {
    // OCR 원본은 의심하지 않았는데 확정값은 의심이다. 근거 화면이 그 까닭을 말한다.
    await open(
      wheel({ visibleDamage: 'suspected', visibleDamageSources: ['carried'] }),
      wheel(),
    );

    const reason = screen.getByText(
      '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.',
    );
    const note = screen.getByText(
      /라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인/,
    );
    expect(reason.closest('li')).toContainElement(note);
  });

  it('이 사진의 판독이 스스로 의심했으면 붙이지 않는다', async () => {
    const suspected = wheel({
      visibleDamage: 'suspected',
      visibleDamageSources: ['label_photo'],
    });
    await open(suspected, wheel({ visibleDamage: 'suspected' }));

    expect(screen.queryByText(/이어받은 것입니다/)).not.toBeInTheDocument();
  });
});
