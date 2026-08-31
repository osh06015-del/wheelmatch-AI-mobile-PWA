// OCR 추출 API 라우트 (Phase 1 — Claude API).
//
// 서버 전용이다. ANTHROPIC_API_KEY는 절대 브라우저로 나가지 않는다.
// 이 라우트는 라벨에서 "보이는 값"만 뽑아 돌려준다. 적합 여부 판정은 하지 않는다.
// 판정은 오로지 src/lib/rules/engine.ts가 한다.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse } from 'next/server';

import { rpmFromPeripheralSpeed } from '@/lib/ocr/parser';
import {
  grinderExtractionSchema,
  systemPromptFor,
  wheelExtractionSchema,
  type ExtractionTarget,
} from '@/lib/ocr/schema';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** 사양서의 claude-sonnet-4-6 대신 더 최신·저렴한 Sonnet을 기본으로 둔다. */
const DEFAULT_MODEL = 'claude-sonnet-5';

/** base64 문자열 상한. 클라이언트가 압축해 보내므로 여유 있게 잡는다. */
const MAX_BASE64_LENGTH = 8_000_000;

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

interface ExtractRequestBody {
  image?: unknown;
  type?: unknown;
  mediaType?: unknown;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // 키가 없을 때 임의의 값을 지어내지 않는다. 실패를 그대로 알린다.
    return NextResponse.json(
      {
        error:
          'ANTHROPIC_API_KEY가 설정되지 않았습니다. 서버 환경변수를 확인하세요.',
      },
      { status: 500 },
    );
  }

  let body: ExtractRequestBody;
  try {
    body = (await request.json()) as ExtractRequestBody;
  } catch {
    return badRequest('요청 본문을 JSON으로 읽을 수 없습니다.');
  }

  const { image, type, mediaType } = body;

  if (typeof image !== 'string' || image.length === 0) {
    return badRequest('image 필드에 base64 이미지 문자열이 필요합니다.');
  }
  if (image.length > MAX_BASE64_LENGTH) {
    return badRequest('이미지가 너무 큽니다. 다시 촬영해 주세요.');
  }
  if (type !== 'grinder' && type !== 'wheel') {
    return badRequest("type 필드는 'grinder' 또는 'wheel'이어야 합니다.");
  }

  const resolvedMediaType: AllowedMediaType =
    typeof mediaType === 'string' &&
    (ALLOWED_MEDIA_TYPES as readonly string[]).includes(mediaType)
      ? (mediaType as AllowedMediaType)
      : 'image/jpeg';

  const client = new Anthropic({ apiKey });
  const target: ExtractionTarget = type;

  try {
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
      max_tokens: 8000,
      system: systemPromptFor(target),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: resolvedMediaType,
                data: image,
              },
            },
            {
              type: 'text',
              text:
                target === 'grinder'
                  ? '이 그라인더 명판에서 값을 추출하세요.'
                  : '이 숫돌 라벨에서 값을 추출하세요.',
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(
          target === 'grinder'
            ? grinderExtractionSchema
            : wheelExtractionSchema,
        ),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      // 스키마에 맞는 응답을 못 받았다. 빈 값으로 채우고 신뢰도를 낮춰 돌려준다.
      return NextResponse.json(emptySpec(target), { status: 200 });
    }

    if (target === 'grinder') {
      const value = parsed as import('@/lib/ocr/schema').GrinderExtraction;
      const spec: GrinderSpec = {
        model: value.model,
        noLoadRPM: value.noLoadRPM,
        maxWheelDiameter: value.maxWheelDiameter,
        rawText: value.rawText,
        confidence: value.confidence,
      };
      return NextResponse.json(spec, { status: 200 });
    }

    const value = parsed as import('@/lib/ocr/schema').WheelExtraction;
    // rpm 표기가 없으면 원주속도(m/s)에서 환산한다. 환산은 검증된 순수 함수가 한다.
    const maxRPM =
      value.maxRPM ??
      rpmFromPeripheralSpeed(value.peripheralSpeedMps, value.diameter);

    const spec: WheelSpec = {
      maxRPM,
      diameter: value.diameter,
      thickness: value.thickness,
      purpose: value.purpose,
      rawText: value.rawText,
      confidence: value.confidence,
    };
    return NextResponse.json(spec, { status: 200 });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'API 키가 올바르지 않습니다.' },
        { status: 500 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: '요청이 많아 잠시 후 다시 시도해야 합니다.' },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `라벨 분석에 실패했습니다. (${error.status})` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: '라벨 분석 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

/** 추출 실패 시 돌려줄 빈 결과. 값을 지어내지 않고 confidence를 low로 둔다. */
function emptySpec(target: ExtractionTarget): GrinderSpec | WheelSpec {
  if (target === 'grinder') {
    return {
      model: null,
      noLoadRPM: null,
      maxWheelDiameter: null,
      rawText: '',
      confidence: 'low',
    };
  }
  return {
    maxRPM: null,
    diameter: null,
    thickness: null,
    purpose: 'unknown',
    rawText: '',
    confidence: 'low',
  };
}
