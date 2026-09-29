import { describe, expect, it } from 'vitest';
import { matchSpecs, RULE } from './engine';
import { BONDED_ABRASIVE_PROFILE } from './profiles';
import type { GrinderSpec, WheelSpec, WorkPurpose } from './types';

const grinder: GrinderSpec = {
  model: null,
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: '',
  confidence: 'high',
};
const wheel: WheelSpec = {
  maxRPM: 12200,
  diameter: 125,
  thickness: 1.6,
  purpose: 'cutting',
  wheelType: 'bonded_abrasive',
  visibleDamage: 'none_visible',
  expiry: { year: 2027, month: 4 },
  rawText: '',
  confidence: 'high',
};

describe('형식이 잘못된 작업 목적의 엔진 경계', () => {
  it.each(
    [undefined, '', 'polishing', 0, false, {}, []].map((raw) => ({ raw })),
  )(
    '$raw는 작업 미선택으로 판정불가이며 확정 RPM 위반을 덮지 않는다',
    ({ raw }) => {
      // 브라우저 저장값·타입 검사 없는 호출은 TypeScript 선언을 보장하지 않는다.
      const options = {
        declaredPurpose: raw as WorkPurpose,
        profile: BONDED_ABRASIVE_PROFILE,
        today: '2026-09-29',
      };
      const result = matchSpecs(grinder, wheel, options);
      expect(result.verdict).toBe('UNDETERMINED');
      expect(
        result.checks.find((check) => check.rule === RULE.WORK_PURPOSE),
      ).toMatchObject({
        passed: null,
        detail: { code: 'workPurpose.notDeclared' },
      });
      expect(
        matchSpecs(grinder, { ...wheel, maxRPM: 8500 }, options).verdict,
      ).toBe('INCOMPATIBLE');
    },
  );
});
