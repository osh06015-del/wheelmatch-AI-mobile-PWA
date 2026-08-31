// Phase 2 — Tesseract.js 기반 독립형 OCR.
//
// 브라우저에서 직접 텍스트를 뽑고, parser.ts의 정규식으로 필드를 분리한다.
// 외부 API 호출이 없으므로 오프라인에서도 동작한다.
// 인식 정확도는 Claude보다 낮으므로, 값을 못 읽으면 반드시 null로 남긴다.

import { parseGrinderText, parseWheelText } from './parser';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

/** 명판·라벨은 영문과 숫자가 대부분이지만 한국어 표기도 섞인다. */
const LANGUAGES = 'eng+kor';

async function recognizeText(imageBlob: Blob): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(LANGUAGES);
  try {
    const { data } = await worker.recognize(imageBlob);
    return data.text ?? '';
  } finally {
    await worker.terminate();
  }
}

export async function recognizeGrinder(imageBlob: Blob): Promise<GrinderSpec> {
  return parseGrinderText(await recognizeText(imageBlob));
}

export async function recognizeWheel(imageBlob: Blob): Promise<WheelSpec> {
  return parseWheelText(await recognizeText(imageBlob));
}
