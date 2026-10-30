import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages, resolveLanguage } from "@/lib/i18n";

export const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="inline-flex min-w-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-2 text-sm">
      <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("language.choose")}</span>
      <select
        aria-label={t("language.choose")}
        className="w-[5.5rem] min-w-0 cursor-pointer bg-background text-foreground focus-visible:outline-primary"
        value={language}
        onChange={(event) => { const next = resolveLanguage(event.target.value); if (next) setLanguage(next); }}
      >
        {languages.map(({ code, name }) => <option key={code} value={code} lang={code}>{name}</option>)}
      </select>
    </label>
  );
};
