'use client';

// 언어 선택과 문구 조회.
//
// 왜 라우팅(/en/...)이 아니라 저장소인가:
// 이 앱은 화면이 다섯 개뿐이고 기록은 기기에만 남는다. URL에 언어를 넣으면
// 공유·SEO에 유리하지만 여기서는 얻을 게 없고, 기존 라우트를 전부 바꿔야 한다.
//
// localStorage에 둔다. 작업자는 한 번 고르면 계속 그 언어를 쓴다.

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { en } from './messages/en';
import { id } from './messages/id';
import { ko, type MessageKey, type Messages } from './messages/ko';
import { vi } from './messages/vi';
import { zh } from './messages/zh';

export type Locale = 'ko' | 'en' | 'vi' | 'id' | 'zh';

export const DEFAULT_LOCALE: Locale = 'ko';

/** 언어 선택 버튼에 쓸 이름. 각 언어를 그 언어로 적는다. */
export const LOCALES: ReadonlyArray<{ code: Locale; label: string }> = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Indonesia' },
  { code: 'zh', label: '中文' },
];

const CATALOG: Record<Locale, Messages> = { ko, en, vi, id, zh };

const KEY = 'wheelmatch.locale';

function isLocale(value: string | null): value is Locale {
  return LOCALES.some((entry) => entry.code === value);
}

function read(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

let current = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return current;
}

/**
 * 서버 렌더에서는 항상 한국어다.
 *
 * 브라우저 값으로 서버를 렌더할 방법이 없으므로 고정한다. 다르게 두면
 * hydration에서 문구가 어긋난다.
 */
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

/**
 * 문구를 찾는다.
 *
 * 번역이 비어 있으면 한국어로 되돌린다. 안전 문구가 빈 칸으로 뜨는 것보다
 * 읽지 못하는 언어로라도 뜨는 편이 낫다. 키 이름이 화면에 나오는 일은 없다.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const text = CATALOG[locale][key] || ko[key];
  if (!params) return text;
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    text,
  );
}

export function useLocale(): {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Translate;
} {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setLocale = useCallback((next: Locale) => {
    current = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // 저장에 실패해도 이번 세션 동안은 동작한다.
    }
    for (const listener of listeners) listener();
  }, []);

  const t = useCallback<Translate>(
    (key, params) => translate(locale, key, params),
    [locale],
  );

  return useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
}

export type { MessageKey, Messages };
export { ko };
