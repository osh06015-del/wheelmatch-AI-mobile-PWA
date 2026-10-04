// 번역 무결성 테스트.
//
// 번역문이 맞는지는 사람이 봐야 안다. 여기서 지키는 것은 그 앞 단계다 —
// 빠진 문구, 빈 문구, 어긋난 자리표시자. 안전 문구가 빈 칸으로 뜨는 일을 막는다.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RULE } from '@/lib/rules/engine';
import { LOCALES, translate, type Locale, type Translate } from './index';
import { en } from './messages/en';
import { id } from './messages/id';
import { ko, type MessageKey } from './messages/ko';
import { vi } from './messages/vi';
import { zh } from './messages/zh';
import {
  ACTION_MESSAGE_KEY,
  RULE_MESSAGE_KEY,
  ruleLabelText,
} from './ruleLabel';

const CATALOG: Record<Locale, Record<string, string>> = { ko, en, vi, id, zh };
const KEYS = Object.keys(ko) as MessageKey[];

/** '...{count}...' 안의 자리표시자 이름들 */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe.each(LOCALES)('$label 번역', ({ code }) => {
  const messages = CATALOG[code];

  it('한국어에 있는 문구가 모두 있다', () => {
    const missing = KEYS.filter((key) => !(key in messages));
    expect(missing).toEqual([]);
  });

  it('빈 문구가 없다', () => {
    const blank = KEYS.filter((key) => messages[key].trim() === '');
    expect(blank).toEqual([]);
  });

  it('한국어에 없는 문구를 넣지 않았다', () => {
    // 남은 키는 어느 화면에도 안 나온다. 고쳤다고 착각하기 쉽다.
    const extra = Object.keys(messages).filter((key) => !(key in ko));
    expect(extra).toEqual([]);
  });

  it('자리표시자가 한국어와 같다', () => {
    // {count}를 빠뜨리면 "안전 항목 개를 모두 확인"처럼 숫자가 사라진다.
    for (const key of KEYS) {
      expect(placeholders(messages[key])).toEqual(placeholders(ko[key]));
    }
  });

  it('한국어를 그대로 베껴 두지 않았다', () => {
    // 번역을 안 한 채 원문을 복사해두면 번역된 것처럼 보인다.
    if (code === 'ko') return;
    const copied = KEYS.filter(
      (key) => messages[key] === ko[key] && /[가-힣]/.test(ko[key]),
    );
    expect(copied).toEqual([]);
  });

  it('번역문에 한국어가 한 글자도 섞이지 않았다', () => {
    // 문장 하나만 한국어로 남아도, 그 언어를 고른 작업자는 그 자리에서 막힌다.
    // 베낀 것만 막아서는 일부만 번역하고 남긴 문장을 잡지 못한다.
    if (code === 'ko') return;
    const mixed = KEYS.filter((key) => /[가-힣]/.test(messages[key]));
    expect(mixed).toEqual([]);
  });
});

describe('translate', () => {
  it('고른 언어의 문구를 준다', () => {
    expect(translate('en', 'verdict.incompatible')).toBe('SPECS DO NOT MATCH');
    expect(translate('ko', 'verdict.incompatible')).toBe('부적합');
  });

  it('자리표시자를 채운다', () => {
    expect(translate('ko', 'checklist.incomplete', { count: 4 })).toContain(
      '4개',
    );
  });

  it('판정 문구는 "사용해도 된다"는 뜻이 되지 않게 한다', () => {
    // 이 앱은 규격이 맞는지만 본다. 사용 승인이 아니다.
    expect(translate('en', 'verdict.compatible')).toBe('SPECS MATCH');
    expect(translate('en', 'verdict.compatible').toLowerCase()).not.toContain(
      'safe',
    );
  });
});

