// 정답 파일 읽기 테스트.
//
// 정답은 앱이 만들 수 없다. 형식이 어긋난 줄을 보정하거나 추정하면
// 그 순간 정답이 아니게 된다. 버리되, 몇 줄을 버렸는지는 알려준다.

import { describe, expect, it } from 'vitest';

import { parseGroundTruth } from './groundTruth';

const VALID = {
  recordId: 7,
  grinderRPM: 11000,
  grinderMaxDiameter: 125,
  wheelMaxRPM: 12200,
  wheelDiameter: 125,
  verdict: 'COMPATIBLE',
};

describe('parseGroundTruth', () => {
  it('정상 배열을 읽는다', () => {
    const { truths, rejected } = parseGroundTruth(JSON.stringify([VALID]));
    expect(rejected).toBe(0);
    expect(truths).toHaveLength(1);
    expect(truths[0].recordId).toBe(7);
    expect(truths[0].verdict).toBe('COMPATIBLE');
  });

  it('라벨에 없던 값은 null 그대로 받는다', () => {
    // 못 읽은 것과 애초에 없던 것은 다르다. 0으로 채우지 않는다.
    const { truths } = parseGroundTruth(
      JSON.stringify([{ ...VALID, wheelDiameter: null }]),
    );
    expect(truths[0].wheelDiameter).toBeNull();
  });

  it('JSON이 아니면 아무것도 읽지 않는다', () => {
    expect(parseGroundTruth('그냥 글자')).toEqual({ truths: [], rejected: 0 });
  });

  it('배열이 아니면 아무것도 읽지 않는다', () => {
    expect(parseGroundTruth(JSON.stringify(VALID))).toEqual({
      truths: [],
      rejected: 0,
    });
  });

  it('형식이 어긋난 줄은 버리고 개수를 알려준다', () => {
    // 조용히 버리면 표본 수가 줄어든 줄 모르고 비율만 보게 된다.
    const { truths, rejected } = parseGroundTruth(
      JSON.stringify([
        VALID,
        { ...VALID, recordId: '7' }, // id가 숫자가 아니다
        { ...VALID, verdict: '적합' }, // 판정 값이 아니다
        { ...VALID, wheelMaxRPM: '12200' }, // 숫자가 아니다
        null,
      ]),
    );

    expect(truths).toHaveLength(1);
    expect(rejected).toBe(4);
  });

  it('세 가지 판정만 받는다', () => {
    const { truths } = parseGroundTruth(
      JSON.stringify([
        { ...VALID, recordId: 1, verdict: 'COMPATIBLE' },
        { ...VALID, recordId: 2, verdict: 'INCOMPATIBLE' },
        { ...VALID, recordId: 3, verdict: 'UNDETERMINED' },
        { ...VALID, recordId: 4, verdict: 'MAYBE' },
      ]),
    );
    expect(truths.map((truth) => truth.recordId)).toEqual([1, 2, 3]);
  });
});
