import { useId } from "react";
import { languages, Language } from "@/lib/i18n";
import { ChallengeTranslations } from "@/lib/localizedContent";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const ChallengeTranslationEditor = ({ value, sourceLanguage, onSourceLanguageChange, onChange }: {
  value: ChallengeTranslations;
  sourceLanguage: Language;
  onSourceLanguageChange: (language: Language) => void;
  onChange: (value: ChallengeTranslations) => void;
}) => {
  const id = useId();
  const { t } = useLanguage();
  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <legend className="px-1 font-semibold">{t("content.translations")}</legend>
      <p className="text-sm text-muted-foreground">{t("content.translationHint")}</p>
      <Label htmlFor={`${id}-source`}>{t("content.source")}</Label>
      <select id={`${id}-source`} className="block rounded border bg-background p-2" value={sourceLanguage} onChange={(event) => onSourceLanguageChange(event.target.value as Language)}>
        {languages.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
      </select>
      {languages.filter(({ code }) => code !== sourceLanguage).map(({ code, name }) => {
        const entry = value[code] ?? { title: "", description: "", prize: "", image_url: "" };
        const update = (field: keyof typeof entry, text: string) => onChange({ ...value, [code]: { ...entry, [field]: text } });
        return (
          <details key={code} className="rounded border border-border p-3">
            <summary className="cursor-pointer font-medium" lang={code}>{name}</summary>
            <div className="mt-3 space-y-2" lang={code}>
              <Label htmlFor={`${id}-${code}-title`}>{t("admin.challengeTitle")}</Label>
              <Input id={`${id}-${code}-title`} value={entry.title} onChange={(event) => update("title", event.target.value)} />
              <Label htmlFor={`${id}-${code}-description`}>{t("admin.challengeDescription")}</Label>
              <Textarea id={`${id}-${code}-description`} value={entry.description} onChange={(event) => update("description", event.target.value)} />
              <Label htmlFor={`${id}-${code}-prize`}>{t("admin.prize")}</Label>
              <Input id={`${id}-${code}-prize`} value={entry.prize ?? ""} onChange={(event) => update("prize", event.target.value)} />
              <Label htmlFor={`${id}-${code}-cover`}>{t("content.coverUrl")}</Label>
              <Input id={`${id}-${code}-cover`} type="url" value={entry.image_url ?? ""} onChange={(event) => update("image_url", event.target.value)} />
            </div>
          </details>
        );
      })}
    </fieldset>
  );
};
