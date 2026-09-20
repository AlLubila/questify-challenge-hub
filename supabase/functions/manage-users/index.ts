import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireRole, requireUser, safeOrigin } from "../_shared/security.ts";

type UserRole = "admin" | "moderator" | "user";
type RequestBody =
  | { action: "list" }
  | { action: "invite"; email: string; role: UserRole }
  | { action: "delete"; userId: string };

const validRoles = new Set<UserRole>(["admin", "moderator", "user"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  try {
    const admin = await requireUser(req);
    await requireRole(admin.id, ["admin"]);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Supabase configuration missing");

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json() as RequestBody;

    if (body.action === "list") {
      const { data: authData, error: authError } = await service.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authError) throw authError;

      const userIds = authData.users.map((authUser) => authUser.id);
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
        userIds.length > 0
          ? await Promise.all([
              service.from("profiles").select("id, username, display_name, created_at").in("id", userIds),
              service.from("user_roles").select("user_id, role").in("user_id", userIds),
            ])
          : [
              { data: [], error: null },
              { data: [], error: null },
            ];

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      const users = authData.users.map((authUser) => {
        const profile = profiles?.find((item) => item.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email ?? "",
          username: profile?.username ?? "Pending profile",
          displayName: profile?.display_name ?? null,
          createdAt: profile?.created_at ?? authUser.created_at,
          emailConfirmedAt: authUser.email_confirmed_at ?? null,
          invitedAt: authUser.invited_at ?? null,
          roles: (roles ?? [])
            .filter((item) => item.user_id === authUser.id)
            .map((item) => item.role as UserRole),
        };
      });

      return json(req, { users });
    }

    if (body.action === "invite") {
      const email = body.email?.trim().toLowerCase();
      if (!email || email.length > 254 || !emailPattern.test(email)) {
        return json(req, { error: "Enter a valid email address" }, 400);
      }
      if (!validRoles.has(body.role)) {
        return json(req, { error: "Select a valid role" }, 400);
      }

      const redirectTo = `${safeOrigin(req)}/auth?mode=invite`;
      const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_role: body.role },
      });
      if (error) throw error;
      if (!data.user) throw new Error("The invitation did not create a user");

      const { error: roleError } = await service.from("user_roles").upsert(
        { user_id: data.user.id, role: body.role, created_by: admin.id },
        { onConflict: "user_id,role" },
      );

      if (roleError) {
        await service.auth.admin.deleteUser(data.user.id);
        throw roleError;
      }

      await service.from("admin_activity_logs").insert({
        admin_id: admin.id,
        action_type: "invite_user",
        target_type: "user",
        target_id: data.user.id,
        reason: `Invited with role: ${body.role}`,
      });

      return json(req, { userId: data.user.id, email, role: body.role });
    }

    if (body.action === "delete") {
      if (!body.userId || !uuidPattern.test(body.userId)) {
        return json(req, { error: "Invalid user" }, 400);
      }
      if (body.userId === admin.id) {
        return json(req, { error: "You cannot delete your own administrator account" }, 403);
      }

      const { data: targetData, error: targetError } = await service.auth.admin.getUserById(body.userId);
      if (targetError || !targetData.user) {
        return json(req, { error: "User not found" }, 404);
      }

      const targetEmail = targetData.user.email ?? "unknown email";
      const { error: deleteError } = await service.auth.admin.deleteUser(body.userId);
      if (deleteError) throw deleteError;

      await service.from("admin_activity_logs").insert({
        admin_id: admin.id,
        action_type: "delete_user",
        target_type: "user",
        target_id: body.userId,
        reason: `Deleted account: ${targetEmail}`,
      });

      return json(req, { deleted: true });
    }

    return json(req, { error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    console.error("manage-users failed", { message });
    return json(req, { error: message }, status);
  }
});
