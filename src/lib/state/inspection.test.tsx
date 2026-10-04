// 화면 간 값 전달 저장소 테스트.
//
// 여기서 값이 새면 결과 화면이 빈 값으로 판정하게 된다.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  limitCauseFor,
  limitCausesOf,
  readOfflineSlots,
  useInspection,
  type ReanalysisInput,
} from './inspection';
import { MAX_REANALYSES } from '@/lib/record/reanalysis';
import type { TrialRunProgress } from '@/lib/safety/trialRun';
import type {
  CaptureQualityMetrics,
  GrinderCondition,
  GrinderSpec,
  OcrTelemetry,
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

  it('진행 중 점검은 다각도 외관 확인 상태를 들고 있지 않다', () => {
    // 뒷면·가장자리·중심구멍 사진과 AI 확인 단계는 점검 흐름에서 뺐다. 받는
    // 화면 없이 상태만 되살아나면 하지 않은 확인이 기록에 실려 나간다.
    const { result } = renderHook(() => useInspection());
    for (const key of [
      'wheelExam',
      'wheelExamNotRun',
      'wheelExamAcknowledged',
      'wheelExamCaptureMetrics',
      'wheelBackImage',
      'wheelEdgeImage',
      'wheelBoreImage',
      'setWheelExam',
    ]) {
      expect(result.current).not.toHaveProperty(key);
    }
  });
});

describe('사진 상태 확인 기록', () => {
  const CHECK = {
    checkVersion: 'test',
    warnings: ['blur' as const],
    usedDespiteWarning: true,
    retakeCount: 2,
  };

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

  it('새 숫돌이 들어오면 라벨 기록을 버리고 명판 기록만 남긴다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setCaptureCheck('grinder', CHECK);
      result.current.setCaptureCheck('wheel', CHECK);
    });

    act(() => result.current.setWheel({ ...WHEEL, diameter: 115 }));

    expect(result.current.captureChecks).toEqual({ grinder: CHECK });
    // 새로고침용 저장도 같은 상태여야 한다 — 어긋나면 새로고침 뒤에 이전 숫돌의
    // 사진 기록이 되살아난다.
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.captureChecks') ?? '{}'),
    ).toEqual({ grinder: CHECK });
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

