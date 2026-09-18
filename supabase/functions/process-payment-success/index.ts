import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@22.4.0";
import { corsHeaders, json, requireUser } from "../_shared/security.ts";

// Compatibility endpoint for the browser redirect. Fulfilment is performed only
// by stripe-webhook; this endpoint never mutates purchases or entitlements.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const { sessionId } = await req.json();
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) return json(req, { error: "Valid session ID is required" }, 400);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Billing configuration missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.user_id !== user.id || session.client_reference_id !== user.id) {
      return json(req, { error: "Forbidden" }, 403);
    }
    return json(req, { success: session.payment_status === "paid", status: session.payment_status, fulfilment: "webhook" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("process-payment-success failed", { message });
    return json(req, { error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
