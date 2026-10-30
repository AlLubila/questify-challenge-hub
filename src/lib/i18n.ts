import en from "@/translations/en.json";
import fr from "@/translations/fr.json";
import pl from "@/translations/pl.json";
import de from "@/translations/de.json";
import es from "@/translations/es.json";

export const languages = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "pl", name: "Polski" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
] as const;
export type Language = typeof languages[number]["code"];
export const catalogs: Record<Language, Record<string, string>> = { en, fr, pl, de, es };

export const resolveLanguage = (value: string): Language | undefined => {
  const code = value.toLowerCase().split(/[-_]/)[0];
  return languages.find((language) => language.code === code)?.code;
};
export const getInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem("questify.language.v1");
    if (stored && resolveLanguage(stored)) return resolveLanguage(stored)!;
  } catch { /* Browser preferences still work without storage. */ }
  if (typeof navigator !== "undefined") {
    for (const preferred of navigator.languages ?? [navigator.language]) {
      const language = resolveLanguage(preferred);
      if (language) return language;
    }
  }
  return "en";
};
export const translate = (language: Language, key: string, values?: Record<string, string | number>): string => {
  const text = catalogs[language][key] ?? catalogs.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => values?.[name] === undefined ? placeholder : String(values[name]));
};
