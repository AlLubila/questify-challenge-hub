import { expect, test } from "@playwright/test";
import { installSupabaseMock, TEST_CHALLENGE_ID } from "./helpers/mockSupabase";

test("signup reaches email-code verification", async ({ page }) => {
  await installSupabaseMock(page);
  await page.goto("/auth");
  await page.getByRole("tab", { name: /sign up/i }).click();
  await page.getByLabel("Username").fill("newcreator");
  await page.getByLabel("Display Name").fill("New Creator");
  await page.getByLabel("Email").fill("new@example.test");
  await page.getByLabel("Password").fill("safe-test-password");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByRole("heading", { name: /confirm your email/i })).toBeVisible();
  await expect(page.getByLabel("Confirmation code")).toHaveAttribute("maxlength", "10");
});

test("password login keeps the OTP input visible and verifies a code", async ({ page }) => {
  const requests = await installSupabaseMock(page);
  await page.goto("/auth");
  await page.getByLabel("Email").fill("admin@example.test");
  await page.getByLabel("Password").fill("safe-test-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: /confirm your email/i })).toBeVisible();
  await page.getByLabel("Confirmation code").fill("12345678");
  await page.getByRole("button", { name: /confirm and enter/i }).click();
  await expect.poll(() => requests.some((entry) => entry.url.includes("/auth/v1/verify"))).toBeTruthy();
});

test("admin can prepare an invitation and sees protected-owner controls", async ({ page }) => {
  const requests = await installSupabaseMock(page, { authenticated: true, role: "admin" });
  await page.goto("/admin/users");

  await expect(page.getByRole("heading", { name: "Invite a user" })).toBeVisible();
  await expect(page.getByText("Your account is protected")).toBeVisible();
  await page.getByLabel("Email address").fill("invitee@example.test");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Moderator" }).click();
  await page.getByRole("button", { name: /send invitation/i }).click();

  await expect(page.getByText(/Invitation sent/i)).toBeVisible();
  await expect.poll(() => requests.some((entry) => {
    const body = entry.body as { action?: string; role?: string } | null;
    return body?.action === "invite" && body.role === "moderator";
  })).toBeTruthy();
});

test("invited user can create a password from the confirmation link", async ({ page }) => {
  const requests = await installSupabaseMock(page, { authenticated: true, role: "user" });
  await page.goto("/auth?mode=invite");

  await expect(page.getByRole("heading", { name: "Create your password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("new-secure-password");
  await page.getByLabel("Confirm new password").fill("new-secure-password");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.getByText(/password has been updated/i)).toBeVisible();
  await expect.poll(() => requests.some((entry) => entry.method === "PUT" && entry.url.includes("/auth/v1/user"))).toBeTruthy();
});

test("admin must confirm before deleting another user", async ({ page }) => {
  const requests = await installSupabaseMock(page, { authenticated: true, role: "admin" });
  await page.goto("/admin/users");

  await page.getByRole("button", { name: "Delete user" }).click();
  await expect(page.getByRole("heading", { name: "Delete this user account?" })).toBeVisible();
  expect(requests.some((entry) => (entry.body as { action?: string } | null)?.action === "delete")).toBeFalsy();
  await page.getByRole("button", { name: "Yes, permanently delete" }).click();
  await expect.poll(() => requests.some((entry) => (entry.body as { action?: string } | null)?.action === "delete")).toBeTruthy();
});

test("participant can select a file and submit an entry", async ({ page }) => {
  const requests = await installSupabaseMock(page, { authenticated: true, role: "user" });
  await page.goto(`/challenge/${TEST_CHALLENGE_ID}`);

  await expect(page.getByRole("heading", { name: "Submit Your Entry" })).toBeVisible();
  await page.getByLabel(/Select Photo\/Video/i).setInputFiles({
    name: "entry.txt",
    mimeType: "video/mp4",
    buffer: Buffer.from("test-video-content"),
  });
  await page.getByLabel("Caption (Optional)").fill("A playful test entry");
  await page.getByRole("button", { name: "Submit Entry" }).click();

  await expect(page.getByText(/Submission received and queued for moderation/i)).toBeVisible();
  await expect.poll(() => requests.some((entry) => entry.method === "POST" && entry.url.includes("/rest/v1/submissions"))).toBeTruthy();
});

test("administration requires an authorized role", async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, role: "user" });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
});
