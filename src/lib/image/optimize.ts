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

/** 브라우저가 이 이미지를 디코딩하지 못할 때 던진다. */
export class ImageDecodeError extends Error {
  constructor() {
    super(
      '이 사진 형식을 읽지 못했습니다. JPG 또는 PNG로 다시 선택해 주세요. (아이폰 HEIC 사진은 지원되지 않을 수 있습니다)',
    );
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
export async function optimizeForUpload(source: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new ImageDecodeError();
  }

  try {
    if (!needsOptimization(source.size, bitmap.width, bitmap.height)) {
      return source;
    }

    const { width, height } = fitWithinMaxEdge(bitmap.width, bitmap.height);
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
      if (candidate.size <= MAX_UPLOAD_BYTES) break;
    }

    // 마지막 단계에서도 목표를 못 맞췄으면 그중 가장 작은 것을 쓴다.
    // 원본보다 크면 원본을 쓴다.
    if (!smallest) return source;
    return smallest.size < source.size ? smallest : source;
  } finally {
    bitmap.close();
  }
}
