// OCR 추출기 인터페이스.
//
// Phase 1은 Claude API(ClaudeExtractor), Phase 2는 Tesseract.js(TesseractExtractor)를 쓴다.
// 화면 코드는 이 인터페이스만 알면 되므로, 엔진을 갈아끼워도 UI는 건드릴 필요가 없다.

import type { GrinderSpec, OcrTelemetry, WheelSpec } from '@/lib/rules/types';
import { ExtractError, failureFromResponse } from './errors';

export interface OCRExtractor {
  extractGrinder(imageBlob: Blob): Promise<GrinderSpec>;
  extractWheel(imageBlob: Blob): Promise<WheelSpec>;
  /**
   * 방금 끝난 추출 호출의 서버 응답 메타데이터(검증용). 판정에 쓰지 않는다.
   *
   * optional인 이유: 테스트가 만드는 최소 fixture 추출기까지 이 메서드를
   * 구현하도록 강제하지 않기 위해서다. 없으면 호출부가 null로 취급한다.
   */
  getLastTelemetry?(): OcrTelemetry | null;
}

/** 서버가 응답에 실은 telemetry를 읽는다. 형태가 안 맞아도 죽지 않는다. */
function parseTelemetry(
  raw: unknown,
  engine: OcrTelemetry['engine'],
): OcrTelemetry {
  const record =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const num = (value: unknown): number | null =>
    typeof value === 'number' ? value : null;
  const str = (value: unknown): string | null =>
    typeof value === 'string' ? value : null;
  return {
    engine,
    model: str(record.model),
    inputTokens: num(record.inputTokens),
    outputTokens: num(record.outputTokens),
    cacheReadTokens: num(record.cacheReadTokens),
    cacheCreationTokens: num(record.cacheCreationTokens),
    durationMs: num(record.durationMs),
  };
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
  private lastTelemetry: OcrTelemetry | null = null;

  async extractGrinder(imageBlob: Blob): Promise<GrinderSpec> {
    return this.request<GrinderSpec>(imageBlob, 'grinder');
  }

  async extractWheel(imageBlob: Blob): Promise<WheelSpec> {
    return this.request<WheelSpec>(imageBlob, 'wheel');
  }

  getLastTelemetry(): OcrTelemetry | null {
    return this.lastTelemetry;
  }

  private async request<T>(
    imageBlob: Blob,
    type: 'grinder' | 'wheel',
  ): Promise<T> {
    const image = await blobToBase64(imageBlob);
    let response: Response;
    try {
      response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          type,
          mediaType: imageBlob.type || 'image/jpeg',
        }),
      });
    } catch {
      // 서버에 닿지 못했다(오프라인·연결 끊김). 응답이 없으니 서버 문장도 없다.
      throw new ExtractError('network');
    }

    if (!response.ok) {
      // 서버 문장(error)은 읽지 않는다. 한 언어로만 쓰여 있어 작업자에게
      // 그대로 보일 수 없다. 실패 종류와 상태 코드만 넘기고 문장은 화면이 고른다.
      const detail = (await response.json().catch(() => null)) as {
        code?: unknown;
        upstreamStatus?: unknown;
      } | null;
      const upstreamStatus =
        typeof detail?.upstreamStatus === 'number'
          ? detail.upstreamStatus
          : null;
      throw new ExtractError(
        failureFromResponse(response.status, detail?.code),
        upstreamStatus ?? response.status,
      );
    }

    // telemetry는 spec과 섞여 오지만 T(GrinderSpec/WheelSpec)에 없는 필드다.
    // 분리해서 저장하지 않으면 세션 저장·IndexedDB에 엉뚱한 키가 섞여 들어간다.
    const raw = (await response.json()) as Record<string, unknown>;
    const { telemetry, ...spec } = raw;
    this.lastTelemetry = parseTelemetry(telemetry, 'claude');
    return spec as T;
  }
}

/**
 * Phase 2 — 브라우저에서 Tesseract.js로 직접 추출한다.
 * 무거운 라이브러리이므로 실제로 쓸 때만 동적으로 불러온다.
 */
export class TesseractExtractor implements OCRExtractor {
  private lastTelemetry: OcrTelemetry | null = null;

  async extractGrinder(imageBlob: Blob): Promise<GrinderSpec> {
    const start = Date.now();
    const { recognizeGrinder } = await import('./tesseract');
    const spec = await recognizeGrinder(imageBlob);
    this.setTelemetry(start);
    return spec;
  }

  async extractWheel(imageBlob: Blob): Promise<WheelSpec> {
    const start = Date.now();
    const { recognizeWheel } = await import('./tesseract');
    const spec = await recognizeWheel(imageBlob);
    this.setTelemetry(start);
    return spec;
  }

  getLastTelemetry(): OcrTelemetry | null {
    return this.lastTelemetry;
  }

  /** 브라우저에서 직접 도는 경로라 토큰·모델명이 없다. 처리시간만 남는다. */
  private setTelemetry(start: number): void {
    this.lastTelemetry = {
      engine: 'tesseract',
      model: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      durationMs: Date.now() - start,
    };
  }
}

/** NEXT_PUBLIC_OCR_MODE로 추출기를 고른다. 기본값은 Phase 1의 claude. */
export function getOCRMode(): OCRMode {
  return process.env.NEXT_PUBLIC_OCR_MODE === 'tesseract'
    ? 'tesseract'
    : 'claude';
}

/**
 * 테스트가 넣은 추출기. 카메라와 OCR 대신 정해 둔 결과를 돌려주는 경계다
 * (점검 흐름 E2E — src/e2e).
 *
 * NODE_ENV가 'test'일 때만 쓰인다. next build와 next dev는 이 값을 각각
 * 'production'·'development'로 바꿔 넣으므로 아래 분기는 번들에서 죽은 코드가
 * 되어 빠진다. 현장 앱에서 이 경로로 가짜 추출 결과가 들어갈 방법은 없다.
 */
let testExtractor: OCRExtractor | null = null;

export function setExtractorForTesting(extractor: OCRExtractor | null): void {
  if (process.env.NODE_ENV !== 'test') {
    // 조용히 무시하지 않는다. 테스트 밖에서 불렸다는 것 자체가 사고다.
    throw new Error(
      'setExtractorForTesting is only available when NODE_ENV is test',
    );
  }
  testExtractor = extractor;
}

export function getExtractor(mode: OCRMode = getOCRMode()): OCRExtractor {
  // 이미 넣어 둔 추출기가 있어도 테스트가 아니면 쓰지 않는다.
  if (process.env.NODE_ENV === 'test' && testExtractor) return testExtractor;
  return mode === 'tesseract'
    ? new TesseractExtractor()
    : new ClaudeExtractor();
}
