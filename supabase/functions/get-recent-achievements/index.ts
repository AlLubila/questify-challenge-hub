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

    const { limit = 10 } = await req.json();

    // Get recent badge awards with user and badge info
    const { data: recentAchievements, error } = await supabase
      .from("user_badges")
      .select(`
        id,
        earned_at,
        user_id,
        badge_id,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          level
        ),
        badges:badge_id (
          id,
          name,
          description,
          icon
        )
      `)
      .order("earned_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return new Response(JSON.stringify({ achievements: recentAchievements || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting recent achievements:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
