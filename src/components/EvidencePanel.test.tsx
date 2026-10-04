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
import { formatDateTime } from '@/lib/record/datetime';
import type {
  GrinderSpec,
  ReanalysisRecord,
  WheelSpec,
} from '@/lib/rules/types';
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
  // 재분석 판독 칸이 생기기 전의 기록 — 그때는 서버 재분석을 받아들이면 OCR 원본
  // 자리에 서버 판독이 들어갔다. 확정값에 남은 로컬 OCR의 표기는 계속 판정에 쓰이는데,
  // 원본 자리만 보면 그 숫자가 어디서 왔는지 알 수 없다. 판정을 막은 숫자의 출처가
  // 화면에 없으면 작업자는 되짚을 수 없다. 이 기록에서 출처는 추론이라 「…로 보이며」로
  // 적는다. 지금 저장되는 기록은 아래 「재분석 판독 칸이 있는 기록」이다.

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

  describe('재분석 판독 칸이 있는 기록 — OCR 원본 자리는 확정할 때의 판독 그대로다', () => {
    // 받아들인 재분석 판독은 확정값 표기의 빈 자리만 채우고, OCR 원본 자리에는 들어가지
    // 않는다. 채워진 칸은 OCR 원본과 다르고, 그 값이 어디서 왔는지는 기록의 재분석
    // 판독으로 확인된다 — 추론이 아니므로 「…로 보이며」라고 적지 않는다.

    const TITLE = '판정에 쓴 라벨 표기 중 OCR 원본과 다른 값';
    const FROM_REANALYSIS =
      '기록된 OCR 원본과 다른 값입니다. 받아들인 서버 재분석 판독이 읽은 표기이며, 작업자가 확인한 값이 아닙니다.';
    const INFERRED =
      '기록된 OCR 원본과 다른 값입니다. 서버로 다시 분석하기 전에 읽어 둔 표기로 보이며, 작업자가 확인한 값이 아닙니다.';

    /** 기기 안 OCR이 rpm 표기만 읽은 원본 */
    const LOCAL_MARKINGS = {
      labeledRPM: 12200,
      peripheralSpeedMps: null,
      boreDiameter: null,
      expiryRaw: null,
    };
    /** 서버가 다시 읽은 표기 — rpm은 같게, m/s와 내경을 더 읽었다 */
    const REREAD_MARKINGS = {
      labeledRPM: 12200,
      peripheralSpeedMps: 80,
      boreDiameter: 22.23,
      expiryRaw: null,
    };

    function reread(
      overrides: Partial<ReanalysisRecord> = {},
    ): ReanalysisRecord {
      return {
        analyzedAt: '2026-10-04T05:12:03.000Z',
        grinderOcr: null,
        grinderOcrTelemetry: null,
        wheelOcr: wheel({ markings: REREAD_MARKINGS }),
        wheelOcrTelemetry: null,
        acceptedAt: '2026-10-04T05:12:40.000Z',
        damageRecheck: null,
        ...overrides,
      };
    }

    async function open(
      confirmed: WheelSpec['markings'],
      original: WheelSpec['markings'],
      reanalyses: ReanalysisRecord[],
    ) {
      const user = userEvent.setup();
      const g = grinder();
      const w = wheel({ markings: confirmed });
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
          wheelOcr={wheel({ markings: original })}
          reanalyses={reanalyses}
        />,
      );
      await user.click(screen.getByRole('button', { name: '근거 보기' }));
    }

    it('받아들인 재분석 판독이 채운 칸은 그 판독이 읽은 표기라고 적는다', async () => {
      await open(REREAD_MARKINGS, LOCAL_MARKINGS, [reread()]);

      const row = screen.getByText(TITLE).closest('li');
      expect(row).toHaveTextContent(
        '원주속도 표기: 판정에 쓴 값 80m/s / OCR 원본 —',
      );
      expect(row).toHaveTextContent(
        '내경 표기: 판정에 쓴 값 Φ22.23mm / OCR 원본 —',
      );
      expect(row).toHaveTextContent(FROM_REANALYSIS);
      // 그 값은 재분석 **전에** 읽어 둔 것이 아니다. 옛 기록의 문장을 쓰면 거짓이다.
      expect(row).not.toHaveTextContent('읽어 둔 표기로 보이며');
      // 기기가 읽어 둔 칸은 OCR 원본과 같아 나오지 않는다.
      expect(row).not.toHaveTextContent('회전속도 표기');
    });

    it('확정할 때의 판독이 읽어 둔 표기는 OCR 원본에 그대로 있어 이 항목을 만들지 않는다', async () => {
      // 기기 안 OCR이 m/s를 60으로 읽어 두었고 서버는 그 칸을 읽지 못했다. 판정에 쓴
      // 60은 OCR 원본에 그대로 있다 — 출처가 사라지지 않았으므로 따로 알릴 것이 없다.
      const local = { ...LOCAL_MARKINGS, peripheralSpeedMps: 60 };
      await open(local, local, [
        reread({ wheelOcr: wheel({ markings: LOCAL_MARKINGS }) }),
      ]);

      expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    });

    it('받아들이지 않은 판독이 같은 값을 읽었어도 그 판독에서 왔다고 적지 않는다', async () => {
      // 받아들이지 않은 판독의 표기는 확정값으로 옮긴 적이 없다.
      await open(REREAD_MARKINGS, LOCAL_MARKINGS, [
        reread({ acceptedAt: null }),
      ]);

      const row = screen.getByText(TITLE).closest('li');
      expect(row).toHaveTextContent(INFERRED);
      expect(row).not.toHaveTextContent('받아들인 서버 재분석 판독이 읽은');
    });

    it('표기가 충돌해 받아들이지 않은 판독은 그 칸을 판독 내역에 적는다', async () => {
      // 기기 안 OCR은 rpm 표기를 12200으로, 서버는 13300으로 읽었다. 회전속도·지름은
      // 같아 비교표만 보면 왜 풀리지 않았는지 알 수 없다. OCR 원본이 기록에 그대로
      // 있으므로 그때의 충돌을 다시 적는다.
      await open(LOCAL_MARKINGS, LOCAL_MARKINGS, [
        reread({
          wheelOcr: wheel({
            markings: { ...LOCAL_MARKINGS, labeledRPM: 13300 },
          }),
          acceptedAt: null,
        }),
      ]);

      expect(
        screen.getByText(
          '회전속도 표기: 앞선 판독 12200rpm / AI 값 13300rpm · 다름',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('제한 대조: 풀지 않음')).toBeInTheDocument();
      // 확정값의 표기는 OCR 원본과 같다. 「원본과 다른 값」 줄은 생기지 않는다.
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    });

    it('한 칸이라도 받아들인 판독으로 설명되지 않으면 그 판독에서 왔다고 적지 않는다', async () => {
      // 내경은 받아들인 판독이 읽은 값(22.23)과 다르다. 일부만 맞는 것을 재분석에서
      // 왔다고 적으면 나머지 칸의 출처를 지어내게 된다.
      await open({ ...REREAD_MARKINGS, boreDiameter: 16 }, LOCAL_MARKINGS, [
        reread(),
      ]);

      const row = screen.getByText(TITLE).closest('li');
      expect(row).toHaveTextContent(
        '내경 표기: 판정에 쓴 값 Φ16mm / OCR 원본 —',
      );
      expect(row).toHaveTextContent(INFERRED);
    });
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

describe('EvidencePanel — 서버 재분석 판독', () => {
  // 결과 화면의 서버 재분석 판독은 OCR 원본(작업자가 고치기 전의 값)과 따로 남는다.
  // 근거 화면도 둘을 섞지 않는다 — 섞으면 작업자가 본 적 없는 값이 "작업자가 고치지
  // 않은 AI 값"처럼 읽힌다.
  const T1 = '2026-10-04T05:12:03.000Z';
  const T3 = '2026-10-04T05:12:40.000Z';

  function reading(
    overrides: Partial<ReanalysisRecord> = {},
  ): ReanalysisRecord {
    return {
      analyzedAt: T1,
      grinderOcr: null,
      grinderOcrTelemetry: null,
      wheelOcr: wheel({ maxRPM: 13300, visibleDamage: 'suspected' }),
      wheelOcrTelemetry: null,
      acceptedAt: null,
      damageRecheck: null,
      ...overrides,
    };
  }

  async function open(reanalyses: ReanalysisRecord[] | undefined) {
    const user = userEvent.setup();
    const g = grinder();
    const w = wheel({ visibleDamage: 'suspected' });
    render(
      <EvidencePanel
        grinder={g}
        wheel={w}
        result={matchSpecs(g, w, {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
          analysisMode: 'offline_limited',
        })}
        reanalyses={reanalyses}
      />,
    );
    await user.click(screen.getByRole('button', { name: '근거 보기' }));
  }

  it('펼치면 받아들이지 않은 판독도 확정값과 나란히 보여준다', async () => {
    await open([reading()]);

    expect(
      screen.getByRole('heading', { name: '서버 재분석 판독' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '값을 확정한 뒤 결과 화면에서 서버로 다시 읽은 판독입니다. 작업자가 고친 적이 없는 값이라 위 OCR 원본과 따로 남깁니다. 이 판독에서 확정값으로 옮긴 것은 외관 손상 의심과, 받아들인 숫돌 판독의 라벨 표기 가운데 비어 있던 자리뿐입니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`재분석 1 · ${formatDateTime(T1)} · 모델 미기록`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '최고사용회전속도: 확정한 값 12200rpm / AI 값 13300rpm · 다름',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('AI 외관 판독: 손상 징후 의심'),
    ).toBeInTheDocument();
    expect(screen.getByText('제한 대조: 풀지 않음')).toBeInTheDocument();
  });

  it('재분석 판독은 OCR 원본 칸에 섞지 않는다 — 직접 넣은 값의 원본은 미기록 그대로다', async () => {
    await open([reading({ acceptedAt: T3 })]);

    // 숫돌 OCR 원본을 넘기지 않았다(직접 입력). 재분석 값 13300rpm이 원본 칸에
    // 나타나면 안 된다.
    const rpmRow = screen.getByText('최고사용회전속도').closest('li');
    expect(rpmRow).toHaveTextContent('OCR 원본 미기록');
    expect(rpmRow).not.toHaveTextContent('13300');
  });

  it('재분석 판독이 없는 기록에는 그 구역을 그리지 않는다', async () => {
    await open(undefined);
    expect(
      screen.queryByRole('heading', { name: '서버 재분석 판독' }),
    ).not.toBeInTheDocument();
  });

  it('재분석을 하지 않은 기록(빈 목록)에도 그리지 않는다', async () => {
    await open([]);
    expect(
      screen.queryByRole('heading', { name: '서버 재분석 판독' }),
    ).not.toBeInTheDocument();
  });
});