describe('제한 대조 표시와 진행 중 점검 복구', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.reset());
  });

  it('단계 하나라도 오프라인으로 넣으면 점검 전체가 offline_limited다', () => {
    const { result } = renderHook(() => useInspection());
    expect(result.current.analysisMode).toBe('online');

    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setOfflineSlot('grinder', true);
    });
    expect(result.current.analysisMode).toBe('offline_limited');
    // 새로고침을 넘어간다.
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.offlineSlots') ?? 'null'),
    ).toEqual({ grinder: true, wheel: false });

    // 숫돌을 새로 넣어도 오프라인으로 넣은 명판 표시는 풀리지 않는다.
    act(() => result.current.setWheel(WHEEL));
    expect(result.current.analysisMode).toBe('offline_limited');

    // 명판을 새로 넣으면(온라인으로 다시 읽으면) 풀린다.
    act(() => result.current.setGrinder(GRINDER));
    expect(result.current.analysisMode).toBe('online');
  });

  it('서버 재분석을 받아들여도 AI 값은 재분석 판독으로만 남고, 최종값과 OCR 원본 자리는 그대로다', () => {
    const { result } = renderHook(() => useInspection());
    const typed: GrinderSpec = { ...GRINDER, rawText: '', confidence: 'high' };
    const plate = new Blob(['plate'], { type: 'image/jpeg' });
    act(() => {
      result.current.setGrinder(typed, plate, null);
      result.current.setOfflineSlot('grinder', true);
    });

    const ai: GrinderSpec = { ...GRINDER, rawText: 'AI', confidence: 'medium' };
    const reading = { grinderOcr: ai, grinderOcrTelemetry: null };
    act(() => {
      result.current.recordReanalysis(reading, {
        grinderImage: plate,
        wheelImage: null,
      });
      result.current.applyReanalysis(reading);
    });

    expect(result.current.grinder).toBe(typed);
    // 직접 넣은 명판에는 「작업자가 고치기 전의 OCR 원본」이 없다. 작업자가 고친 적
    // 없는 재분석 판독으로 그 자리를 채우지 않는다.
    expect(result.current.grinderOcr).toBeNull();
    expect(result.current.reanalyses).toHaveLength(1);
    expect(result.current.reanalyses?.[0]).toMatchObject({
      grinderOcr: ai,
      wheelOcr: null,
    });
    expect(result.current.reanalyses?.[0]?.acceptedAt).not.toBeNull();
    expect(result.current.analysisMode).toBe('online');
  });

  describe('숫돌 라벨 재분석 — AI가 낸 외관 의심과 원본 표시', () => {
    // 확정값(wheel)에서 visibleDamage와 markings는 작업자가 확인 화면에서 본 값이
    // 아니라 OCR이 실어 온 값이다(confirm.ts). 직접 입력이면 둘 다 비어 있다.
    // 재분석을 받아들여 온라인 대조로 바뀌면 판정은 확정값만 보므로, 여기서 옮기지
    // 않으면 AI가 올린 의심과 표기 대조가 판정에서 통째로 빠진다.

    /** 작업자가 라벨을 직접 보고 넣은 값. 외관 판독도 원본 표시도 없다 */
    const TYPED: WheelSpec = {
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      visibleDamage: 'unknown',
      rpmSource: 'user',
      expiry: { year: 2099, month: 12 },
      expiryReview: 'marked',
      rawText: '',
      confidence: 'high',
    };

    /** 서버가 같은 라벨 사진에서 읽은 값 */
    const AI: WheelSpec = {
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      visibleDamage: 'none_visible',
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: 80,
        boreDiameter: 22.23,
        expiryRaw: '12/2099',
      },
      rpmSource: 'label',
      expiry: { year: 2099, month: 12 },
      rawText: 'AI',
      confidence: 'medium',
    };

    /** 서버로 보내는 라벨 사진. 재분석은 사진이 있을 때만 할 수 있다 */
    const PHOTO = new Blob(['label'], { type: 'image/jpeg' });

    function typedOffline(wheel: WheelSpec = TYPED) {
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER, null, GRINDER);
        result.current.setWheel(wheel, PHOTO, null);
        result.current.setOfflineSlot('wheel', true);
      });
      return result;
    }

    const storedWheel = () =>
      JSON.parse(
        sessionStorage.getItem('wheelmatch.wheel') ?? 'null',
      ) as WheelSpec;

    /** 이 묶음의 명판은 사진 없이 온라인으로 읽은 것이다. 라벨 사진만 서버로 간다 */
    const SENT = { grinderImage: null, wheelImage: PHOTO };

    /**
     * 재분석 결과가 도착하고(recordReanalysis) 작업자가 받아들인다(applyReanalysis).
     * 화면의 순서 그대로다 — 도착했을 때 남기지 않은 판독은 받아들일 수 없다.
     */
    function reanalyzeAndAccept(
      result: ReturnType<typeof typedOffline>,
      reading: ReanalysisInput,
    ) {
      act(() => {
        result.current.recordReanalysis(reading, SENT);
        result.current.applyReanalysis(reading);
      });
    }

    it('AI가 외관 손상을 의심하면 최종값에 의심이 더해지고, 작업자가 넣은 값은 그대로다', () => {
      const result = typedOffline();

      reanalyzeAndAccept(result, {
        wheelOcr: { ...AI, visibleDamage: 'suspected' },
        wheelOcrTelemetry: null,
      });

      expect(result.current.analysisMode).toBe('online');
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      // 작업자가 확인 화면에서 확정한 값은 하나도 바뀌지 않는다.
      expect(result.current.wheel).toMatchObject({
        maxRPM: 12200,
        diameter: 125,
        thickness: 1.6,
        purpose: 'cutting',
        wheelType: 'bonded_abrasive',
        rpmSource: 'user',
        expiry: { year: 2099, month: 12 },
        expiryReview: 'marked',
        confidence: 'high',
      });
      // 새로고침해도 의심이 남는다.
      expect(storedWheel().visibleDamage).toBe('suspected');
      // AI가 읽은 그대로는 재분석 판독에 남는다. OCR 원본 자리는 비어 있던 그대로다.
      expect(result.current.reanalyses?.[0]?.wheelOcr?.visibleDamage).toBe(
        'suspected',
      );
      expect(result.current.wheelOcr).toBeNull();
    });

    it('AI가 읽은 원본 표시가 최종값에 들어가고, 재분석 판독과 객체를 공유하지 않는다', () => {
      const result = typedOffline();

      reanalyzeAndAccept(result, { wheelOcr: AI, wheelOcrTelemetry: null });

      expect(result.current.wheel?.markings).toEqual(AI.markings);
      expect(result.current.reanalyses?.[0]?.wheelOcr?.markings).toEqual(
        AI.markings,
      );
      expect(result.current.wheel?.markings).not.toBe(
        result.current.reanalyses?.[0]?.wheelOcr?.markings,
      );
      expect(storedWheel().markings).toEqual(AI.markings);
    });

    it('AI가 손상을 의심하지 않으면 최종값의 외관 판독을 바꾸지 않는다', () => {
      // 의심을 지어내지 않는다. 보이지 않았다는 판독으로 덮어쓰지도 않는다.
      const result = typedOffline();

      reanalyzeAndAccept(result, { wheelOcr: AI, wheelOcrTelemetry: null });

      expect(result.current.wheel?.visibleDamage).toBe('unknown');
    });

    it('이미 올라와 있던 의심은 재분석이 의심하지 않아도 지워지지 않는다', () => {
      const result = typedOffline({ ...TYPED, visibleDamage: 'suspected' });

      reanalyzeAndAccept(result, { wheelOcr: AI, wheelOcrTelemetry: null });

      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      expect(storedWheel().visibleDamage).toBe('suspected');
    });

    it('재분석 결과가 도착하면 전환하지 않아도 AI가 올린 의심만 최종값에 남긴다', () => {
      // 값이 달라 전환이 막히거나 작업자가 취소해도 의심은 버리지 않는다.
      const result = typedOffline();

      act(() =>
        result.current.recordReanalysis(
          {
            wheelOcr: { ...AI, visibleDamage: 'suspected' },
            wheelOcrTelemetry: null,
          },
          SENT,
        ),
      );

      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      expect(storedWheel().visibleDamage).toBe('suspected');
      // 전환한 것이 아니다. 오프라인 표시도, OCR 원본 자리도, 원본 표시도 그대로다.
      expect(result.current.analysisMode).toBe('offline_limited');
      expect(result.current.wheelOcr).toBeNull();
      expect(result.current.wheel?.markings).toBeUndefined();
      expect(sessionStorage.getItem('wheelmatch.wheelOcr')).toBe('null');
    });

    it('재분석이 의심하지 않았으면 결과가 도착해도 확정값은 바꾸지 않는다', () => {
      const result = typedOffline();
      const before = result.current.wheel;

      act(() =>
        result.current.recordReanalysis(
          { wheelOcr: AI, wheelOcrTelemetry: null },
          SENT,
        ),
      );

      expect(result.current.wheel).toBe(before);
    });

    it('응답을 기다리는 사이 숫돌을 다시 찍었으면 이전 사진의 의심을 새 숫돌에 얹지 않는다', () => {
      // 서버 응답은 늦게 올 수 있다. 그 사이 확정된 숫돌은 AI가 본 사진의 숫돌이
      // 아니다 — 거기에 의심을 얹으면 의심을 지어내는 것이다.
      const result = typedOffline();
      act(() => {
        result.current.setWheel(
          { ...TYPED, diameter: 115 },
          new Blob(['other label'], { type: 'image/jpeg' }),
          null,
        );
        result.current.setOfflineSlot('wheel', true);
      });

      act(() =>
        result.current.recordReanalysis(
          {
            wheelOcr: { ...AI, visibleDamage: 'suspected' },
            wheelOcrTelemetry: null,
          },
          SENT,
        ),
      );

      expect(result.current.wheel?.visibleDamage).toBe('unknown');
      expect(storedWheel().visibleDamage).toBe('unknown');
      // 그 판독은 이 점검의 숫돌을 본 것이 아니다. 기록에도 남기지 않는다.
      expect(result.current.reanalyses).toEqual([]);
    });

    /** 로컬 OCR이 rpm 표기만 읽어 둔 확정값 */
    const LOCAL_RPM_ONLY: WheelSpec = {
      ...TYPED,
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: null,
        boreDiameter: null,
        expiryRaw: null,
      },
    };

    /** 서버가 rpm 표기를 로컬 OCR과 다르게 읽은 판독. 나머지 값은 모두 같다 */
    const AI_RPM_MARKING_DIFFERS: WheelSpec = {
      ...AI,
      markings: {
        labeledRPM: 13300,
        peripheralSpeedMps: 80,
        boreDiameter: 22.23,
        expiryRaw: '12/2099',
      },
    };

    it('로컬 OCR이 읽어 둔 표기는 그대로 두고 빈 자리만 채운다', () => {
      // 로컬 OCR은 rpm 표기만 읽었다. 서버는 rpm을 같게 읽고 m/s와 내경을 더 읽었다.
      const result = typedOffline(LOCAL_RPM_ONLY);
      const reading: ReanalysisInput = {
        wheelOcr: AI,
        wheelOcrTelemetry: null,
      };

      reanalyzeAndAccept(result, reading);

      expect(result.current.analysisMode).toBe('online');
      expect(result.current.wheel?.markings).toEqual({
        labeledRPM: 12200,
        peripheralSpeedMps: 80,
        boreDiameter: 22.23,
        expiryRaw: '12/2099',
      });
      expect(storedWheel().markings).toEqual(result.current.wheel?.markings);
      // 서버가 읽은 그대로는 재분석 판독에 남는다. OCR 원본 자리에는 넣지 않는다.
      expect(result.current.reanalyses?.[0]?.wheelOcr).toEqual(AI);
      expect(result.current.reanalyses?.[0]?.acceptedAt).not.toBeNull();
      expect(result.current.wheelOcr).toBeNull();
    });

    it('로컬 OCR이 읽어 둔 표기를 서버가 다르게 읽었으면 전환하지 않는다', () => {
      // 값이 있고 다른 것은 충돌이다. 로컬 표기를 남긴 채 전환하면 서버가 읽은 표기가
      // 판정에서 빠지고, 서버 표기로 덮으면 로컬이 올린 표기가 사라진다. 어느 쪽도
      // 하지 않고 제한 대조로 남긴다. 화면이 먼저 막지만(OfflineReanalysisPanel)
      // 버튼만 막으면 다른 경로로 불렸을 때 샌다 — 저장소도 막는다.
      const result = typedOffline(LOCAL_RPM_ONLY);
      const before = result.current.wheel;
      const storedBefore = sessionStorage.getItem('wheelmatch.wheel');
      const reading: ReanalysisInput = {
        wheelOcr: AI_RPM_MARKING_DIFFERS,
        wheelOcrTelemetry: null,
      };

      // 화면의 순서 그대로다 — 도착한 판독을 남기고 받아들이려 한다. 남기지 않고
      // 부르면 표기 충돌이 아니라 「남긴 적 없는 판독」이라서 거절돼 이 검사가 헛돈다.
      reanalyzeAndAccept(result, reading);

      expect(result.current.analysisMode).toBe('offline_limited');
      expect(result.current.wheel).toBe(before);
      expect(sessionStorage.getItem('wheelmatch.wheel')).toBe(storedBefore);
      // 받아들이지 않은 AI 값은 OCR 원본 자리에도 넣지 않는다.
      expect(result.current.wheelOcr).toBeNull();
      expect(sessionStorage.getItem('wheelmatch.wheelOcr')).toBe('null');
      expect(
        JSON.parse(sessionStorage.getItem('wheelmatch.offlineSlots') ?? 'null'),
      ).toEqual({ grinder: false, wheel: true });
      // 판독은 남아 있다 — 서버가 읽은 그대로, 받아들이지 않은 판독으로.
      expect(result.current.reanalyses).toHaveLength(1);
      expect(
        result.current.reanalyses?.[0]?.wheelOcr?.markings?.labeledRPM,
      ).toBe(13300);
      expect(result.current.reanalyses?.[0]?.acceptedAt).toBeNull();
    });

    it('숫돌 표기가 충돌하면 함께 다시 분석한 명판도 전환하지 않는다', () => {
      // 한 번의 재분석은 통째로 받아들이거나 받아들이지 않는다. 명판만 풀면 화면이
      // 막아 둔 전환의 절반이 조용히 적용된다.
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER, null, null);
        result.current.setOfflineSlot('grinder', true);
        result.current.setWheel(LOCAL_RPM_ONLY, PHOTO, null);
        result.current.setOfflineSlot('wheel', true);
      });
      const reading: ReanalysisInput = {
        grinderOcr: GRINDER,
        grinderOcrTelemetry: null,
        wheelOcr: AI_RPM_MARKING_DIFFERS,
        wheelOcrTelemetry: null,
      };

      act(() => {
        result.current.recordReanalysis(reading, SENT);
        result.current.applyReanalysis(reading);
      });

      expect(result.current.offlineSlots).toEqual({
        grinder: true,
        wheel: true,
      });
      expect(result.current.grinderOcr).toBeNull();
      expect(result.current.wheelOcr).toBeNull();
      expect(result.current.wheel).toEqual(LOCAL_RPM_ONLY);
      // 명판·숫돌을 함께 읽은 판독 하나가 남아 있고, 받아들인 시각은 적히지 않았다.
      expect(result.current.reanalyses).toHaveLength(1);
      expect(result.current.reanalyses?.[0]).toMatchObject({
        grinderOcr: GRINDER,
        wheelOcr: AI_RPM_MARKING_DIFFERS,
        acceptedAt: null,
      });
    });

    it('명판만 재분석하면 숫돌 최종값은 건드리지 않는다', () => {
      const result = typedOffline();
      const before = result.current.wheel;

      reanalyzeAndAccept(result, {
        grinderOcr: GRINDER,
        grinderOcrTelemetry: null,
      });

      expect(result.current.wheel).toBe(before);
      // 숫돌 쪽 오프라인 표시도 그대로다.
      expect(result.current.analysisMode).toBe('offline_limited');
    });
  });

  describe('서버 재분석 판독 기록 — 받아들이지 않은 것도 남긴다', () => {
    // 재분석 판독을 버리면 그 판독이 올린 외관 의심만 확정값에 남아, 의심이 어디서
    // 왔는지 기록으로 되짚을 수 없다. 받아들인 판독도 OCR 원본 자리에 넣지 않는다 —
    // 그 자리는 작업자가 확인 화면에서 고치기 전의 원본이고, 로컬 OCR로 읽은
    // 점검이면 덮여 사라진다.

    const PLATE = new Blob(['plate'], { type: 'image/jpeg' });
    const LABEL = new Blob(['label'], { type: 'image/jpeg' });
    const SENT = { grinderImage: PLATE, wheelImage: LABEL };

    /** 작업자가 라벨을 직접 보고 넣은 값 */
    const TYPED: WheelSpec = {
      ...WHEEL,
      visibleDamage: 'unknown',
      rpmSource: 'user',
    };

    /** 서버가 같은 라벨 사진에서 읽은 값 */
    const AI: WheelSpec = {
      ...WHEEL,
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: 80,
        boreDiameter: 22.23,
      },
      rpmSource: 'label',
      rawText: 'AI',
      confidence: 'medium',
    };

    const AI_TELEMETRY: OcrTelemetry = {
      engine: 'claude',
      model: 'claude-x',
      inputTokens: 1500,
      outputTokens: 120,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      durationMs: 2100,
    };

    /** 명판은 온라인으로 읽고 숫돌 라벨만 직접 넣은 점검 */
    function wheelOffline(
      wheel: WheelSpec = TYPED,
      ocr: WheelSpec | null = null,
      telemetry: OcrTelemetry | null = null,
    ) {
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER, PLATE, GRINDER);
        result.current.setWheel(wheel, LABEL, ocr, null, telemetry);
        result.current.setOfflineSlot('wheel', true);
        result.current.setWheelCondition(WHEEL_CONDITION);
      });
      return result;
    }

    const storedReanalyses = () =>
      JSON.parse(sessionStorage.getItem('wheelmatch.reanalyses') ?? 'null');

    it('점검을 시작하기 전에는 알 수 없음이고, 명판을 확정하면 빈 목록에서 시작한다', () => {
      const { result } = renderHook(() => useInspection());
      // 빈 목록은 "재분석을 하지 않았다"는 뜻이다. 아직 시작하지 않은 점검에 쓰지 않는다.
      expect(result.current.reanalyses).toBeNull();

      act(() => result.current.setGrinder(GRINDER, PLATE, GRINDER));

      // 명판이 바뀌면 그 뒤의 모든 것이 처음부터다. 이 점검에는 재분석이 없었다.
      expect(result.current.reanalyses).toEqual([]);
      expect(storedReanalyses()).toEqual([]);
    });

    it('결과가 도착하면 받아들이기 전에도 판독을 메타데이터·도착 시각과 함께 남긴다', () => {
      const result = wheelOffline();
      const reading = {
        wheelOcr: { ...AI, maxRPM: 13300, visibleDamage: 'suspected' as const },
        wheelOcrTelemetry: AI_TELEMETRY,
      };

      act(() => result.current.recordReanalysis(reading, SENT));

      expect(result.current.reanalyses).toHaveLength(1);
      const [record] = result.current.reanalyses ?? [];
      expect(record).toMatchObject({
        grinderOcr: null,
        grinderOcrTelemetry: null,
        wheelOcr: reading.wheelOcr,
        wheelOcrTelemetry: AI_TELEMETRY,
        acceptedAt: null,
        damageRecheck: null,
      });
      expect(Number.isNaN(Date.parse(record.analyzedAt))).toBe(false);
      // 전환하지 않았다. 확정값의 회전속도도, OCR 원본 자리도 그대로다.
      expect(result.current.analysisMode).toBe('offline_limited');
      expect(result.current.wheel?.maxRPM).toBe(12200);
      expect(result.current.wheelOcr).toBeNull();
      // 새로고침을 넘어간다 — 확정값에 남는 의심과 함께 남아야 한다.
      expect(storedReanalyses()).toEqual(result.current.reanalyses);
    });

    it('의심하지 않은 판독도 남긴다', () => {
      // 의심을 올린 판독만 남기면 인식률을 잴 때 일부 판독만 세게 된다.
      const result = wheelOffline();

      act(() =>
        result.current.recordReanalysis(
          { wheelOcr: AI, wheelOcrTelemetry: null },
          SENT,
        ),
      );

      expect(result.current.reanalyses).toHaveLength(1);
      expect(result.current.wheel?.visibleDamage).toBe('unknown');
    });

    it('다시 분석하면 앞선 판독 뒤에 붙는다 — 앞선 판독을 지우지 않는다', () => {
      const result = wheelOffline();
      const first = {
        wheelOcr: { ...AI, visibleDamage: 'suspected' as const },
      };
      const second = { wheelOcr: { ...AI } };

      act(() => result.current.recordReanalysis(first, SENT));
      act(() => result.current.recordReanalysis(second, SENT));

      // 둘째 판독은 의심하지 않았지만 확정값의 의심은 남는다. 그 의심이 첫 판독에서
      // 왔다는 것을 기록이 말해 준다.
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      expect(
        result.current.reanalyses?.map(
          (record) => record.wheelOcr?.visibleDamage,
        ),
      ).toEqual(['suspected', 'none_visible']);
    });

    it('받아들이면 그 판독에 받아들인 시각을 적는다 — 앞선 판독에는 적지 않는다', () => {
      const result = wheelOffline();
      const first = { wheelOcr: { ...AI, maxRPM: 13300 } };
      const second = { wheelOcr: { ...AI } };
      act(() => result.current.recordReanalysis(first, SENT));
      act(() => result.current.recordReanalysis(second, SENT));

      act(() => result.current.applyReanalysis(second));

      expect(result.current.analysisMode).toBe('online');
      expect(result.current.reanalyses?.[0]?.acceptedAt).toBeNull();
      const acceptedAt = result.current.reanalyses?.[1]?.acceptedAt ?? '';
      expect(Number.isNaN(Date.parse(acceptedAt))).toBe(false);
      expect(storedReanalyses()).toEqual(result.current.reanalyses);
    });

    it('도착했을 때 남기지 않은 판독은 받아들이지 않는다', () => {
      // 남긴 적 없는 판독은 이 점검의 사진을 본 것인지 알 수 없다. 받아들이면
      // 출처 없는 값으로 온라인 대조가 열린다.
      const result = wheelOffline();
      const before = result.current.wheel;

      act(() => result.current.applyReanalysis({ wheelOcr: AI }));

      expect(result.current.analysisMode).toBe('offline_limited');
      expect(result.current.wheel).toBe(before);
      expect(result.current.reanalyses).toEqual([]);
    });

    /** 기기 안 OCR이 읽었다는 응답 메타데이터 */
    const LOCAL_TELEMETRY: OcrTelemetry = {
      engine: 'tesseract',
      model: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      durationMs: 800,
    };

    it('로컬 OCR로 읽은 원본은 재분석을 받아들여도 덮이지 않는다', () => {
      // 기기 안 OCR이 지름을 115로 잘못 읽었고 작업자가 125로 고친 점검. 작업자가
      // 고치기 전의 원본은 로컬 판독이다 — 서버 판독으로 덮으면 무엇을 보고 고쳤는지가
      // 사라진다. rpm 표기는 맞게 읽었고 m/s 표기는 읽지 못했다.
      const local: WheelSpec = {
        ...WHEEL,
        diameter: 115,
        markings: {
          labeledRPM: 12200,
          peripheralSpeedMps: null,
          boreDiameter: null,
        },
        rpmSource: 'label',
        rawText: 'local',
        confidence: 'low',
      };
      const confirmed: WheelSpec = {
        ...TYPED,
        markings: { ...local.markings! },
      };
      const result = wheelOffline(confirmed, local, LOCAL_TELEMETRY);
      const reading = { wheelOcr: AI, wheelOcrTelemetry: AI_TELEMETRY };

      act(() => {
        result.current.recordReanalysis(reading, SENT);
        result.current.applyReanalysis(reading);
      });

      expect(result.current.analysisMode).toBe('online');
      expect(result.current.wheelOcr).toEqual(local);
      expect(result.current.wheelOcrTelemetry).toEqual(LOCAL_TELEMETRY);
      expect(
        JSON.parse(sessionStorage.getItem('wheelmatch.wheelOcr') ?? 'null'),
      ).toEqual(local);
      // 서버 판독은 재분석 판독에 있다. 확정값의 표기가 어디서 왔는지 둘을 견줘 알 수 있다.
      expect(result.current.reanalyses?.[0]?.wheelOcr).toEqual(AI);
      expect(result.current.reanalyses?.[0]?.acceptedAt).not.toBeNull();
      // 로컬이 읽은 rpm 표기는 그대로, 읽지 못한 m/s 표기만 서버 판독으로 채웠다.
      expect(result.current.wheel?.markings?.labeledRPM).toBe(12200);
      expect(result.current.wheel?.markings?.peripheralSpeedMps).toBe(80);
    });

    it('로컬 OCR의 표기가 서버 판독과 충돌해 풀리지 않아도 두 판독이 모두 남는다', () => {
      // 기기 안 OCR이 rpm 표기를 1220으로 잘못 읽었고 작업자가 회전속도를 고쳤다.
      // 확인은 정규화 값만 바꾸고 원본 표기는 그대로 두므로 서버 판독(12200)과
      // 충돌한다 — 제한 대조는 풀리지 않는다. 그 까닭을 기록으로 되짚으려면 로컬
      // 원본과 서버 판독이 둘 다 남아 있어야 한다.
      const local: WheelSpec = {
        ...WHEEL,
        maxRPM: 1220,
        markings: {
          labeledRPM: 1220,
          peripheralSpeedMps: null,
          boreDiameter: null,
        },
        rpmSource: 'label',
        rawText: 'local',
        confidence: 'low',
      };
      const confirmed: WheelSpec = {
        ...TYPED,
        markings: { ...local.markings! },
      };
      const result = wheelOffline(confirmed, local, LOCAL_TELEMETRY);
      const reading = { wheelOcr: AI, wheelOcrTelemetry: AI_TELEMETRY };

      act(() => {
        result.current.recordReanalysis(reading, SENT);
        result.current.applyReanalysis(reading);
      });

      expect(result.current.analysisMode).toBe('offline_limited');
      expect(result.current.wheelOcr).toEqual(local);
      expect(result.current.wheelOcrTelemetry).toEqual(LOCAL_TELEMETRY);
      expect(result.current.reanalyses).toHaveLength(1);
      expect(result.current.reanalyses?.[0]?.wheelOcr).toEqual(AI);
      expect(result.current.reanalyses?.[0]?.acceptedAt).toBeNull();
      // 확정값의 표기는 그대로다. 서버가 읽은 값으로 덮지도, 빈 자리를 채우지도 않는다.
      expect(result.current.wheel?.markings).toEqual(local.markings);
    });

    it('다시 받은 손상 항목의 답을 그 판독에 적는다', () => {
      const result = wheelOffline();
      const reading = {
        wheelOcr: { ...AI, visibleDamage: 'suspected' as const },
      };
      act(() => result.current.recordReanalysis(reading, SENT));

      act(() => result.current.recordDamageRecheck(reading, true));

      const recheck = result.current.reanalyses?.[0]?.damageRecheck;
      expect(recheck?.damageFree).toBe(true);
      expect(Number.isNaN(Date.parse(recheck?.answeredAt ?? ''))).toBe(false);
      // 숫돌 상태 확인의 답은 건드리지 않는다. 그 답은 경고를 보기 전의 것 그대로다.
      expect(result.current.wheelCondition).toEqual(WHEEL_CONDITION);
      expect(storedReanalyses()).toEqual(result.current.reanalyses);
    });

    it('「문제 있음」도 그 판독에 그대로 적는다', () => {
      const result = wheelOffline();
      const reading = {
        wheelOcr: { ...AI, visibleDamage: 'suspected' as const },
      };
      act(() => result.current.recordReanalysis(reading, SENT));

      act(() => result.current.recordDamageRecheck(reading, false));

      expect(result.current.reanalyses?.[0]?.damageRecheck?.damageFree).toBe(
        false,
      );
    });

    it('남기지 않은 판독에 대한 손상 답은 어디에도 적지 않는다', () => {
      const result = wheelOffline();
      act(() => result.current.recordReanalysis({ wheelOcr: AI }, SENT));

      act(() =>
        result.current.recordDamageRecheck({ wheelOcr: { ...AI } }, true),
      );

      expect(result.current.reanalyses?.[0]?.damageRecheck).toBeNull();
    });

    it('응답을 기다리는 사이 숫돌만 다시 찍었으면 함께 읽은 명판 판독만 남긴다', () => {
      // 명판 사진은 그대로다. 그 판독은 여전히 이 점검의 명판을 본 것이다.
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER, PLATE, null);
        result.current.setOfflineSlot('grinder', true);
        result.current.setWheel(TYPED, LABEL, null);
        result.current.setOfflineSlot('wheel', true);
      });
      act(() => {
        result.current.setWheel(
          { ...TYPED, diameter: 115 },
          new Blob(['other label'], { type: 'image/jpeg' }),
          null,
        );
        result.current.setOfflineSlot('wheel', true);
      });

      act(() =>
        result.current.recordReanalysis(
          {
            grinderOcr: GRINDER,
            grinderOcrTelemetry: AI_TELEMETRY,
            wheelOcr: { ...AI, visibleDamage: 'suspected' },
            wheelOcrTelemetry: AI_TELEMETRY,
          },
          SENT,
        ),
      );

      expect(result.current.reanalyses).toHaveLength(1);
      expect(result.current.reanalyses?.[0]).toMatchObject({
        grinderOcr: GRINDER,
        grinderOcrTelemetry: AI_TELEMETRY,
        wheelOcr: null,
        wheelOcrTelemetry: null,
      });
      expect(result.current.wheel?.visibleDamage).toBe('unknown');
    });

    it('응답을 기다리는 사이 명판을 다시 찍었으면 아무것도 남기지 않는다', () => {
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER, PLATE, null);
        result.current.setOfflineSlot('grinder', true);
      });
      act(() =>
        result.current.setGrinder(
          GRINDER,
          new Blob(['other plate'], { type: 'image/jpeg' }),
          null,
        ),
      );

      act(() => result.current.recordReanalysis({ grinderOcr: GRINDER }, SENT));

      expect(result.current.reanalyses).toEqual([]);
    });

    it('숫돌을 다시 확정하면 숫돌 쪽 판독과 손상 답은 버리고 명판 판독은 남긴다', () => {
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER, PLATE, null);
        result.current.setOfflineSlot('grinder', true);
        result.current.setWheel(TYPED, LABEL, null);
        result.current.setOfflineSlot('wheel', true);
      });
      const both = {
        grinderOcr: { ...GRINDER, noLoadRPM: 13000 },
        wheelOcr: { ...AI, visibleDamage: 'suspected' as const },
      };
      const wheelOnly = { wheelOcr: { ...AI } };
      act(() => {
        result.current.recordReanalysis(both, SENT);
        result.current.recordDamageRecheck(both, true);
        result.current.recordReanalysis(wheelOnly, {
          grinderImage: null,
          wheelImage: LABEL,
        });
      });
      expect(result.current.reanalyses).toHaveLength(2);

      act(() => result.current.setWheel({ ...TYPED, diameter: 115 }, LABEL));

      // 새 사진은 새 숫돌일 수 있다. 이전 숫돌의 판독과 그때 한 답은 이어지지 않는다.
      expect(result.current.reanalyses).toHaveLength(1);
      expect(result.current.reanalyses?.[0]).toMatchObject({
        grinderOcr: both.grinderOcr,
        wheelOcr: null,
        wheelOcrTelemetry: null,
        damageRecheck: null,
      });
      expect(storedReanalyses()).toEqual(result.current.reanalyses);
    });

    it('명판을 다시 확정하면 재분석 판독을 모두 버리고 빈 목록에서 다시 시작한다', () => {
      const result = wheelOffline();
      act(() => result.current.recordReanalysis({ wheelOcr: AI }, SENT));

      act(() => result.current.setGrinder(GRINDER, PLATE, GRINDER));

      expect(result.current.reanalyses).toEqual([]);
      expect(storedReanalyses()).toEqual([]);
    });

    it('reset은 재분석 판독도 지운다', () => {
      const result = wheelOffline();
      act(() => result.current.recordReanalysis({ wheelOcr: AI }, SENT));

      act(() => result.current.reset());

      expect(result.current.reanalyses).toBeNull();
      expect(sessionStorage.getItem('wheelmatch.reanalyses')).toBeNull();
    });

    it('남길 자리가 없으면 판독은 남기지 못해도 AI가 올린 의심은 남긴다', () => {
      // 화면은 상한에 닿으면 재분석을 받지 않는다(OfflineReanalysisPanel). 그래도
      // 판독이 들어왔다면 경고는 버리지 않는다 — 판독은 남기지 못하고, 남기지 못한
      // 판독은 받아들일 수도 없다.
      const result = wheelOffline();
      act(() => {
        for (let count = 0; count < MAX_REANALYSES; count += 1) {
          result.current.recordReanalysis({ wheelOcr: { ...AI } }, SENT);
        }
      });
      expect(result.current.reanalyses).toHaveLength(MAX_REANALYSES);
      const overflow = {
        wheelOcr: { ...AI, visibleDamage: 'suspected' as const },
      };

      act(() => {
        result.current.recordReanalysis(overflow, SENT);
        result.current.applyReanalysis(overflow);
      });

      expect(result.current.reanalyses).toHaveLength(MAX_REANALYSES);
      expect(result.current.wheel?.visibleDamage).toBe('suspected');
      expect(result.current.analysisMode).toBe('offline_limited');
    });

    it('남길 자리가 없고 더할 의심도 없으면 상태를 건드리지 않는다', () => {
      // 상태의 참조는 값이 바뀔 때만 바뀐다. 진행 중 점검 자동 저장이 그 참조로
      // 저장할지 정하므로, 바뀐 것 없이 참조만 바뀌면 헛저장이 된다.
      const result = wheelOffline();
      act(() => {
        for (let count = 0; count < MAX_REANALYSES; count += 1) {
          result.current.recordReanalysis({ wheelOcr: { ...AI } }, SENT);
        }
      });
      const before = result.current.reanalyses;
      const wheelBefore = result.current.wheel;

      act(() => result.current.recordReanalysis({ wheelOcr: { ...AI } }, SENT));

      expect(result.current.reanalyses).toBe(before);
      expect(result.current.wheel).toBe(wheelBefore);
    });
  });

  it('체크리스트와 마친 시험운전은 메모리에만 두고, 새 숫돌이 들어오면 버린다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setChecklist({
        guardCover: true,
        auxiliaryHandle: true,
        wheelDamage: true,
        ppe: true,
      });
    });
    expect(result.current.checklist?.guardCover).toBe(true);
    expect(
      Object.keys(sessionStorage).some((key) => key.includes('checklist')),
    ).toBe(false);

    act(() => result.current.setWheel(WHEEL));
    expect(result.current.checklist).toBeNull();
    expect(result.current.trialRunRecord).toBeNull();
  });

  it('restore는 되살린 상태로 바꾸고 새로고침용 저장도 그 상태로 맞춘다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.setPurpose('grinding'));

    act(() =>
      result.current.restore({
        ...result.current,
        declaredPurpose: 'cutting',
        grinder: GRINDER,
        grinderCondition: GRINDER_CONDITION,
        wheel: null,
        wheelOcr: null,
        offlineSlots: { grinder: true, wheel: false },
        checklist: null,
        trialRunRecord: null,
      }),
    );

    expect(result.current.declaredPurpose).toBe('cutting');
    expect(result.current.grinder).toEqual(GRINDER);
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(sessionStorage.getItem('wheelmatch.purpose')).toBe('"cutting"');
    expect(sessionStorage.getItem('wheelmatch.wheel')).toBeNull();
  });

  it('reset은 오프라인 표시·체크리스트도 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setOfflineSlot('wheel', true);
      result.current.setChecklist({
        guardCover: true,
        auxiliaryHandle: null,
        wheelDamage: null,
        ppe: null,
      });
      result.current.reset();
    });
    expect(result.current.analysisMode).toBe('online');
    expect(result.current.checklist).toBeNull();
    expect(sessionStorage.getItem('wheelmatch.offlineSlots')).toBeNull();
  });
});

