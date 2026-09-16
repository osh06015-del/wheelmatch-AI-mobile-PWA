// 다각도 외관 확인의 안전 규칙 테스트.
//
// 여기서 지키는 불변조건은 하나다. **AI는 의심을 더할 수 있을 뿐 덜어낼 수 없다.**
// 찾지 못함(not_observed)이 어떤 경로로도 통과·손상 없음으로 바뀌지 않는지,
// 판독할 수 없는 사진이 그냥 넘어가지 않는지를 본다.

import { describe, expect, it } from 'vitest';

import {
  EXTRA_EXAM_VIEWS,
  examVisibleDamage,
  mergeVisibleDamage,
  viewsNeedingRetake,
  wheelExamBlock,
  wheelExamRequired,
  type WheelExamGateInput,
} from './wheelExamSafety';
import type {
  VisibleDamage,
  WheelExamResult,
  WheelExamStatus,
  WheelType,
} from '@/lib/rules/types';

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

function gate(overrides: Partial<WheelExamGateInput> = {}): WheelExamGateInput {
  return {
    required: true,
    photosReady: true,
    exam: exam(),
    acknowledged: false,
    analysisFailed: false,
    manualContinueAcknowledged: false,
    ...overrides,
  };
}

describe('wheelExamRequired — 지원 종류에만 요구한다', () => {
  it('일반 결합숫돌은 다각도 확인을 요구한다', () => {
    expect(wheelExamRequired('bonded_abrasive')).toBe(true);
  });

  it.each<WheelType>([
    'flap_disc',
    'cup_wheel',
    'diamond',
    'wire_brush',
    'other',
    'unknown',
  ])(
    '%s는 요구하지 않는다 — 규격 대조가 이미 판정불가로 끝나는 종류다',
    (wheelType) => {
      expect(wheelExamRequired(wheelType)).toBe(false);
    },
  );

  it('추가로 받는 사진은 뒷면·가장자리·중심구멍 셋이다', () => {
    expect([...EXTRA_EXAM_VIEWS]).toEqual(['back', 'edge', 'bore']);
  });
});

describe('examVisibleDamage — 의심만 옮긴다', () => {
  it('suspected만 의심으로 옮긴다', () => {
    expect(examVisibleDamage(exam({ status: 'suspected' }))).toBe('suspected');
  });

  it.each<WheelExamStatus>(['not_observed', 'unassessable'])(
    '%s는 unknown으로 남긴다 — none_visible(사진에서 안 보임)로 적지 않는다',
    (status) => {
      // none_visible로 적으면 "확인했다"는 기록이 남아, 나중에 통과 근거로
      // 읽힐 여지를 만든다. 확인하지 못한 것은 확인하지 못한 채로 둔다.
      expect(examVisibleDamage(exam({ status }))).toBe('unknown');
    },
  );

  it('결과가 없으면 unknown이다', () => {
    expect(examVisibleDamage(null)).toBe('unknown');
  });
});

describe('mergeVisibleDamage — 의심은 더해지기만 한다', () => {
  it('다각도 확인이 의심하면 라벨 판독이 무엇이든 의심이다', () => {
    expect(mergeVisibleDamage('none_visible', 'suspected')).toBe('suspected');
    expect(mergeVisibleDamage('unknown', 'suspected')).toBe('suspected');
  });

  it('라벨이 의심했으면 다각도 확인이 찾지 못해도 의심을 지우지 않는다', () => {
    // 이 방향이 깨지면 "한 번 더 찍었더니 경고가 사라지는" 앱이 된다.
    expect(mergeVisibleDamage('suspected', 'unknown')).toBe('suspected');
  });

  it.each<VisibleDamage>(['none_visible', 'unknown'])(
    '둘 다 의심하지 않으면 라벨 쪽 값(%s)을 그대로 둔다',
    (fromLabel) => {
      expect(mergeVisibleDamage(fromLabel, 'unknown')).toBe(fromLabel);
    },
  );
});

