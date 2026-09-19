import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@22.4.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireUser, safeOrigin } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user.email) throw new Error("Verified email is required");
    const origin = safeOrigin(req);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_CREATOR_PASS_PRICE_ID");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !priceId || !url || !serviceKey) throw new Error("Billing configuration missing");

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" });
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: link } = await service.from("stripe_customers").select("customer_id").eq("user_id", user.id).maybeSingle();
    let customerId = link?.customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      const { error } = await service.from("stripe_customers").upsert({ user_id: user.id, customer_id: customerId });
      if (error) throw error;
    }

    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/profile?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile`,
      integration_identifier: `questify_${suffix}`,
      metadata: { user_id: user.id, purchase_type: "subscription" },
      subscription_data: { metadata: { user_id: user.id } },
    }, { idempotencyKey: `subscription-checkout:${user.id}:${priceId}` });

    return json(req, { url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-subscription-checkout failed", { message });
    return json(req, { error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
