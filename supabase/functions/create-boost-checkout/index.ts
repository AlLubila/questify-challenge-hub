import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@22.4.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireUser, safeOrigin } from "../_shared/security.ts";

const priceVars = {
  small: "STRIPE_SMALL_BOOST_PRICE_ID",
  medium: "STRIPE_MEDIUM_BOOST_PRICE_ID",
  large: "STRIPE_LARGE_BOOST_PRICE_ID",
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user.email) throw new Error("Verified email is required");
    const origin = safeOrigin(req);
    const { boostType, submissionId, requestId } = await req.json();
    if (!(boostType in priceVars) || typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
      return json(req, { error: "Invalid boost request" }, 400);
    }
    if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      return json(req, { error: "A valid requestId is required" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get(priceVars[boostType as keyof typeof priceVars]);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !priceId || !url || !serviceKey) throw new Error("Billing configuration missing");

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: submission } = await service.from("submissions").select("id,user_id,status").eq("id", submissionId).maybeSingle();
    if (!submission || submission.user_id !== user.id || submission.status !== "approved") {
      return json(req, { error: "Only an approved submission owned by you can be boosted" }, 403);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" });
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
      mode: "payment",
      success_url: `${origin}/feed?boost_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/feed`,
      integration_identifier: `questify_${suffix}`,
      metadata: { user_id: user.id, purchase_type: "boost", boost_type: boostType, submission_id: submissionId },
    }, { idempotencyKey: `boost-checkout:${user.id}:${requestId}` });

    return json(req, { url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-boost-checkout failed", { message });
    return json(req, { error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
