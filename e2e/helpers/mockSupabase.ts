import type { Page, Route } from "@playwright/test";

export const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
export const TEST_OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
export const TEST_CHALLENGE_ID = "33333333-3333-4333-8333-333333333333";

const futureExpiry = Math.floor(Date.now() / 1000) + 60 * 60;

const testUser = {
  id: TEST_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.test",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { username: "test-admin" },
  identities: [],
  created_at: new Date().toISOString(),
};

const testSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: futureExpiry,
  token_type: "bearer",
  user: testUser,
};

const challenge = {
  id: TEST_CHALLENGE_ID,
  title: "Pocket Movie Magic",
  description: "Create a playful ten-second visual trick with an everyday object.",
  image_url: null,
  prize: "$100 Creative Prize",
  participants_count: 4,
  points: 300,
  difficulty: "easy",
  challenge_type: "weekly",
  publish_status: "published",
  is_ai_generated: true,
  start_date: new Date(Date.now() - 86_400_000).toISOString(),
  end_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  created_at: new Date().toISOString(),
  created_by: TEST_USER_ID,
  updated_at: new Date().toISOString(),
};

type MockOptions = {
  authenticated?: boolean;
  role?: "admin" | "moderator" | "user";
};

const json = (route: Route, body: unknown, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  headers: {
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "content-range",
  },
  body: JSON.stringify(body),
});

export async function installSupabaseMock(page: Page, options: MockOptions = {}) {
  const requests: Array<{ url: string; method: string; body: unknown }> = [];

  if (options.authenticated) {
    await page.addInitScript(({ session }) => {
      window.localStorage.setItem("sb-example-auth-token", JSON.stringify(session));
    }, { session: testSession });
  }

  await page.route("https://example.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let body: unknown = null;
    try { body = request.postDataJSON(); } catch { body = request.postData(); }
    requests.push({ url: request.url(), method, body });

    if (method === "OPTIONS") return json(route, {});

    if (url.pathname === "/auth/v1/token") return json(route, testSession);
    if (url.pathname === "/auth/v1/logout") return json(route, {});
    if (url.pathname === "/auth/v1/otp") return json(route, {});
    if (url.pathname === "/auth/v1/verify") return json(route, testSession);
    if (url.pathname === "/auth/v1/signup") {
      return json(route, { user: testUser, session: null });
    }
    if (url.pathname === "/auth/v1/user") return json(route, testUser);

    if (url.pathname.endsWith("/functions/v1/manage-users")) {
      if ((body as { action?: string } | null)?.action === "list") {
        return json(route, {
          users: [
            {
              id: TEST_USER_ID,
              email: testUser.email,
              username: "test-admin",
              displayName: "Test Admin",
              createdAt: testUser.created_at,
              emailConfirmedAt: testUser.email_confirmed_at,
              invitedAt: null,
              roles: ["admin"],
            },
            {
              id: TEST_OTHER_USER_ID,
              email: "member@example.test",
              username: "member",
              displayName: "Test Member",
              createdAt: testUser.created_at,
              emailConfirmedAt: testUser.email_confirmed_at,
              invitedAt: null,
              roles: ["user"],
            },
          ],
        });
      }
      if ((body as { action?: string } | null)?.action === "invite") {
        return json(route, { userId: TEST_OTHER_USER_ID });
      }
      if ((body as { action?: string } | null)?.action === "delete") {
        return json(route, { deleted: true });
      }
    }

    if (url.pathname.endsWith("/functions/v1/verify-image-authenticity")) {
      return json(route, { analysis: { isAuthentic: true } });
    }

    if (url.pathname.startsWith("/storage/v1/object/submissions/")) {
      return json(route, { Key: url.pathname.replace("/storage/v1/object/", "") });
    }

    if (url.pathname === "/rest/v1/user_roles") {
      return json(route, [{ role: options.role ?? "user" }]);
    }
    if (url.pathname === "/rest/v1/profiles") {
      if (request.headers()["accept"]?.includes("application/vnd.pgrst.object")) {
        return json(route, {
          id: TEST_USER_ID,
          username: "test-admin",
          display_name: "Test Admin",
          avatar_url: null,
          points: 120,
          xp: 120,
          level: 2,
          wallet_balance: 0,
        });
      }
      return json(route, [{ id: TEST_USER_ID, username: "test-admin", display_name: "Test Admin", avatar_url: null, points: 120 }]);
    }
    if (url.pathname === "/rest/v1/challenges") {
      if (url.searchParams.has("id")) return json(route, challenge);
      return json(route, [challenge]);
    }
    if (url.pathname === "/rest/v1/submissions") {
      if (method === "POST") return json(route, { id: "submission-test-id" }, 201);
      return json(route, null);
    }
    if (url.pathname === "/rest/v1/admin_activity_logs") return json(route, [], method === "POST" ? 201 : 200);

    return json(route, []);
  });

  return requests;
}
