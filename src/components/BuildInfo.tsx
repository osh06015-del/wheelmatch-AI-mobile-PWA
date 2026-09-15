'use client';

// 지금 실행 중인 빌드의 커밋 해시. 현장판·검증판 모두에서 보인다.
//
// 면책 문구 옆(정보 영역)에 작게 둔다 — 지원 문의를 받을 때 "어느 빌드에서
// 문제가 났는지"를 되짚으려면 화면 어딘가에 항상 남아 있어야 한다.
// ValidationBuildBanner의 눈에 띄는 경고 배너와 달리, 이건 항상 조용히 떠 있는
// 참고 정보라 화면 최상단 배너가 아니라 기존 정보 영역에 끼워 넣는다.

import { useLocale } from '@/lib/i18n';

export function BuildInfo() {
  const { t } = useLocale();
  // 함수 안에서 읽는다 — ValidationBuildBanner와 같은 이유다.
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

  return (
    <p className="text-center text-xs text-slate-600">
      {commitSha
        ? t('build.commit', { sha: commitSha.slice(0, 7) })
        : t('build.commitUnknown')}
    </p>
  );
}
