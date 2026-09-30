// 문서에 넣을 사진을 data URL로 만든다.
//
// 저장된 사진은 장당 1~2MB다. 문서 하나에 여러 기록·여러 사진이 들어가면 폰에서
// 열거나 카카오톡으로 보내기 어렵다. 라벨 글자를 읽을 수 있는 크기(긴 변
// 1280px)로 줄여 넣는다. 줄이지 못하면(디코딩 실패 등) 원본을 그대로 넣는다 —
// 사진을 조용히 빼지 않는다.

/** 긴 변 최대 크기(px). 명판·라벨 글자를 확대해 읽을 수 있는 정도다 */
export const REPORT_PHOTO_MAX_EDGE = 1280;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function photoToDataUrl(blob: Blob): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(
      1,
      REPORT_PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return readAsDataUrl(blob);
  }
}
