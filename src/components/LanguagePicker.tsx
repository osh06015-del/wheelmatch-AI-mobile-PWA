'use client';

// 언어 선택. 메인과 결과 화면에 둔다.
//
// 드롭다운이 아니라 버튼을 늘어놓는다. 장갑 낀 손으로 목록을 열고 고르는 것보다
// 한 번에 누르는 쪽이 빠르고, 자기 언어를 못 읽는 상태에서도 글자 모양으로 찾는다.
// 그래서 각 언어를 그 언어로 적는다 ('Vietnamese'가 아니라 'Tiếng Việt').

import { LOCALES, useLocale } from '@/lib/i18n';

export function LanguagePicker() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-slate-400">{t('common.language')}</span>
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((entry) => {
          const active = entry.code === locale;
          return (
            <button
              key={entry.code}
              type="button"
              lang={entry.code}
              aria-pressed={active}
              onClick={() => setLocale(entry.code)}
              className={`min-h-12 rounded-lg px-4 text-base font-semibold ${
                active
                  ? 'bg-slate-200 text-slate-900'
                  : 'border border-slate-600 text-slate-300 active:bg-slate-800'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      {locale !== 'ko' && (
        <p className="text-sm leading-relaxed text-yellow-200">
          ⚠ {t('translation.notice')}
        </p>
      )}
    </div>
  );
}
