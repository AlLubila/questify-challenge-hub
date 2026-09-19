import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireUser } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Supabase configuration missing");
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await service
      .from("subscriptions")
      .select("product_id,is_active,subscription_end")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return json(req, {
      subscribed: data?.is_active === true,
      product_id: data?.product_id ?? null,
      subscription_end: data?.subscription_end ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("check-subscription failed", { message });
    return json(req, { error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
