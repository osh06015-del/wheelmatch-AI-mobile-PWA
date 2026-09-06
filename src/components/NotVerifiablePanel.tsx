'use client';

// 이 앱이 확인하지 못한 것.
//
// 판정 결과와 **섞지 않는다.** 별도 영역에 두는 것이 이 컴포넌트의 요점이다.
// 검사 항목 목록 안에 넣으면 다른 ✅ 사이에 끼여 "이것도 확인됐구나"로 읽힌다.
//
// 접지 않는다. 접어 두면 안 열어보고, 안 열어보면 없는 것과 같다.

import { useLocale } from '@/lib/i18n';
import { NOT_VERIFIABLE } from '@/lib/guide/notVerifiable';

export function NotVerifiablePanel() {
  const { t } = useLocale();

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-600 bg-slate-800/40 px-4 py-4">
      <h2 className="text-lg font-bold text-slate-100">
        {t('notVerifiable.title')}
      </h2>
      <p className="text-base leading-relaxed text-slate-400">
        {t('notVerifiable.note')}
      </p>

      <ul className="flex flex-col gap-3">
        {NOT_VERIFIABLE.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span aria-hidden className="text-slate-500">
              —
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold text-slate-200">
                {item.title}
              </span>
              <span className="text-base leading-relaxed text-slate-400">
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
