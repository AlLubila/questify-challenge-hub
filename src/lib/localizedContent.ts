import { Language } from "@/lib/i18n";
import { challengeCatalog } from "../../supabase/functions/_shared/challengeCatalog";

export interface ChallengeTranslation {
  title: string;
  description: string;
  prize?: string;
  image_url?: string;
}
export type ChallengeTranslations = Partial<Record<Language, ChallengeTranslation>>;

export const prepareTranslations = (translations: ChallengeTranslations, source: Language): ChallengeTranslations => {
  const result: ChallengeTranslations = {};
  for (const [code, entry] of Object.entries(translations)) {
    if (code === source || !entry || !Object.values(entry).some((text) => text?.trim())) continue;
    if (!entry.title?.trim() || !entry.description?.trim()) throw new Error("content.incomplete");
    if (entry.image_url?.trim() && !/^https:\/\//i.test(entry.image_url.trim())) throw new Error("content.invalidCover");
    result[code as Language] = { title: entry.title.trim(), description: entry.description.trim(), prize: entry.prize?.trim() || undefined, image_url: entry.image_url?.trim() || undefined };
  }
  return result;
};

export const localizeChallenge = <T extends { title: string; description?: string; prize?: string; image_url?: string | null; translations?: unknown; source_language?: string }>(challenge: T, language: Language): T & { translationMissing: boolean } => {
  if (language === (challenge.source_language ?? "en")) return { ...challenge, translationMissing: false };
  const builtIn = (challengeCatalog as Record<string, { source_description: string; translations: unknown }>)[challenge.title];
  const translations = challenge.translations;
  const stored = translations && typeof translations === "object" && !Array.isArray(translations)
    ? (translations as Record<string, unknown>)[language] : undefined;
  const reviewed = builtIn?.source_description === challenge.description
    ? (builtIn.translations as Record<string, unknown>)[language] : undefined;
  const entry = stored ?? reviewed;
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    const localized = entry as Record<string, unknown>;
    if (typeof localized.title === "string" && localized.title.trim() && typeof localized.description === "string" && localized.description.trim()) {
      // Only editorial fields may be overridden. Never spread untrusted JSON onto a challenge.
      const cover = typeof localized.image_url === "string" && /^https?:\/\//i.test(localized.image_url) ? localized.image_url : challenge.image_url;
      return { ...challenge, title: localized.title, description: localized.description,
        prize: typeof localized.prize === "string" && localized.prize.trim() ? localized.prize : challenge.prize,
        image_url: cover, translationMissing: false };
    }
  }
  return { ...challenge, translationMissing: language !== (challenge.source_language ?? "en") };
};
