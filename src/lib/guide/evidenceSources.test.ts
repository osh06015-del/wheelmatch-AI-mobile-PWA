import { describe, expect, it } from 'vitest';

import { ko } from '@/lib/i18n/messages/ko';
import { RULE } from '@/lib/rules/engine';
import { EVIDENCE_SOURCE, evidenceSourceFor } from './evidenceSources';

describe('규칙별 근거 문서 연결', () => {
  it('엔진의 모든 규칙에 근거와 한계 문구가 있다', () => {
    // 규칙을 새로 추가하고 근거를 잊으면 그 규칙만 근거 없이 나온다.
    const missing = Object.values(RULE).filter(
      (rule) => !(rule in EVIDENCE_SOURCE),
    );
    expect(missing).toEqual([]);
  });

  it('이름을 바꾸기 전에 저장된 기록도 같은 근거를 찾는다', () => {
    // 2026-10-04까지 저장된 기록의 규칙 이름은 「오프라인 제한 대조」다. 이력 화면은
    // 저장된 이름으로 근거를 찾으므로, 짝을 잃으면 그 항목만 근거 없이 나온다.
    expect(evidenceSourceFor('오프라인 제한 대조')).toBe(
      EVIDENCE_SOURCE[RULE.OFFLINE_LIMITED],
    );
    expect(evidenceSourceFor(RULE.OFFLINE_LIMITED)).toBe(
      EVIDENCE_SOURCE[RULE.OFFLINE_LIMITED],
    );
    expect(evidenceSourceFor('없는 규칙')).toBeUndefined();
  });

  it('연결된 문구 키가 실제로 존재하고 비어 있지 않다', () => {
    for (const source of Object.values(EVIDENCE_SOURCE)) {
      expect(ko[source.docKey].length).toBeGreaterThan(0);
      expect(ko[source.limitKey].length).toBeGreaterThan(0);
      if (source.formulaKey) {
        expect(ko[source.formulaKey].length).toBeGreaterThan(0);
      }
    }
  });

  it('한계 문구는 안전을 승인하는 표현을 쓰지 않는다', () => {
    for (const source of Object.values(EVIDENCE_SOURCE)) {
      expect(ko[source.limitKey]).not.toMatch(
        /안전합니다|사용해도 됩니다|검사 통과|손상이 없습니다/,
      );
      expect(ko[source.docKey]).not.toMatch(
        /안전합니다|사용해도 됩니다|검사 통과/,
      );
    }
  });

  it('계산식이 있는 규칙만 계산식 키를 둔다', () => {
    // 산술 근거가 없는 규칙에 계산식을 억지로 채우면 근거를 지어낸 것이 된다.
    const withFormula = [
      RULE.RPM_SAFETY,
      RULE.DIAMETER_FIT,
      RULE.PERIPHERAL_SPEED,
      RULE.UNIT_CONSISTENCY,
      RULE.EXPIRY,
    ];
    for (const [rule, source] of Object.entries(EVIDENCE_SOURCE)) {
      if (withFormula.includes(rule as (typeof withFormula)[number])) {
        expect(source.formulaKey).toBeDefined();
      } else {
        expect(source.formulaKey).toBeUndefined();
      }
    }
  });
});
