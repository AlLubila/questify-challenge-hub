import { expect, test } from "@playwright/test";

test("renders the public landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Create\. Compete\. Win Big\./i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Creating Now/i })).toBeVisible();
  await expect(page).toHaveTitle(/Questify/i);
});

test("redirects private and staff routes to sign in", async ({ page }) => {
  for (const path of ["/wallet", "/admin/users"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  }
});

test("offers password recovery without submitting personal data", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Forgot your password/i }).click();

  await expect(page.getByRole("heading", { name: /Reset your password/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Send reset link/i })).toBeVisible();
});

test("renders a useful not-found page", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Return to Home/i })).toHaveAttribute("href", "/");
});
