// 새로고침 복원 테스트 — sessionStorage에 남은 값이 지금 타입 그대로일 때만 되살린다.
//
// 타입 선언(`JSON.parse(raw) as T`)은 저장값을 검사하지 않는다. 탭을 연 채 앱이
// 업데이트되면 이전 버전이 쓴 값을 새 버전이 읽고, 되살린 규격은 결과 화면에서 곧바로
// 규칙엔진으로 들어간다. 어긋난 값이 엔진에 닿으면
//   · 목록에 없는 종류 — 엔진이 예외를 던져 결과 화면이 죽는다
//   · 목록에 없는 용도 — 근거 없는 용도 불일치(부적합)가 된다
//   · {year, month}가 아닌 유효기한 — 유효기한 규칙을 통과해 적합이 나온다
//
// 기준은 draft 복구와 같다(recordSanitize.ts). 값마다의 기준 자체는
// draftModel.test.ts가 목록 전체를 돌려 확인한다. 여기서는 그 기준이 이 경로에도
// 걸려 있는지, 버린 뒤의 상태가 맞는지를 본다.

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrialRunProgress } from '@/lib/safety/trialRun';
import type {
  CaptureQualityCheck,
  CaptureQualityMetrics,
  GrinderCondition,
  GrinderSpec,
  OcrTelemetry,
  WheelCondition,
  WheelSpec,
  WorkConditions,
} from '@/lib/rules/types';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};

const WHEEL_OCR: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  rawText: '',
  confidence: 'high',
};

/** 작업자가 확정한 숫돌 규격. 원본 표시와 유효기한이 옮겨져 있다 */
const WHEEL: WheelSpec = {
  ...WHEEL_OCR,
  markings: { labeledRPM: 12200, peripheralSpeedMps: 80, boreDiameter: 22.23 },
  rpmSource: 'label',
  expiry: { year: 2099, month: 12 },
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
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: null,
};

const WORK: WorkConditions = { material: 'steel', cooling: 'dry' };

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
  warnings: ['blur'],
  usedDespiteWarning: true,
  retakeCount: 1,
};

const PROGRESS: TrialRunProgress = {
  wheelReplaced: true,
  requiredSeconds: 180,
  startedAt: '2026-09-12T09:00:00.000Z',
  endsAt: '2026-09-12T09:03:00.000Z',
};

/** 저장소 모듈을 새로 불러온다 — 불러올 때 sessionStorage에서 상태를 되살린다 */
async function load() {
  vi.resetModules();
  const { useInspection } = await import('./inspection');
  return renderHook(() => useInspection()).result;
}

/** 새로고침 뒤의 상태 */
async function reload() {
  return (await load()).current;
}

/**
 * 결과 화면까지 간 점검을 앱이 쓰는 그대로 sessionStorage에 남긴다.
 *
 * 저장 형태를 여기서 손으로 적지 않는다 — 앱이 쓴 값에서 필요한 자리만 고친다.
 * 손으로 적으면 저장 형태가 바뀌어도 이 테스트는 옛 형태로 계속 통과한다.
 */
async function seed(): Promise<void> {
  const result = await load();
  act(() => {
    result.current.setPurpose('cutting', WORK);
    result.current.setGrinder(GRINDER, null, GRINDER, METRICS, TELEMETRY);
    result.current.setGrinderCondition(GRINDER_OK);
    result.current.setCaptureCheck('grinder', CHECK);
    result.current.setOfflineSlot('grinder', false);
    result.current.setWheel(WHEEL, null, WHEEL_OCR, METRICS, TELEMETRY);
    result.current.setCaptureCheck('wheel', CHECK);
    result.current.setOfflineSlot('wheel', false);
    result.current.setWheelCondition(WHEEL_OK);
  });
  cleanup();
}

const key = (name: string) => `wheelmatch.${name}`;

function stored(name: string): unknown {
  const raw = sessionStorage.getItem(key(name));
  return raw === null ? undefined : JSON.parse(raw);
}

function put(name: string, value: unknown): void {
  sessionStorage.setItem(key(name), JSON.stringify(value));
}

/** 저장된 객체 하나에서 일부 자리만 바꾼다 */
function patch(name: string, change: Record<string, unknown>): void {
  put(name, { ...(stored(name) as Record<string, unknown>), ...change });
}

