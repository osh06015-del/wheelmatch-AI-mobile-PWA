// OCR 추출기 인터페이스.
//
// Phase 1은 Claude API(ClaudeExtractor), Phase 2는 Tesseract.js(TesseractExtractor)를 쓴다.
// 화면 코드는 이 인터페이스만 알면 되므로, 엔진을 갈아끼워도 UI는 건드릴 필요가 없다.

import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

export interface OCRExtractor {
  extractGrinder(imageBlob: Blob): Promise<GrinderSpec>;
  extractWheel(imageBlob: Blob): Promise<WheelSpec>;
}

export type OCRMode = 'claude' | 'tesseract';

/** Blob을 base64 문자열로 바꾼다. 큰 이미지에서 스택이 넘치지 않도록 나눠 처리한다. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Phase 1 — 서버의 /api/extract를 거쳐 Claude로 추출한다. */
export class ClaudeExtractor implements OCRExtractor {
  async extractGrinder(imageBlob: Blob): Promise<GrinderSpec> {
    return this.request<GrinderSpec>(imageBlob, 'grinder');
  }

  async extractWheel(imageBlob: Blob): Promise<WheelSpec> {
    return this.request<WheelSpec>(imageBlob, 'wheel');
  }

  private async request<T>(
    imageBlob: Blob,
    type: 'grinder' | 'wheel',
  ): Promise<T> {
    const image = await blobToBase64(imageBlob);
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        type,
        mediaType: imageBlob.type || 'image/jpeg',
      }),
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(detail?.error ?? '라벨 분석에 실패했습니다.');
    }

    return (await response.json()) as T;
  }
}

/**
 * Phase 2 — 브라우저에서 Tesseract.js로 직접 추출한다.
 * 무거운 라이브러리이므로 실제로 쓸 때만 동적으로 불러온다.
 */
export class TesseractExtractor implements OCRExtractor {
  async extractGrinder(imageBlob: Blob): Promise<GrinderSpec> {
    const { recognizeGrinder } = await import('./tesseract');
    return recognizeGrinder(imageBlob);
  }

  async extractWheel(imageBlob: Blob): Promise<WheelSpec> {
    const { recognizeWheel } = await import('./tesseract');
    return recognizeWheel(imageBlob);
  }
}

/** NEXT_PUBLIC_OCR_MODE로 추출기를 고른다. 기본값은 Phase 1의 claude. */
export function getOCRMode(): OCRMode {
  return process.env.NEXT_PUBLIC_OCR_MODE === 'tesseract'
    ? 'tesseract'
    : 'claude';
}

export function getExtractor(mode: OCRMode = getOCRMode()): OCRExtractor {
  return mode === 'tesseract'
    ? new TesseractExtractor()
    : new ClaudeExtractor();
}
