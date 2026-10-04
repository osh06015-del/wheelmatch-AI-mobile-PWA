// 결과 카드 렌더링 테스트.
//
// 이 화면이 판정을 잘못 표시하면 사람이 다친다.
// 부적합인데 "적합"이 뜨는 것이 이 프로젝트 최악의 버그다.
// 규칙엔진이 낸 결과를 화면이 그대로 보여주는지만 확인한다.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResultCard } from './ResultCard';
import { matchSpecs } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import { BONDED_ABRASIVE_PROFILE } from '@/lib/rules/profiles';

/** 기준일을 고정한다. 엔진은 시계를 읽지 않는다. */
const TODAY = '2026-09-08';

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

describe('ResultCard — 판정 표시', () => {
  it('상단은 적합으로 표시하고 사용기한 미확인은 직접 확인 항목에 남긴다', () => {
    const result = matchSpecs(
      grinder(),
      wheel({ expiry: null, expiryReview: 'not_found' }),
      {
        declaredPurpose: 'cutting',
        profile: BONDED_ABRASIVE_PROFILE,
        today: TODAY,
      },
    );
    render(<ResultCard result={result} />);
    expect(screen.getByText('적합', { exact: true })).toBeInTheDocument();
    expect(
      screen.queryByText('규격 적합 — 사용기한 미확인'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /직접 확인할 항목/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/작업자가 사용기한 표시를 찾지 못했습니다/),
    ).toBeInTheDocument();
  });
  it('적합이면 "적합"만 표시하고 "부적합"은 표시하지 않는다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder(), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(screen.getByText('적합')).toBeInTheDocument();
    expect(screen.queryByText('부적합')).not.toBeInTheDocument();
    expect(screen.queryByText('판정불가')).not.toBeInTheDocument();
  });

  it('RPM 위반이면 "부적합"과 그 사유를 표시한다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder(), wheel({ maxRPM: 8500 }), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(screen.getByText('부적합')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(
      screen.getByText(/숫돌 최고사용회전속도\(8500rpm\)가/),
    ).toBeInTheDocument();
    expect(screen.getByText(/파손·비산 위험/)).toBeInTheDocument();
  });

  it('값이 없으면 "판정불가"를 표시한다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder({ noLoadRPM: null }), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
  });

  it('지름 위반 사유에 두 값이 모두 나온다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder({ maxWheelDiameter: 100 }), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(
      screen.getByText(
        '숫돌 지름(125mm)이 그라인더 허용 최대 지름(100mm)을 초과합니다.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ResultCard — 검사 항목', () => {
  it('5개 검사 항목을 모두 보여준다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder(), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    for (const rule of [
      '필수값 존재',
      'RPM 상한 대조',
      '지름 호환',
      '용도 확인',
      '신뢰도 검증',
    ]) {
      expect(screen.getByText(rule)).toBeInTheDocument();
    }
  });

  it('그라인더와 숫돌 값을 나란히 보여준다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder(), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(
      screen.getAllByText('그라인더 11000rpm / 숫돌 12200rpm').length,
    ).toBeGreaterThan(0);
  });

  it('값이 없는 항목은 —로 표시한다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder({ noLoadRPM: null }), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(
      screen.getAllByText('그라인더 — / 숫돌 12200rpm').length,
    ).toBeGreaterThan(0);
  });

  it('실제 OCR 미판독과 덮개 입력 충돌이 "판정할 수 없는 정보" 한 묶음에 함께 보인다', () => {
    // 성격이 다른 두 원인(값 못 읽음 / 입력 충돌)을 같은 묶음 이름으로 아우른다.
    render(
      <ResultCard
        result={matchSpecs(
          grinder({ noLoadRPM: null, guardType: 'none' }),
          wheel(),
          {
            declaredPurpose: 'cutting',
            profile: BONDED_ABRASIVE_PROFILE,
            today: TODAY,
          },
        )}
      />,
    );

    const heading = screen.getByText('판정할 수 없는 정보', { exact: false });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText('읽지 못한 정보')).not.toBeInTheDocument();
    expect(screen.getByText('필수값 존재')).toBeInTheDocument();
    expect(screen.getByText('덮개 조건')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// 외관 손상 의심의 출처
//
// 이어받은 의심도 엔진 문장은 "사진에서 … 보이는 부분이 있습니다"다. 이 점검의 사진
// 판독에서 나온 의심이 아니면 그 아래에 출처를 밝힌다. 의심은 덜어내지 않는다.
// ─────────────────────────────────────────────────────────────

describe('ResultCard — 외관 손상 의심의 출처', () => {
  const ENGINE_SENTENCE =
    '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.';
  const CARRIED_NOTE =
    '이 의심은 라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인에서 이어받은 것입니다. 이 점검에 쓴 라벨 사진의 판독에서 나온 것이 아닙니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.';

  function renderCard(spec: WheelSpec) {
    const g = grinder();
    const result = matchSpecs(g, spec, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
    });
    render(<ResultCard result={result} grinder={g} wheel={spec} />);
    return result;
  }

  it('이어받은 의심이면 엔진 문장 아래에 출처를 함께 보여준다', () => {
    renderCard(
      wheel({ visibleDamage: 'suspected', visibleDamageSources: ['carried'] }),
    );

    // 엔진 문장은 그대로 남는다 — 출처가 그 경고를 대신하지 않는다.
    const reason = screen.getByText(ENGINE_SENTENCE);
    const note = screen.getByText(CARRIED_NOTE);
    // 같은 항목(외관 손상) 안에, 사유 다음에 온다.
    const row = reason.closest('li');
    expect(row).not.toBeNull();
    expect(row).toContainElement(note);
    expect(row).toHaveTextContent('외관 손상');
    expect(
      reason.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('출처를 밝혀도 판정과 항목 구성은 그대로다', () => {
    const inherited = renderCard(
      wheel({ visibleDamage: 'suspected', visibleDamageSources: ['carried'] }),
    );

    // 외관 손상은 경고라 판정을 움직이지 않는다. 출처 문장도 마찬가지다.
    expect(inherited.verdict).toBe('COMPATIBLE');
    expect(screen.getByText('적합', { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /직접 확인할 항목/ }),
    ).toBeInTheDocument();
  });

  it('이 사진의 판독도 의심했으면 이어받은 출처는 「…에서도」로 남긴다 — 다른 숫돌일 수 있다는 안내를 빼지 않는다', () => {
    // 결과 화면의 서버 재분석이 의심을 더하면 출처가 이렇게 바뀐다. 문장을 통째로
    // 빼면 방금까지 보이던 안내가 재분석 한 번에 사라진다.
    renderCard(
      wheel({
        visibleDamage: 'suspected',
        visibleDamageSources: ['carried', 'reanalysis'],
      }),
    );

    expect(screen.getByText(ENGINE_SENTENCE)).toBeInTheDocument();
    expect(
      screen.getByText(
        '라벨을 다시 찍기 전에 저장돼 있던 숫돌 확인에서도 AI의 손상 의심이 있었습니다. 그 의심도 지우지 않고 이어갑니다. 다른 숫돌을 촬영했더라도 실물을 직접 확인하세요.',
      ),
    ).toBeInTheDocument();
    // 이 사진의 판독도 의심했으므로 이 말은 더 이상 사실이 아니다.
    expect(screen.queryByText(/나온 것이 아닙니다/)).not.toBeInTheDocument();
  });

  it('이 사진의 판독만 의심했으면 출처 문장을 붙이지 않는다', () => {
    renderCard(
      wheel({
        visibleDamage: 'suspected',
        visibleDamageSources: ['label_photo'],
      }),
    );

    expect(screen.getByText(ENGINE_SENTENCE)).toBeInTheDocument();
    expect(screen.queryByText(/이어받/)).not.toBeInTheDocument();
    expect(screen.queryByText(/에서도/)).not.toBeInTheDocument();
  });

  it('출처가 기록되지 않은 의심에는 아무것도 붙이지 않는다', () => {
    renderCard(wheel({ visibleDamage: 'suspected' }));

    expect(screen.getByText(ENGINE_SENTENCE)).toBeInTheDocument();
    expect(screen.queryByText(/이어받은 것입니다/)).not.toBeInTheDocument();
  });

  it('숫돌 규격을 넘겨받지 못한 화면에서도 엔진 문장은 그대로 보인다', () => {
    const result = matchSpecs(
      grinder(),
      wheel({ visibleDamage: 'suspected', visibleDamageSources: ['carried'] }),
      {
        declaredPurpose: 'cutting',
        profile: BONDED_ABRASIVE_PROFILE,
        today: TODAY,
      },
    );
    render(<ResultCard result={result} />);

    expect(screen.getByText(ENGINE_SENTENCE)).toBeInTheDocument();
    expect(screen.queryByText(/이어받은 것입니다/)).not.toBeInTheDocument();
  });
});

describe('ResultCard — 제한 대조', () => {
  // 제한 대조는 값이 모자라서 판정불가인 것이 아니다. 확정한 값을 뒷받침하는 서버
  // 판독이 확인되지 않은 것이다. 까닭은 여럿이라(직접 입력·기기 안 OCR·버린 판독·
  // 읽지 못한 표시) 카드는 까닭을 단정하지 않는다.
  const LIMITED_NOTE =
    '제한 대조라 적합 판정을 제공하지 않습니다. 아래 항목과 안내를 확인하세요.';
  const MISSING_NOTE =
    '값이 부족해 판정할 수 없습니다. 재촬영하거나 값을 직접 입력하세요.';

  function limited(g: GrinderSpec = grinder(), w: WheelSpec = wheel()) {
    return matchSpecs(g, w, {
      declaredPurpose: 'cutting',
      profile: BONDED_ABRASIVE_PROFILE,
      today: TODAY,
      analysisMode: 'offline_limited',
    });
  }

  it('규격이 맞아도 판정불가이고, 값이 부족하다거나 직접 입력하라고 적지 않는다', () => {
    render(<ResultCard result={limited()} />);

    expect(screen.getByText('판정불가')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(screen.getByText(LIMITED_NOTE)).toBeInTheDocument();
    // 직접 입력해서 제한 대조가 된 작업자에게 다시 직접 입력하라고 하지 않는다.
    expect(screen.queryByText(MISSING_NOTE)).not.toBeInTheDocument();
  });

  it('검사 항목의 이름은 「제한 대조」이고 까닭을 단정하지 않는다', () => {
    render(<ResultCard result={limited()} />);

    expect(screen.getByText('제한 대조')).toBeInTheDocument();
    expect(
      screen.getByText(
        '확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만 대조했습니다. RPM·지름 위반만 부적합으로 판정하며 적합 판정은 제공하지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/오프라인/)).not.toBeInTheDocument();
    expect(screen.queryByText(/서버 분석 없이/)).not.toBeInTheDocument();
    expect(screen.queryByText(/서버에 닿지/)).not.toBeInTheDocument();
  });

  it('제한 대조여도 확정된 위반은 부적합이고 부적합 문구를 쓴다', () => {
    render(<ResultCard result={limited(grinder(), wheel({ maxRPM: 8500 }))} />);

    expect(screen.getByText('부적합')).toBeInTheDocument();
    expect(
      screen.getByText('이 조합은 사용하면 안 됩니다. 아래 원인을 확인하세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(LIMITED_NOTE)).not.toBeInTheDocument();
  });

  it('제한 대조가 아닌 판정불가는 기존 문구 그대로다', () => {
    render(
      <ResultCard
        result={matchSpecs(grinder({ noLoadRPM: null }), wheel(), {
          declaredPurpose: 'cutting',
          profile: BONDED_ABRASIVE_PROFILE,
          today: TODAY,
        })}
      />,
    );

    expect(screen.getByText(MISSING_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(LIMITED_NOTE)).not.toBeInTheDocument();
  });

  it('이름을 바꾸기 전에 저장된 기록도 지금 이름과 문장으로 보인다', () => {
    // 2026-10-04까지 저장된 기록의 모양이다 — 규칙 이름과 사유가 옛 문구다.
    const current = limited();
    const stored = {
      ...current,
      checks: current.checks.map((check) =>
        check.detail?.code === 'analysisMode.offlineLimited'
          ? {
              ...check,
              rule: '오프라인 제한 대조',
              reason:
                '서버 분석 없이 작업자가 입력·확인한 값으로만 대조했습니다. RPM·지름 위반만 부적합으로 판정하며 적합 판정은 제공하지 않습니다.',
            }
          : check,
      ),
    };
    render(<ResultCard result={stored} />);

    expect(screen.getByText('제한 대조')).toBeInTheDocument();
    expect(screen.queryByText('오프라인 제한 대조')).not.toBeInTheDocument();
    // 사유는 저장된 사유 코드로 지금 문장을 다시 만든다.
    expect(screen.queryByText(/서버 분석 없이/)).not.toBeInTheDocument();
    expect(screen.getByText(LIMITED_NOTE)).toBeInTheDocument();
  });
});
