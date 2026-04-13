import { createContext, useContext, useEffect, useMemo, useState } from "react";

import i18n from "../i18n";
import { STORAGE_KEYS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../lib/constants";

type Direction = "ltr" | "rtl";

interface LocaleContextValue {
  language: SupportedLanguage;
  direction: Direction;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value !== null && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function getDirection(language: SupportedLanguage): Direction {
  return language === "ar" ? "rtl" : "ltr";
}

function applyDocumentLocale(language: SupportedLanguage) {
  const direction = getDirection(language);
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  document.body.dir = direction;
}

function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.locale);
    return isSupportedLanguage(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  useEffect(() => {
    applyDocumentLocale(language);
    void i18n.changeLanguage(language);
  }, []);

  async function setLanguage(nextLanguage: SupportedLanguage) {
    if (nextLanguage === language) {
      return;
    }

    setLanguageState(nextLanguage);
    localStorage.setItem(STORAGE_KEYS.locale, nextLanguage);
    applyDocumentLocale(nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  }

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      direction: getDirection(language),
      setLanguage,
    }),
    [language]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
