import { challengeCatalog } from "./challengeCatalog.ts";

const targetLanguages = ["fr", "pl", "de", "es"] as const;
type Translation = { title: string; description: string; prize: string };
export type EditorialTranslations = Record<string, Translation>;

export const challengeTranslationSchema = {
  type: "object",
  properties: Object.fromEntries(targetLanguages.map((code) => [code, {
    type: "object",
    properties: { title: { type: "string" }, description: { type: "string" }, prize: { type: "string" } },
    required: ["title", "description", "prize"], additionalProperties: false,
  }])),
  required: [...targetLanguages], additionalProperties: false,
};

export const localizationInstructions = "Write the main title, description and prize in English. Include translations in French (fr), Polish (pl), German (de), and Spanish (es) in the translations object. Translate the complete brief and reward faithfully; preserve all numbers, deadlines, eligibility and safety instructions. Use natural language in each locale. Rewards must remain non-cash. Cover illustrations must contain no text so they work in every language.";

export const getEditorialTranslations = (challenge: { title: string; description: string; translations?: unknown }): EditorialTranslations => {
  const result: EditorialTranslations = {};
  if (challenge.translations && typeof challenge.translations === "object" && !Array.isArray(challenge.translations)) {
    const source = challenge.translations as Record<string, unknown>;
    for (const code of targetLanguages) {
      const entry = source[code];
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      if (["title", "description", "prize"].every((key) => typeof item[key] === "string" && (item[key] as string).trim())) {
        result[code] = { title: (item.title as string).trim(), description: (item.description as string).trim(), prize: (item.prize as string).trim() };
      }
    }
    if (targetLanguages.every((code) => result[code])) return result;
  }
  const builtIn = (challengeCatalog as Record<string, { source_description: string; translations: EditorialTranslations }>)[challenge.title];
  if (builtIn?.source_description === challenge.description) return builtIn.translations;
  throw new Error("Complete French, Polish, German and Spanish translations are required before publishing generated challenges");
};
