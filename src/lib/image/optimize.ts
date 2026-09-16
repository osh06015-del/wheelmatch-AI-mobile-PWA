// 업로드 전 이미지 축소.
//
// Vercel 함수의 요청 본문 한도는 4.5MB다. 휴대폰으로 찍은 원본 사진은
// 3~5MB이고 base64로 감싸면 1.33배가 되어 그 한도를 넘는다. 그러면 요청이
// 서버 코드에 닿기도 전에 413으로 잘린다.
//
// 라벨의 숫자를 읽는 데 12MP는 필요 없다. 긴 변 2048px이면 충분하다.

/** 긴 변 최대 픽셀. 라벨 문자를 읽기에 충분하면서 전송량을 크게 줄인다. */
export const MAX_EDGE = 2048;

/** 업로드 목표 상한(바이트). base64(1.33배)로 감싸도 Vercel 한도에 여유가 있다. */
export const MAX_UPLOAD_BYTES = 2_500_000;

/**
 * 한 요청에 사진을 여러 장 보낼 때의 상한.
 *
 * 다각도 외관 확인은 4장을 **한 번의 요청**으로 보낸다. 라벨용 상한(2.5MB)을
 * 그대로 쓰면 4장이 10MB가 되어 Vercel 함수의 4.5MB 요청 한도를 코드에 닿기도
 * 전에 넘는다. 그래서 장당 예산을 따로 둔다 — 0.6MB × 4장 = 2.4MB,
 * base64(1.33배)로 감싸도 약 3.2MB라 한도 안에 남는다.
 *
 * 긴 변 1280px은 깨진 모서리·조각 떨어짐처럼 **눈에 보이는** 손상을 확인하기
 * 위한 크기다. 미세균열은 어차피 사진으로 판별하지 않는다(찾으려 하지 않는다).
 */
export const MULTI_UPLOAD_MAX_EDGE = 1280;
export const MULTI_UPLOAD_MAX_BYTES = 600_000;

/** optimizeForUpload의 예산. 넘기지 않으면 라벨 한 장 기준을 쓴다. */
export interface OptimizeBudget {
  maxEdge?: number;
  maxBytes?: number;
}

/** 화질을 이 순서로 낮춰가며 목표 크기를 맞춘다. */
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55] as const;

/**
 * 긴 변을 maxEdge 이하로 맞춘 크기를 구한다. 비율은 유지한다.
 * 이미 작으면 원래 크기를 그대로 돌려준다 (확대하지 않는다).
 */
export function fitWithinMaxEdge(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** 축소가 필요한지 판단한다. 순수 함수라 테스트로 검증한다. */
export function needsOptimization(
  bytes: number,
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
  maxBytes: number = MAX_UPLOAD_BYTES,
): boolean {
  return bytes > maxBytes || Math.max(width, height) > maxEdge;
}

/**
 * 브라우저가 이 이미지를 디코딩하지 못할 때 던진다.
 *
 * 메시지는 개발자용이다. 작업자에게 보이는 문장은 화면이 고른 언어로 붙인다
 * (error.imageDecode).
 */
export class ImageDecodeError extends Error {
  constructor() {
    super('image could not be decoded (HEIC or unsupported format)');
    this.name = 'ImageDecodeError';
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality),
  );
}

/**
 * 업로드용으로 이미지를 줄인다.
 *
 * 이미 충분히 작으면 원본을 그대로 돌려준다. 불필요하게 재인코딩하면
 * 화질만 떨어지고 얻는 게 없다.
 */
export async function optimizeForUpload(
  source: Blob,
  budget: OptimizeBudget = {},
): Promise<Blob> {
  const maxEdge = budget.maxEdge ?? MAX_EDGE;
  const maxBytes = budget.maxBytes ?? MAX_UPLOAD_BYTES;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new ImageDecodeError();
  }

  try {
    if (
      !needsOptimization(
        source.size,
        bitmap.width,
        bitmap.height,
        maxEdge,
        maxBytes,
      )
    ) {
      return source;
    }

    const { width, height } = fitWithinMaxEdge(
      bitmap.width,
      bitmap.height,
      maxEdge,
    );
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return source;
    context.drawImage(bitmap, 0, 0, width, height);

    // 목표 크기에 들어올 때까지 화질을 단계적으로 낮춘다.
    let smallest: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      const candidate = await toBlob(canvas, quality);
      if (!candidate) continue;
      smallest = candidate;
      if (candidate.size <= maxBytes) break;
    }

    // 마지막 단계에서도 목표를 못 맞췄으면 그중 가장 작은 것을 쓴다.
    // 원본보다 크면 원본을 쓴다.
    if (!smallest) return source;
    return smallest.size < source.size ? smallest : source;
  } finally {
    bitmap.close();
  }
}
