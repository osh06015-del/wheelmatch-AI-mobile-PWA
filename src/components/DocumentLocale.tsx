'use client';

// 문서 전체의 언어 표시를 작업자가 고른 언어에 맞춘다.
//
// <html lang>과 탭 제목은 서버가 한국어로 그린다. 서버는 이 기기에서 고른 언어를
// 모르기 때문이다. 그대로 두면 스크린리더가 베트남어 문장을 한국어 발음 규칙으로
// 읽고, 브라우저가 중국어 한자를 한국어 글꼴 모양으로 그린다.

import { useEffect } from 'react';

import { useLocale, type Locale } from '@/lib/i18n';

/** 문서 언어 태그. 중국어는 간체라는 것까지 밝혀 글꼴이 맞게 골라지게 한다. */
const HTML_LANG: Readonly<Record<Locale, string>> = {
  ko: 'ko',
  en: 'en',
  vi: 'vi',
  id: 'id',
  zh: 'zh-Hans',
};

export function DocumentLocale() {
  const { locale, t } = useLocale();

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];

    const wanted = t('meta.title');
    const apply = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    apply();

    // Next는 메타데이터의 <title>을 늦게(스트리밍으로) 넣고, 화면을 옮길 때도
    // 다시 쓴다. 한 번만 바꾸면 곧 한국어로 돌아간다 — Browser pane에서 실제로
    // 그렇게 되돌아갔다. 머리말이 바뀔 때마다 다시 맞춘다. 같은 값이면 쓰지
    // 않으므로 스스로 일으킨 변경에 다시 반응해 맴돌지 않는다.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [locale, t]);

  return null;
}