describe('규칙 이름 연결', () => {
  it('엔진의 모든 규칙에 문구 키가 있다', () => {
    // 규칙을 새로 추가하고 번역을 잊으면 그 항목만 한국어로 남는다.
    const missing = Object.values(RULE).filter(
      (rule) => !(rule in RULE_MESSAGE_KEY),
    );
    expect(missing).toEqual([]);
  });

  it('연결된 문구 키가 실제로 존재한다', () => {
    for (const key of Object.values(RULE_MESSAGE_KEY)) {
      expect(ko).toHaveProperty(key);
    }
    for (const key of Object.values(ACTION_MESSAGE_KEY)) {
      expect(ko).toHaveProperty(key);
    }
  });

  it('제한 대조 — 한국어 화면의 이름이 기록에 남는 이름과 같다', () => {
    // 규칙 이름은 기록(result.checks[].rule)에 그대로 저장된다. 화면만 고치고 엔진
    // 이름을 두면 기록에는 계속 「오프라인」이 남는다.
    expect(RULE.OFFLINE_LIMITED).toBe('제한 대조');
    expect(ko['rule.offlineLimited']).toBe(RULE.OFFLINE_LIMITED);
  });

  it('짝이 없는 이름은 저장된 이름 그대로 보인다 — 빈 칸이 되지 않는다', () => {
    const t: Translate = (key, params) => translate('en', key, params);
    expect(ruleLabelText('없는 규칙', t)).toBe('없는 규칙');
    // 기록에서 읽은 이름은 아무 문자열이나 될 수 있다. 객체에 원래 있는 이름을
    // 문구 키로 읽으면 라벨이 undefined가 된다.
    expect(ruleLabelText('constructor', t)).toBe('constructor');
    expect(ruleLabelText('toString', t)).toBe('toString');
  });

  it('이름을 바꾸기 전에 저장된 기록도 같은 라벨로 읽는다', () => {
    // 2026-10-04까지 저장된 기록의 규칙 이름은 「오프라인 제한 대조」다. 짝을 잃으면
    // 고른 언어와 상관없이 그 한국어 이름이 화면에 그대로 나온다.
    for (const { code } of LOCALES) {
      const t: Translate = (key, params) => translate(code, key, params);
      expect(ruleLabelText('오프라인 제한 대조', t), code).toBe(
        translate(code, 'rule.offlineLimited'),
      );
    }
  });
});

describe('쓰이지 않는 문구', () => {
  /** src 아래 소스를 전부 이어 붙인다 (문구 파일과 테스트는 뺀다). */
  function appSource(dir = 'src'): string {
    let out = '';
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        // E2E 흐름 테스트 도구는 문구 키로 화면을 찾는다. 앱이 쓰는 것으로 세지 않는다.
        if (name !== 'e2e') out += appSource(path);
      } else if (
        /\.tsx?$/.test(name) &&
        !name.includes('.test.') &&
        !path.includes('messages')
      ) {
        out += readFileSync(path, 'utf-8');
      }
    }
    return out;
  }

  it('모든 문구가 화면 어딘가에서 쓰인다', () => {
    // 안 쓰는 키가 남아 있으면 번역이 실제보다 많이 된 것처럼 보인다.
    // 화면을 새로 번역할 때 키를 먼저 만들지 말고, 쓸 때 만든다.
    const source = appSource();
    // JSX 속성(nameKey="…")은 큰따옴표로 쓰인다. 두 모양을 모두 쓰임으로 본다.
    const unused = KEYS.filter(
      (key) => !source.includes(`'${key}'`) && !source.includes(`"${key}"`),
    );
    expect(unused).toEqual([]);
  });
});

describe('비통과 문구', () => {
  it('덮개 어긋남 문구가 어느 언어에서도 통과·적합·안전으로 읽히지 않는다', () => {
    // 덮개 어긋남은 판정불가로 막는 사유다. 번역에서 "맞다"·"안전하다"로
    // 바뀌면 화면의 비통과 판정과 문장이 서로 다른 말을 한다.
    const SUCCESS: Record<Locale, RegExp> = {
      ko: /적합합니다|안전합니다|통과|사용해도 됩니다|맞습니다/,
      en: /\b(safe|ok|okay|pass(ed)?|compatible|approved|specs match)\b/i,
      vi: /an toàn|đạt|được phép sử dụng|phù hợp/i,
      id: /\baman\b|lulus|cocok|boleh digunakan/i,
      zh: /安全|合格|通过|相符|可以使用/,
    };
    const BLOCKING_KEYS = [
      'reason.guard.missing',
      'reason.guard.smallerThanWheel',
      'profile.code.guard.missing',
      'profile.code.guardSize.smallerThanWheel',
      'profile.status.conflict',
      'verdict.undetermined',
      // 판정 범위(scope)가 제한적이라는 사실이 적합·안전으로 읽히면 안 된다.
      'profile.scope.limited',
      'history.filter.scopeLimited',
      // 제한 대조는 적합을 낼 수 없는 판정이다.
      'rule.offlineLimited',
      'reason.analysisMode.offlineLimited',
      'result.undetermined.offlineLimited',
      'evidence.limit.offlineLimited',
      'verdict.note.limited',
      'offline.limit',
      'offline.cause.manual',
      'offline.cause.localOcr',
      'offline.cause.ocrDropped',
      'offline.cause.unknown',
      'scan.offline.continueHint',
      'scan.offline.notice',
      'scan.localOcr.notice',
      // 서버 재분석으로 온라인 대조로 바꿀 수 없다는 사유. 번역에서 "맞다"로
      // 읽히면 전환이 막힌 화면이 값이 맞았다고 말하게 된다.
      'offline.mismatch',
      'offline.markingConflict',
      'offline.lowConfidence',
    ] as const;

    for (const { code } of LOCALES) {
      for (const key of BLOCKING_KEYS) {
        expect(CATALOG[code][key], `${code} ${key}`).not.toMatch(SUCCESS[code]);
      }
      // 판정불가와 적합이 같은 말로 번역되지 않는다.
      expect(CATALOG[code]['verdict.undetermined']).not.toBe(
        CATALOG[code]['verdict.compatible'],
      );
    }
  });
});