describe('viewsNeedingRetake — 판독할 수 없는 사진만 고른다', () => {
  it('readable이 false인 사진을 고른다', () => {
    const result = exam({
      status: 'unassessable',
      photoQuality: [
        { view: 'front', issues: [], readable: true },
        { view: 'back', issues: ['blur'], readable: false },
        { view: 'edge', issues: ['glare'], readable: true },
        { view: 'bore', issues: ['darkness'], readable: false },
      ],
    });

    expect(viewsNeedingRetake(result)).toEqual(['back', 'bore']);
  });

  it('품질 문제가 있어도 판독이 됐으면 다시 찍게 하지 않는다', () => {
    // 반사가 조금 있는 사진까지 되돌리면 현장에서 아무것도 진행되지 않는다.
    const result = exam({
      photoQuality: [
        { view: 'front', issues: ['glare'], readable: true },
        { view: 'back', issues: [], readable: true },
        { view: 'edge', issues: [], readable: true },
        { view: 'bore', issues: [], readable: true },
      ],
    });

    expect(viewsNeedingRetake(result)).toEqual([]);
  });

  it('결과가 없으면 다시 찍을 사진도 없다', () => {
    expect(viewsNeedingRetake(null)).toEqual([]);
  });
});

describe('wheelExamBlock — 언제 진행을 막는가', () => {
  it('요구하지 않는 종류는 막지 않는다', () => {
    expect(wheelExamBlock(gate({ required: false, exam: null }))).toBeNull();
  });

  it('사진이 아직 없으면 막는다', () => {
    expect(wheelExamBlock(gate({ photosReady: false, exam: null }))).toBe(
      'photosMissing',
    );
  });

  it('사진은 있는데 분석하지 않았으면 막는다', () => {
    expect(wheelExamBlock(gate({ exam: null }))).toBe('notAnalyzed');
  });

  it('판독할 수 없는 사진이 있으면 다시 찍게 막는다', () => {
    const result = exam({
      status: 'unassessable',
      photoQuality: [
        { view: 'front', issues: [], readable: true },
        { view: 'back', issues: ['blur'], readable: false },
        { view: 'edge', issues: [], readable: true },
        { view: 'bore', issues: [], readable: true },
      ],
    });

    expect(wheelExamBlock(gate({ exam: result }))).toBe('retakeRequired');
  });

  it('이상 징후가 보이면 작업자가 확인하기 전에는 막는다', () => {
    const suspected = exam({
      status: 'suspected',
      findings: [
        {
          kind: 'edge_break',
          view: 'edge',
          reason: '가장자리 2시 방향 파손',
          confidence: 'high',
        },
      ],
    });

    expect(wheelExamBlock(gate({ exam: suspected }))).toBe('needsAcknowledge');
    expect(
      wheelExamBlock(gate({ exam: suspected, acknowledged: true })),
    ).toBeNull();
  });

  it('찾지 못한 경우는 막지 않는다 — 대신 아무것도 통과시키지 않는다', () => {
    // 여기서 null이 되는 것은 "이 기능이 막을 이유가 없다"는 뜻일 뿐이다.
    // 작업자 확인 Gate는 그대로 남아 있어 사람이 직접 눌러야 넘어간다.
    expect(wheelExamBlock(gate())).toBeNull();
  });

  it('서버·네트워크 실패는 확인 없이는 지나가지 못한다', () => {
    // 실패를 조용히 넘기면 AI가 확인해준 것과 구분되지 않는다. 확인을 요구할
    // 뿐 결과를 지어내지도, 통과시키지도 않는다.
    expect(wheelExamBlock(gate({ exam: null, analysisFailed: true }))).toBe(
      'needsManualContinue',
    );
  });

  it('직접점검으로 진행하겠다고 확인하면 막지 않는다 — 법정 점검까지 가로막지 않는다', () => {
    // AI가 돌지 않았다고 해서 사람이 하는 점검까지 영원히 막으면, 앱이 점검
    // 자체를 가로막는 셈이 된다. 여는 것은 작업자의 명시적 확인뿐이다.
    expect(
      wheelExamBlock(
        gate({
          exam: null,
          analysisFailed: true,
          manualContinueAcknowledged: true,
        }),
      ),
    ).toBeNull();
  });

  it('실패했더라도 사진이 없다고 막지는 않는다 — 막는 주체가 다르다', () => {
    // 사진이 없다고 막는 것은 분석을 돌리기 위해서다. 분석이 이미 실패한
    // 뒤에는 사진을 더 받아도 달라지는 것이 없다. 확인만 요구한다.
    expect(
      wheelExamBlock(
        gate({ exam: null, photosReady: false, analysisFailed: true }),
      ),
    ).toBe('needsManualContinue');
    expect(
      wheelExamBlock(
        gate({
          exam: null,
          photosReady: false,
          analysisFailed: true,
          manualContinueAcknowledged: true,
        }),
      ),
    ).toBeNull();
  });
});
