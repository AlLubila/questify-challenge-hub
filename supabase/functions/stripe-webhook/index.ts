import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@22.4.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const boostTypes = new Set(["small", "medium", "large"]);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const signature = req.headers.get("stripe-signature");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!signature || !stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response("Webhook configuration missing", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" });
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", { message: error instanceof Error ? error.message : "unknown" });
    return new Response("Invalid signature", { status: 400 });
  }

  const { error: claimError } = await service.from("stripe_events").insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
  });
  if (claimError?.code === "23505") return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  if (claimError) return new Response("Unable to claim event", { status: 500 });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const incoming = event.data.object as Stripe.Checkout.Session;
      const session = await stripe.checkout.sessions.retrieve(incoming.id, { expand: ["line_items"] });
      const userId = session.metadata?.user_id;
      if (!userId || session.client_reference_id !== userId) throw new Error("Checkout identity metadata is invalid");
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!customerId) throw new Error("Checkout customer is missing");

      const { error: customerError } = await service.from("stripe_customers").upsert({ user_id: userId, customer_id: customerId });
      if (customerError) throw customerError;

      if (session.mode === "subscription") {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subscriptionId) throw new Error("Subscription is missing from Checkout");
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const product = subscription.items.data[0]?.price.product;
        const productId = typeof product === "string" ? product : product?.id;
        const periodEnd = subscription.items.data[0]?.current_period_end;
        const { error } = await service.from("subscriptions").upsert({
          user_id: userId,
          product_id: productId ?? "",
          is_active: ["active", "trialing"].includes(subscription.status),
          subscription_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
        }, { onConflict: "user_id" });
        if (error) throw error;

        await service.from("notifications").insert({
          user_id: userId,
          type: "subscription_activated",
          title: "Creator Pass activated",
          message: "Your subscription is active.",
          metadata: { checkout_session_id: session.id },
        });
      } else if (session.payment_status === "paid" && session.metadata?.purchase_type === "boost") {
        const boostType = session.metadata.boost_type;
        const submissionId = session.metadata.submission_id;
        if (!boostType || !boostTypes.has(boostType) || !submissionId) throw new Error("Boost metadata is invalid");
        const price = session.line_items?.data[0]?.price;
        const { error: purchaseError } = await service.from("boost_purchases").insert({
          user_id: userId,
          price_id: price?.id ?? "",
          amount: session.amount_total ?? 0,
          boost_type: boostType,
          checkout_session_id: session.id,
          submission_id: submissionId,
        });
        if (purchaseError && purchaseError.code !== "23505") throw purchaseError;

        const { error: updateError } = await service
          .from("submissions")
          .update({ boost_level: boostType })
          .eq("id", submissionId)
          .eq("user_id", userId)
          .eq("status", "approved");
        if (updateError) throw updateError;

        await service.from("notifications").insert({
          user_id: userId,
          type: "boost_applied",
          title: "Boost applied",
          message: "Your submission visibility boost is active.",
          metadata: { checkout_session_id: session.id, submission_id: submissionId, boost_type: boostType },
        });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const { data: link } = await service.from("stripe_customers").select("user_id").eq("customer_id", customerId).maybeSingle();
      const userId = subscription.metadata.user_id ?? link?.user_id;
      if (userId) {
        const product = subscription.items.data[0]?.price.product;
        const productId = typeof product === "string" ? product : product?.id;
        const periodEnd = subscription.items.data[0]?.current_period_end;
        const { error } = await service.from("subscriptions").upsert({
          user_id: userId,
          product_id: productId ?? "",
          is_active: event.type !== "customer.subscription.deleted" && ["active", "trialing"].includes(subscription.status),
          subscription_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
        }, { onConflict: "user_id" });
        if (error) throw error;
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const parentSubscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof parentSubscription === "string" ? parentSubscription : parentSubscription?.id;
      if (subscriptionId) {
        const { error } = await service.from("subscriptions").update({ is_active: false }).eq("stripe_subscription_id", subscriptionId);
        if (error) throw error;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    await service.from("stripe_events").delete().eq("event_id", event.id);
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, message: error instanceof Error ? error.message : "unknown" });
    return new Response("Webhook processing failed", { status: 500 });
  }
});
