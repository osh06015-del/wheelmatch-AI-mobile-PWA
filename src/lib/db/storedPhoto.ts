// 사진을 IndexedDB에 넣을 수 있는 형태로 바꾸고, 읽을 때 되돌린다.
//
// 모바일 WebKit(아이폰 Safari의 개인정보 보호 모드, 카카오톡 등 앱 안의 브라우저)은
// IndexedDB에 Blob·File을 넣으면 저장 공간과 상관없이 실패한다("Error preparing
// Blob/File data to be stored in object store"). 현장 폰에서 최종 기록 저장과 진행
// 상태 임시저장이 함께 실패한 원인이다 — 둘 다 사진을 담는 쓰기다. ArrayBuffer에는
// 그 제한이 없으므로 바이트와 MIME 형식으로 풀어 넣는다.
//
// 앱의 나머지 코드는 계속 Blob만 본다. 변환은 저장소 경계(db/index.ts,
// draft/draftStore.ts)에서만 한다. 예전에 Blob 그대로 저장된 기록도 그대로 읽는다.

const KIND = 'wheelmatch-photo-bytes';

export interface StoredPhotoBytes {
  kind: typeof KIND;
  /** Blob의 MIME 형식. 되돌릴 때 그대로 붙인다 */
  type: string;
  bytes: ArrayBuffer;
}

/** 저장소 안의 사진. 예전 기록은 Blob, 새 기록은 바이트다 */
export type StoredPhoto = Blob | StoredPhotoBytes;

async function readBytes(blob: Blob): Promise<ArrayBuffer> {
  // Blob.arrayBuffer가 없는 오래된 브라우저는 Response로 읽는다.
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Response(blob).arrayBuffer();
}

export async function toStoredPhoto(blob: Blob): Promise<StoredPhotoBytes> {
  return { kind: KIND, type: blob.type, bytes: await readBytes(blob) };
}

export function isStoredPhotoBytes(value: unknown): value is StoredPhotoBytes {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === KIND &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { bytes?: unknown }).bytes instanceof ArrayBuffer
  );
}

/** 저장된 값을 Blob으로 되돌린다. 사진이 아니면 undefined다 — 지어내지 않는다 */
export function fromStoredPhoto(value: unknown): Blob | undefined {
  if (value instanceof Blob) return value;
  if (isStoredPhotoBytes(value)) {
    return new Blob([value.bytes], { type: value.type });
  }
  return undefined;
}

/** 저장된 사진의 크기(byte). 사진이 아니면 0 */
export function storedPhotoSize(value: unknown): number {
  if (value instanceof Blob) return value.size;
  if (isStoredPhotoBytes(value)) return value.bytes.byteLength;
  return 0;
}
