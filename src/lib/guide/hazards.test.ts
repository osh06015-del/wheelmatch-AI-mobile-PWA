import { describe, expect, it } from 'vitest';

import { hazardTitle, hazardsFor } from './hazards';

describe('hazardsFor', () => {
  it('절단은 절단 고유 위험을 포함한다', () => {
    const titles = hazardsFor('cutting').map((h) => h.title);
    expect(titles).toContain('측면으로 갈지 않는다');
    expect(titles).not.toContain('15~30° 로 눕혀서 댄다');
  });

  it('연삭은 연삭 고유 위험을 포함한다', () => {
    const titles = hazardsFor('grinding').map((h) => h.title);
    expect(titles).toContain('15~30° 로 눕혀서 댄다');
    expect(titles).not.toContain('측면으로 갈지 않는다');
  });

  it('공통 항목은 어느 작업에나 붙는다', () => {
    for (const purpose of ['cutting', 'grinding', null] as const) {
      const titles = hazardsFor(purpose).map((h) => h.title);
      expect(titles).toContain('완전히 멈춘 뒤 내려놓는다');
    }
  });

  it('작업을 고르지 않으면 공통 항목만 준다', () => {
    expect(hazardsFor(null)).toHaveLength(2);
  });

  it('모든 항목에 이유가 붙어 있다', () => {
    // 이유 없는 금지는 현장에서 지켜지지 않는다.
    for (const hazard of hazardsFor('cutting').concat(hazardsFor('grinding'))) {
      expect(hazard.detail.length).toBeGreaterThan(10);
    }
  });
});

describe('hazardTitle', () => {
  it('작업 이름을 붙인다', () => {
    expect(hazardTitle('cutting')).toBe('절단 작업 위험사항');
    expect(hazardTitle('grinding')).toBe('연삭 작업 위험사항');
    expect(hazardTitle(null)).toBe('공통 위험사항');
  });
});
