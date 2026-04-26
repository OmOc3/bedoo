import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  applyLanguageDirection,
  defaultLanguage,
  getLocaleStrings,
  getTextDirection,
  type Language,
  type LocaleStrings,
  type TextDirection,
  loadPersistedLanguage,
  persistLanguage,
} from '@/lib/i18n';

interface LanguageContextValue {
  direction: TextDirection;
  isRtl: boolean;
  language: Language;
  needsRestart: boolean;
  setLanguage: (language: Language) => Promise<void>;
  strings: LocaleStrings['i18n'];
  statusOptionLabels: LocaleStrings['statusOptionLabels'];
  roleLabels: LocaleStrings['roleLabels'];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLanguage(): Promise<void> {
      const savedLanguage = await loadPersistedLanguage();

      if (!isMounted) {
        return;
      }

      setLanguageState(savedLanguage);
      setNeedsRestart(applyLanguageDirection(savedLanguage));
    }

    void hydrateLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: Language): Promise<void> => {
    setLanguageState(nextLanguage);
    await persistLanguage(nextLanguage);
    setNeedsRestart(applyLanguageDirection(nextLanguage));
  }, []);

  const locale = getLocaleStrings(language);
  const direction = getTextDirection(language);
  const value = useMemo<LanguageContextValue>(
    () => ({
      direction,
      isRtl: direction === 'rtl',
      language,
      needsRestart,
      setLanguage,
      strings: locale.i18n,
      statusOptionLabels: locale.statusOptionLabels,
      roleLabels: locale.roleLabels,
    }),
    [direction, language, locale.i18n, locale.roleLabels, locale.statusOptionLabels, needsRestart, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return value;
}