describe('새로고침 복원 — 앱이 쓴 값', () => {
  // 아래 묶음들만으로는 "무엇이든 버리는" 결함을 잡지 못한다.

  it('결과 화면까지 간 점검은 버리는 것 없이 그대로 되살린다', async () => {
    await seed();
    put('trialRun', PROGRESS);

    const state = await reload();

    expect(state.declaredPurpose).toBe('cutting');
    expect(typeof state.startedAt).toBe('number');
    expect(state.workConditions).toEqual(WORK);
    expect(state.grinder).toEqual(GRINDER);
    expect(state.grinderOcr).toEqual(GRINDER);
    expect(state.grinderCondition).toEqual(GRINDER_OK);
    expect(state.wheel).toEqual(WHEEL);
    expect(state.wheelOcr).toEqual(WHEEL_OCR);
    expect(state.wheelCondition).toEqual(WHEEL_OK);
    expect(state.trialRun).toEqual(PROGRESS);
    expect(state.grinderCaptureMetrics).toEqual(METRICS);
    expect(state.wheelCaptureMetrics).toEqual(METRICS);
    expect(state.grinderOcrTelemetry).toEqual(TELEMETRY);
    expect(state.wheelOcrTelemetry).toEqual(TELEMETRY);
    expect(state.captureChecks).toEqual({ grinder: CHECK, wheel: CHECK });
    expect(state.offlineSlots).toEqual({ grinder: false, wheel: false });
    expect(state.analysisMode).toBe('online');
    expect(state.droppedOnReload).toBe(false);
  });

  it('서버 재분석으로 옮긴 외관 의심과 원본 표시는 새로고침 뒤에도 그대로 되살아난다', async () => {
    // 직접 입력한 숫돌(외관 unknown, 원본 표시 없음)을 결과 화면에서 재분석해 온라인
    // 대조로 바꾼 점검. 옮긴 값이 복원 검사에 걸리면 숫돌 단계가 통째로 버려져,
    // 새로고침 한 번에 AI가 올린 의심이 숫돌과 함께 사라진다.
    const typed: WheelSpec = {
      ...WHEEL_OCR,
      visibleDamage: 'unknown',
      rpmSource: 'user',
      expiry: { year: 2099, month: 12 },
    };
    const reanalyzed: WheelSpec = { ...WHEEL, visibleDamage: 'suspected' };
    const reading = { wheelOcr: reanalyzed, wheelOcrTelemetry: TELEMETRY };
    const result = await load();
    act(() => {
      result.current.setPurpose('cutting', WORK);
      result.current.setGrinder(GRINDER, null, GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(typed, null, null);
      result.current.setOfflineSlot('wheel', true);
      result.current.setWheelCondition(WHEEL_OK);
      // 화면의 순서 그대로 — 결과가 도착하고, 손상 항목을 다시 답하고, 받아들인다.
      result.current.recordReanalysis(reading, {
        grinderImage: null,
        wheelImage: null,
      });
      result.current.recordDamageRecheck(reading, true);
      result.current.applyReanalysis(reading);
    });
    cleanup();

    const state = await reload();

    expect(state.wheel).toEqual({
      ...typed,
      visibleDamage: 'suspected',
      // 의심의 출처도 함께 되살아난다. 출처가 복원 검사에 걸려도 숫돌 단계가
      // 통째로 버려진다.
      visibleDamageSources: ['reanalysis'],
      markings: WHEEL.markings,
    });
    // 직접 넣은 숫돌에는 OCR 원본이 없었다. 재분석 판독은 그 자리에 들어가지 않고
    // 재분석 판독으로 되살아난다 — 받아들인 시각과 다시 받은 손상 답까지.
    expect(state.wheelOcr).toBeNull();
    expect(state.reanalyses).toHaveLength(1);
    expect(state.reanalyses?.[0]).toMatchObject({
      grinderOcr: null,
      wheelOcr: reanalyzed,
      wheelOcrTelemetry: TELEMETRY,
    });
    expect(state.reanalyses?.[0]?.acceptedAt).not.toBeNull();
    expect(state.reanalyses?.[0]?.damageRecheck?.damageFree).toBe(true);
    expect(state.wheelCondition).toEqual(WHEEL_OK);
    expect(state.analysisMode).toBe('online');
    expect(state.droppedOnReload).toBe(false);
  });

  it('받아들이지 않은 재분석 판독도 새로고침 뒤에 그대로 되살아난다', async () => {
    // 그 판독이 올린 의심은 확정값에 실려 새로고침을 넘는다. 판독이 함께 넘지
    // 못하면 새로고침 한 번에 의심의 출처가 사라진다.
    const typed: WheelSpec = { ...WHEEL_OCR, visibleDamage: 'unknown' };
    const reading = {
      wheelOcr: {
        ...WHEEL,
        maxRPM: 13300,
        visibleDamage: 'suspected' as const,
      },
      wheelOcrTelemetry: TELEMETRY,
    };
    const result = await load();
    act(() => {
      result.current.setPurpose('cutting', WORK);
      result.current.setGrinder(GRINDER, null, GRINDER);
      result.current.setGrinderCondition(GRINDER_OK);
      result.current.setWheel(typed, null, null);
      result.current.setOfflineSlot('wheel', true);
      result.current.setWheelCondition(WHEEL_OK);
      result.current.recordReanalysis(reading, {
        grinderImage: null,
        wheelImage: null,
      });
    });
    const before = result.current.reanalyses;
    cleanup();

    const state = await reload();

    expect(state.wheel?.visibleDamage).toBe('suspected');
    expect(state.analysisMode).toBe('offline_limited');
    expect(state.reanalyses).toEqual(before);
    expect(state.reanalyses?.[0]?.acceptedAt).toBeNull();
    expect(state.droppedOnReload).toBe(false);
  });

  it('재분석을 하지 않은 점검은 빈 목록 그대로 되살아난다', async () => {
    await seed();

    const state = await reload();

    expect(state.reanalyses).toEqual([]);
    expect(state.droppedOnReload).toBe(false);
  });

  it('이 기록이 생기기 전 버전이 남긴 점검은 재분석 여부를 알 수 없음으로 되살린다', async () => {
    // 탭을 연 채 앱이 업데이트된 경우다. 이전 버전은 재분석 판독을 남기지 않았다 —
    // 그 점검에서 재분석을 했는지는 저장값으로 알 수 없다. 빈 목록(하지 않았다)으로
    // 채우지 않는다.
    await seed();
    sessionStorage.removeItem(key('reanalyses'));

    const state = await reload();

    expect(state.reanalyses).toBeNull();
    expect(state.wheel).toEqual(WHEEL);
    // 없던 값은 어긋난 값이 아니다. 버렸다고 알리지 않는다.
    expect(state.droppedOnReload).toBe(false);
  });

  it('고르지 않았거나 수집하지 못해 null로 남긴 값은 어긋난 값이 아니다', async () => {
    // 앱은 고르지 않은 작업 조건, 받지 못한 OCR 원본·측정값을 null로 저장한다.
    const result = await load();
    act(() => {
      result.current.setPurpose('grinding');
      result.current.setGrinder(GRINDER, null, null, null, null);
    });
    cleanup();
    expect(stored('workConditions')).toBeNull();
    expect(stored('grinderOcr')).toBeNull();

    const state = await reload();

    expect(state.declaredPurpose).toBe('grinding');
    expect(state.grinder).toEqual(GRINDER);
    expect(state.workConditions).toBeNull();
    expect(state.grinderOcr).toBeNull();
    expect(state.grinderCaptureMetrics).toBeNull();
    expect(state.grinderOcrTelemetry).toBeNull();
    expect(state.droppedOnReload).toBe(false);
  });
});

describe('새로고침 복원 — 확정한 규격', () => {
  const MALFORMED_WHEEL: ReadonlyArray<
    readonly [string, Record<string, unknown>]
  > = [
    ['종류 — 목록에 없는 값', { wheelType: 'resin_wheel' }],
    ['용도 — 목록에 없는 값', { purpose: 'polishing' }],
    ['외관 — 목록에 없는 값', { visibleDamage: 'cracked' }],
    ['유효기한 — 빈 객체', { expiry: {} }],
    ['유효기한 — 문자열', { expiry: '01/2020' }],
    ['유효기한 — 다른 이름의 필드', { expiry: { y: 2020, m: 1 } }],
    ['유효기한 — 배열', { expiry: [2020, 1] }],
    ['회전속도 — 숫자 자리에 문자열', { maxRPM: '12200' }],
    ['원본 표시 — 빠진 자리', { markings: { labeledRPM: 12200 } }],
  ];

  const MALFORMED_GRINDER: ReadonlyArray<
    readonly [string, Record<string, unknown>]
  > = [
    ['회전속도 — 숫자 자리에 문자열', { noLoadRPM: '11000' }],
    ['스핀들 — 목록에 없는 값', { spindleThread: 'M99' }],
    ['덮개 종류 — 목록에 없는 값', { guardType: 'weird' }],
    ['신뢰도 — 목록에 없는 값', { confidence: 'certain' }],
  ];

  it.each(MALFORMED_WHEEL)(
    '확정한 숫돌 규격이 어긋나면 숫돌 단계를 버려 다시 하게 한다 — %s',
    async (_name, change) => {
      await seed();
      put('trialRun', PROGRESS);
      patch('wheel', change);

      const state = await reload();

      // 규칙엔진까지 가지 못한다. 어긋난 값을 비슷한 값으로 고쳐 이어가지도 않는다.
      expect(state.wheel).toBeNull();
      expect(state.wheelOcr).toBeNull();
      expect(state.wheelCondition).toBeNull();
      expect(state.wheelCaptureMetrics).toBeNull();
      expect(state.wheelOcrTelemetry).toBeNull();
      // 그 숫돌로 돌리던 시험운전도, 그 라벨 사진의 기록도 근거가 없다.
      expect(state.trialRun).toBeNull();
      expect(state.captureChecks).toEqual({ grinder: CHECK });
      // 명판 쪽은 그대로다.
      expect(state.declaredPurpose).toBe('cutting');
      expect(state.grinder).toEqual(GRINDER);
      expect(state.grinderCondition).toEqual(GRINDER_OK);
      expect(state.grinderOcr).toEqual(GRINDER);
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each(MALFORMED_WHEEL)(
    '숫돌 OCR 원본만 어긋나면 원본만 버리고 숫돌 단계는 그대로다 — %s',
    async (_name, change) => {
      await seed();
      patch('wheelOcr', change);

      const state = await reload();

      // 고친 값을 모델이 읽은 원본으로 남기지 않는다.
      expect(state.wheelOcr).toBeNull();
      expect(state.wheel).toEqual(WHEEL);
      expect(state.wheelCondition).toEqual(WHEEL_OK);
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each(MALFORMED_GRINDER)(
    '확정한 그라인더 규격이 어긋나면 명판 단계부터 다시 하게 한다 — %s',
    async (_name, change) => {
      await seed();
      patch('grinder', change);

      const state = await reload();

      expect(state.grinder).toBeNull();
      expect(state.grinderCondition).toBeNull();
      // 명판이 없으면 숫돌 단계도 근거가 없다.
      expect(state.wheel).toBeNull();
      expect(state.wheelCondition).toBeNull();
      // 작업 선택은 그대로다.
      expect(state.declaredPurpose).toBe('cutting');
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each(MALFORMED_GRINDER)(
    '그라인더 OCR 원본만 어긋나면 원본만 버리고 나머지는 그대로다 — %s',
    async (_name, change) => {
      await seed();
      patch('grinderOcr', change);

      const state = await reload();

      expect(state.grinderOcr).toBeNull();
      expect(state.grinder).toEqual(GRINDER);
      expect(state.grinderCondition).toEqual(GRINDER_OK);
      expect(state.wheel).toEqual(WHEEL);
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each([
    ['JSON으로 읽히지 않는 값', '{"maxRPM":12200'],
    ['객체가 아닌 값', '"wheel"'],
    ['배열', '[]'],
  ])('규격 자리의 값이 규격이 아니면 버린다 — %s', async (_name, raw) => {
    await seed();
    sessionStorage.setItem(key('wheel'), raw);

    const state = await reload();

    expect(state.wheel).toBeNull();
    expect(state.grinder).toEqual(GRINDER);
    expect(state.droppedOnReload).toBe(true);
  });

  it('명판 값 없이 숫돌 값만 남아 있으면 숫돌 단계를 되살리지 않는다', async () => {
    // 명판 값의 저장만 실패했던 경우다. 어긋난 값은 없으므로 알리지는 않는다 —
    // draft 복구도 같은 경우에 경고하지 않는다.
    await seed();
    sessionStorage.removeItem(key('grinder'));

    const state = await reload();

    expect(state.grinder).toBeNull();
    expect(state.grinderCondition).toBeNull();
    expect(state.wheel).toBeNull();
    expect(state.wheelCondition).toBeNull();
    expect(state.droppedOnReload).toBe(false);
  });
});

describe('새로고침 복원 — 오프라인 표시', () => {
  // 한 단계라도 서버 분석 없이 넣었으면 적합을 내지 않는다(analysisModeOf). 표시를
  // 읽지 못했을 때 온라인으로 추정하면 그 제한이 근거 없이 풀린다.

  it('저장된 적이 없으면 아직 오프라인으로 넣은 단계가 없는 것이다', async () => {
    await seed();
    sessionStorage.removeItem(key('offlineSlots'));

    const state = await reload();

    expect(state.offlineSlots).toEqual({ grinder: false, wheel: false });
    expect(state.analysisMode).toBe('online');
    expect(state.droppedOnReload).toBe(false);
  });

  it('온전한 표시는 그대로 되살린다', async () => {
    await seed();
    put('offlineSlots', { grinder: true, wheel: false });

    const state = await reload();

    expect(state.offlineSlots).toEqual({ grinder: true, wheel: false });
    expect(state.analysisMode).toBe('offline_limited');
    expect(state.droppedOnReload).toBe(false);
  });

  it('제한된 까닭도 함께 되살린다', async () => {
    await seed();
    put('offlineSlots', {
      grinder: true,
      wheel: false,
      causes: { grinder: 'dropped_ocr' },
    });

    const state = await reload();

    expect(state.offlineSlots).toEqual({
      grinder: true,
      wheel: false,
      causes: { grinder: 'dropped_ocr' },
    });
    expect(state.analysisMode).toBe('offline_limited');
    expect(state.droppedOnReload).toBe(false);
  });

  it('어긋난 까닭은 까닭만 버린다 — 제한은 그대로이고 단계를 다시 하게 하지 않는다', async () => {
    await seed();
    put('offlineSlots', {
      grinder: true,
      wheel: false,
      causes: { grinder: 'server' },
    });

    const state = await reload();

    // 까닭은 판정에 쓰지 않는 값이다. 표시는 온전하므로 읽지 못한 표시로 보지 않는다.
    expect(state.offlineSlots).toEqual({ grinder: true, wheel: false });
    expect(state.analysisMode).toBe('offline_limited');
    expect(state.droppedOnReload).toBe(false);
  });

  it.each([
    ['빈 객체', '{}'],
    ['한 단계만 있는 값', '{"grinder":false}'],
    ['boolean이 아닌 값', '{"grinder":"false","wheel":0}'],
    ['문자열', '"online"'],
    ['배열', '[false,false]'],
    ['null', 'null'],
    ['JSON으로 읽히지 않는 값', '{"grinder":fal'],
  ])('읽지 못하면 더 엄격한 쪽(오프라인)으로 본다 — %s', async (_name, raw) => {
    await seed();
    sessionStorage.setItem(key('offlineSlots'), raw);

    const state = await reload();

    expect(state.offlineSlots).toEqual({ grinder: true, wheel: true });
    expect(state.analysisMode).toBe('offline_limited');
    expect(state.droppedOnReload).toBe(true);
    // 규격은 그대로다 — 오프라인 표시 때문에 단계를 다시 하게 하지는 않는다.
    expect(state.grinder).toEqual(GRINDER);
    expect(state.wheel).toEqual(WHEEL);

    // 한 번 더 새로고침해도 온라인으로 풀리지 않는다.
    expect((await reload()).analysisMode).toBe('offline_limited');
  });
});

describe('새로고침 복원 — 진행 중 시험운전', () => {
  // 제122조 ②의 1분·3분은 앱이 줄여 줄 수 없는 시간이다. 타이머는 종료시각으로
  // 남은 시간을 계산하는데, 종료시각을 읽지 못하면 남은 시간이 0으로 나온다 —
  // 어긋난 값을 그대로 되살리면 기다리지 않고 "이상 없음"을 누를 수 있다.

  it.each([
    ['교체 후(180초)', PROGRESS],
    [
      '작업 시작 전(60초)',
      {
        wheelReplaced: false,
        requiredSeconds: 60,
        startedAt: '2026-09-12T09:00:00.000Z',
        endsAt: '2026-09-12T09:01:00.000Z',
      },
    ],
  ])('온전한 타이머는 그대로 이어진다 — %s', async (_name, progress) => {
    await seed();
    put('trialRun', progress);

    const state = await reload();

    expect(state.trialRun).toEqual(progress);
    expect(state.droppedOnReload).toBe(false);
  });

  it.each([
    ['빈 객체', {}],
    ['배열', []],
    ['문자열', 'running'],
    ['종료시각이 없는 값', { ...PROGRESS, endsAt: undefined }],
    ['종료시각이 날짜가 아닌 값', { ...PROGRESS, endsAt: '언젠가' }],
    ['시작시각이 날짜가 아닌 값', { ...PROGRESS, startedAt: 'x' }],
    ['교체 여부가 boolean이 아닌 값', { ...PROGRESS, wheelReplaced: 'yes' }],
    [
      '법정 시간이 아닌 요구 시간',
      { ...PROGRESS, requiredSeconds: 5, endsAt: '2026-09-12T09:00:05.000Z' },
    ],
    [
      '교체했는데 60초인 값',
      { ...PROGRESS, requiredSeconds: 60, endsAt: '2026-09-12T09:01:00.000Z' },
    ],
    [
      '종료시각이 요구 시간보다 이른 값',
      { ...PROGRESS, endsAt: '2026-09-12T09:02:59.000Z' },
    ],
  ])(
    '어긋난 타이머는 버려 시험운전을 처음부터 다시 하게 한다 — %s',
    async (_name, progress) => {
      await seed();
      put('trialRun', progress);

      const state = await reload();

      expect(state.trialRun).toBeNull();
      expect(state.droppedOnReload).toBe(true);
      // 규격과 상태 확인은 그대로다.
      expect(state.wheel).toEqual(WHEEL);
      expect(state.wheelCondition).toEqual(WHEEL_OK);
    },
  );
});

describe('새로고침 복원 — 규격이 아닌 값', () => {
  // 어긋난 값만 버린다. 버려진 것이 작업자의 상태 확인이면 그 확인은 하지 않은
  // 것이 되어, 화면 가드가 그 단계를 다시 하게 한다.

  it.each([
    ['boolean 자리에 문자열', { guardSecure: 'yes' }],
    ['boolean 자리에 숫자', { bodyUndamaged: 1 }],
    ['빠진 항목', { cordAndPlugUndamaged: undefined }],
  ])(
    '장비 상태 확인이 어긋나면 그 확인만 버린다 — %s',
    async (_name, change) => {
      await seed();
      patch('grinderCondition', change);

      const state = await reload();

      expect(state.grinderCondition).toBeNull();
      expect(state.grinder).toEqual(GRINDER);
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each([
    ['boolean 자리에 문자열', { damageFree: 'true' }],
    // 구버전 항목이지만 Gate는 false가 아닌지만 본다 — 문자열이 그대로 통과한다.
    ['기한 항목에 문자열', { expiryValid: 'false' }],
    ['빠진 기본 항목', { labelLegible: undefined }],
    ['종류별 항목에 숫자', { flapsIntact: 1 }],
  ])(
    '숫돌 상태 확인이 어긋나면 그 확인만 버린다 — %s',
    async (_name, change) => {
      await seed();
      patch('wheelCondition', change);

      const state = await reload();

      expect(state.wheelCondition).toBeNull();
      expect(state.wheel).toEqual(WHEEL);
      expect(state.grinderCondition).toEqual(GRINDER_OK);
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each([
    ['재료 — 목록에 없는 값', { material: 'wood' }],
    ['건식/습식 — 목록에 없는 값', { cooling: 'oil' }],
    ['빠진 자리', { cooling: undefined }],
  ])('작업 조건이 어긋나면 그 값만 버린다 — %s', async (_name, change) => {
    await seed();
    patch('workConditions', change);

    const state = await reload();

    // 고르지 않은 것과 같다(화면·기록에서 unknown으로 읽는다).
    expect(state.workConditions).toBeNull();
    expect(state.declaredPurpose).toBe('cutting');
    expect(state.wheel).toEqual(WHEEL);
    expect(state.droppedOnReload).toBe(true);
  });

  it.each([
    ['grinderCaptureMetrics', { uploadBytes: '1830000' }],
    ['wheelCaptureMetrics', { blurMetric: undefined }],
    ['grinderOcrTelemetry', { engine: 'gpt' }],
    ['wheelOcrTelemetry', { inputTokens: '1500' }],
  ] as const)(
    '검증용 측정값이 어긋나면 그 값만 버린다 — %s',
    async (name, change) => {
      await seed();
      patch(name, change);

      const state = await reload();

      expect(state[name]).toBeNull();
      expect(state.grinder).toEqual(GRINDER);
      expect(state.wheel).toEqual(WHEEL);
      expect(state.wheelCondition).toEqual(WHEEL_OK);
      expect(state.droppedOnReload).toBe(true);
    },
  );

  it.each([
    ['배열이 아닌 값', '{}'],
    ['JSON으로 읽히지 않는 값', '[{"analyzedAt":'],
    ['도착 시각이 날짜가 아닌 판독', null],
    ['칸이 빠진 판독', undefined],
  ])(
    '재분석 판독이 어긋나면(%s) 목록을 버리고 알린다 — 빈 목록으로 채우지 않는다',
    async (name, raw) => {
      await seed();
      if (typeof raw === 'string') {
        sessionStorage.setItem(key('reanalyses'), raw);
      } else {
        const entry: Record<string, unknown> = {
          analyzedAt: '2026-10-04T05:12:03.000Z',
          grinderOcr: null,
          grinderOcrTelemetry: null,
          wheelOcr: WHEEL_OCR,
          wheelOcrTelemetry: TELEMETRY,
          acceptedAt: null,
          damageRecheck: null,
        };
        if (raw === null) entry.analyzedAt = 'soon';
        else delete entry.acceptedAt;
        put('reanalyses', [entry]);
      }

      const state = await reload();

      // 읽을 수 없는 목록을 "재분석을 하지 않았다"로 바꿔 적지 않는다. 알 수 없음이다.
      expect(state.reanalyses, name).toBeNull();
      // 확정한 규격과 작업자의 확인은 그대로다.
      expect(state.wheel).toEqual(WHEEL);
      expect(state.wheelCondition).toEqual(WHEEL_OK);
      expect(state.droppedOnReload).toBe(true);
      // 버린 값은 저장소에서도 지운다 — 다시 새로고침해도 또 알리지 않는다.
      expect(stored('reanalyses')).toBeUndefined();
    },
  );

  it('숫돌 규격을 버리면 숫돌 쪽 재분석 판독도 함께 버리고 명판 판독은 남긴다', async () => {
    // 숫돌이 없으면 그 숫돌의 사진을 본 판독은 근거가 없다(dropOrphanedSteps).
    const grinderReading = {
      analyzedAt: '2026-10-04T05:12:03.000Z',
      grinderOcr: GRINDER,
      grinderOcrTelemetry: TELEMETRY,
      wheelOcr: WHEEL_OCR,
      wheelOcrTelemetry: TELEMETRY,
      acceptedAt: null,
      damageRecheck: {
        damageFree: true,
        answeredAt: '2026-10-04T05:12:31.000Z',
      },
    };
    const wheelReading = { ...grinderReading, grinderOcr: null };
    await seed();
    put('reanalyses', [
      grinderReading,
      { ...wheelReading, grinderOcrTelemetry: null },
    ]);
    patch('wheel', { wheelType: 'not-a-real-type' });

    const state = await reload();

    expect(state.wheel).toBeNull();
    expect(state.reanalyses).toEqual([
      {
        ...grinderReading,
        wheelOcr: null,
        wheelOcrTelemetry: null,
        damageRecheck: null,
      },
    ]);
  });

  it('사진 상태 기록은 어긋난 자리만 버린다', async () => {
    await seed();
    patch('captureChecks', { wheel: { ...CHECK, warnings: ['smudge'] } });

    const state = await reload();

    expect(state.captureChecks).toEqual({ grinder: CHECK });
    expect(state.wheel).toEqual(WHEEL);
    expect(state.droppedOnReload).toBe(true);
  });

  it.each([
    ['문자열', '"blur"'],
    ['배열', '[]'],
    ['JSON으로 읽히지 않는 값', '{"grinder":'],
  ])('사진 상태 기록 전체가 %s이면 모두 버린다', async (_name, raw) => {
    await seed();
    sessionStorage.setItem(key('captureChecks'), raw);

    const state = await reload();

    expect(state.captureChecks).toEqual({});
    expect(state.droppedOnReload).toBe(true);
  });

  it('사진 상태 기록에 명판·라벨이 아닌 자리가 있어도 되살리지 않는다', async () => {
    // 다각도 확인이 있던 시기의 자리다. 지금 점검에는 그 사진이 없다.
    await seed();
    patch('captureChecks', { wheelBack: CHECK });

    const state = await reload();

    expect(state.captureChecks).toEqual({ grinder: CHECK, wheel: CHECK });
  });

  it.each([
    ['문자열', '"2026-09-12"'],
    ['객체', '{}'],
    ['JSON으로 읽히지 않는 값', 'abc'],
  ])('시작 시각이 %s이면 버린다', async (_name, raw) => {
    await seed();
    sessionStorage.setItem(key('startedAt'), raw);

    const state = await reload();

    // 소요시간은 지어내지 않고 없는 채로 둔다(elapsedSince가 null을 낸다).
    expect(state.startedAt).toBeNull();
    expect(state.wheel).toEqual(WHEEL);
    expect(state.droppedOnReload).toBe(true);
  });

  it('작업 선택이 어긋나 있어도 버렸다고 알린다', async () => {
    await seed();
    put('purpose', 'polishing');

    const state = await reload();

    expect(state.declaredPurpose).toBeNull();
    expect(state.droppedOnReload).toBe(true);
  });
});

describe('새로고침 복원 — 버린 값 알림', () => {
  it('버린 값은 저장소에서도 지워, 다시 새로고침하면 또 알리지 않는다', async () => {
    // 메모리 상태와 새로고침용 저장이 어긋나 있으면 새로고침할 때마다 같은 값을
    // 다시 버리고 다시 알린다 — 다시 넣을 수 없는 값(작업 조건·측정값)은 끝없이.
    await seed();
    patch('wheel', { expiry: {} });
    patch('workConditions', { material: 'wood' });

    expect((await reload()).droppedOnReload).toBe(true);
    cleanup();

    expect(sessionStorage.getItem(key('wheel'))).toBeNull();
    expect(sessionStorage.getItem(key('wheelCondition'))).toBeNull();
    expect(sessionStorage.getItem(key('workConditions'))).toBeNull();
    // 버리지 않은 값은 그대로 남아 있다.
    expect(stored('grinder')).toEqual(GRINDER);
    expect(stored('grinderCondition')).toEqual(GRINDER_OK);
    expect(stored('captureChecks')).toEqual({ grinder: CHECK });

    const again = await reload();
    expect(again.droppedOnReload).toBe(false);
    expect(again.wheel).toBeNull();
    expect(again.grinder).toEqual(GRINDER);
  });

  it('버린 값이 없으면 저장소를 건드리지 않는다', async () => {
    await seed();
    const before = JSON.stringify(
      Object.fromEntries(
        Object.keys(sessionStorage).map((name) => [
          name,
          sessionStorage.getItem(name),
        ]),
      ),
    );

    await reload();

    expect(
      JSON.stringify(
        Object.fromEntries(
          Object.keys(sessionStorage).map((name) => [
            name,
            sessionStorage.getItem(name),
          ]),
        ),
      ),
    ).toBe(before);
  });

  it('점검을 새로 시작하면(reset) 알림이 꺼진다', async () => {
    await seed();
    patch('wheel', { wheelType: 'resin_wheel' });
    const result = await load();
    expect(result.current.droppedOnReload).toBe(true);

    act(() => result.current.reset());

    expect(result.current.droppedOnReload).toBe(false);
  });

  it('draft로 복구하면(restore) 알림이 꺼진다 — 그 뒤의 경고는 draft 복구가 낸다', async () => {
    await seed();
    patch('wheel', { wheelType: 'resin_wheel' });
    const result = await load();
    expect(result.current.droppedOnReload).toBe(true);

    act(() =>
      result.current.restore({
        declaredPurpose: 'cutting',
        startedAt: 1,
        workConditions: null,
        grinder: GRINDER,
        wheel: null,
        grinderOcr: null,
        wheelOcr: null,
        grinderCondition: GRINDER_OK,
        wheelCondition: null,
        trialRun: null,
        grinderImage: null,
        wheelImage: null,
        grinderCaptureMetrics: null,
        wheelCaptureMetrics: null,
        grinderOcrTelemetry: null,
        wheelOcrTelemetry: null,
        captureChecks: {},
        offlineSlots: { grinder: false, wheel: false },
        reanalyses: [],
        checklist: null,
        trialRunRecord: null,
      }),
    );

    expect(result.current.droppedOnReload).toBe(false);
    expect(result.current.grinder).toEqual(GRINDER);
  });
});
