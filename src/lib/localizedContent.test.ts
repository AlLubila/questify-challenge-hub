import { describe, expect, it } from "vitest";
import { localizeChallenge, prepareTranslations } from "@/lib/localizedContent";
import { challengeCatalog } from "../../supabase/functions/_shared/challengeCatalog";

describe("editorial content localization", () => {
  const original = { id: "keep", title: "Original", description: "Brief", image_url: "/shared-cover.png", points: 450, translations: {
    pl: { title: "Tytuł", description: "Opis", image_url: "https://example.test/pl.png", id: "overwrite", points: 999 },
  } };
  it("switches text and localized cover together without overriding operational fields", () => {
    const result = localizeChallenge(original, "pl");
    expect(result).toMatchObject({ title: "Tytuł", description: "Opis", image_url: "https://example.test/pl.png", id: "keep", points: 450, translationMissing: false });
    expect(original.title).toBe("Original");
    expect(localizeChallenge(original, "en").image_url).toBe("/shared-cover.png");
  });
  it("keeps original content when translations are absent or incomplete", () => {
    expect(localizeChallenge(original, "de")).toMatchObject({ title: "Original", translationMissing: true });
    expect(localizeChallenge({ ...original, translations: { de: { title: "Unvollständig" } } }, "de").title).toBe("Original");
  });
  it("uses reviewed built-in translations only while the original brief still matches", () => {
    const [title, entry] = Object.entries(challengeCatalog)[0];
    expect(localizeChallenge({ title, description: entry.source_description }, "fr").translationMissing).toBe(false);
    expect(localizeChallenge({ title, description: "Changed brief" }, "fr").translationMissing).toBe(true);
  });
  it("requires complete editorial entries and HTTPS covers", () => {
    expect(prepareTranslations({ fr: { title: "", description: "" } }, "en")).toEqual({});
    expect(() => prepareTranslations({ fr: { title: "Titre", description: "" } }, "en")).toThrow("content.incomplete");
    expect(() => prepareTranslations({ fr: { title: "Titre", description: "Texte", image_url: "javascript:alert(1)" } }, "en")).toThrow("content.invalidCover");
  });
});
