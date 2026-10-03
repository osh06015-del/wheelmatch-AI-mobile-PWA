// 진행 중 점검(draft) 저장 형태와 복구 테스트.
//
// 핵심: 형태가 어긋나거나 사진이 빠진 draft에서 **추정해 채우지 않고** 믿을 수
// 있는 값만 살리는지, 버린 것을 경고하는지, 진행 중 시험운전을 되살리지 않는지.

import { describe, expect, it } from 'vitest';

import {
  DRAFT_ID,
  DRAFT_SCHEMA_VERSION,
  buildDraft,
  hasInspectionInProgress,
  recoverDraft,
  resumePathFor,
  type InspectionDraft,
} from './draftModel';
import type { InspectionSnapshot } from '@/lib/state/inspection';
import type {
  GrinderCondition,
  GrinderSpec,
  WheelCondition,
  WheelSpec,
} from '@/lib/rules/types';

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'flap_disc',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

const GRINDER_OK: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

const WHEEL_OK: WheelCondition = {
  damageFree: true,
  notDeformed: null,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: null,
  flapsIntact: true,
  noDelamination: true,
  flapBackingIntact: true,
};

const photo = (name: string) => new Blob([name], { type: 'image/jpeg' });

function snapshot(
  overrides: Partial<InspectionSnapshot> = {},
): InspectionSnapshot {
  return {
    declaredPurpose: 'cutting',
    startedAt: 1_758_000_000_000,
    workConditions: null,
    grinder: GRINDER,
    wheel: WHEEL,
    grinderOcr: GRINDER,
    wheelOcr: WHEEL,
    grinderCondition: GRINDER_OK,
    wheelCondition: WHEEL_OK,
    trialRun: null,
    grinderImage: photo('grinder'),
    wheelImage: photo('wheel'),
    grinderCaptureMetrics: null,
    wheelCaptureMetrics: null,
    grinderOcrTelemetry: null,
    wheelOcrTelemetry: null,
    captureChecks: {},
    offlineSlots: { grinder: false, wheel: false },
    checklist: null,
    trialRunRecord: null,
    ...overrides,
  };
}

const NOW = new Date('2026-09-17T03:00:00.000Z');

describe('buildDraft — 저장 형태', () => {
  it('사진은 state에서 빼 photos로 옮기고, 사진이 있던 자리를 남긴다', () => {
    const draft = buildDraft(snapshot(), NOW);

    expect(draft.id).toBe(DRAFT_ID);
    expect(draft.schemaVersion).toBe(DRAFT_SCHEMA_VERSION);
    expect(draft.savedAt).toBe('2026-09-17T03:00:00.000Z');
    expect(Object.keys(draft.photos).sort()).toEqual(['grinder', 'wheel']);
    expect(draft.photoSlots.sort()).toEqual(['grinder', 'wheel']);
    expect(draft.photosOmitted).toBe(false);
    expect(draft.state).not.toHaveProperty('grinderImage');
    expect(draft.state).not.toHaveProperty('wheelImage');
  });

  it('적용한 Profile(종류·버전·범위)을 함께 남긴다 — 판정 결과는 담지 않는다', () => {
    const draft = buildDraft(snapshot(), NOW);
    expect(draft.profile).toMatchObject({
      type: 'flap_disc',
      scope: 'limited',
    });
    expect(draft).not.toHaveProperty('result');
    expect(buildDraft(snapshot({ wheel: null }), NOW).profile).toBeNull();
  });

  it('작업을 고르지 않았으면 진행 중이 아니다(저장하지 않는다)', () => {
    expect(hasInspectionInProgress(snapshot())).toBe(true);
    expect(hasInspectionInProgress(snapshot({ declaredPurpose: null }))).toBe(
      false,
    );
  });
});

/** 저장소에서 읽어 온 모양(구조화 복제를 거친 값)으로 만든다 */
function stored(draft: InspectionDraft): unknown {
  return { ...draft, state: JSON.parse(JSON.stringify(draft.state)) };
}

