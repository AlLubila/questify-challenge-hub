import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installSupabaseMock } from "./helpers/mockSupabase";

for (const path of ["/", "/feed", "/leaderboard", "/privacy", "/terms", "/cookies", "/contest-rules"]) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await installSupabaseMock(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test("mobile navigation and layouts avoid horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only layout assertion");
  await installSupabaseMock(page);

  for (const path of ["/", "/feed", "/leaderboard", "/privacy"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
  }

  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
});
