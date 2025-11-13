import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { limit = 5 } = await req.json();

    // Calculate the start of the week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Get all point-related transactions from this week
    const { data: transactions, error: transError } = await supabase
      .from("wallet_transactions")
      .select("user_id, amount, created_at")
      .gte("created_at", weekStart.toISOString())
      .in("transaction_type", ["challenge_reward", "referral_reward", "submission_approved"]);

    if (transError) throw transError;

    // Aggregate points per user
    const userPointsMap: Record<string, number> = {};
    transactions?.forEach(transaction => {
      if (transaction.amount > 0) {
        userPointsMap[transaction.user_id] = (userPointsMap[transaction.user_id] || 0) + transaction.amount;
      }
    });

    // Sort by points and get top performers
    const topUserIds = Object.entries(userPointsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, points]) => ({ userId, weeklyPoints: points }));

    if (topUserIds.length === 0) {
      return new Response(JSON.stringify({ topPerformers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level")
      .in("id", topUserIds.map(u => u.userId));

    if (profileError) throw profileError;

    // Combine profiles with weekly points
    const topPerformers = topUserIds.map(({ userId, weeklyPoints }) => {
      const profile = profiles?.find(p => p.id === userId);
      return profile ? { ...profile, weeklyPoints } : null;
    }).filter(Boolean);

    return new Response(JSON.stringify({ topPerformers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting weekly top performers:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
