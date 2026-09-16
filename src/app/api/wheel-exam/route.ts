// 다각도 외관 이상 징후 확인 API 라우트.
//
// /api/extract(라벨 값 읽기)와 **별도 라우트**다. 하는 일도 응답 형식도 달라서
// 한 라우트에 묶으면 한쪽을 고칠 때 다른 쪽 응답이 흔들린다. 기존 OCR 응답과
// 규칙엔진은 이 파일을 모른다.
//
// 서버 전용이다. ANTHROPIC_API_KEY는 절대 브라우저로 나가지 않는다.
// 이 라우트는 **적합 여부를 판정하지 않는다.** 사진에서 보이는 이상 징후만
// 돌려준다. 판정은 오로지 src/lib/rules/engine.ts가 한다.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse } from 'next/server';

import type { ExtractFailure } from '@/lib/ocr/errors';
import { resolveModel } from '@/lib/ocr/model';
import {
  WHEEL_EXAM_PROMPT_VERSION,
  WHEEL_EXAM_SYSTEM_PROMPT,
  wheelExamSchema,
} from '@/lib/vision/wheelExamSchema';
import type { WheelExamResult, WheelExamView } from '@/lib/rules/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** 받는 사진 수와 순서. 클라이언트(WHEEL_EXAM_ORDER)와 같은 순서다. */
const VIEW_ORDER: ReadonlyArray<WheelExamView> = [
  'front',
  'back',
  'edge',
  'bore',
];

/**
 * base64 총량 상한.
 *
 * Vercel 함수의 요청 본문 한도는 4.5MB다. 4장을 한 번에 받으므로 장당이 아니라
 * **합계**로 막는다. 클라이언트는 장당 0.6MB 이하로 줄여 보내므로
 * (lib/image/optimize.ts의 MULTI_UPLOAD_MAX_BYTES) 정상 경로에서는 걸리지 않는다.
 */
const MAX_TOTAL_BASE64_LENGTH = 4_000_000;

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

interface ExamRequestBody {
  images?: unknown;
  mediaType?: unknown;
}

function errorResponse(
  status: number,
  code: ExtractFailure,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

function badRequest(message: string, code: ExtractFailure = 'bad_request') {
  return errorResponse(400, code, message);
}

/**
 * 판단할 수 없었다는 결과.
 *
 * **실패를 not_observed로 돌려주지 않는다.** not_observed는 "네 장을 살펴봤지만
 * 찾지 못했다"는 뜻이라, 살펴보지도 못한 경우에 쓰면 사진을 확인한 것처럼
 * 보이게 된다. 그것이 이 기능에서 가장 위험한 거짓말이다.
 */
function unassessable(model: string | null): WheelExamResult {
  return {
    status: 'unassessable',
    findings: [],
    photoQuality: VIEW_ORDER.map((view) => ({
      view,
      issues: [],
      readable: false,
    })),
    model,
    promptVersion: WHEEL_EXAM_PROMPT_VERSION,
    analyzedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // 키가 없을 때 값을 지어내지 않는다. 실패를 그대로 알린다.
    return errorResponse(
      500,
      'server_config',
      'ANTHROPIC_API_KEY가 설정되지 않았습니다. 서버 환경변수를 확인하세요.',
    );
  }

  let body: ExamRequestBody;
  try {
    body = (await request.json()) as ExamRequestBody;
  } catch {
    return badRequest('요청 본문을 JSON으로 읽을 수 없습니다.');
  }

  const { images, mediaType } = body;

  if (!Array.isArray(images) || images.length !== VIEW_ORDER.length) {
    return badRequest(
      `images 필드에 사진 ${VIEW_ORDER.length}장(앞면·뒷면·가장자리·중심구멍)이 필요합니다.`,
    );
  }
  if (images.some((image) => typeof image !== 'string' || image.length === 0)) {
    return badRequest('images의 각 항목은 base64 이미지 문자열이어야 합니다.');
  }

  const totalLength = (images as string[]).reduce(
    (sum, image) => sum + image.length,
    0,
  );
  if (totalLength > MAX_TOTAL_BASE64_LENGTH) {
    return badRequest(
      '사진 용량이 너무 큽니다. 해상도가 낮은 사진으로 다시 시도해 주세요.',
      'image_too_large',
    );
  }

  const resolvedMediaType: AllowedMediaType =
    typeof mediaType === 'string' &&
    (ALLOWED_MEDIA_TYPES as readonly string[]).includes(mediaType)
      ? (mediaType as AllowedMediaType)
      : 'image/jpeg';

  const client = new Anthropic({ apiKey });
  const model = resolveModel(process.env.ANTHROPIC_MODEL);

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 4000,
      system: WHEEL_EXAM_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            // 어느 사진이 어느 면인지 글로 함께 붙인다. 순서만으로는 모델이
            // 뒷면과 가장자리를 바꿔 볼 수 있다.
            ...(images as string[]).flatMap((image, index) => [
              {
                type: 'text' as const,
                text: `${index + 1}. ${VIEW_ORDER[index]}`,
              },
              {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: resolvedMediaType,
                  data: image,
                },
              },
            ]),
            {
              type: 'text' as const,
              text: '이 숫돌 사진 네 장에서 보이는 이상 징후만 찾아 보고하세요. 안전 여부는 말하지 마세요.',
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(wheelExamSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      // 스키마에 맞는 응답을 못 받았다. 살펴보지 못한 것으로 돌려준다.
      return NextResponse.json(unassessable(model), { status: 200 });
    }

    const result: WheelExamResult = {
      status: parsed.status,
      findings: parsed.findings,
      photoQuality: parsed.photoQuality,
      model: typeof response.model === 'string' ? response.model : model,
      promptVersion: WHEEL_EXAM_PROMPT_VERSION,
      analyzedAt: new Date().toISOString(),
    };
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return errorResponse(500, 'server_config', 'API 키가 올바르지 않습니다.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      return errorResponse(
        429,
        'rate_limited',
        '요청이 많아 잠시 후 다시 시도해야 합니다.',
      );
    }
    if (error instanceof Anthropic.APIError) {
      // 사진·base64는 남기지 않는다. 상태 코드와 메시지만 남긴다.
      console.error(
        '[wheel-exam] Anthropic APIError',
        error.status,
        error.message,
      );
      return errorResponse(
        502,
        'upstream',
        `사진 확인에 실패했습니다. (${error.status})`,
        { detail: error.message, upstreamStatus: error.status },
      );
    }
    console.error('[wheel-exam] unknown error', error);
    return errorResponse(
      500,
      'unknown',
      '사진 확인 중 알 수 없는 오류가 발생했습니다.',
    );
  }
}
