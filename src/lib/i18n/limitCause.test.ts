// 제한 대조가 된 까닭을 적는 줄.
//
// 결과 화면과 내보낸 문서가 같은 줄을 쓴다. 기록된 그대로만 적고, 모르는 것을
// 다른 까닭으로 바꿔 적지 않는다.

import { describe, expect, it } from 'vitest';

import type { AnalysisLimitCauses } from '@/lib/rules/types';
import { translate, type Translate } from './index';
import { limitCauseLines } from './limitCause';

const t: Translate = (key, params) => translate('ko', key, params);

describe('limitCauseLines', () => {
  it('제한된 단계마다 「단계: 까닭」 한 줄을 점검 순서(명판 → 숫돌)대로 적는다', () => {
    // 넘긴 순서와 상관없이 명판이 먼저다.
    const lines = limitCauseLines(
      { wheel: 'dropped_ocr', grinder: 'manual' },
      t,
    );

    expect(lines).toEqual([
      {
        step: 'grinder',
        text: '그라인더: 서버에 닿지 못해 직접 입력한 값입니다.',
      },
      {
        step: 'wheel',
        text: '숫돌: 저장된 AI 판독을 읽을 수 없어 버린 뒤 확정한 값입니다.',
      },
    ]);
  });

  it('제한되지 않은 단계는 줄이 없다', () => {
    expect(limitCauseLines({ wheel: 'local_ocr' }, t)).toEqual([
      { step: 'wheel', text: '숫돌: 서버가 아니라 이 기기에서 읽은 값입니다.' },
    ]);
    expect(limitCauseLines({}, t)).toEqual([]);
  });

  it('까닭이 남아 있지 않은 단계는 기록되지 않았다고 적는다', () => {
    expect(limitCauseLines({ grinder: 'unknown' }, t)).toEqual([
      { step: 'grinder', text: '그라인더: 제한된 까닭이 기록되지 않았습니다.' },
    ]);
  });

  it.each([['server'], ['constructor'], ['toString'], ['']])(
    '목록에 없는 값(%o)은 빈 문장으로 찍지 않고 기록되지 않았다고 적는다',
    (stored) => {
      // 저장된 기록에서 읽은 값이다. 다른 버전이 쓴 기록에는 지금 목록에 없는 값이
      // 있을 수 있다. 타입은 그것을 막아 주지 않는다.
      const causes = { wheel: stored } as unknown as AnalysisLimitCauses;

      expect(limitCauseLines(causes, t)).toEqual([
        { step: 'wheel', text: '숫돌: 제한된 까닭이 기록되지 않았습니다.' },
      ]);
    },
  );

  it('고른 언어로 적는다', () => {
    const en: Translate = (key, params) => translate('en', key, params);

    expect(limitCauseLines({ grinder: 'manual' }, en)).toEqual([
      {
        step: 'grinder',
        text: 'Grinder: Entered by hand because the server could not be reached.',
      },
    ]);
  });
});