describe('제한된 까닭', () => {
  // 한 단계가 제한 대조가 된 까닭. 기록과 화면이 사실대로 말하기 위한 값이다.
  // 제한 여부(analysisMode)는 단계별 표시(true/false)만 정한다 — 까닭이 없거나
  // 어긋나도 제한은 그대로이고, 까닭이 있다고 제한이 풀리지도 않는다.
  const stored = () =>
    JSON.parse(sessionStorage.getItem('wheelmatch.offlineSlots') ?? 'null');

  beforeEach(() => {
    const { result } = renderHook(() => useInspection());
    act(() => result.current.reset());
  });

  it('확정할 때 넘긴 까닭을 표시와 함께 남기고 새로고침용 저장에도 쓴다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setOfflineSlot('grinder', true, 'dropped_ocr');
    });

    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'dropped_ocr',
    });
    expect(stored()).toEqual({
      grinder: true,
      wheel: false,
      causes: { grinder: 'dropped_ocr' },
    });
  });

  it('까닭 없이 표시만 남기면 unknown으로 읽는다 — 추정해 채우지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setOfflineSlot('grinder', true);
    });

    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'unknown',
    });
    // 저장되는 모양은 까닭을 적기 전과 같다.
    expect(stored()).toEqual({ grinder: true, wheel: false });
  });

  it('제한되지 않은 단계에는 까닭을 남기지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setOfflineSlot('grinder', false, 'manual');
    });

    expect(result.current.analysisMode).toBe('online');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({});
    expect(result.current.offlineSlots).toEqual({
      grinder: false,
      wheel: false,
    });
  });

  it('까닭이 있어도 제한은 풀리지 않는다 — 어느 까닭이든 offline_limited다', () => {
    for (const cause of [
      'manual',
      'local_ocr',
      'dropped_ocr',
      'unknown',
    ] as const) {
      const { result } = renderHook(() => useInspection());
      act(() => {
        result.current.setGrinder(GRINDER);
        result.current.setOfflineSlot('grinder', true, cause);
      });
      expect(result.current.analysisMode, cause).toBe('offline_limited');
    }
  });

  it('숫돌을 다시 확정하면 숫돌 까닭만 지운다 — 명판 까닭은 남는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setOfflineSlot('grinder', true, 'manual');
      result.current.setWheel(WHEEL);
      result.current.setOfflineSlot('wheel', true, 'local_ocr');
    });
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'manual',
      wheel: 'local_ocr',
    });

    // 새 라벨 사진을 서버로 읽었다. 이전 숫돌의 까닭이 따라오면 안 된다.
    act(() => result.current.setWheel(WHEEL));

    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      grinder: 'manual',
    });
    expect(stored()).toEqual({
      grinder: true,
      wheel: false,
      causes: { grinder: 'manual' },
    });
  });

  it('명판을 다시 확정하면 두 단계의 까닭을 모두 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setOfflineSlot('grinder', true, 'manual');
      result.current.setWheel(WHEEL);
      result.current.setOfflineSlot('wheel', true, 'dropped_ocr');
    });

    act(() => result.current.setGrinder(GRINDER));

    expect(result.current.analysisMode).toBe('online');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({});
    expect(result.current.offlineSlots).toEqual({
      grinder: false,
      wheel: false,
    });
  });

  it('같은 단계를 다시 제한으로 확정하면 까닭을 새로 적는다 — 이전 까닭이 남지 않는다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER);
      result.current.setWheel(WHEEL);
      result.current.setOfflineSlot('wheel', true, 'manual');
    });

    act(() => result.current.setOfflineSlot('wheel', true));

    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'unknown',
    });
    expect(stored()).toEqual({ grinder: false, wheel: true });
  });

  it('재분석을 받아들인 단계의 까닭만 지운다', () => {
    const { result } = renderHook(() => useInspection());
    act(() => {
      result.current.setGrinder(GRINDER, null, null);
      result.current.setOfflineSlot('grinder', true, 'manual');
      result.current.setWheel(WHEEL);
      result.current.setOfflineSlot('wheel', true, 'local_ocr');
    });

    // 화면의 순서 그대로다 — 도착한 판독을 남기고(recordReanalysis) 받아들인다.
    // 남긴 적 없는 판독은 받아들일 수 없다. 이 묶음에는 사진이 없다.
    const reading: ReanalysisInput = {
      grinderOcr: { ...GRINDER, rawText: 'AI' },
      grinderOcrTelemetry: null,
    };
    act(() => {
      result.current.recordReanalysis(reading, {
        grinderImage: null,
        wheelImage: null,
      });
      result.current.applyReanalysis(reading);
    });

    // 숫돌 단계가 남아 있어 점검은 여전히 제한 대조다.
    expect(result.current.analysisMode).toBe('offline_limited');
    expect(limitCausesOf(result.current.offlineSlots)).toEqual({
      wheel: 'local_ocr',
    });
    expect(stored()).toEqual({
      grinder: false,
      wheel: true,
      causes: { wheel: 'local_ocr' },
    });
  });
});

