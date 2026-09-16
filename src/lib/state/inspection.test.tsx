// 화면 간 값 전달 저장소 테스트.
//
// 여기서 값이 새면 결과 화면이 빈 값으로 판정하게 된다.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useInspection } from './inspection';
import type { TrialRunProgress } from '@/lib/safety/trialRun';
import type {
  CaptureQualityMetrics,
  GrinderCondition,
  GrinderSpec,
  OcrTelemetry,
  WheelCondition,
  WheelExamResult,
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
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

const GRINDER_CONDITION: GrinderCondition = {
  cordAndPlugUndamaged: true,
  bodyUndamaged: true,
  guardSecure: true,
  auxiliaryHandleSecure: true,
  spindleAssemblyUndamaged: true,
};

const PROGRESS: TrialRunProgress = {
  wheelReplaced: true,
  requiredSeconds: 180,
  startedAt: '2026-09-12T09:00:00.000Z',
  endsAt: '2026-09-12T09:03:00.000Z',
};

const WHEEL_CONDITION: WheelCondition = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

describe('useInspection', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.reset());
  });

  it('작업을 고르면 시작 시각을 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    const before = Date.now();
    act(() => result.current.setPurpose('cutting'));

    expect(result.current.declaredPurpose).toBe('cutting');
    expect(result.current.startedAt).toBeGreaterThanOrEqual(before);
  });

  it('OCR 원본과 사용자가 고친 최종값을 함께 보관한다', () => {
    // 최종값만 남기면 인식률을 잴 수 없다.
    const { result } = renderHook(() => useInspection());
    const corrected = { ...WHEEL, maxRPM: 12200 };
    const raw = { ...WHEEL, maxRPM: 1220 };

    act(() => result.current.setWheel(corrected, null, raw));

    expect(result.current.wheel?.maxRPM).toBe(12200);
    expect(result.current.wheelOcr?.maxRPM).toBe(1220);
  });

  it('새로고침에 대비해 sessionStorage에도 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER, null, GRINDER));

    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.grinderOcr') ?? 'null'),
    ).toMatchObject({ noLoadRPM: 11000 });
  });

  it('저장·복원 후에도 라벨 원문과 정규화된 유효기한이 함께 남는다', () => {
    // sessionStorage를 거치면 JSON 직렬화를 한 번 통과한다. 여기서 선택
    // 필드가 조용히 떨어지면 화면을 새로고침한 순간 유효기한 검사가 사라진다.
    const { result } = renderHook(() => useInspection());
    const ocr: WheelSpec = {
      ...WHEEL,
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: null,
        boreDiameter: 22.23,
        expiryRaw: '04/2023',
      },
      rpmSource: 'label',
      expiry: { year: 2023, month: 4 },
    };
    // 사용자가 라벨을 다시 보고 2027년으로 고친 경우.
    const confirmed: WheelSpec = { ...ocr, expiry: { year: 2027, month: 4 } };

    act(() => result.current.setWheel(confirmed, null, ocr));

    const storedWheel = JSON.parse(
      sessionStorage.getItem('wheelmatch.wheel') ?? 'null',
    ) as WheelSpec;
    const storedOcr = JSON.parse(
      sessionStorage.getItem('wheelmatch.wheelOcr') ?? 'null',
    ) as WheelSpec;

    // 라벨 원문은 양쪽 모두 그대로다. 사용자 수정이 덮지 않는다.
    expect(storedWheel.markings?.expiryRaw).toBe('04/2023');
    expect(storedOcr.markings?.expiryRaw).toBe('04/2023');
    // 정규화 값만 갈린다 — 무엇을 사람이 고쳤는지 되짚을 수 있다.
    expect(storedWheel.expiry).toEqual({ year: 2027, month: 4 });
    expect(storedOcr.expiry).toEqual({ year: 2023, month: 4 });
  });

  it('작업자가 직접 답한 숫돌 상태를 별도로 저장한다', () => {
    const { result } = renderHook(() => useInspection());

    act(() => result.current.setWheelCondition(WHEEL_CONDITION));

    expect(result.current.wheelCondition).toEqual(WHEEL_CONDITION);
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.wheelCondition') ?? 'null'),
    ).toEqual(WHEEL_CONDITION);
  });

  it('새 숫돌 값이 들어오면 이전 숫돌의 상태 확인을 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setWheelCondition(WHEEL_CONDITION));

    act(() => result.current.setWheel(WHEEL));

    expect(result.current.wheelCondition).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelCondition')).toBeNull();
  });

  it('작업자가 직접 답한 그라인더 장비 상태를 별도로 저장한다', () => {
    const { result } = renderHook(() => useInspection());

    act(() => result.current.setGrinder(GRINDER));
    act(() => result.current.setGrinderCondition(GRINDER_CONDITION));

    expect(result.current.grinderCondition).toEqual(GRINDER_CONDITION);
    expect(
      JSON.parse(
        sessionStorage.getItem('wheelmatch.grinderCondition') ?? 'null',
      ),
    ).toEqual(GRINDER_CONDITION);
    // 숫돌 쪽 확인과 섞이지 않는다.
    expect(result.current.wheelCondition).toBeNull();
  });

  it('새 그라인더가 들어오면 장비 상태와 그 뒤의 숫돌 값까지 전부 버린다', () => {
    // 기계가 달라지면 그 기계로 본 장비 상태도, 그 기계 기준의 규격 대조도
    // 근거를 잃는다. 남겨두면 다른 기계의 확인이 그대로 통과한다.
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() => {
      result.current.setGrinderCondition(GRINDER_CONDITION);
      result.current.setWheel(WHEEL, null, WHEEL);
      result.current.setWheelCondition(WHEEL_CONDITION);
    });

    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    expect(result.current.grinderCondition).toBeNull();
    expect(result.current.wheel).toBeNull();
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.wheelCondition).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.grinderCondition')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheel')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelCondition')).toBeNull();
    // 새 그라인더 값 자체는 남는다.
    expect(result.current.grinder?.noLoadRPM).toBe(8500);
  });

  it('새 숫돌이 들어오면 진행 중인 시험운전을 버린다', () => {
    // 제122조 ②의 시간은 그 숫돌을 달고 돌린 시간이다. 숫돌이 바뀌었는데
    // 타이머가 이어지면 새 숫돌은 한 번도 돌려보지 않고 통과한다.
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setWheel(WHEEL));
    act(() => result.current.setTrialRun(PROGRESS));

    act(() => result.current.setWheel({ ...WHEEL, maxRPM: 8500 }));

    expect(result.current.trialRun).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.trialRun')).toBeNull();
  });

  it('새 그라인더가 들어오면 진행 중인 시험운전을 버린다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() => result.current.setTrialRun(PROGRESS));

    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    expect(result.current.trialRun).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.trialRun')).toBeNull();
  });

  it('시험운전은 종료시각째로 저장돼 새로고침에도 이어진다', () => {
    // 남은 시간을 저장하면 화면이 꺼져 있던 만큼이 공짜가 된다.
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setTrialRun(PROGRESS));

    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.trialRun') ?? 'null'),
    ).toEqual(PROGRESS);
    expect(result.current.trialRun?.endsAt).toBe(PROGRESS.endsAt);
  });

  it('숫돌만 바뀔 때는 그라인더 장비 상태를 건드리지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() => result.current.setGrinderCondition(GRINDER_CONDITION));

    act(() => result.current.setWheel(WHEEL));

    expect(result.current.grinderCondition).toEqual(GRINDER_CONDITION);
  });

  it('reset은 OCR 원본과 시작 시각까지 모두 지운다', () => {
    // 지난 점검 값이 남아 다음 점검에 섞이면 엉뚱한 기록이 저장된다.
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setPurpose('grinding');
      result.current.setGrinder(GRINDER, null, GRINDER);
      result.current.setGrinderCondition(GRINDER_CONDITION);
      result.current.setWheel(WHEEL, null, WHEEL);
      result.current.setWheelCondition(WHEEL_CONDITION);
    });
    act(() => result.current.reset());

    expect(result.current.grinderOcr).toBeNull();
    expect(result.current.wheelOcr).toBeNull();
    expect(result.current.grinderCondition).toBeNull();
    expect(result.current.wheelCondition).toBeNull();
    expect(result.current.startedAt).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelOcr')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.grinderCondition')).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.wheelCondition')).toBeNull();
  });

  const CAPTURE_METRICS: CaptureQualityMetrics = {
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

  const OCR_TELEMETRY: OcrTelemetry = {
    engine: 'claude',
    model: 'claude-sonnet-5',
    inputTokens: 1500,
    outputTokens: 80,
    cacheReadTokens: 0,
    cacheCreationTokens: 1500,
    durationMs: 2100,
  };

  it('촬영·OCR 검증용 측정값을 함께 보관하고 새로고침에도 남는다', () => {
    const { result } = renderHook(() => useInspection());

    act(() =>
      result.current.setGrinder(
        GRINDER,
        null,
        GRINDER,
        CAPTURE_METRICS,
        OCR_TELEMETRY,
      ),
    );

    expect(result.current.grinderCaptureMetrics).toEqual(CAPTURE_METRICS);
    expect(result.current.grinderOcrTelemetry).toEqual(OCR_TELEMETRY);
    expect(
      JSON.parse(
        sessionStorage.getItem('wheelmatch.grinderCaptureMetrics') ?? 'null',
      ),
    ).toEqual(CAPTURE_METRICS);
  });

  it('측정값 수집이 실패해도(null) 판정에 필요한 값은 그대로 저장된다', () => {
    // 값 수집 실패가 점검을 막으면 안 된다 — null을 넘겨도 spec은 그대로 들어간다.
    const { result } = renderHook(() => useInspection());

    act(() => result.current.setWheel(WHEEL, null, WHEEL, null, null));

    expect(result.current.wheel).toEqual(WHEEL);
    expect(result.current.wheelCaptureMetrics).toBeNull();
    expect(result.current.wheelOcrTelemetry).toBeNull();
  });

  it('새 그라인더가 들어오면 숫돌의 검증용 측정값도 함께 버린다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setGrinder(GRINDER));
    act(() =>
      result.current.setWheel(
        WHEEL,
        null,
        WHEEL,
        CAPTURE_METRICS,
        OCR_TELEMETRY,
      ),
    );

    act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

    expect(result.current.wheelCaptureMetrics).toBeNull();
    expect(result.current.wheelOcrTelemetry).toBeNull();
  });

  it('reset은 검증용 측정값도 모두 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() =>
      result.current.setGrinder(
        GRINDER,
        null,
        GRINDER,
        CAPTURE_METRICS,
        OCR_TELEMETRY,
      ),
    );
    act(() => result.current.reset());

    expect(result.current.grinderCaptureMetrics).toBeNull();
    expect(result.current.grinderOcrTelemetry).toBeNull();
    expect(
      sessionStorage.getItem('wheelmatch.grinderCaptureMetrics'),
    ).toBeNull();
  });

  it('사진 없이 값만 갱신해도 이전 사진을 지우지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    const photo = new Blob(['x']);
    act(() => result.current.setWheel(WHEEL, photo));
    act(() => result.current.setWheel({ ...WHEEL, diameter: 100 }));

    expect(result.current.wheelImage).toBe(photo);
    expect(result.current.wheel?.diameter).toBe(100);
  });

  describe('다각도 외관 확인', () => {
    const EXAM: WheelExamResult = {
      status: 'not_observed',
      findings: [],
      photoQuality: [],
      model: 'claude-sonnet-5',
      promptVersion: 'test',
      analyzedAt: '2026-09-16T03:00:00.000Z',
    };

    function photos() {
      return {
        back: new Blob(['back']),
        edge: new Blob(['edge']),
        bore: new Blob(['bore']),
      };
    }

    it('결과와 사진을 함께 들고 있다 — 화면을 옮겨도 남는다', () => {
      // 모듈 저장소라 라우팅(촬영 → 결과 → 이력)으로는 사라지지 않는다.
      const { result } = renderHook(() => useInspection());
      const taken = photos();

      act(() =>
        result.current.setWheelExam({
          exam: EXAM,
          photos: taken,
          acknowledged: true,
        }),
      );

      expect(result.current.wheelExam).toEqual(EXAM);
      expect(result.current.wheelBackImage).toBe(taken.back);
      expect(result.current.wheelEdgeImage).toBe(taken.edge);
      expect(result.current.wheelBoreImage).toBe(taken.bore);
      expect(result.current.wheelExamAcknowledged).toBe(true);
    });

    it('sessionStorage에는 남기지 않는다 — 사진 없이 결과만 살아남지 않게', () => {
      // Blob은 sessionStorage에 담을 수 없다. 결과만 남기면 새로고침 뒤에
      // "사진 없이 확인된 결과"가 되어 다시 찍지 않고도 통과한 것처럼 보인다.
      const { result } = renderHook(() => useInspection());

      act(() =>
        result.current.setWheelExam({
          exam: EXAM,
          photos: photos(),
          acknowledged: true,
        }),
      );

      const stored = Object.keys(sessionStorage).filter((key) =>
        key.toLowerCase().includes('exam'),
      );
      expect(stored).toEqual([]);
    });

    it('새 숫돌이 들어오면 이전 숫돌의 확인 결과와 사진을 버린다', () => {
      const { result } = renderHook(() => useInspection());
      act(() =>
        result.current.setWheelExam({
          exam: EXAM,
          photos: photos(),
          acknowledged: true,
        }),
      );

      act(() => result.current.setWheel({ ...WHEEL, diameter: 115 }));

      expect(result.current.wheelExam).toBeNull();
      expect(result.current.wheelExamAcknowledged).toBe(false);
      expect(result.current.wheelBackImage).toBeNull();
      expect(result.current.wheelEdgeImage).toBeNull();
      expect(result.current.wheelBoreImage).toBeNull();
    });

    it('새 그라인더가 들어와도 함께 버린다', () => {
      const { result } = renderHook(() => useInspection());
      act(() =>
        result.current.setWheelExam({
          exam: EXAM,
          photos: photos(),
          acknowledged: true,
        }),
      );

      act(() => result.current.setGrinder({ ...GRINDER, noLoadRPM: 8500 }));

      expect(result.current.wheelExam).toBeNull();
      expect(result.current.wheelBackImage).toBeNull();
    });

    it('확인하지 못한 사실도 결과와 같은 자리에 남긴다', () => {
      // 실패를 결과로 바꾸지 않는다. 둘은 서로 다른 칸에 들어간다.
      const { result } = renderHook(() => useInspection());
      const taken = photos();

      act(() =>
        result.current.setWheelExam({
          exam: null,
          notRun: {
            reason: 'offline',
            acknowledgedAt: '2026-09-16T03:00:00.000Z',
          },
          photos: taken,
          acknowledged: false,
        }),
      );

      expect(result.current.wheelExam).toBeNull();
      expect(result.current.wheelExamNotRun).toEqual({
        reason: 'offline',
        acknowledgedAt: '2026-09-16T03:00:00.000Z',
      });
      // 사진은 그대로 남는다 — 확인하지 못했어도 무엇을 찍었는지는 증빙이다.
      expect(result.current.wheelBackImage).toBe(taken.back);
    });

    it('확인이 돌아간 경우에는 미실행 사유를 남기지 않는다', () => {
      const { result } = renderHook(() => useInspection());

      act(() =>
        result.current.setWheelExam({
          exam: EXAM,
          photos: photos(),
          acknowledged: true,
        }),
      );

      expect(result.current.wheelExamNotRun).toBeNull();
    });

    it('새 숫돌이 들어오면 미실행 사유도 버린다', () => {
      const { result } = renderHook(() => useInspection());
      act(() =>
        result.current.setWheelExam({
          exam: null,
          notRun: {
            reason: 'api_error',
            acknowledgedAt: '2026-09-16T03:00:00.000Z',
          },
          photos: photos(),
          acknowledged: false,
        }),
      );

      act(() => result.current.setWheel({ ...WHEEL, diameter: 115 }));

      expect(result.current.wheelExamNotRun).toBeNull();
    });

    it('reset은 확인 결과와 사진도 지운다', () => {
      const { result } = renderHook(() => useInspection());
      act(() =>
        result.current.setWheelExam({
          exam: EXAM,
          photos: photos(),
          acknowledged: true,
        }),
      );

      act(() => result.current.reset());

      expect(result.current.wheelExam).toBeNull();
      expect(result.current.wheelExamNotRun).toBeNull();
      expect(result.current.wheelExamAcknowledged).toBe(false);
      expect(result.current.wheelBoreImage).toBeNull();
    });
  });
});

