import { expect, test } from "@playwright/test";
import { installSupabaseMock, TEST_CHALLENGE_ID } from "./helpers/mockSupabase";

const translations = {
  fr: { title: "Un décor miniature", description: "Créez une scène originale.", prize: "300 points + badge Créateur", image_url: "https://example.test/fr.png" },
  pl: { title: "Miniaturowy plan", description: "Stwórz autorską scenę.", prize: "300 punktów + odznaka Twórca" },
  de: { title: "Ein Miniaturset", description: "Erstelle eine eigene Szene.", prize: "300 Punkte + Abzeichen Kreativ" },
  es: { title: "Un plató en miniatura", description: "Crea una escena original.", prize: "300 puntos + insignia Creador" },
};

test("all five languages switch content and persist across navigation and reload", async ({ page }) => {
  await installSupabaseMock(page, { challenge: { translations, source_language: "en" } });
  await page.route("https://example.test/fr.png", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="orange"/></svg>' }));
  await page.goto("/");
  const selector = page.getByRole("combobox");
  for (const [code, title] of [["fr", "Un décor miniature"], ["pl", "Miniaturowy plan"], ["de", "Ein Miniaturset"], ["es", "Un plató en miniatura"], ["en", "Pocket Movie Magic"]]) {
    await selector.selectOption(code);
    await expect(page.locator("html")).toHaveAttribute("lang", code);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  await selector.selectOption("fr");
  await expect(page.getByAltText("Un décor miniature")).toHaveAttribute("src", "https://example.test/fr.png");
  await page.getByRole("button", { name: "Participer", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/challenge/${TEST_CHALLENGE_ID}`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Un décor miniature");
  await page.reload();
  await expect(page.getByRole("combobox")).toHaveValue("fr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Un décor miniature");
  await page.goto("/auth");
  await page.getByRole("combobox").selectOption("pl");
  await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Polityka prywatności");
  await page.goto("/faq");
  await expect(page.getByRole("button", { name: "Czym jest A Challenge?" })).toBeVisible();
  await page.screenshot({ path: `test-results/languages-${test.info().project.name}.png`, fullPage: true });
});

test("browser language detection and missing-content fallback are explicit", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ locale: "de-DE", viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  await installSupabaseMock(page);
  await page.goto("/");
  await expect(page.getByRole("combobox")).toHaveValue("de");
  await expect(page.getByText("Übersetzung nicht verfügbar: Inhalt in der Originalsprache.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pocket Movie Magic" })).toBeVisible();
  await context.close();
});

test("administrators can save a translated brief and its cover URL", async ({ page }) => {
  const requests = await installSupabaseMock(page, { authenticated: true, role: "admin" });
  await page.goto("/admin/create-challenge");
  await page.locator("#title").fill("Original brief");
  await page.locator("#description").fill("Make an original photograph.");
  await page.locator("#prize").fill("450 points + badge");
  await page.locator("#points").fill("450");
  const french = page.locator("details").filter({ has: page.locator("summary", { hasText: "Français" }) });
  await french.locator("summary").click();
  await french.getByLabel("Challenge Title", { exact: true }).fill("Un défi original");
  await french.getByLabel("Description", { exact: true }).fill("Créez une photographie originale.");
  await french.getByLabel("Reward", { exact: true }).fill("450 points + badge");
  await french.getByLabel("Translated cover URL (optional)").fill("https://example.test/fr.png");
  await page.getByRole("button", { name: "Create Challenge", exact: true }).click();
  await expect.poll(() => requests.find((request) => request.method === "POST" && request.url.includes("/rest/v1/challenges"))?.body).toMatchObject({
    source_language: "en", translations: { fr: { title: "Un défi original", description: "Créez une photographie originale.", image_url: "https://example.test/fr.png" } },
  });
});

test("translated navigation fits tablet widths", async ({ page }) => {
  await installSupabaseMock(page);
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("combobox").selectOption("de");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});
