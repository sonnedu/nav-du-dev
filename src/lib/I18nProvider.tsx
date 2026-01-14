import { useEffect, useMemo, useState } from 'react';

import { en, zhCN } from './i18nMessages';
import { I18nContext, type Locale } from './i18nContext';

const LOCALE_STORAGE_KEY = 'nav-du/locale';

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN';

  try {
    const url = new URL(window.location.href);
    const q = (url.searchParams.get('lang') || '').toLowerCase();
    if (q === 'zh' || q === 'zh-cn') return 'zh-CN';
    if (q === 'en') return 'en';
  } catch (e) {
    void e;
  }

  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'zh-CN' || saved === 'en') return saved;
  } catch (e) {
    void e;
  }

  const lang = (navigator.language || 'zh-CN').toLowerCase();
  if (lang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

export function I18nProvider(props: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch (e) {
      void e;
    }
  }, [locale]);

  const dict = locale === 'zh-CN' ? zhCN : en;

  const value = useMemo(() => {
    return { locale, setLocale, isZh: locale === 'zh-CN', m: dict };
  }, [locale, dict]);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}
