'use client';

// "검증용 빌드" 표시. 모든 화면 맨 위에 고정으로 그린다.
//
// 연구 도구와 같은 조건(researchToolsEnabled)으로만 그려진다 — 검증 빌드에서만
// 보이고 현장 배포판에는 없다. 순수 표시일 뿐이다. 상태를 읽거나 쓰지 않으므로
// 판정·Gate·시험운전·저장에는 관여하지 않는다.
//
// 커밋 해시는 Vercel이 "Automatically expose System Environment Variables"를
// 켜둔 프로젝트에서 빌드 시점에 번들에 넣어주는 값이다. 로컬 개발(npm run dev)에는
// 없으므로 그때는 "커밋 정보 없음"으로 대신한다 — 없는 값을 지어내지 않는다.

import { useLocale } from '@/lib/i18n';
import { researchToolsEnabled } from '@/lib/record/researchMode';

export function ValidationBuildBanner() {
  const { t } = useLocale();

  if (!researchToolsEnabled()) return null;

  // 함수 안에서 읽는다 — 모듈 최상단 상수로 캡처하면 테스트가 값을 바꿔가며
  // 확인할 수 없다. Next 번들러가 문자 그대로의 접근이면 그대로 빌드 시점에 박는다.
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-sky-500/50 bg-sky-500/15 px-4 py-2 text-center text-sm font-semibold text-sky-100"
    >
      <span>⚠ {t('validationBuild.label')}</span>
      <span className="font-mono text-sky-200">
        {commitSha
          ? t('validationBuild.commit', { sha: commitSha.slice(0, 7) })
          : t('validationBuild.commitUnknown')}
      </span>
      <span className="text-sky-300">{t('validationBuild.note')}</span>
    </div>
  );
}
