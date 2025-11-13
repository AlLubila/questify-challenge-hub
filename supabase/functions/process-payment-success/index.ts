import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: user.id });

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    logStep("Parsing request body");
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error("Valid session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer'],
    });
    logStep("Retrieved session", { sessionId, status: session.payment_status });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      throw new Error("User ID not found in session metadata");
    }
    
    // Verify the session belongs to the authenticated user
    if (userId !== user.id) {
      throw new Error("Unauthorized: Session does not belong to user");
    }
    logStep("Verified session belongs to user", { userId });

    // Check if this is a boost purchase or subscription
    const isSubscription = session.mode === "subscription";
    const boostType = session.metadata?.boost_type;
    const submissionId = session.metadata?.submission_id;

    if (isSubscription) {
      // Handle subscription payment
      logStep("Processing subscription payment");

      // Create notification
      const { error: notifError } = await supabaseClient
        .from("notifications")
        .insert({
          user_id: userId,
          type: "subscription_activated",
          title: "Creator Pass Activated! 🎉",
          message: "Your Creator Pass subscription is now active. Enjoy exclusive perks and rewards!",
          metadata: { session_id: sessionId },
        });

      if (notifError) {
        logStep("Error creating notification", { error: notifError });
      }
    } else if (boostType && submissionId) {
      // Handle boost purchase
      logStep("Processing boost purchase", { boostType, submissionId });

      const amount = session.amount_total || 0;

      // Record the purchase
      const { error: purchaseError } = await supabaseClient
        .from("boost_purchases")
        .insert({
          user_id: userId,
          price_id: session.line_items?.data[0]?.price?.id || "",
          amount,
          boost_type: boostType,
        });

      if (purchaseError) {
        logStep("Error recording purchase", { error: purchaseError });
      }

      // Update submission with boost level
      const { error: updateError } = await supabaseClient
        .from("submissions")
        .update({ boost_level: boostType })
        .eq("id", submissionId)
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error updating submission", { error: updateError });
      }

      // Create notification
      const boostNames: Record<string, string> = {
        small: "Small Boost (2x)",
        medium: "Medium Boost (5x)",
        large: "Large Boost (10x)",
      };

      const { error: notifError } = await supabaseClient
        .from("notifications")
        .insert({
          user_id: userId,
          type: "boost_applied",
          title: `${boostNames[boostType]} Applied! ⚡`,
          message: "Your submission visibility has been boosted successfully!",
          metadata: { session_id: sessionId, submission_id: submissionId, boost_type: boostType },
        });

      if (notifError) {
        logStep("Error creating notification", { error: notifError });
      }
    }

    logStep("Payment processed successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-payment-success", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
