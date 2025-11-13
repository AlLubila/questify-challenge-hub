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

    const { limit = 10 } = await req.json();

    // Get challenges the user has participated in
    const { data: userSubmissions } = await supabase
      .from("submissions")
      .select("challenge_id")
      .eq("user_id", user.id);

    const userChallengeIds = userSubmissions?.map(s => s.challenge_id) || [];

    // Get challenges the user has voted on
    const { data: userVotes } = await supabase
      .from("submission_votes")
      .select("submission_id")
      .eq("user_id", user.id);

    const voteSubmissionIds = userVotes?.map(v => v.submission_id) || [];

    // Get challenge IDs from voted submissions
    const { data: votedSubmissions } = await supabase
      .from("submissions")
      .select("challenge_id")
      .in("id", voteSubmissionIds.length > 0 ? voteSubmissionIds : ['00000000-0000-0000-0000-000000000000']);

    const votedChallengeIds = votedSubmissions?.map(s => s.challenge_id) || [];

    // Combine all challenge interests
    const allChallengeIds = [...new Set([...userChallengeIds, ...votedChallengeIds])];

    if (allChallengeIds.length === 0) {
      // New user - recommend top users by points
      const { data: topUsers } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, points, level")
        .neq("id", user.id)
        .order("points", { ascending: false })
        .limit(limit);

      return new Response(JSON.stringify({ recommendations: topUsers || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find users who participated in similar challenges
    const { data: similarUsers } = await supabase
      .from("submissions")
      .select("user_id, challenge_id")
      .in("challenge_id", allChallengeIds)
      .neq("user_id", user.id);

    // Calculate similarity scores
    const userScores: Record<string, number> = {};
    similarUsers?.forEach(submission => {
      if (!userScores[submission.user_id]) {
        userScores[submission.user_id] = 0;
      }
      userScores[submission.user_id]++;
    });

    // Get users already followed
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map(f => f.following_id) || [];

    // Sort by similarity score and exclude already followed users
    const sortedUserIds = Object.entries(userScores)
      .filter(([userId]) => !followingIds.includes(userId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId]) => userId);

    if (sortedUserIds.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile details
    const { data: recommendedProfiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, points, level")
      .in("id", sortedUserIds);

    // Preserve order from sortedUserIds
    const orderedProfiles = sortedUserIds
      .map(id => recommendedProfiles?.find(p => p.id === id))
      .filter(Boolean);

    return new Response(JSON.stringify({ recommendations: orderedProfiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
