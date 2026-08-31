// 이 앱의 공개 URL.
//
// 카카오톡 같은 메신저는 og:image / og:url이 **절대 URL**이어야 미리보기 카드를
// 만든다. 상대 경로면 카드가 깨진다. Next는 metadataBase가 있어야 상대 경로를
// 절대 URL로 바꿔준다.
//
// Vercel이 넣어주는 VERCEL_PROJECT_PRODUCTION_URL을 쓴다. 이 값은
// "가장 짧은 프로덕션 도메인"을 고르므로, 나중에 짧은 도메인을 붙이면
// 코드를 고치지 않아도 카드 주소가 따라간다. 프로토콜은 포함되지 않는다.

/** 직접 지정하고 싶을 때 쓰는 환경변수. 없으면 Vercel 값을 쓴다. */
const EXPLICIT = process.env.NEXT_PUBLIC_APP_URL;

/** Vercel이 자동으로 넣어주는 프로덕션 도메인 (프로토콜 없음). */
const VERCEL_PRODUCTION = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/**
 * 메타데이터에 쓸 기준 URL을 만든다.
 *
 * 로컬 개발처럼 아무것도 없을 때는 null을 돌려준다. 그 경우 Next는
 * metadataBase 경고를 내지만 개발에는 지장이 없다. 임의의 URL을 지어내면
 * 잘못된 절대 주소가 만들어져 더 나쁘다.
 */
export function resolveSiteUrl(): URL | null {
  const explicit = EXPLICIT?.trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      // http로 배포된 주소를 카드에 넣으면 메신저가 이미지를 거부할 수 있다.
      if (url.protocol === 'https:') return url;
    } catch {
      // 형식이 잘못된 값은 무시하고 아래로 넘어간다.
    }
  }

  const vercel = VERCEL_PRODUCTION?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`);
    } catch {
      return null;
    }
  }

  return null;
}