describe('제한 대조 문구', () => {
  // 제한 대조가 되는 까닭은 여럿이다 — 서버에 닿지 못해 작업자가 직접 입력했거나,
  // 기기 안 OCR로만 읽었거나, 저장된 서버 판독을 읽을 수 없어 버린 채 확정했거나,
  // 판독 경로 표시를 읽지 못해 엄격한 쪽으로 봤다. 뒤의 셋은 기기가 오프라인이
  // 아니었고, 버린 판독은 서버 분석까지 거쳤다.
  //
  // 그래서 까닭을 가리지 않고 뜨는 문구(결과 화면·검사 항목·내보낸 문서)는 까닭
  // 하나를 단정하지 않는다. 단정하면 나머지 경우에 거짓이 된다. 까닭은
  // offline.cause.*가 기록된 대로만 적는다.
  const CAUSE_NEUTRAL_KEYS = [
    'rule.offlineLimited',
    'reason.analysisMode.offlineLimited',
    'evidence.doc.offlineLimited',
    'evidence.limit.offlineLimited',
    'result.undetermined.offlineLimited',
    'verdict.note.limited',
    'offline.limit',
    'offline.reanalyzeHint',
    'offline.failed',
    'offline.compareTitle',
    'offline.compareRow',
    'offline.compareAbstained',
    'offline.mismatch',
    // 표기 충돌 줄은 둘이다. 기기 안 OCR이 읽었다고 까닭에 남은 경우의 줄
    // (offline.compareMarkingRow)은 사실을 말하는 것이라 여기 없다.
    'offline.compareMarkingRowUnknown',
    'offline.markingConflict',
    'offline.lowConfidenceRow',
    'offline.lowConfidence',
    'offline.damageRecheck',
    'offline.accept',
    'offline.cancel',
    'offline.cause.unknown',
  ] as const;

  /** 오프라인이었다·서버에 닿지 못했다·서버 분석이 없었다고 단정하는 말 */
  const CAUSE_ASSERTION: Record<Locale, RegExp> = {
    ko: /오프라인|온라인|서버에 닿지|서버 분석 없이|연결이 돌아|연결되면/,
    en: /\boffline\b|\bonline\b|could not be reached|without server analysis|connection is back|(when|once) connected/i,
    vi: /ngoại tuyến|trực tuyến|không kết nối được|không có phân tích máy chủ|khi có kết nối/i,
    id: /\bluring\b|\bdaring\b|tidak terjangkau|tanpa analisis server|saat terhubung|setelah tersambung/i,
    zh: /离线|在线|无法连接|未经服务器分析|连接后|恢复连接/,
  };

  it('까닭을 가리지 않고 뜨는 문구는 어느 언어에서도 까닭을 단정하지 않는다', () => {
    for (const { code } of LOCALES) {
      for (const key of CAUSE_NEUTRAL_KEYS) {
        expect(CATALOG[code][key], `${code} ${key}`).not.toMatch(
          CAUSE_ASSERTION[code],
        );
      }
    }
  });

  /** 작업자가 값을 「입력」했다고 단정하는 말 */
  const ENTERED_ASSERTION: Record<Locale, RegExp> = {
    ko: /입력/,
    en: /\benter(ed|s|ing)?\b|\btyped\b/i,
    vi: /nhập/i,
    id: /masuk/i,
    zh: /输入/,
  };

  it('값을 작업자가 입력했다고 단정하지 않는다 — 어느 언어에서도', () => {
    // 직접 입력이 아닌 경우의 값은 기기나 서버가 읽었거나 draft에 남아 있던 것을
    // 작업자가 「확인」한 것이다. 「입력·확인한」도 다른 언어로 옮기면 「입력하고
    // 확인한」(entered and checked)이 되어 입력을 단정한다.
    for (const { code } of LOCALES) {
      for (const key of CAUSE_NEUTRAL_KEYS) {
        expect(CATALOG[code][key], `${code} ${key}`).not.toMatch(
          ENTERED_ASSERTION[code],
        );
      }
    }
  });

  describe('위의 두 검사가 헛돌지 않는다', () => {
    // 정규식이 아무것도 못 잡는 채로 통과하면 검사가 있는 것처럼만 보인다. 걸려야
    // 하는 문구에 실제로 걸리는지 본다.

    /** 2026-10-04까지의 문구. 고치기 전 화면과 기록이 실제로 이렇게 말했다 */
    const BEFORE: Record<Locale, { name: string; limit: string }> = {
      ko: {
        name: '오프라인 제한 대조',
        limit: '이 결과는 작업자가 입력한 값으로만 대조했습니다.',
      },
      en: {
        name: 'Offline limited check',
        limit: 'This result compares only the values the worker entered.',
      },
      vi: {
        name: 'Đối chiếu hạn chế ngoại tuyến',
        limit: 'Kết quả này chỉ đối chiếu giá trị người làm việc nhập.',
      },
      id: {
        name: 'Pemeriksaan terbatas luring',
        limit: 'Hasil ini hanya membandingkan nilai yang dimasukkan pekerja.',
      },
      zh: { name: '离线有限对照', limit: '本结果仅对照了作业人员输入的数值。' },
    };

    it('고치기 전의 문구에는 걸린다', () => {
      for (const { code } of LOCALES) {
        expect(BEFORE[code].name, code).toMatch(CAUSE_ASSERTION[code]);
        expect(BEFORE[code].limit, code).toMatch(ENTERED_ASSERTION[code]);
      }
    });

    it('까닭을 아는 문구(직접 입력)에는 걸린다 — 그 문구는 사실을 말하는 것이 맞다', () => {
      for (const { code } of LOCALES) {
        const manual = CATALOG[code]['offline.cause.manual'];
        expect(manual, code).toMatch(CAUSE_ASSERTION[code]);
        expect(manual, code).toMatch(ENTERED_ASSERTION[code]);
      }
    });
  });

  it('한국어 원문 — 결과 화면과 내보낸 문서에 뜨는 문장', () => {
    expect(ko['rule.offlineLimited']).toBe('제한 대조');
    expect(ko['result.undetermined.offlineLimited']).toBe(
      '제한 대조입니다. 확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 적합 판정을 제공하지 않습니다. 풀려면 서버 재분석이나 다시 촬영이 필요합니다.',
    );
    expect(ko['offline.limit']).toBe(
      '이 결과는 확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만 대조했습니다. RPM·지름 위반은 부적합으로 판정하지만 적합 판정은 제공하지 않고 시험운전도 열지 않습니다.',
    );
    expect(ko['evidence.doc.offlineLimited']).toBe(
      '앱 설계 — 확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만 대조한 경우',
    );
    expect(ko['evidence.limit.offlineLimited']).toBe(
      '확정한 값이 라벨과 같은지 서버 판독으로 확인되지 않았습니다. RPM·지름 위반은 부적합으로 막지만, 위반이 없어도 적합 판정을 내지 않고 시험운전을 열지 않습니다.',
    );
    expect(ko['verdict.note.limited']).toBe(
      '제한 대조라 적합 판정을 제공하지 않습니다. 아래 항목과 안내를 확인하세요.',
    );
  });

  it('한국어 원문 — 기록된 까닭', () => {
    expect(ko['offline.cause.manual']).toBe(
      '서버에 닿지 못해 직접 입력한 값입니다.',
    );
    expect(ko['offline.cause.localOcr']).toBe(
      '서버가 아니라 이 기기에서 읽은 값입니다.',
    );
    expect(ko['offline.cause.ocrDropped']).toBe(
      '저장된 AI 판독을 읽을 수 없어 버린 뒤 확정한 값입니다.',
    );
    expect(ko['offline.cause.unknown']).toBe(
      '제한된 까닭이 기록되지 않았습니다.',
    );
  });
});
