import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("User ID is required");
    }

    console.log(`Checking badges for user: ${user_id}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (profileError) throw profileError;

    // Get user's current badges
    const { data: userBadges, error: badgesError } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user_id);

    if (badgesError) throw badgesError;

    const userBadgeIds = new Set(userBadges.map(b => b.badge_id));

    // Get all badges
    const { data: allBadges, error: allBadgesError } = await supabase
      .from("badges")
      .select("*");

    if (allBadgesError) throw allBadgesError;

    // Get submission count
    const { count: submissionCount, error: submissionError } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (submissionError) throw submissionError;

    const newBadges: string[] = [];

    // Check badge criteria
    for (const badge of allBadges) {
      if (userBadgeIds.has(badge.id)) continue;

      let shouldAward = false;

      switch (badge.name) {
        case "First Challenge":
          shouldAward = (submissionCount || 0) >= 1;
          break;
        case "Rising Star":
          shouldAward = profile.points >= 1000;
          break;
        case "Challenge Master":
          shouldAward = (submissionCount || 0) >= 10;
          break;
        // Add more badge logic as needed
      }

      if (shouldAward) {
        const { error: awardError } = await supabase
          .from("user_badges")
          .insert({
            user_id: user_id,
            badge_id: badge.id,
          });

        if (!awardError) {
          newBadges.push(badge.name);
          console.log(`Awarded badge: ${badge.name} to user: ${user_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        awarded_badges: newBadges,
        message: newBadges.length > 0 
          ? `Awarded ${newBadges.length} new badge(s)!` 
          : "No new badges awarded"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in award-badges function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});