describe('recoverDraft — 정상 복구', () => {
  it('같은 버전의 draft는 경고 없이 그대로 되살린다', () => {
    const recovery = recoverDraft(stored(buildDraft(snapshot(), NOW)));

    expect(recovery.warnings).toEqual([]);
    expect(recovery.resumable).toBe(true);
    expect(recovery.savedAt).toBe('2026-09-17T03:00:00.000Z');
    expect(recovery.snapshot?.grinder).toEqual(GRINDER);
    expect(recovery.snapshot?.wheel).toEqual(WHEEL);
    expect(recovery.snapshot?.wheelCondition).toEqual(WHEEL_OK);
    expect(recovery.snapshot?.grinderImage).toBeInstanceOf(Blob);
    expect(recovery.snapshot?.wheelImage).toBeInstanceOf(Blob);
  });

  it('체크리스트·마친 시험운전·오프라인 표시를 되살린다', () => {
    const checklist = {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: null,
      ppe: true,
    };
    const trialRunRecord = {
      wheelReplaced: false,
      requiredSeconds: 60,
      startedAt: '2026-09-17T02:00:00.000Z',
      finishedAt: '2026-09-17T02:01:00.000Z',
      elapsedSeconds: 61,
      outcome: 'normal' as const,
      findings: [],
      completed: true,
    };
    const recovery = recoverDraft(
      stored(
        buildDraft(
          snapshot({
            checklist,
            trialRunRecord,
            offlineSlots: { grinder: true, wheel: false },
          }),
          NOW,
        ),
      ),
    );
    expect(recovery.snapshot?.checklist).toEqual(checklist);
    expect(recovery.snapshot?.trialRunRecord).toEqual(trialRunRecord);
    expect(recovery.snapshot?.offlineSlots).toEqual({
      grinder: true,
      wheel: false,
    });
  });
});

