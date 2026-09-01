'use client';

// 면책 문구. 메인 화면과 결과 화면에 항상 표시한다.
//
// 이 앱은 라벨에 "표시된 규격"을 서로 대조할 뿐이다.
// 숫돌의 실제 상태, 기계의 마모, 작업 방법까지 판단하지 않는다.

import { useLocale } from '@/lib/i18n';

export function Disclaimer() {
  const { t } = useLocale();

  return (
    <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-4 text-base leading-relaxed text-slate-400">
      ⚠ {t('disclaimer')}
    </p>
  );
}
