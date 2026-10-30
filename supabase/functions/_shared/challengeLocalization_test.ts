import { challengeCatalog } from "./challengeCatalog.ts";
import { getEditorialTranslations } from "./challengeLocalization.ts";

Deno.test("every built-in fallback includes the four complete translations", () => {
  for (const [title, entry] of Object.entries(challengeCatalog)) {
    const translations = getEditorialTranslations({ title, description: entry.source_description });
    for (const code of ["fr", "pl", "de", "es"]) {
      if (!translations[code]?.title || !translations[code]?.description || !translations[code]?.prize) throw new Error(`${title}: ${code} missing`);
    }
  }
});

Deno.test("incomplete generated translations cannot be published", () => {
  let rejected = false;
  try { getEditorialTranslations({ title: "New mission", description: "New brief", translations: { fr: { title: "Titre", description: "Description", prize: "100 points" } } }); }
  catch { rejected = true; }
  if (!rejected) throw new Error("Incomplete generated challenge accepted");
});
