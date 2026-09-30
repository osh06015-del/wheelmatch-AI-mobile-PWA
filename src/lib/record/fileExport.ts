// 만든 파일을 폰에 넘긴다.
//
// 휴대폰에서는 <a download>가 잘 안 먹는다. 아이폰 홈 화면 앱·카카오톡 등 앱 안의
// 브라우저는 다운로드를 막고, 파일 주소(object URL)를 누른 직후 지우면 다운로드가
// 시작되기 전에 취소되기도 한다. 공유 창(navigator.share)을 쓸 수 있으면 그것으로
// 넘겨 작업자가 "파일에 저장"·카카오톡 등을 고르게 하고, 안 되면 다운로드한다.

export type FileExportResult = 'shared' | 'downloaded' | 'cancelled';

/** 다운로드가 시작될 시간을 준 뒤 파일 주소를 지운다 */
const REVOKE_DELAY_MS = 60_000;

function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * 파일을 공유 창으로 넘기거나 다운로드한다.
 *
 * 공유 창을 사용자가 닫으면 'cancelled'다 — 다운로드로 몰래 넘어가지 않는다.
 * 공유가 다른 이유로 실패하면 다운로드로 한 번 더 시도한다.
 */
export async function saveOrShareFile(
  file: File,
  title: string,
): Promise<FileExportResult> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if ((error as { name?: unknown } | null)?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  // 문서에 붙인 링크여야 누르기가 모든 브라우저에서 다운로드로 처리된다.
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  return 'downloaded';
}
