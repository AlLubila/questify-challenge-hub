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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { limit = 5 } = await req.json();

    // Get user's past submissions to understand their interests
    const { data: userSubmissions } = await supabase
      .from("submissions")
      .select("challenge_id, challenges(difficulty, challenge_type)")
      .eq("user_id", user.id);

    // Get challenges user has voted on
    const { data: userVotes } = await supabase
      .from("submission_votes")
      .select("submission_id")
      .eq("user_id", user.id);

    const voteSubmissionIds = userVotes?.map(v => v.submission_id) || [];

    // Get challenge IDs from voted submissions
    const { data: votedSubmissions } = await supabase
      .from("submissions")
      .select("challenge_id, challenges(difficulty, challenge_type)")
      .in("id", voteSubmissionIds.length > 0 ? voteSubmissionIds : ['00000000-0000-0000-0000-000000000000']);

    // Combine to understand user preferences
    const allChallengeInteractions = [
      ...(userSubmissions || []),
      ...(votedSubmissions || [])
    ];

    // Extract user preferences
    const difficultyPreferences: Record<string, number> = {};
    const typePreferences: Record<string, number> = {};

    allChallengeInteractions.forEach((item: any) => {
      if (item.challenges) {
        const difficulty = item.challenges.difficulty;
        const type = item.challenges.challenge_type;
        
        difficultyPreferences[difficulty] = (difficultyPreferences[difficulty] || 0) + 1;
        typePreferences[type] = (typePreferences[type] || 0) + 1;
      }
    });

    const preferredDifficulty = Object.keys(difficultyPreferences).sort(
      (a, b) => difficultyPreferences[b] - difficultyPreferences[a]
    )[0];

    const preferredType = Object.keys(typePreferences).sort(
      (a, b) => typePreferences[b] - typePreferences[a]
    )[0];

    // Get challenges user has already participated in
    const participatedChallengeIds = userSubmissions?.map(s => s.challenge_id) || [];

    // Query for recommended challenges
    let query = supabase
      .from("challenges")
      .select("*")
      .eq("publish_status", "published")
      .gte("end_date", new Date().toISOString())
      .not("id", "in", `(${participatedChallengeIds.length > 0 ? participatedChallengeIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    const { data: allChallenges } = await query;

    if (!allChallenges || allChallenges.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score challenges based on user preferences
    const scoredChallenges = allChallenges.map(challenge => {
      let score = 0;
      
      // Prefer same difficulty
      if (preferredDifficulty && challenge.difficulty === preferredDifficulty) {
        score += 3;
      }
      
      // Prefer same type
      if (preferredType && challenge.challenge_type === preferredType) {
        score += 2;
      }
      
      // Boost newer challenges
      const daysOld = (Date.now() - new Date(challenge.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 1;
      
      return { ...challenge, score };
    });

    // Sort by score and return top recommendations
    const recommendations = scoredChallenges
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...challenge }) => challenge);

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting challenge recommendations:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
