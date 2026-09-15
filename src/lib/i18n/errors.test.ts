// 분석 실패 문장 테스트.
//
// 실패 종류가 틀린 문장으로 이어지면 작업자는 엉뚱한 조치를 한다 — 네트워크
// 문제인데 "다시 촬영하라"고 하면 같은 실패를 되풀이한다.

import { describe, expect, it } from 'vitest';

import { ImageDecodeError } from '@/lib/image/optimize';
import { ExtractError, type ExtractFailure } from '@/lib/ocr/errors';
import { analysisErrorText } from './errors';
import { LOCALES, translate, type Translate } from './index';

const ko: Translate = (key, params) => translate('ko', key, params);

describe('analysisErrorText', () => {
  it('사진 형식을 읽지 못하면 다른 형식으로 고르라고 한다', () => {
    expect(
      analysisErrorText(new ImageDecodeError(), 'scan.wheel.failed', ko),
    ).toBe(
      '이 사진 형식을 읽지 못했습니다. JPG 또는 PNG로 다시 선택해 주세요. (아이폰 HEIC 사진은 지원되지 않을 수 있습니다)',
    );
  });

  it('서버에 닿지 못하면 네트워크를 확인하라고 한다', () => {
    expect(
      analysisErrorText(new ExtractError('network'), 'scan.wheel.failed', ko),
    ).toBe(
      '서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 같은 사진으로 다시 분석하세요.',
    );
  });

  it('분석 서비스 오류는 상태 코드를 함께 보인다', () => {
    expect(
      analysisErrorText(
        new ExtractError('upstream', 400),
        'scan.wheel.failed',
        ko,
      ),
    ).toBe(
      '분석 서비스가 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요. (오류 400)',
    );
  });

  it('무엇이 실패했는지 모르면 화면의 기본 문장을 쓴다', () => {
    expect(
      analysisErrorText(
        new ExtractError('unknown', 500),
        'scan.grinder.failed',
        ko,
      ),
    ).toBe('명판 분석에 실패했습니다.');
    expect(analysisErrorText('문자열 오류', 'scan.wheel.failed', ko)).toBe(
      '라벨 분석에 실패했습니다.',
    );
  });

  it('오류 원문을 작업자에게 그대로 보이지 않는다', () => {
    const text = analysisErrorText(
      new Error('Tesseract worker crashed'),
      'scan.wheel.failed',
      ko,
    );
    expect(text).not.toContain('Tesseract');
  });
});

describe.each(LOCALES.filter(({ code }) => code !== 'ko'))(
  '$label — 실패 문장에 한국어가 섞이지 않는다',
  ({ code }) => {
    const t: Translate = (key, params) => translate(code, key, params);
    const failures: ExtractFailure[] = [
      'network',
      'server_config',
      'bad_request',
      'image_too_large',
      'rate_limited',
      'upstream',
      'unknown',
    ];

    it('모든 실패 종류', () => {
      const texts = [
        analysisErrorText(new ImageDecodeError(), 'scan.wheel.failed', t),
        analysisErrorText(new Error('x'), 'scan.grinder.failed', t),
        ...failures.map((failure) =>
          analysisErrorText(
            new ExtractError(failure, 502),
            'scan.wheel.failed',
            t,
          ),
        ),
      ];
      expect(texts.filter((text) => /[가-힣]|\{\w+\}/.test(text))).toEqual([]);
    });
  },
);
