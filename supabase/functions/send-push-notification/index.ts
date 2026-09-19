import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireRole, requireUser } from "../_shared/security.ts";

const allowedTypes = new Set([
  "new_challenge", "submission_approved", "submission_rejected", "prize_won",
  "ranking_change", "badge_earned", "new_follower", "subscription_activated", "boost_applied",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const caller = await requireUser(req);
    await requireRole(caller.id, ["admin", "moderator"]);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Supabase configuration missing");

    const { user_id, title, body, data = {} } = await req.json();
    if (typeof user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(user_id)) return json(req, { error: "Valid user_id is required" }, 400);
    if (typeof title !== "string" || !title.trim() || title.length > 120) return json(req, { error: "Invalid title" }, 400);
    if (typeof body !== "string" || !body.trim() || body.length > 500) return json(req, { error: "Invalid body" }, 400);
    const type = typeof data.type === "string" && allowedTypes.has(data.type) ? data.type : null;
    if (!type) return json(req, { error: "Invalid notification type" }, 400);

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { count, error: tokenError } = await service
      .from("push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id);
    if (tokenError) throw tokenError;

    const { error: notificationError } = await service.from("notifications").insert({
      user_id,
      type,
      title: title.trim(),
      message: body.trim(),
      metadata: { ...data, type: undefined },
    });
    if (notificationError) throw notificationError;

    return json(req, { success: true, devices: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-push-notification failed", { message });
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json(req, { error: message }, status);
  }
});
