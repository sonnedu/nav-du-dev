import { createContext } from 'react';

import type { Messages } from './i18nMessages';

export type Locale = 'zh-CN' | 'en';

export type I18n = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  isZh: boolean;
  m: Messages;
};

export const I18nContext = createContext<I18n | null>(null);
