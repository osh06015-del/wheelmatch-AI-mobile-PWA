import { describe, expect, it } from 'vitest';

import { ko } from '@/lib/i18n/messages/ko';
import { hazardTitle, hazardsFor } from './hazards';
import type { WorkPurpose } from '@/lib/rules/types';

/** 원본인 한국어 제목으로 확인한다. */
function titles(purpose: WorkPurpose | null): string[] {
  return hazardsFor(purpose).map((hazard) => ko[hazard.titleKey]);
}

describe('hazardsFor', () => {
  it('절단은 절단 고유 위험을 포함한다', () => {
    expect(titles('cutting')).toContain('측면으로 갈지 않는다');
    expect(titles('cutting')).not.toContain('15~30° 로 눕혀서 댄다');
  });

  it('연삭은 연삭 고유 위험을 포함한다', () => {
    expect(titles('grinding')).toContain('15~30° 로 눕혀서 댄다');
    expect(titles('grinding')).not.toContain('측면으로 갈지 않는다');
  });

  it('공통 항목은 어느 작업에나 붙는다', () => {
    for (const purpose of ['cutting', 'grinding', null] as const) {
      expect(titles(purpose)).toContain('완전히 멈춘 뒤 내려놓는다');
    }
  });

  it('작업을 고르지 않으면 공통 항목만 준다', () => {
    expect(hazardsFor(null)).toHaveLength(2);
  });

  it('모든 항목에 이유가 붙어 있다', () => {
    // 이유 없는 금지는 현장에서 지켜지지 않는다.
    for (const hazard of hazardsFor('cutting').concat(hazardsFor('grinding'))) {
      expect(ko[hazard.detailKey].length).toBeGreaterThan(10);
    }
  });
});

describe('hazardTitle', () => {
  it('작업 이름을 붙인다', () => {
    expect(ko[hazardTitle('cutting')]).toBe('절단 작업 위험사항');
    expect(ko[hazardTitle('grinding')]).toBe('연삭 작업 위험사항');
    expect(ko[hazardTitle(null)]).toBe('공통 위험사항');
  });
});
