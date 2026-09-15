'use client';

// 작업별 위험사항. 기본은 접어 둔다.
//
// 결과 화면에서 제일 중요한 것은 판정과 체크리스트다. 위험사항을 펼쳐 놓으면
// 화면이 길어져 정작 체크리스트까지 내려가지 않는다. 필요할 때 펼쳐 보게 한다.

import { hazardTitle, hazardsFor } from '@/lib/guide/hazards';
import { useLocale } from '@/lib/i18n';
import type { WorkPurpose } from '@/lib/rules/types';

export function HazardList({ purpose }: { purpose: WorkPurpose | null }) {
  const { t } = useLocale();
  const hazards = hazardsFor(purpose);

  return (
    <details className="rounded-xl border border-slate-700 bg-slate-800/60">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 py-4 text-lg font-bold text-slate-100">
        ⚠{' '}
        {t('hazard.summary', {
          title: t(hazardTitle(purpose)),
          count: hazards.length,
        })}
      </summary>
      <ul className="flex flex-col gap-4 border-t border-slate-700 px-4 py-4">
        {hazards.map((hazard) => (
          <li key={hazard.titleKey} className="flex flex-col gap-1">
            <span className="text-lg font-semibold text-slate-100">
              {t(hazard.titleKey)}
            </span>
            <span className="text-base leading-relaxed text-slate-400">
              {t(hazard.detailKey)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
