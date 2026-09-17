// 이 앱의 공개 URL.
//
// 카카오톡 같은 메신저는 og:image / og:url이 **절대 URL**이어야 미리보기 카드를
// 만든다. 상대 경로면 카드가 깨진다. Next는 metadataBase가 있어야 상대 경로를
// 절대 URL로 바꿔준다. metadataBase가 아예 없으면(undefined) Next가 빌드마다
// 경고를 내고 자기 나름의 기본값(http://localhost:3000)으로 채운다 — 우리가
// 쓸 값을 명시적으로 정해 그 경고를 없앤다.
//
// 순서:
//   1. NEXT_PUBLIC_APP_URL — 직접 지정하고 싶을 때 쓰는 선택적 환경변수.
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel이 모든 환경(Production·Preview)에
//      자동으로 넣어주는 "가장 짧은 프로덕션 도메인"이다. Preview 빌드에도
//      들어 있어, PR 미리보기에서도 카드 주소가 실제 배포 주소가 아니라
//      엉뚱한 상대 경로가 되는 일이 없다.
//   3. 위 둘 다 없는 로컬·CI 빌드 — README에 적힌 실제 배포 주소를 안전한
//      기본값으로 쓴다. 새 환경변수를 요구하지 않으면서 경고만 없앤다.
//      실제 Vercel 빌드에서는 2번이 항상 채워지므로 이 값까지 오지 않는다.

/**
 * 위 둘 다 없을 때만 쓰는 마지막 기본값. README.md의 "배포 주소"와 같은,
 * 이미 문서에 실제 주소로 적혀 있는 값이다 — 지어낸 도메인이 아니다.
 * API 키 등 서버 비밀값을 담지 않는 공개 상수라 클라이언트에 노출돼도 안전하다.
 */
const FALLBACK_PRODUCTION_URL = 'https://wheelmatch-nu.vercel.app';

/**
 * 메타데이터에 쓸 기준 URL을 만든다. 항상 유효한 https URL을 돌려준다.
 *
 * NEXT_PUBLIC_ 값은 `next build` 때 번들에 박힌다. process.env[이름]처럼
 * 동적으로 읽으면 박히지 않으니(researchMode.ts와 같은 이유) 아래처럼
 * process.env.NEXT_PUBLIC_APP_URL을 그대로 적는다.
 */
export function resolveSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      // http로 배포된 주소를 카드에 넣으면 메신저가 이미지를 거부할 수 있다.
      if (url.protocol === 'https:') return url;
    } catch {
      // 형식이 잘못된 값은 무시하고 아래로 넘어간다.
    }
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`);
    } catch {
      // 형식이 잘못된 값(있을 수 없지만)도 아래 기본값으로 넘어간다.
    }
  }

  return new URL(FALLBACK_PRODUCTION_URL);
}
