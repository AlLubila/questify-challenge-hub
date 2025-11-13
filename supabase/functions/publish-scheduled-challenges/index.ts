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

    // Get all scheduled challenges that should be published now
    const { data: scheduledChallenges, error: fetchError } = await supabase
      .from("challenges")
      .select("*")
      .eq("publish_status", "scheduled")
      .lte("scheduled_publish_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching scheduled challenges:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledChallenges?.length || 0} challenges to publish`);

    if (scheduledChallenges && scheduledChallenges.length > 0) {
      // Update all challenges to published status
      const challengeIds = scheduledChallenges.map(c => c.id);
      
      const { error: updateError } = await supabase
        .from("challenges")
        .update({ 
          publish_status: "published",
          start_date: new Date().toISOString()
        })
        .in("id", challengeIds);

      if (updateError) {
        console.error("Error publishing challenges:", updateError);
        throw updateError;
      }

      console.log(`Successfully published ${challengeIds.length} challenges`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          published: challengeIds.length,
          challenges: scheduledChallenges.map(c => ({ id: c.id, title: c.title }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, published: 0, message: "No challenges to publish" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in publish-scheduled-challenges:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
