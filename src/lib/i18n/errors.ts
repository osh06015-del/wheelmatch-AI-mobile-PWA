// 촬영 화면의 분석 실패를 고른 언어의 문장으로 바꾼다.
//
// 서버·브라우저가 준 오류 원문은 작업자에게 그대로 보이지 않는다. 한 언어로만
// 쓰여 있거나(서버 문장), 개발자용 영어 메시지(Tesseract 등)라서 작업자가 무엇을
// 해야 할지 알려주지 못한다. 실패 종류로 문장을 고른다.

import { ImageDecodeError } from '@/lib/image/optimize';
import { ExtractError, type ExtractFailure } from '@/lib/ocr/errors';
import type { Translate } from './index';
import type { MessageKey } from './messages/ko';

const FAILURE_MESSAGE: Readonly<
  Record<Exclude<ExtractFailure, 'unknown'>, MessageKey>
> = {
  network: 'error.network',
  server_config: 'error.serverConfig',
  bad_request: 'error.badRequest',
  image_too_large: 'error.imageTooLarge',
  rate_limited: 'error.rateLimited',
  upstream: 'error.upstream',
};

/**
 * 분석 실패 문장.
 *
 * 무엇이 실패했는지 모르면 화면마다 정한 기본 문장(명판/라벨 분석 실패)을 쓴다.
 * 상태 코드가 있으면 함께 보인다 — 현장에서 캡처 한 장으로 원인을 되짚을 수 있다.
 */
export function analysisErrorText(
  caught: unknown,
  fallback: MessageKey,
  t: Translate,
): string {
  if (caught instanceof ImageDecodeError) return t('error.imageDecode');
  if (caught instanceof ExtractError && caught.failure !== 'unknown') {
    return t(FAILURE_MESSAGE[caught.failure], {
      status: caught.status ?? '—',
    });
  }
  return t(fallback);
}