describe('recoverDraft — 손상·불일치', () => {
  it('읽을 수 없는 값은 이어할 수 없고 삭제만 고르게 한다', () => {
    for (const raw of [null, 'x', {}, { state: 'x' }]) {
      const recovery = recoverDraft(raw);
      expect(recovery.snapshot).toBeNull();
      expect(recovery.resumable).toBe(false);
      expect(recovery.warnings).toEqual(['unreadable']);
    }
  });

  it('작업을 고르지 않은 draft는 이어할 것이 없다', () => {
    const draft = stored(buildDraft(snapshot({ declaredPurpose: null }), NOW));
    expect(recoverDraft(draft).resumable).toBe(false);
  });

  it('스키마 버전이 다르면(이전 버전 migration) 형태가 맞는 값만 살리고 경고한다', () => {
    const old = {
      ...(stored(buildDraft(snapshot(), NOW)) as Record<string, unknown>),
      schemaVersion: 0,
    };
    const recovery = recoverDraft(old);

    expect(recovery.warnings).toContain('schema');
    expect(recovery.resumable).toBe(true);
    expect(recovery.snapshot?.grinder).toEqual(GRINDER);
  });

  it('형태가 어긋난 값은 추정해 채우지 않고 버린다 — 뒤 단계도 함께 버린다', () => {
    const draft = stored(buildDraft(snapshot(), NOW)) as {
      state: Record<string, unknown>;
    };
    draft.state.grinder = { noLoadRPM: '11000' }; // 문자열 — 믿을 수 없다
    const recovery = recoverDraft(draft);

    expect(recovery.warnings).toContain('schema');
    expect(recovery.snapshot?.grinder).toBeNull();
    expect(recovery.snapshot?.grinderCondition).toBeNull();
    // 명판이 없으면 숫돌 단계도 근거가 없다.
    expect(recovery.snapshot?.wheel).toBeNull();
    expect(recovery.snapshot?.declaredPurpose).toBe('cutting');
  });

  it('오프라인 표시를 읽지 못하면 더 엄격한 쪽(오프라인)으로 본다', () => {
    const draft = stored(buildDraft(snapshot(), NOW)) as {
      state: Record<string, unknown>;
    };
    draft.state.offlineSlots = 'broken';
    const recovery = recoverDraft(draft);

    expect(recovery.warnings).toContain('schema');
    expect(recovery.snapshot?.offlineSlots.grinder).toBe(true);
  });

  it('일부 사진 Blob이 빠졌으면 가능한 값만 복구하고 경고한다', () => {
    const draft = stored(buildDraft(snapshot(), NOW)) as {
      photos: Record<string, unknown>;
    };
    delete draft.photos.grinder;
    const recovery = recoverDraft(draft);

    expect(recovery.warnings).toEqual(['photos']);
    expect(recovery.snapshot?.grinderImage).toBeNull();
    expect(recovery.snapshot?.wheelImage).toBeInstanceOf(Blob);
    expect(recovery.snapshot?.grinder).toEqual(GRINDER);
  });

  it('저장 공간 부족으로 사진 없이 저장된 draft도 사진 경고와 함께 복구한다', () => {
    const draft = {
      ...buildDraft(snapshot(), NOW),
      photos: {},
      photosOmitted: true,
    };
    const recovery = recoverDraft(stored(draft));

    expect(recovery.warnings).toContain('photos');
    expect(recovery.snapshot?.grinder).toEqual(GRINDER);
  });

  describe('이전 버전의 다각도 외관 확인(2026-10-03에 점검 흐름에서 뺐다)', () => {
    const CHECK = {
      checkVersion: 'test',
      warnings: [],
      usedDespiteWarning: false,
      retakeCount: 0,
    };
    const LEGACY_EXAM = {
      status: 'suspected',
      findings: [
        {
          kind: 'edge_break',
          view: 'edge',
          reason: '가장자리 조각 떨어짐',
          confidence: 'high',
        },
      ],
      photoQuality: [],
      model: null,
      promptVersion: 'test',
      analyzedAt: '2026-09-17T02:00:00.000Z',
    };

    /** 다각도 확인을 마치고 결과 화면까지 갔던, 빼기 전 버전이 저장한 draft */
    function legacyDraft() {
      const bonded = snapshot({
        // 그때 다각도 확인이 올린 의심은 숫돌 규격에 이미 합쳐져 있다.
        wheel: {
          ...WHEEL,
          wheelType: 'bonded_abrasive',
          visibleDamage: 'suspected',
        },
        wheelCondition: {
          damageFree: true,
          notDeformed: true,
          mountingAreaUndamaged: true,
          labelLegible: true,
          expiryValid: true,
        },
      });
      const draft = stored(buildDraft(bonded, NOW)) as {
        state: Record<string, unknown>;
        photos: Record<string, unknown>;
        photoSlots: string[];
      };
      draft.state.wheelExam = LEGACY_EXAM;
      draft.state.wheelExamNotRun = null;
      draft.state.wheelExamAcknowledged = true;
      draft.state.wheelExamCaptureMetrics = {
        back: null,
        edge: null,
        bore: null,
      };
      draft.state.captureChecks = {
        grinder: CHECK,
        wheel: CHECK,
        wheelBack: CHECK,
        wheelBore: CHECK,
      };
      draft.photos = {
        ...draft.photos,
        wheelBack: photo('back'),
        wheelEdge: photo('edge'),
        wheelBore: photo('bore'),
      };
      draft.photoSlots = [
        'grinder',
        'wheel',
        'wheelBack',
        'wheelEdge',
        'wheelBore',
      ];
      return draft;
    }

    it('결과·사진·그 사진의 상태 기록을 되살리지 않고, 버렸다는 것을 알린다', () => {
      const recovery = recoverDraft(legacyDraft());

      expect(recovery.warnings).toEqual(['exam']);
      expect(recovery.resumable).toBe(true);
      for (const key of [
        'wheelExam',
        'wheelExamNotRun',
        'wheelExamAcknowledged',
        'wheelExamCaptureMetrics',
        'wheelBackImage',
        'wheelEdgeImage',
        'wheelBoreImage',
      ]) {
        expect(recovery.snapshot).not.toHaveProperty(key);
      }
      // 없는 사진에 대한 상태 기록을 남기지 않는다. 명판·라벨 것은 그대로다.
      expect(recovery.snapshot?.captureChecks).toEqual({
        grinder: CHECK,
        wheel: CHECK,
      });
    });

    it('숫돌 단계는 버리지 않는다 — 그 확인이 올린 외관 의심도 규격에 그대로 남는다', () => {
      const recovery = recoverDraft(legacyDraft());

      expect(recovery.snapshot?.wheel?.wheelType).toBe('bonded_abrasive');
      // 의심을 덜어내지 않는다. 결과 화면의 외관 손상 경고가 그대로 뜬다.
      expect(recovery.snapshot?.wheel?.visibleDamage).toBe('suspected');
      expect(recovery.snapshot?.wheelImage).toBeInstanceOf(Blob);
      expect(recovery.snapshot?.wheelCondition).not.toBeNull();
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    });

    it('사진은 없고 결과만 남은 draft(사진 없이 저장된 경우)도 같은 경고를 낸다', () => {
      const draft = legacyDraft();
      draft.photos = {};
      draft.photoSlots = [];
      expect(recoverDraft(draft).warnings).toContain('exam');
    });

    it('AI 확인을 하지 못한 채 진행했던 draft도 같은 경고를 낸다', () => {
      const draft = legacyDraft();
      draft.state.wheelExam = null;
      draft.state.wheelExamNotRun = {
        reason: 'offline',
        acknowledgedAt: '2026-09-17T02:00:00.000Z',
      };
      draft.photos = { grinder: photo('grinder'), wheel: photo('wheel') };
      draft.photoSlots = ['grinder', 'wheel'];
      expect(recoverDraft(draft).warnings).toEqual(['exam']);
    });

    it('다각도 확인이 없던 draft에는 이 경고를 붙이지 않는다', () => {
      // 빼기 전 버전도 요구하지 않는 종류에는 빈 값(null)을 저장했다.
      const draft = stored(buildDraft(snapshot(), NOW)) as {
        state: Record<string, unknown>;
      };
      draft.state.wheelExam = null;
      draft.state.wheelExamNotRun = null;
      draft.state.wheelExamAcknowledged = false;
      draft.state.wheelExamCaptureMetrics = null;
      expect(recoverDraft(draft).warnings).toEqual([]);
    });
  });

  it('진행 중이던 시험운전은 되살리지 않고 경고한다', () => {
    const recovery = recoverDraft(
      stored(
        buildDraft(
          snapshot({
            trialRun: {
              wheelReplaced: false,
              requiredSeconds: 60,
              startedAt: '2026-09-17T02:00:00.000Z',
              endsAt: '2026-09-17T02:01:00.000Z',
            },
          }),
          NOW,
        ),
      ),
    );

    expect(recovery.warnings).toContain('trialRun');
    expect(recovery.snapshot?.trialRun).toBeNull();
  });
});

describe('resumePathFor — 이어갈 화면', () => {
  it('마친 단계의 다음 화면으로 보낸다', () => {
    expect(resumePathFor(snapshot())).toBe('/result');
    expect(resumePathFor(snapshot({ wheel: null }))).toBe('/scan/wheel');
    expect(
      resumePathFor(
        snapshot({ wheelCondition: { ...WHEEL_OK, damageFree: null } }),
      ),
    ).toBe('/scan/wheel');
    expect(resumePathFor(snapshot({ grinder: null, wheel: null }))).toBe(
      '/scan/grinder',
    );
    expect(
      resumePathFor(
        snapshot({
          grinderCondition: { ...GRINDER_OK, guardSecure: null },
          wheel: null,
        }),
      ),
    ).toBe('/scan/grinder');
  });
});
