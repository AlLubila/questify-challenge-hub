import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@22.4.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireUser, safeOrigin } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const origin = safeOrigin(req);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !url || !serviceKey) throw new Error("Billing configuration missing");

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: link } = await service.from("stripe_customers").select("customer_id").eq("user_id", user.id).maybeSingle();
    if (!link?.customer_id) return json(req, { error: "No billing account exists for this user" }, 404);

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" });
    const session = await stripe.billingPortal.sessions.create({ customer: link.customer_id, return_url: `${origin}/profile` });
    return json(req, { url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("customer-portal failed", { message });
    return json(req, { error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
