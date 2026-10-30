import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getInitialLanguage, Language, languages, translate } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, updateLanguage] = useState<Language>(getInitialLanguage);
  const setLanguage = useCallback((next: Language) => {
    if (!languages.some(({ code }) => code === next)) return;
    updateLanguage(next);
    try { localStorage.setItem("questify.language.v1", next); } catch { /* Storage can be disabled. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
  }, [language]);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