describe('readOfflineSlots — 저장된 까닭', () => {
  it('까닭을 적기 전 형식(표시만 있는 값)은 그대로 읽고, 까닭은 unknown이다', () => {
    const read = readOfflineSlots({ grinder: true, wheel: false });

    expect(read.unreadable).toBe(false);
    expect(read.slots).toEqual({ grinder: true, wheel: false });
    expect(limitCausesOf(read.slots)).toEqual({ grinder: 'unknown' });
  });

  it('온전한 까닭은 그대로 되살린다', () => {
    const read = readOfflineSlots({
      grinder: true,
      wheel: true,
      causes: { grinder: 'manual', wheel: 'dropped_ocr' },
    });

    expect(read.unreadable).toBe(false);
    expect(limitCausesOf(read.slots)).toEqual({
      grinder: 'manual',
      wheel: 'dropped_ocr',
    });
  });

  it.each([
    ['목록에 없는 까닭', { grinder: 'server', wheel: 'online' }],
    ['문자열이 아닌 까닭', { grinder: 3, wheel: true }],
    ['객체가 아닌 causes', 'manual'],
    ['배열인 causes', ['manual', 'manual']],
    ['null인 causes', null],
  ])(
    '어긋난 까닭(%s)은 까닭만 버린다 — 제한은 그대로이고 읽지 못한 표시로 보지 않는다',
    (_name, causes) => {
      const read = readOfflineSlots({ grinder: true, wheel: true, causes });

      // 까닭은 판정에 쓰지 않는 값이다. 까닭 때문에 표시 전체를 버리지 않는다.
      expect(read.unreadable).toBe(false);
      expect(read.slots.grinder).toBe(true);
      expect(read.slots.wheel).toBe(true);
      expect(limitCausesOf(read.slots)).toEqual({
        grinder: 'unknown',
        wheel: 'unknown',
      });
    },
  );

  it('제한되지 않은 단계에 적힌 까닭은 읽지 않는다', () => {
    const read = readOfflineSlots({
      grinder: false,
      wheel: true,
      causes: { grinder: 'manual', wheel: 'local_ocr' },
    });

    expect(read.slots).toEqual({
      grinder: false,
      wheel: true,
      causes: { wheel: 'local_ocr' },
    });
    expect(limitCausesOf(read.slots)).toEqual({ wheel: 'local_ocr' });
  });

  it('표시를 읽지 못하면 두 단계 모두 제한이고, 함께 적힌 까닭도 믿지 않는다', () => {
    const read = readOfflineSlots({
      grinder: 'yes',
      wheel: true,
      causes: { wheel: 'manual' },
    });

    expect(read.unreadable).toBe(true);
    expect(read.slots).toEqual({ grinder: true, wheel: true });
    // 표시를 읽지 못해 엄격한 쪽으로 본 것이다. 직접 입력했다고 적지 않는다.
    expect(limitCausesOf(read.slots)).toEqual({
      grinder: 'unknown',
      wheel: 'unknown',
    });
  });

  it('제한된 단계가 없으면 까닭도 없다', () => {
    expect(limitCausesOf({ grinder: false, wheel: false })).toEqual({});
    expect(limitCausesOf(readOfflineSlots(undefined).slots)).toEqual({});
  });
});

