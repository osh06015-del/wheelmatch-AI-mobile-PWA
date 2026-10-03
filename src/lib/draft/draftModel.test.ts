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
import { WHEEL_PURPOSE_LABEL, WHEEL_TYPE_LABEL } from '@/lib/i18n/checkText';
import {
  COOLING_LABEL,
  GUARD_LABEL,
  MATERIAL_LABEL,
  SPINDLE_LABEL,
} from '@/lib/i18n/profileLabels';
import { canSaveInspection } from '@/lib/safety/saveGuard';
import { isTrialRunStopped } from '@/lib/safety/trialRun';
import type { InspectionSnapshot } from '@/lib/state/inspection';
import type {
  CaptureQualityCheck,
  CaptureQualityMetrics,
  CaptureQualityWarning,
  CoolingMode,
  GrinderCondition,
  GrinderSpec,
  GuardType,
  OcrTelemetry,
  RpmSource,
  SafetyChecklist,
  SpindleThread,
  TrialRun,
  TrialRunFinding,
  TrialRunOutcome,
  VisibleDamage,
  WheelCondition,
  WheelConditionKey,
  WheelPurpose,
  WheelSpec,
  WheelType,
  WorkConditions,
  WorkMaterial,
} from '@/lib/rules/types';

// 목록형 필드의 모든 값. 손으로 적은 목록이 아니라 타입이 잠근 표에서 얻는다 —
// 값을 더하거나 이름을 바꾸면 타입 검사가 그 표부터 고치게 하므로, 값 하나가 빠진
// 채로 아래 테스트가 통과할 수 없다. 복구가 쓰는 허용 목록과는 다른 출처다.
// 표가 앱에 따로 없는 타입은 satisfies로 잠근다(빠진 값·남는 값 모두 타입 오류).
const EVERY_WHEEL_TYPE = Object.keys(WHEEL_TYPE_LABEL) as WheelType[];
const EVERY_WHEEL_PURPOSE = Object.keys(WHEEL_PURPOSE_LABEL) as WheelPurpose[];
const EVERY_VISIBLE_DAMAGE = Object.keys({
  suspected: true,
  none_visible: true,
  unknown: true,
} satisfies Record<VisibleDamage, true>) as VisibleDamage[];
const EVERY_SPINDLE_THREAD = Object.keys(SPINDLE_LABEL) as SpindleThread[];
const EVERY_GUARD_TYPE = Object.keys(GUARD_LABEL) as GuardType[];
const EVERY_RPM_SOURCE = Object.keys({
  label: true,
  converted: true,
  user: true,
} satisfies Record<RpmSource, true>) as RpmSource[];
type ExpiryReview = NonNullable<WheelSpec['expiryReview']>;
const EVERY_EXPIRY_REVIEW = Object.keys({
  marked: true,
  not_found: true,
  unreadable: true,
} satisfies Record<ExpiryReview, true>) as ExpiryReview[];

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
      // 빼기 전 버전은 그 확인을 요구하지 않는 종류에도 빈 값을 저장했다 —
      // 결과는 null, 확인 표시는 false, 측정값은 세 자리가 모두 null인 객체다.
      const draft = stored(buildDraft(snapshot(), NOW)) as {
        state: Record<string, unknown>;
      };
      draft.state.wheelExam = null;
      draft.state.wheelExamNotRun = null;
      draft.state.wheelExamAcknowledged = false;
      draft.state.wheelExamCaptureMetrics = {
        back: null,
        edge: null,
        bore: null,
      };
      expect(recoverDraft(draft).warnings).toEqual([]);
    });

    it('결과는 없고 그 사진의 상태 기록이나 확인 표시만 남아 있어도 버렸다고 알린다', () => {
      const onlyChecks = stored(buildDraft(snapshot(), NOW)) as {
        state: Record<string, unknown>;
      };
      onlyChecks.state.captureChecks = { wheel: CHECK, wheelEdge: CHECK };
      const recovery = recoverDraft(onlyChecks);
      expect(recovery.warnings).toEqual(['exam']);
      expect(recovery.snapshot?.captureChecks).toEqual({ wheel: CHECK });

      const onlyAcknowledged = stored(buildDraft(snapshot(), NOW)) as {
        state: Record<string, unknown>;
      };
      onlyAcknowledged.state.wheelExamAcknowledged = true;
      expect(recoverDraft(onlyAcknowledged).warnings).toEqual(['exam']);
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

/** 작업자가 확정한 숫돌 규격. 외관 의심과 원본 표시가 이미 옮겨져 있다 */
const CONFIRMED: WheelSpec = {
  ...WHEEL,
  visibleDamage: 'suspected',
  markings: {
    labeledRPM: 12200,
    peripheralSpeedMps: 80,
    boreDiameter: 22.23,
  },
  rpmSource: 'label',
};

/** 결과 화면까지 갔던 draft에서 규격 하나의 값만 바꾼다 */
function draftWith(
  key: 'grinder' | 'grinderOcr' | 'wheel' | 'wheelOcr',
  patch: Record<string, unknown>,
): unknown {
  const draft = stored(
    buildDraft(snapshot({ wheel: CONFIRMED, wheelOcr: WHEEL }), NOW),
  ) as { state: Record<string, Record<string, unknown>> };
  draft.state[key] = { ...draft.state[key], ...patch };
  return draft;
}

describe('recoverDraft — 숫돌 규격의 종류·용도·외관 허용 목록', () => {
  // 되살린 숫돌 규격은 결과 화면에서 곧바로 규칙엔진으로 들어간다. 엔진은 종류·
  // 용도·외관 값이 타입에 있는 값이라고 믿는다 — 목록에 없는 종류를 받으면 예외를
  // 던져 결과 화면이 죽고, 목록에 없는 용도는 근거 없는 용도 불일치(부적합)가 된다.
  // 그런 값이 든 기록은 백업에서도 조용히 빠진다(recordSanitize.ts).

  const UNLISTED = [
    ['종류', 'wheelType', 'resin_wheel'],
    ['용도', 'purpose', 'polishing'],
    ['외관', 'visibleDamage', 'cracked'],
  ] as const;

  it.each(UNLISTED)(
    '확정한 숫돌 규격의 %s 값이 목록에 없으면 숫돌 단계를 버리고 다시 하게 한다',
    (_name, field, value) => {
      const recovery = recoverDraft(draftWith('wheel', { [field]: value }));

      // 사람이 확정한 값을 앱이 비슷한 값이나 unknown으로 바꿔 이어가지 않는다.
      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.resumable).toBe(true);
      expect(recovery.snapshot?.wheel).toBeNull();
      expect(recovery.snapshot?.wheelOcr).toBeNull();
      expect(recovery.snapshot?.wheelCondition).toBeNull();
      expect(recovery.snapshot?.wheelImage).toBeNull();
      // 명판 쪽은 그대로다.
      expect(recovery.snapshot?.grinder).toEqual(GRINDER);
      expect(recovery.snapshot?.grinderCondition).toEqual(GRINDER_OK);
      expect(recovery.snapshot?.grinderImage).toBeInstanceOf(Blob);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/scan/wheel',
      );
    },
  );

  it.each([
    ['대소문자가 다른 값', 'FLAP_DISC'],
    ['앞뒤에 공백이 붙은 값', ' flap_disc '],
    ['빈 문자열', ''],
    // 종류별 표가 일반 객체라, 표에서 찾으면 "있는 값"으로 보이는 이름이다.
    ['객체 기본 속성과 같은 이름', 'constructor'],
  ])(
    '비슷해 보이는 종류도 목록에 없으면 받지 않는다 — %s',
    (_name, wheelType) => {
      const recovery = recoverDraft(draftWith('wheel', { wheelType }));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.wheel).toBeNull();
    },
  );

  it.each(UNLISTED)(
    'OCR 원본의 %s 값만 목록에 없으면 원본만 버리고 숫돌 단계는 이어간다',
    (_name, field, value) => {
      const recovery = recoverDraft(draftWith('wheelOcr', { [field]: value }));

      // 버린 것은 알린다. 고친 값을 모델이 읽은 원본으로 남기지 않는다.
      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.wheelOcr).toBeNull();
      // 확정값은 그대로다 — 그 OCR이 올린 외관 의심과 원본 표시는 확정할 때 이미
      // 숫돌 규격으로 옮겨져 있어 사라지지 않는다.
      expect(recovery.snapshot?.wheel).toEqual(CONFIRMED);
      expect(recovery.snapshot?.wheelCondition).toEqual(WHEEL_OK);
      expect(recovery.snapshot?.wheelImage).toBeInstanceOf(Blob);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  it.each(EVERY_WHEEL_TYPE)(
    '목록에 있는 종류는 경고 없이 되살린다 — %s',
    (wheelType) => {
      const wheel = { ...WHEEL, wheelType };
      const recovery = recoverDraft(
        stored(buildDraft(snapshot({ wheel, wheelOcr: wheel }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.wheel).toEqual(wheel);
      expect(recovery.snapshot?.wheelOcr).toEqual(wheel);
    },
  );

  it.each(EVERY_WHEEL_PURPOSE)(
    '목록에 있는 용도는 경고 없이 되살린다 — %s',
    (purpose) => {
      const wheel = { ...WHEEL, purpose };
      const recovery = recoverDraft(
        stored(buildDraft(snapshot({ wheel, wheelOcr: wheel }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.wheel).toEqual(wheel);
      expect(recovery.snapshot?.wheelOcr).toEqual(wheel);
    },
  );

  it.each(EVERY_VISIBLE_DAMAGE)(
    '목록에 있는 외관 값은 경고 없이 되살린다 — %s',
    (visibleDamage) => {
      const wheel = { ...WHEEL, visibleDamage };
      const recovery = recoverDraft(
        stored(buildDraft(snapshot({ wheel, wheelOcr: wheel }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.wheel).toEqual(wheel);
      expect(recovery.snapshot?.wheelOcr).toEqual(wheel);
    },
  );
});

describe('recoverDraft — 규격의 없어도 되는 필드(유효기한·원본 표시·덮개 등)', () => {
  // 없어도 되는 필드라고 형태를 보지 않으면, 어긋난 값이 규칙엔진에서 근거 없는
  // 통과를 만든다. 유효기한이 {year, month}가 아닌 값(빈 객체·문자열)이면 유효기한
  // 규칙이 "기한이 남아 있습니다. 표시 undefined/undefined"로 통과해, 만료됐거나
  // 기한을 읽지 못한 숫돌이 적합으로 나온다. 복구는 백업 정리(recordSanitize.ts)와
  // 같은 기준으로 규격 전체를 본다.

  const MALFORMED_WHEEL: ReadonlyArray<
    readonly [string, Record<string, unknown>]
  > = [
    ['유효기한 — 빈 객체', { expiry: {} }],
    ['유효기한 — 문자열', { expiry: '01/2020' }],
    ['유효기한 — 다른 이름의 필드', { expiry: { y: 2020, m: 1 } }],
    ['유효기한 — 배열', { expiry: [2020, 1] }],
    ['유효기한 — 숫자 자리에 문자열', { expiry: { year: '2020', month: '1' } }],
    ['유효기한 — 없는 달', { expiry: { year: 2020, month: 13 } }],
    ['유효기한 — 정수가 아닌 연도', { expiry: { year: 2020.5, month: 1 } }],
    ['유효기한 직접 확인 — 목록에 없는 값', { expiryReview: 'checked_ok' }],
    ['회전속도 출처 — 목록에 없는 값', { rpmSource: 'guess' }],
    ['원본 표시 — 객체가 아님', { markings: 'x' }],
    [
      '원본 표시 — 숫자 자리에 객체',
      {
        markings: {
          labeledRPM: {},
          peripheralSpeedMps: 80,
          boreDiameter: null,
        },
      },
    ],
    ['원본 표시 — 빠진 자리', { markings: { labeledRPM: 12200 } }],
    ['부속품 이름 — 숫자', { accessoryName: 42 }],
  ];

  const MALFORMED_GRINDER: ReadonlyArray<
    readonly [string, Record<string, unknown>]
  > = [
    ['스핀들 — 목록에 없는 값', { spindleThread: 'M99' }],
    ['덮개 종류 — 목록에 없는 값', { guardType: 'weird' }],
    ['덮개 크기 — 숫자 자리에 문자열', { guardSize: '125' }],
  ];

  it.each(MALFORMED_WHEEL)(
    '확정한 숫돌 규격이 어긋나면 숫돌 단계를 버리고 다시 하게 한다 — %s',
    (_name, patch) => {
      const recovery = recoverDraft(draftWith('wheel', patch));

      // 규칙엔진까지 가지 못한다. 어긋난 값을 비슷한 값으로 고쳐 이어가지도 않는다.
      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.wheel).toBeNull();
      expect(recovery.snapshot?.wheelOcr).toBeNull();
      expect(recovery.snapshot?.wheelCondition).toBeNull();
      // 명판 쪽은 그대로다.
      expect(recovery.snapshot?.grinder).toEqual(GRINDER);
      expect(recovery.snapshot?.grinderCondition).toEqual(GRINDER_OK);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/scan/wheel',
      );
    },
  );

  it.each(MALFORMED_WHEEL)(
    '숫돌 OCR 원본만 어긋나면 원본만 버리고 숫돌 단계는 이어간다 — %s',
    (_name, patch) => {
      const recovery = recoverDraft(draftWith('wheelOcr', patch));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.wheelOcr).toBeNull();
      expect(recovery.snapshot?.wheel).toEqual(CONFIRMED);
      expect(recovery.snapshot?.wheelCondition).toEqual(WHEEL_OK);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  it.each(MALFORMED_GRINDER)(
    '확정한 그라인더 규격이 어긋나면 명판 단계부터 다시 하게 한다 — %s',
    (_name, patch) => {
      const recovery = recoverDraft(draftWith('grinder', patch));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.resumable).toBe(true);
      expect(recovery.snapshot?.grinder).toBeNull();
      expect(recovery.snapshot?.grinderCondition).toBeNull();
      // 명판이 없으면 숫돌 단계도 근거가 없다.
      expect(recovery.snapshot?.wheel).toBeNull();
      expect(recovery.snapshot?.declaredPurpose).toBe('cutting');
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/scan/grinder',
      );
    },
  );

  it.each(MALFORMED_GRINDER)(
    '그라인더 OCR 원본만 어긋나면 원본만 버리고 나머지는 이어간다 — %s',
    (_name, patch) => {
      const recovery = recoverDraft(draftWith('grinderOcr', patch));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.grinderOcr).toBeNull();
      expect(recovery.snapshot?.grinder).toEqual(GRINDER);
      expect(recovery.snapshot?.wheel).toEqual(CONFIRMED);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  /** 값이 온전한 규격은 경고 없이 그대로 되살아나야 한다 */
  function expectRestored(overrides: Partial<InspectionSnapshot>) {
    const base = snapshot(overrides);
    const recovery = recoverDraft(stored(buildDraft(base, NOW)));

    expect(recovery.warnings).toEqual([]);
    expect(recovery.snapshot?.grinder).toEqual(base.grinder);
    expect(recovery.snapshot?.wheel).toEqual(base.wheel);
  }

  it('유효기한이 없거나(null) 월/연이 온전하면 그대로 되살린다', () => {
    expectRestored({ wheel: { ...WHEEL, expiry: null } });
    expectRestored({ wheel: { ...WHEEL, expiry: { year: 2027, month: 4 } } });
    expectRestored({ wheel: { ...WHEEL, expiry: { year: 2027, month: 12 } } });
  });

  it('원본 표시는 유효기한 원문이 있어도 없어도 그대로 되살린다', () => {
    const markings = {
      labeledRPM: 12200,
      peripheralSpeedMps: null,
      boreDiameter: 22.23,
    };
    expectRestored({ wheel: { ...WHEEL, markings } });
    expectRestored({
      wheel: { ...WHEEL, markings: { ...markings, expiryRaw: '04/2027' } },
    });
    expectRestored({
      wheel: { ...WHEEL, markings: { ...markings, expiryRaw: null } },
    });
  });

  it('부속품 이름은 문자열이어도 null이어도 그대로 되살린다', () => {
    expectRestored({ wheel: { ...WHEEL, accessoryName: null } });
    expectRestored({ wheel: { ...WHEEL, accessoryName: '연마 디스크' } });
  });

  it.each(EVERY_RPM_SOURCE)(
    '목록에 있는 회전속도 출처는 그대로 되살린다 — %s',
    (rpmSource) => {
      expectRestored({ wheel: { ...WHEEL, rpmSource } });
    },
  );

  it.each(EVERY_EXPIRY_REVIEW)(
    '목록에 있는 유효기한 직접 확인 응답은 그대로 되살린다 — %s',
    (expiryReview) => {
      expectRestored({ wheel: { ...WHEEL, expiryReview } });
    },
  );

  it.each(EVERY_SPINDLE_THREAD)(
    '목록에 있는 스핀들 규격은 그대로 되살린다 — %s',
    (spindleThread) => {
      expectRestored({ grinder: { ...GRINDER, spindleThread } });
    },
  );

  it.each(EVERY_GUARD_TYPE)(
    '목록에 있는 덮개 종류는 그대로 되살린다 — %s',
    (guardType) => {
      expectRestored({ grinder: { ...GRINDER, guardType } });
    },
  );

  it('덮개 크기는 숫자여도 null이어도 그대로 되살린다', () => {
    expectRestored({ grinder: { ...GRINDER, guardSize: 125 } });
    expectRestored({ grinder: { ...GRINDER, guardSize: null } });
  });
});

// ── 규격이 아닌 값 ──
//
// 아래 값들의 목록형 필드도 위와 같이 타입이 잠근 표에서 얻는다.
const EVERY_WORK_MATERIAL = Object.keys(MATERIAL_LABEL) as WorkMaterial[];
const EVERY_COOLING_MODE = Object.keys(COOLING_LABEL) as CoolingMode[];
const EVERY_TRIAL_RUN_OUTCOME = Object.keys({
  normal: true,
  abnormal: true,
} satisfies Record<TrialRunOutcome, true>) as TrialRunOutcome[];
const EVERY_TRIAL_RUN_FINDING = Object.keys({
  vibration: true,
  noise: true,
  wobble: true,
  wheelDamage: true,
  equipment: true,
} satisfies Record<TrialRunFinding, true>) as TrialRunFinding[];
const EVERY_CAPTURE_WARNING = Object.keys({
  low_resolution: true,
  blur: true,
  too_dark: true,
  overexposed: true,
} satisfies Record<CaptureQualityWarning, true>) as CaptureQualityWarning[];
type OcrEngine = OcrTelemetry['engine'];
const EVERY_OCR_ENGINE = Object.keys({
  claude: true,
  tesseract: true,
} satisfies Record<OcrEngine, true>) as OcrEngine[];
const EVERY_WHEEL_CONDITION_KEY = Object.keys({
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
  diamondRimIntact: true,
  flapsIntact: true,
  noDelamination: true,
  flapBackingIntact: true,
  threadAdapterFit: true,
  evenWear: true,
  dedicatedGuardFitted: true,
  wiresIntact: true,
  backingPadUndamaged: true,
} satisfies Record<WheelConditionKey, true>) as WheelConditionKey[];
const EVERY_CHECKLIST_KEY = Object.keys({
  guardCover: true,
  auxiliaryHandle: true,
  wheelDamage: true,
  ppe: true,
  workpieceSecured: true,
  surroundingsClear: true,
  sparkDirection: true,
} satisfies Record<keyof SafetyChecklist, true>) as (keyof SafetyChecklist)[];

const WORK: WorkConditions = { material: 'steel', cooling: 'dry' };

const CHECKLIST: SafetyChecklist = {
  guardCover: null,
  auxiliaryHandle: null,
  wheelDamage: null,
  ppe: true,
  workpieceSecured: true,
  surroundingsClear: true,
};

const TRIAL_RUN: TrialRun = {
  wheelReplaced: false,
  requiredSeconds: 60,
  startedAt: '2026-09-17T02:00:00.000Z',
  finishedAt: '2026-09-17T02:01:01.000Z',
  elapsedSeconds: 61,
  outcome: 'normal',
  findings: [],
  completed: true,
};

const METRICS: CaptureQualityMetrics = {
  originalWidth: 4032,
  originalHeight: 3024,
  originalBytes: 7_580_000,
  uploadWidth: 2048,
  uploadHeight: 1536,
  uploadBytes: 1_830_000,
  meanBrightness: 132.5,
  contrast: 48.1,
  darkPixelRatio: 0.02,
  brightPixelRatio: 0.01,
  blurMetric: 913.4,
  optimizeMs: 210,
};

const TELEMETRY: OcrTelemetry = {
  engine: 'claude',
  model: 'claude-sonnet-5',
  inputTokens: 1500,
  outputTokens: 80,
  cacheReadTokens: 0,
  cacheCreationTokens: 1500,
  durationMs: 2100,
};

const CHECK: CaptureQualityCheck = {
  checkVersion: 'test',
  warnings: [],
  usedDespiteWarning: false,
  retakeCount: 0,
};

/** 결과 화면에서 시험운전까지 마친 점검 */
function finished(
  overrides: Partial<InspectionSnapshot> = {},
): InspectionSnapshot {
  return snapshot({
    workConditions: WORK,
    checklist: CHECKLIST,
    trialRunRecord: TRIAL_RUN,
    grinderCaptureMetrics: METRICS,
    wheelCaptureMetrics: METRICS,
    grinderOcrTelemetry: TELEMETRY,
    wheelOcrTelemetry: TELEMETRY,
    captureChecks: { grinder: CHECK, wheel: CHECK },
    ...overrides,
  });
}

/** 그 draft에서 저장된 값 하나를 통째로 바꾼다 */
function finishedDraftWith(key: string, value: unknown): unknown {
  const draft = stored(buildDraft(finished(), NOW)) as {
    state: Record<string, unknown>;
  };
  draft.state[key] = value;
  return draft;
}

/** 항목 하나가 아예 없는 값. undefined를 넣은 것과 다르다 — 키가 없다 */
function without<T extends object>(value: T, key: keyof T): Partial<T> {
  const copy: Partial<T> = { ...value };
  delete copy[key];
  return copy;
}

/** 적합 조합에서 이 시험운전 기록으로 저장이 열리는가 */
function opensSave(trialRunRecord: TrialRun | null | undefined): boolean {
  return canSaveInspection({
    grinderConditionComplete: true,
    wheelConditionComplete: true,
    checklistComplete: true,
    verdict: 'COMPATIBLE',
    trialRunRecord: trialRunRecord ?? null,
  });
}

type Malformed = ReadonlyArray<readonly [string, unknown]>;

describe('recoverDraft — 규격이 아닌 값(상태 확인·체크리스트·시험운전 기록·작업 조건·측정값)', () => {
  // 규격만 검사하고 나머지를 "객체인가"·"값이 boolean인가"로만 보면, 어긋난 값이
  // 화면과 기록으로 그대로 들어간다. 마친 시험운전 기록이 빈 객체여도 "시험운전을
  // 마쳤고 이상이 없었다"로 읽혀 저장이 열리고, 그런 값이 든 기록은 백업에서 조용히
  // 빠진다. 복구는 이 값들도 백업 정리(recordSanitize.ts)와 같은 기준으로 본다.
  //
  // 어긋난 값은 그 값만 버린다. 버려진 것이 작업자의 확인(상태 확인·체크리스트·
  // 시험운전)이면 그 확인은 하지 않은 것이 되어 화면이 다시 하게 한다.

  it('온전한 값은 경고 없이 모두 되살린다', () => {
    const base = finished();
    const recovery = recoverDraft(stored(buildDraft(base, NOW)));

    expect(recovery.warnings).toEqual([]);
    expect(recovery.snapshot?.workConditions).toEqual(WORK);
    expect(recovery.snapshot?.grinderCondition).toEqual(GRINDER_OK);
    expect(recovery.snapshot?.wheelCondition).toEqual(WHEEL_OK);
    expect(recovery.snapshot?.checklist).toEqual(CHECKLIST);
    expect(recovery.snapshot?.trialRunRecord).toEqual(TRIAL_RUN);
    expect(recovery.snapshot?.grinderCaptureMetrics).toEqual(METRICS);
    expect(recovery.snapshot?.wheelCaptureMetrics).toEqual(METRICS);
    expect(recovery.snapshot?.grinderOcrTelemetry).toEqual(TELEMETRY);
    expect(recovery.snapshot?.wheelOcrTelemetry).toEqual(TELEMETRY);
    expect(recovery.snapshot?.captureChecks).toEqual({
      grinder: CHECK,
      wheel: CHECK,
    });
    expect(opensSave(recovery.snapshot?.trialRunRecord)).toBe(true);
  });

  // ── 마친 시험운전 기록 ──

  const MALFORMED_TRIAL_RUN: Malformed = [
    ['빈 객체', {}],
    ['결과가 없는 값', without(TRIAL_RUN, 'outcome')],
    ['결과 — 목록에 없는 값', { ...TRIAL_RUN, outcome: 'fine' }],
    [
      '이상 항목 — 목록에 없는 값',
      { ...TRIAL_RUN, outcome: 'abnormal', findings: ['smell'] },
    ],
    ['이상 항목 — 배열이 아님', { ...TRIAL_RUN, findings: 'none' }],
    ['시작 시각 — 날짜가 아님', { ...TRIAL_RUN, startedAt: '아까' }],
    ['끝난 시각이 없는 값', without(TRIAL_RUN, 'finishedAt')],
    ['교체 여부 — boolean이 아님', { ...TRIAL_RUN, wheelReplaced: 'no' }],
    ['요구 시간 — 정수가 아님', { ...TRIAL_RUN, requiredSeconds: 60.5 }],
    ['흐른 시간 — 숫자가 아님', { ...TRIAL_RUN, elapsedSeconds: '61' }],
    ['완료 표시가 없는 값', without(TRIAL_RUN, 'completed')],
    ['배열', [TRIAL_RUN]],
  ];

  it.each(MALFORMED_TRIAL_RUN)(
    '마친 시험운전 기록이 어긋나면 기록만 버려 시험운전을 다시 하게 한다 — %s',
    (_name, value) => {
      const recovery = recoverDraft(finishedDraftWith('trialRunRecord', value));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.trialRunRecord).toBeNull();
      // 하지 않은 것으로 읽힌다 — 적합 조합이면 시험운전 전에는 저장이 열리지 않는다.
      expect(opensSave(recovery.snapshot?.trialRunRecord)).toBe(false);
      // 규격·상태 확인·체크리스트는 그대로다. 결과 화면에서 시험운전만 다시 한다.
      expect(recovery.snapshot?.wheel).toEqual(WHEEL);
      expect(recovery.snapshot?.wheelCondition).toEqual(WHEEL_OK);
      expect(recovery.snapshot?.checklist).toEqual(CHECKLIST);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  it.each(EVERY_TRIAL_RUN_OUTCOME)(
    '목록에 있는 시험운전 결과는 그대로 되살린다 — %s',
    (outcome) => {
      // 이상이 있었던 기록(중지)도 기록이다. 버리면 중지 안내가 사라진다.
      const trialRunRecord: TrialRun = {
        ...TRIAL_RUN,
        outcome,
        findings: outcome === 'abnormal' ? EVERY_TRIAL_RUN_FINDING : [],
      };
      const recovery = recoverDraft(
        stored(buildDraft(finished({ trialRunRecord }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.trialRunRecord).toEqual(trialRunRecord);
      expect(isTrialRunStopped(recovery.snapshot?.trialRunRecord ?? null)).toBe(
        outcome === 'abnormal',
      );
    },
  );

  // ── 체크리스트 ──

  const MALFORMED_CHECKLIST: Malformed = [
    ['빈 객체', {}],
    ['빠진 기본 항목', without(CHECKLIST, 'ppe')],
    ['boolean 자리에 문자열', { ...CHECKLIST, ppe: 'yes' }],
    ['선택 항목에 숫자', { ...CHECKLIST, workpieceSecured: 1 }],
    ['배열', [true, true, true]],
  ];

  it.each(MALFORMED_CHECKLIST)(
    '체크리스트가 어긋나면 체크리스트만 버려 다시 누르게 한다 — %s',
    (_name, value) => {
      const recovery = recoverDraft(finishedDraftWith('checklist', value));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.checklist).toBeNull();
      expect(recovery.snapshot?.wheel).toEqual(WHEEL);
      expect(recovery.snapshot?.wheelCondition).toEqual(WHEEL_OK);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  it('체크리스트는 선택 항목이 있어도 없어도 그대로 되살린다', () => {
    const every = Object.fromEntries(
      EVERY_CHECKLIST_KEY.map((key) => [key, true]),
    ) as unknown as SafetyChecklist;
    const required: SafetyChecklist = {
      guardCover: true,
      auxiliaryHandle: false,
      wheelDamage: null,
      ppe: true,
    };
    for (const checklist of [every, required]) {
      const recovery = recoverDraft(
        stored(buildDraft(finished({ checklist }), NOW)),
      );
      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.checklist).toEqual(checklist);
    }
  });

  // ── 작업자의 상태 확인 ──

  const MALFORMED_GRINDER_CONDITION: Malformed = [
    ['빈 객체', {}],
    ['빠진 항목', without(GRINDER_OK, 'guardSecure')],
    ['boolean 자리에 문자열', { ...GRINDER_OK, guardSecure: 'true' }],
    ['boolean 자리에 숫자', { ...GRINDER_OK, bodyUndamaged: 1 }],
    ['배열', [true, true, true, true, true]],
  ];

  it.each(MALFORMED_GRINDER_CONDITION)(
    '장비 상태 확인이 어긋나면 그 확인만 버려 명판 단계에서 다시 하게 한다 — %s',
    (_name, value) => {
      const recovery = recoverDraft(
        finishedDraftWith('grinderCondition', value),
      );

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.grinderCondition).toBeNull();
      // 확정한 규격을 버리지는 않는다 — 어긋난 것은 규격이 아니다.
      expect(recovery.snapshot?.grinder).toEqual(GRINDER);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/scan/grinder',
      );
    },
  );

  const MALFORMED_WHEEL_CONDITION: Malformed = [
    ['빈 객체', {}],
    ['빠진 기본 항목', without(WHEEL_OK, 'labelLegible')],
    // 구버전 항목이다. Gate는 false가 아닌지만 보므로 아래 둘은 Gate를 그대로 지난다.
    ['빠진 기한 항목', without(WHEEL_OK, 'expiryValid')],
    ['기한 항목에 문자열', { ...WHEEL_OK, expiryValid: 'false' }],
    ['boolean 자리에 문자열', { ...WHEEL_OK, damageFree: 'true' }],
    ['종류별 항목에 숫자', { ...WHEEL_OK, flapsIntact: 1 }],
    ['배열', [true, true, true, true]],
  ];

  it.each(MALFORMED_WHEEL_CONDITION)(
    '숫돌 상태 확인이 어긋나면 그 확인만 버려 숫돌 단계에서 다시 하게 한다 — %s',
    (_name, value) => {
      const recovery = recoverDraft(finishedDraftWith('wheelCondition', value));

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.wheelCondition).toBeNull();
      expect(recovery.snapshot?.wheel).toEqual(WHEEL);
      expect(recovery.snapshot?.grinderCondition).toEqual(GRINDER_OK);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/scan/wheel',
      );
    },
  );

  it('숫돌 상태 확인은 종류별 항목이 어느 것이 있어도 그대로 되살린다', () => {
    const wheelCondition = Object.fromEntries(
      EVERY_WHEEL_CONDITION_KEY.map((key) => [key, true]),
    ) as unknown as WheelCondition;
    const recovery = recoverDraft(
      stored(buildDraft(finished({ wheelCondition }), NOW)),
    );

    expect(recovery.warnings).toEqual([]);
    expect(recovery.snapshot?.wheelCondition).toEqual(wheelCondition);
  });

  // ── 작업 조건 ──

  const MALFORMED_WORK: Malformed = [
    ['빈 객체', {}],
    ['재료 — 목록에 없는 값', { ...WORK, material: 'wood' }],
    ['건식/습식 — 목록에 없는 값', { ...WORK, cooling: 'oil' }],
    ['빠진 자리', without(WORK, 'cooling')],
    ['배열', ['steel', 'dry']],
  ];

  it.each(MALFORMED_WORK)(
    '작업 조건이 어긋나면 그 값만 버린다 — %s',
    (_name, value) => {
      const recovery = recoverDraft(finishedDraftWith('workConditions', value));

      expect(recovery.warnings).toEqual(['schema']);
      // 고르지 않은 것과 같다(화면·기록에서 unknown으로 읽는다). 비슷한 값으로
      // 바꾸지 않는다.
      expect(recovery.snapshot?.workConditions).toBeNull();
      expect(recovery.snapshot?.declaredPurpose).toBe('cutting');
      expect(recovery.snapshot?.trialRunRecord).toEqual(TRIAL_RUN);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  it.each(EVERY_WORK_MATERIAL)(
    '목록에 있는 재료는 그대로 되살린다 — %s',
    (material) => {
      const workConditions: WorkConditions = { ...WORK, material };
      const recovery = recoverDraft(
        stored(buildDraft(finished({ workConditions }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.workConditions).toEqual(workConditions);
    },
  );

  it.each(EVERY_COOLING_MODE)(
    '목록에 있는 건식/습식 값은 그대로 되살린다 — %s',
    (cooling) => {
      const workConditions: WorkConditions = { ...WORK, cooling };
      const recovery = recoverDraft(
        stored(buildDraft(finished({ workConditions }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.workConditions).toEqual(workConditions);
    },
  );

  // ── 검증용 측정값 ──

  const MALFORMED_METRICS: Malformed = [
    ['빈 객체', {}],
    ['숫자 자리에 문자열', { ...METRICS, uploadBytes: '1830000' }],
    ['빠진 자리', without(METRICS, 'blurMetric')],
    ['배열', [4032, 3024]],
  ];

  const MALFORMED_TELEMETRY: Malformed = [
    ['빈 객체', {}],
    ['엔진 — 목록에 없는 값', { ...TELEMETRY, engine: 'gpt' }],
    ['토큰 수 — 숫자 자리에 문자열', { ...TELEMETRY, inputTokens: '1500' }],
    ['모델 이름 — 숫자', { ...TELEMETRY, model: 5 }],
    ['빠진 자리', without(TELEMETRY, 'durationMs')],
  ];

  it.each(
    (['grinderCaptureMetrics', 'wheelCaptureMetrics'] as const).flatMap((key) =>
      MALFORMED_METRICS.map(([name, value]) => [key, name, value] as const),
    ),
  )('촬영 측정값이 어긋나면 그 값만 버린다 — %s: %s', (key, _name, value) => {
    const recovery = recoverDraft(finishedDraftWith(key, value));

    expect(recovery.warnings).toEqual(['schema']);
    expect(recovery.snapshot?.[key]).toBeNull();
    // 측정값은 점검 흐름과 무관하다 — 버려도 이어갈 화면이 달라지지 않는다.
    expect(recovery.snapshot?.wheel).toEqual(WHEEL);
    expect(recovery.snapshot?.trialRunRecord).toEqual(TRIAL_RUN);
    expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
      '/result',
    );
  });

  it.each(
    (['grinderOcrTelemetry', 'wheelOcrTelemetry'] as const).flatMap((key) =>
      MALFORMED_TELEMETRY.map(([name, value]) => [key, name, value] as const),
    ),
  )('OCR 측정값이 어긋나면 그 값만 버린다 — %s: %s', (key, _name, value) => {
    const recovery = recoverDraft(finishedDraftWith(key, value));

    expect(recovery.warnings).toEqual(['schema']);
    expect(recovery.snapshot?.[key]).toBeNull();
    expect(recovery.snapshot?.wheel).toEqual(WHEEL);
    expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
      '/result',
    );
  });

  it('측정에 실패해 null로 채운 측정값은 어긋난 값이 아니다', () => {
    const empty = Object.fromEntries(
      Object.keys(METRICS).map((key) => [key, null]),
    ) as unknown as CaptureQualityMetrics;
    const recovery = recoverDraft(
      stored(
        buildDraft(
          finished({ grinderCaptureMetrics: empty, wheelCaptureMetrics: null }),
          NOW,
        ),
      ),
    );

    expect(recovery.warnings).toEqual([]);
    expect(recovery.snapshot?.grinderCaptureMetrics).toEqual(empty);
    expect(recovery.snapshot?.wheelCaptureMetrics).toBeNull();
  });

  it.each(EVERY_OCR_ENGINE)(
    '목록에 있는 OCR 엔진은 그대로 되살린다 — %s',
    (engine) => {
      const telemetry: OcrTelemetry = { ...TELEMETRY, engine, model: null };
      const recovery = recoverDraft(
        stored(buildDraft(finished({ wheelOcrTelemetry: telemetry }), NOW)),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.wheelOcrTelemetry).toEqual(telemetry);
    },
  );

  // ── 시작 시각 ──

  it.each([
    ['문자열', '2026-09-17T02:00:00.000Z'],
    // IndexedDB는 JSON과 달리 NaN·Infinity를 그대로 담는다.
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['객체', {}],
  ])('시작 시각이 유한한 숫자가 아니면 버린다 — %s', (_name, value) => {
    const recovery = recoverDraft(finishedDraftWith('startedAt', value));

    expect(recovery.warnings).toEqual(['schema']);
    // 소요시간을 지어내지 않는다 — 시작 시각이 없으면 기록에 남기지 않는다.
    expect(recovery.snapshot?.startedAt).toBeNull();
    expect(recovery.snapshot?.wheel).toEqual(WHEEL);
    expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
      '/result',
    );
  });

  // ── 사진 상태 기록 ──

  const MALFORMED_CHECK: Malformed = [
    ['빈 객체', {}],
    ['경고 — 목록에 없는 값', { ...CHECK, warnings: ['smudge'] }],
    ['경고 — 배열이 아님', { ...CHECK, warnings: 'blur' }],
    ['다시 찍은 횟수 — 정수가 아님', { ...CHECK, retakeCount: 1.5 }],
    ['빠진 자리', without(CHECK, 'usedDespiteWarning')],
  ];

  it.each(MALFORMED_CHECK)(
    '사진 상태 기록은 어긋난 자리만 버린다 — %s',
    (_name, value) => {
      const recovery = recoverDraft(
        finishedDraftWith('captureChecks', { grinder: CHECK, wheel: value }),
      );

      expect(recovery.warnings).toEqual(['schema']);
      expect(recovery.snapshot?.captureChecks).toEqual({ grinder: CHECK });
      expect(recovery.snapshot?.wheel).toEqual(WHEEL);
      expect(recovery.snapshot ? resumePathFor(recovery.snapshot) : null).toBe(
        '/result',
      );
    },
  );

  it('사진 상태 기록의 한 자리가 객체가 아니어도 버렸다고 알린다', () => {
    const recovery = recoverDraft(
      finishedDraftWith('captureChecks', { grinder: 'blur', wheel: CHECK }),
    );

    expect(recovery.warnings).toEqual(['schema']);
    expect(recovery.snapshot?.captureChecks).toEqual({ wheel: CHECK });
  });

  it.each(EVERY_CAPTURE_WARNING)(
    '목록에 있는 사진 경고는 그대로 되살린다 — %s',
    (warning) => {
      const check: CaptureQualityCheck = {
        ...CHECK,
        warnings: [warning],
        usedDespiteWarning: true,
        retakeCount: 2,
      };
      const recovery = recoverDraft(
        stored(
          buildDraft(
            finished({ captureChecks: { grinder: check, wheel: check } }),
            NOW,
          ),
        ),
      );

      expect(recovery.warnings).toEqual([]);
      expect(recovery.snapshot?.captureChecks).toEqual({
        grinder: check,
        wheel: check,
      });
    },
  );
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
