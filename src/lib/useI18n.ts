import { useContext } from 'react';

import { I18nContext, type I18n } from './i18nContext';

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