describe('limitCauseFor — 확인 화면의 상태에서 까닭 하나를 고른다', () => {
  const NONE = {
    manual: false,
    localOnly: false,
    localOcrConfirmed: false,
    ocrDropped: false,
  };

  it('직접 입력이면 manual이다', () => {
    expect(limitCauseFor({ ...NONE, manual: true })).toBe('manual');
  });

  it('기기 안 OCR이 읽은 것이 확인됐으면 local_ocr이다', () => {
    expect(
      limitCauseFor({ ...NONE, localOnly: true, localOcrConfirmed: true }),
    ).toBe('local_ocr');
  });

  it('서버로 읽은 판독을 버렸으면 dropped_ocr다', () => {
    expect(limitCauseFor({ ...NONE, ocrDropped: true })).toBe('dropped_ocr');
  });

  it('제한할 까닭이 없으면 null이다', () => {
    expect(limitCauseFor(NONE)).toBeNull();
  });

  // 확인 화면의 localOnly는 제한을 지키려고 넓게 잡은 묶음이다 — 기기 안 OCR로
  // 읽은 값뿐 아니라, 읽을 때 기기가 오프라인으로 보고된 값과 출처가 남지 않은
  // draft의 값도 들어 있다. 뒤의 둘은 서버가 읽은 값일 수 있다. 그 묶음 전체를
  // 「이 기기에서 읽었다」고 기록하면 모르는 것을 단정하는 것이다.
  it('서버 판독이 아닌 것으로 봤지만 기기 안 OCR인지 확인되지 않았으면 까닭을 적지 않는다', () => {
    expect(limitCauseFor({ ...NONE, localOnly: true })).toBeNull();
  });

  it('출처를 모르면 버린 판독도 까닭으로 적지 않는다 — 그 판독이 서버 판독이었는지 모른다', () => {
    expect(
      limitCauseFor({ ...NONE, localOnly: true, ocrDropped: true }),
    ).toBeNull();
  });

  it('겹치면 출처가 먼저다 — 기기 안 OCR로 읽은 판독이 버려져도 local_ocr로 남는다', () => {
    // 출처는 바꿔 적지 않는다(formDraftModel.ts의 AnalysisSource). 버린 판독이
    // 까닭이 되는 것은 서버로 읽은 판독을 버렸을 때뿐이다.
    expect(
      limitCauseFor({
        ...NONE,
        localOnly: true,
        localOcrConfirmed: true,
        ocrDropped: true,
      }),
    ).toBe('local_ocr');
    expect(
      limitCauseFor({
        manual: true,
        localOnly: true,
        localOcrConfirmed: true,
        ocrDropped: true,
      }),
    ).toBe('manual');
  });

  it('확인 표시만 있고 서버 판독이 아니라고 본 적이 없으면 무시한다', () => {
    // localOcrConfirmed는 localOnly일 때만 뜻이 있다.
    expect(limitCauseFor({ ...NONE, localOcrConfirmed: true })).toBeNull();
  });
});