describe('사진 상태 확인 기록', () => {
  const CHECK = {
    checkVersion: 'test',
    warnings: ['blur' as const],
    usedDespiteWarning: true,
    retakeCount: 2,
  };
  const EXAM_CHECKS = {
    back: { ...CHECK, retakeCount: 0 },
    edge: null,
    bore: { ...CHECK, warnings: [] },
  };
  const photo = () => new Blob(['x'], { type: 'image/jpeg' });

  beforeEach(() => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.reset());
  });

  it('명판·라벨 기록은 새로고침을 넘도록 sessionStorage에도 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setCaptureCheck('grinder', CHECK);
      result.current.setCaptureCheck('wheel', { ...CHECK, retakeCount: 0 });
    });

    expect(result.current.captureChecks.grinder).toEqual(CHECK);
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.captureChecks') ?? '{}'),
    ).toEqual({ grinder: CHECK, wheel: { ...CHECK, retakeCount: 0 } });
  });

  it('다각도 자리 기록은 사진과 수명을 같이 해 sessionStorage에 남기지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setCaptureCheck('wheel', CHECK);
      result.current.setWheelExam({
        exam: null,
        photos: { back: photo(), edge: photo(), bore: photo() },
        acknowledged: false,
        captureChecks: EXAM_CHECKS,
      });
    });

    expect(result.current.captureChecks.wheelBack).toEqual(EXAM_CHECKS.back);
    // 한 번도 찍지 않은(null) 자리는 기록하지 않는다.
    expect(result.current.captureChecks).not.toHaveProperty('wheelEdge');
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.captureChecks') ?? '{}'),
    ).toEqual({ wheel: CHECK });
  });

  it('새 숫돌이 들어오면 라벨·다각도 기록을 버리고 명판 기록만 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setCaptureCheck('grinder', CHECK);
      result.current.setCaptureCheck('wheel', CHECK);
      result.current.setWheelExam({
        exam: null,
        photos: { back: photo(), edge: photo(), bore: photo() },
        acknowledged: false,
        captureChecks: EXAM_CHECKS,
        captureMetrics: { back: null, edge: null, bore: null },
      });
    });

    act(() => result.current.setWheel({ ...WHEEL, diameter: 115 }));

    expect(result.current.captureChecks).toEqual({ grinder: CHECK });
    expect(result.current.wheelExamCaptureMetrics).toBeNull();
  });

  it('새 그라인더와 reset은 모든 기록을 버린다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setCaptureCheck('grinder', CHECK);
      result.current.setCaptureCheck('wheel', CHECK);
    });
    act(() => result.current.setGrinder(GRINDER));
    expect(result.current.captureChecks).toEqual({});

    act(() => result.current.setCaptureCheck('grinder', CHECK));
    act(() => result.current.reset());
    expect(result.current.captureChecks).toEqual({});
    expect(sessionStorage.getItem('wheelmatch.captureChecks')).toBeNull();
  });
});

describe('작업 조건', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.reset());
  });

  it('작업을 고르면서 넘긴 조건을 남기고, 넘기지 않으면 고르지 않은 것으로 둔다', () => {
    const { result } = renderHook(() => useInspection());

    act(() =>
      result.current.setPurpose('cutting', {
        material: 'steel',
        cooling: 'dry',
      }),
    );
    expect(result.current.workConditions).toEqual({
      material: 'steel',
      cooling: 'dry',
    });

    act(() => result.current.setPurpose('grinding'));
    expect(result.current.workConditions).toBeNull();
  });

  it('reset은 작업 조건도 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() =>
      result.current.setPurpose('cutting', {
        material: 'steel',
        cooling: 'dry',
      }),
    );

    act(() => result.current.reset());

    expect(result.current.workConditions).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.workConditions')).toBeNull();
  });
});
