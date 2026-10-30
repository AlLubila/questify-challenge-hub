import { describe, expect, it, afterEach, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { catalogs, getInitialLanguage, languages, resolveLanguage, translate } from "@/lib/i18n";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { calculateTimeLeft } from "@/hooks/useChallenges";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("language preferences", () => {
  it("detects regional browser preferences and lets a saved choice win", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP", "pl-PL", "en-US"]);
    expect(getInitialLanguage()).toBe("pl");
    localStorage.setItem("questify.language.v1", "de");
    expect(getInitialLanguage()).toBe("de");
    localStorage.setItem("questify.language.v1", "invalid");
    expect(getInitialLanguage()).toBe("pl");
  });
  it("works when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX"]);
    expect(getInitialLanguage()).toBe("es");
    expect(resolveLanguage("fr_CA")).toBe("fr");
  });
  it("switches, persists and updates the document language", () => {
    localStorage.setItem("questify.language.v1", "en");
    render(<LanguageProvider><LanguageSelector /></LanguageProvider>);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fr" } });
    expect(document.documentElement.lang).toBe("fr");
    expect(localStorage.getItem("questify.language.v1")).toBe("fr");
    expect(screen.getByRole("combobox")).toHaveAccessibleName("Choisir la langue");
  });
});

describe("translation catalogs", () => {
  it("covers every English key and preserves interpolation variables in all five languages", () => {
    for (const { code } of languages) for (const [key, value] of Object.entries(catalogs.en)) {
      expect(catalogs[code][key], `${code}: ${key}`).toBeTruthy();
      expect(catalogs[code][key].match(/\{\w+\}/g)?.sort() ?? [], `${code}: ${key}`).toEqual(value.match(/\{\w+\}/g)?.sort() ?? []);
    }
  });
  it("formats countdowns and substitutes values without interpreting markup", () => {
    expect(calculateTimeLeft("2000-01-01", "pl")).toBe("Zakończone");
    expect(translate("de", "time.hours", { hours: 3 })).toBe("Noch 3 Std.");
    expect(translate("fr", "missing.key")).toBe("missing.key");
  });
});
