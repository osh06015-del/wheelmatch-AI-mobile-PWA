// sanitizeInspectionRecord — TypeScript 타입은 런타임 속성을 지우지 않는다는
// 전제로 이 함수를 검증한다. 여기서는 순수하게 "허용된 필드만 새 객체로
// 재구성되는가"만 본다. classifyImportRecords의 유효/무효/중복 분류는
// backupModel.test.ts가 맡는다.

import { describe, expect, it } from 'vitest';

import { isValidWheelSpec, sanitizeInspectionRecord } from './recordSanitize';
import type { VisibleDamageSource } from '@/lib/rules/types';

/** 대부분의 optional 중첩 필드까지 채운 완전한 기록. 라운드트립 검증용 */
function fullRecordRaw(): Record<string, unknown> {
  return {
    id: 42,
    createdAt: '2026-09-18T00:00:00.000Z',
    grinder: {
      model: 'GWS 750-125',
      noLoadRPM: 11000,
      maxWheelDiameter: 125,
      spindleThread: 'M14',
      guardType: 'grinding',
      guardSize: 125,
      rawText: 'GWS 750-125 11000/min',
      confidence: 'high',
    },
    wheel: {
      maxRPM: 12000,
      diameter: 125,
      thickness: 6,
      purpose: 'grinding',
      wheelType: 'bonded_grinding',
      visibleDamage: 'none_visible',
      markings: {
        labeledRPM: 12000,
        peripheralSpeedMps: 80,
        boreDiameter: 22.23,
        expiryRaw: '04/2027',
      },
      rpmSource: 'label',
      expiry: { year: 2027, month: 4 },
      accessoryName: null,
      rawText: '125x6x22.23',
      confidence: 'high',
    },
    result: {
      verdict: 'COMPATIBLE',
      checks: [
        {
          rule: 'rpmSafety',
          passed: true,
          reason: '통과',
          detail: {
            code: 'rpmSafety.pass',
            params: { rpm: 12000, unit: 'rpm' },
          },
          grinderValue: '11000',
          wheelValue: '12000',
          advisory: false,
        },
      ],
      timestamp: '2026-09-18T00:00:01.000Z',
    },
    checklist: {
      guardCover: true,
      auxiliaryHandle: true,
      wheelDamage: true,
      ppe: true,
      workpieceSecured: true,
      surroundingsClear: true,
      sparkDirection: true,
    },
    grinderCondition: {
      cordAndPlugUndamaged: true,
      bodyUndamaged: true,
      guardSecure: true,
      auxiliaryHandleSecure: true,
      spindleAssemblyUndamaged: true,
    },
    wheelCondition: {
      damageFree: true,
      notDeformed: true,
      mountingAreaUndamaged: true,
      labelLegible: true,
      expiryValid: true,
      flapsIntact: null,
    },
    trialRun: {
      wheelReplaced: true,
      requiredSeconds: 180,
      startedAt: '2026-09-18T00:01:00.000Z',
      finishedAt: '2026-09-18T00:04:00.000Z',
      elapsedSeconds: 182,
      outcome: 'normal',
      findings: [],
      completed: true,
    },
    declaredPurpose: 'grinding',
    workConditions: { material: 'steel', cooling: 'dry' },
    accessoryProfile: { type: 'bonded_grinding', version: 'v1', scope: 'full' },
    profileConditions: [
      { key: 'guard', status: 'manual_check', code: 'guard.manualCheck' },
    ],
    grinderOcrTelemetry: {
      engine: 'claude',
      model: 'claude-x',
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      durationMs: 900,
    },
    wheelExam: {
      status: 'not_observed',
      findings: [],
      photoQuality: [{ view: 'front', issues: [], readable: true }],
      model: 'claude-x',
      promptVersion: 'v1',
      analyzedAt: '2026-09-18T00:00:30.000Z',
    },
    wheelExamAcknowledged: true,
    elapsedMs: 45000,
    preTrialElapsedMs: 30000,
    ruleVersion: 'v3',
    analysisMode: 'online',
  };
}

