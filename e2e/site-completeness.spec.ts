import { expect, test } from "@playwright/test";
import { installSupabaseMock } from "./helpers/mockSupabase";

test("the primary action is above the fold in all five languages", async ({ page }) => {
  await installSupabaseMock(page);
  await page.goto("/");
  for (const language of ["en", "fr", "pl", "de", "es"]) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.getByRole("combobox").selectOption(language);
    const action = page.locator("section").filter({ has: page.locator("h1") }).getByRole("button").first();
    await expect(action).toBeInViewport({ ratio: 1 });
    await action.click();
    await expect(page.locator("#challenges")).toBeInViewport();
  }
});

test("public pages have distinct metadata, accessible images, and privacy access", async ({ page }) => {
  await installSupabaseMock(page);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of ["/", "/feed", "/leaderboard", "/faq", "/privacy", "/terms", "/cookies", "/contest-rules"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(title).toContain("A Challenge");
    expect(description?.length).toBeGreaterThan(30);
    expect(titles.has(title)).toBe(false);
    expect(descriptions.has(description!)).toBe(false);
    titles.add(title);
    descriptions.add(description!);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
    await expect(page.locator("img:not([alt])")).toHaveCount(0);
    await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
  }
  await page.goto("/does-not-exist");
  await expect(page).toHaveTitle("Page not found | A Challenge");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.getByRole("link", { name: "Return to Home" }).click();
  await expect(page).toHaveTitle(/Weekly Creative/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
  await page.goto("/auth");
  await expect(page).toHaveTitle("Sign in or create an account | A Challenge");
});

test("discovery and sharing resources are real files", async ({ page, request }) => {
  await installSupabaseMock(page);
  await page.goto("/");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  const icon = await page.locator('link[rel="icon"]').getAttribute("href");
  for (const [path, type] of [["/robots.txt", /text\/plain/], ["/sitemap.xml", /xml/], [new URL(image!).pathname, /image\/png/], [icon!, /image\/svg/]] as const) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-type"], path).toMatch(type);
  }
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap: https://achallenge.vercel.app/sitemap.xml");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("https://achallenge.vercel.app/privacy");
});