describe('sanitizeInspectionRecord — 정상 라운드트립', () => {
  it('사용기한 직접 응답은 보존하고 임의의 확인 완료 값은 거부한다', () => {
    const raw = fullRecordRaw();
    const wheel = raw.wheel as Record<string, unknown>;
    wheel.expiry = null;
    wheel.expiryReview = 'not_found';
    expect(sanitizeInspectionRecord(raw)?.wheel.expiryReview).toBe('not_found');
    wheel.expiryReview = 'safe';
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });
  it('허용된 필드는 깊은 곳까지 그대로 남는다', () => {
    const raw = fullRecordRaw();
    expect(sanitizeInspectionRecord(raw)).toEqual(raw);
  });

  it('외관 의심의 출처는 보존하고, 목록에 없는 출처는 기록 전체를 무효로 만든다', () => {
    // 재구성하면서 이 칸을 빠뜨리면 백업을 거친 기록에서 출처가 조용히 사라지고,
    // 이어받은 의심이 다시 "이 사진에서 보인 것"으로만 읽힌다.
    const raw = fullRecordRaw();
    const wheel = raw.wheel as Record<string, unknown>;
    wheel.visibleDamage = 'suspected';
    wheel.visibleDamageSources = ['legacy_exam', 'carried'];
    expect(sanitizeInspectionRecord(raw)?.wheel.visibleDamageSources).toEqual([
      'legacy_exam',
      'carried',
    ]);

    wheel.visibleDamageSources = ['carried', 'trusted'];
    expect(sanitizeInspectionRecord(raw)).toBeNull();
    // 목록이 아닌 값도 받지 않는다.
    wheel.visibleDamageSources = 'carried';
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('같은 출처가 두 번 적혔거나 목록이 빈 기록은 버리지 않고 그대로 옮긴다 — 고쳐 담지 않는다', () => {
    // 앱이 쓰는 모양은 아니다(손으로 고친 백업 등). 그렇다고 기록을 통째로 버리면
    // 의심이 적힌 기록이 출처 표기 때문에 사라진다. 값을 다듬어 담지도 않는다 —
    // 화면과 CSV가 읽을 때 한 번만 보고(checkText.ts), 빈 목록은 출처 미기록과
    // 같게 읽는다.
    const raw = fullRecordRaw();
    const wheel = raw.wheel as Record<string, unknown>;
    wheel.visibleDamage = 'suspected';

    wheel.visibleDamageSources = ['carried', 'carried'];
    expect(sanitizeInspectionRecord(raw)?.wheel.visibleDamageSources).toEqual([
      'carried',
      'carried',
    ]);

    wheel.visibleDamageSources = [];
    const emptied = sanitizeInspectionRecord(raw);
    expect(emptied?.wheel.visibleDamage).toBe('suspected');
    expect(emptied?.wheel.visibleDamageSources).toEqual([]);
  });

  it('출처 타입의 값은 하나도 빠짐없이 통과한다', () => {
    // 허용 목록에서 빠진 값은 타입 검사가 잡지 못한다. 타입 전체를 표로 잠가
    // 돌린다 — 빠지면 그 출처가 붙은 기록이 백업·새로고침 복원에서 통째로 버려진다.
    const all: Record<VisibleDamageSource, true> = {
      label_photo: true,
      reanalysis: true,
      legacy_exam: true,
      dropped_ocr: true,
      carried: true,
    };
    for (const source of Object.keys(all)) {
      const raw = fullRecordRaw();
      const wheel = raw.wheel as Record<string, unknown>;
      wheel.visibleDamage = 'suspected';
      wheel.visibleDamageSources = [source];

      expect(sanitizeInspectionRecord(raw)?.wheel.visibleDamageSources).toEqual(
        [source],
      );
      expect(isValidWheelSpec(wheel)).toBe(true);
    }
  });

  it('출처가 없는 기록에 출처 칸을 만들지 않는다 — 구기록을 라벨 사진 판독으로 채우지 않는다', () => {
    const raw = fullRecordRaw();
    (raw.wheel as Record<string, unknown>).visibleDamage = 'suspected';
    const sanitized = sanitizeInspectionRecord(raw);

    expect(sanitized?.wheel.visibleDamage).toBe('suspected');
    expect(sanitized && 'visibleDamageSources' in sanitized.wheel).toBe(false);
  });

  it('제한 대조 기록의 단계별 까닭을 보존한다', () => {
    const raw = fullRecordRaw();
    raw.analysisMode = 'offline_limited';
    raw.analysisLimitCauses = { grinder: 'manual', wheel: 'dropped_ocr' };
    expect(sanitizeInspectionRecord(raw)).toEqual(raw);

    raw.analysisLimitCauses = { wheel: 'local_ocr' };
    expect(sanitizeInspectionRecord(raw)).toEqual(raw);

    raw.analysisLimitCauses = { grinder: 'unknown' };
    expect(sanitizeInspectionRecord(raw)).toEqual(raw);
  });

  it('까닭을 남기기 전에 저장된 제한 대조 기록은 까닭 없이 그대로 통과한다 — 채워 넣지 않는다', () => {
    const raw = fullRecordRaw();
    raw.analysisMode = 'offline_limited';
    const record = sanitizeInspectionRecord(raw);
    expect(record?.analysisMode).toBe('offline_limited');
    expect(record).not.toHaveProperty('analysisLimitCauses');
  });

  it('사진 없는 구기록(옵션 필드 전부 없음)도 통과한다', () => {
    const minimal = {
      id: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      grinder: {
        model: null,
        noLoadRPM: null,
        maxWheelDiameter: null,
        rawText: '',
        confidence: 'low',
      },
      wheel: {
        maxRPM: null,
        diameter: null,
        thickness: null,
        purpose: 'unknown',
        wheelType: 'unknown',
        visibleDamage: 'unknown',
        rawText: '',
        confidence: 'low',
      },
      result: {
        verdict: 'UNDETERMINED',
        checks: [],
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      checklist: {
        guardCover: null,
        auxiliaryHandle: null,
        wheelDamage: null,
        ppe: null,
      },
    };
    expect(sanitizeInspectionRecord(minimal)).toEqual(minimal);
  });
});

describe('sanitizeInspectionRecord — 알 수 없는 속성은 어떤 깊이에서도 남지 않는다', () => {
  it('최상위의 API 키·system prompt·원시 응답류 필드를 버린다', () => {
    const raw = {
      ...fullRecordRaw(),
      apiKey: 'sk-ant-secret',
      systemPrompt: '너는 라벨을 읽는 어시스턴트다...',
      rawApiResponse: { id: 'msg_1', content: [{ type: 'text', text: '...' }] },
      draft: { step: 'wheel-scan' },
      currentGateProgress: { step: 3 },
    };
    const result = sanitizeInspectionRecord(raw);
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('apiKey');
    expect(result).not.toHaveProperty('systemPrompt');
    expect(result).not.toHaveProperty('rawApiResponse');
    expect(result).not.toHaveProperty('draft');
    expect(result).not.toHaveProperty('currentGateProgress');
    expect(result).toEqual(fullRecordRaw());
  });

  it('중첩 객체(grinder) 안의 알 수 없는 속성도 버린다', () => {
    const raw = {
      ...fullRecordRaw(),
      grinder: {
        ...(fullRecordRaw().grinder as Record<string, unknown>),
        apiKey: 'sk-ant-secret',
        internalDebug: { prompt: 'x' },
      },
    };
    const result = sanitizeInspectionRecord(raw);
    expect(result?.grinder).not.toHaveProperty('apiKey');
    expect(result?.grinder).not.toHaveProperty('internalDebug');
    expect(result?.grinder).toEqual(fullRecordRaw().grinder);
  });

  it('배열 안 항목(checks[].detail.params)의 알 수 없는 값 타입은 기록 전체를 무효로 만든다', () => {
    const raw = {
      ...fullRecordRaw(),
      result: {
        verdict: 'COMPATIBLE',
        checks: [
          {
            rule: 'rpmSafety',
            passed: true,
            reason: '통과',
            detail: {
              code: 'rpmSafety.pass',
              params: { rpm: 12000, evil: { nested: true } },
            },
            grinderValue: '11000',
            wheelValue: '12000',
          },
        ],
        timestamp: '2026-09-18T00:00:01.000Z',
      },
    };
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('params에 실제 __proto__ 소유 속성이 있어도(JSON.parse 결과처럼) 조용히 빠진다', () => {
    // JSON.parse('{"__proto__": ...}')는 예외적으로 "__proto__"라는 이름의
    // 평범한 own property를 만든다(진짜 프로토타입을 바꾸지 않는다) — 객체
    // 리터럴의 `{__proto__: x}` 문법과 다르다. previewImport가 실제로 겪는
    // 입력 형태이므로 여기서도 JSON.parse로 만든다.
    const params = JSON.parse(
      '{"rpm":12000,"__proto__":{"polluted":true},"constructor":{"polluted":true},"prototype":{"polluted":true}}',
    ) as Record<string, unknown>;
    expect(Object.keys(params)).toContain('__proto__');

    const raw = {
      ...fullRecordRaw(),
      result: {
        verdict: 'COMPATIBLE',
        checks: [
          {
            rule: 'rpmSafety',
            passed: true,
            reason: '통과',
            detail: { code: 'rpmSafety.pass', params },
            grinderValue: '11000',
            wheelValue: '12000',
          },
        ],
        timestamp: '2026-09-18T00:00:01.000Z',
      },
    };
    const result = sanitizeInspectionRecord(raw);
    expect(result).not.toBeNull();
    const sanitizedParams = result?.result.checks[0]?.detail?.params;
    expect(sanitizedParams).toEqual({ rpm: 12000 });
    expect(Object.keys(sanitizedParams ?? {})).not.toContain('__proto__');
    expect(Object.getPrototypeOf(sanitizedParams)).toBe(Object.prototype);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('최상위에 실제 __proto__ 소유 속성이 있어도 읽지 않는다(프로토타입 오염 방어)', () => {
    const raw = JSON.parse(
      `${JSON.stringify(fullRecordRaw()).slice(0, -1)},"__proto__":{"polluted":true},"constructor":{"polluted":true}}`,
    ) as Record<string, unknown>;
    expect(Object.keys(raw)).toContain('__proto__');

    const result = sanitizeInspectionRecord(raw);
    expect(result).not.toBeNull();
    expect(Object.keys(result as object)).not.toContain('__proto__');
    expect(Object.keys(result as object)).not.toContain('constructor');
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('사진 Blob이 어떤 이름으로 끼어 있어도(Blob 자체가 아니라도) 결과에 실리지 않는다', () => {
    const raw = {
      ...fullRecordRaw(),
      grinderImage: new Blob(['x']),
      wheelImage: new Blob(['y']),
      wheelBackImage: 'not-even-a-blob-but-still-forbidden',
    };
    const result = sanitizeInspectionRecord(raw);
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('grinderImage');
    expect(result).not.toHaveProperty('wheelImage');
    expect(result).not.toHaveProperty('wheelBackImage');
  });
});

describe('sanitizeInspectionRecord — 제한 까닭 자리의 알 수 없는 속성', () => {
  it('단계가 아닌 속성은 버린다', () => {
    const raw = fullRecordRaw();
    raw.analysisMode = 'offline_limited';
    raw.analysisLimitCauses = {
      grinder: 'manual',
      wheelBack: 'manual',
      note: '<script>',
    };
    expect(sanitizeInspectionRecord(raw)?.analysisLimitCauses).toEqual({
      grinder: 'manual',
    });
  });
});

describe('sanitizeInspectionRecord — 알려진 필드의 손상은 기록 전체를 무효로 만든다', () => {
  it('잘못된 enum(wheelType)은 무효다', () => {
    const raw = fullRecordRaw();
    (raw.wheel as Record<string, unknown>).wheelType = 'not-a-real-type';
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('비정상 숫자(Infinity)는 무효다', () => {
    const raw = fullRecordRaw();
    (raw.grinder as Record<string, unknown>).noLoadRPM = Infinity;
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('잘못된 날짜 문자열(createdAt)은 무효다', () => {
    const raw = fullRecordRaw();
    raw.createdAt = 'not-a-date';
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('과도하게 긴 문자열(rawText)은 무효다', () => {
    const raw = fullRecordRaw();
    (raw.grinder as Record<string, unknown>).rawText = 'x'.repeat(20_001);
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('과도하게 큰 배열(checks)은 무효다', () => {
    const raw = fullRecordRaw();
    (raw.result as Record<string, unknown>).checks = Array.from(
      { length: 201 },
      () => ({
        rule: 'x',
        passed: null,
        reason: '',
        grinderValue: null,
        wheelValue: null,
      }),
    );
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('유효기한 월이 범위를 벗어나면 무효다', () => {
    const raw = fullRecordRaw();
    (raw.wheel as Record<string, unknown>).expiry = { year: 2027, month: 13 };
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('타입이 어긋난 필드(boolean이어야 할 자리에 문자열)는 무효다', () => {
    const raw = fullRecordRaw();
    (raw.checklist as Record<string, unknown>).guardCover = 'yes';
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it.each([
    ['목록에 없는 까닭', { grinder: 'server' }],
    ['문자열이 아닌 까닭', { wheel: true }],
    ['객체가 아닌 값', 'manual'],
    ['배열', ['manual']],
  ])('어긋난 제한 까닭(%s)은 무효다', (_name, causes) => {
    const raw = fullRecordRaw();
    raw.analysisMode = 'offline_limited';
    raw.analysisLimitCauses = causes;
    expect(sanitizeInspectionRecord(raw)).toBeNull();
  });

  it('객체가 아니면 무효다', () => {
    expect(sanitizeInspectionRecord('not an object')).toBeNull();
    expect(sanitizeInspectionRecord(null)).toBeNull();
    expect(sanitizeInspectionRecord([1, 2, 3])).toBeNull();
  });
});
