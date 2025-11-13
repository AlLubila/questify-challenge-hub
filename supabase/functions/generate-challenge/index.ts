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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type = 'daily', count = 1 } = await req.json();

    console.log(`Generating ${count} ${type} challenge(s)...`);

    const systemPrompt = `You are a creative challenge designer for Questify, a Gen Z social app combining TikTok-style content with gamified challenges. Generate ${type} challenges that are:
- Trendy, viral-worthy, and Gen Z-friendly
- Creative and engaging
- Suitable for photo/video submissions
- Fun and achievable within the timeframe

IMPORTANT: Only use NON-MONETARY rewards that feel exciting and valuable:
🏅 Exclusive badges or titles (e.g., "Trend Setter", "Legend", "Viral Star", "Challenge Master")
⚡ XP multipliers or point boosts (e.g., "2x XP Boost", "500 Bonus Points")
🚀 Ranking boosts or leaderboard highlights (e.g., "Featured on Leaderboard", "Top Creator Spotlight")
🌈 Profile effects or customizations (e.g., "Gold Profile Frame", "Animated Avatar", "Rainbow Username Effect")
🎯 Exclusive challenge access (e.g., "Early Access to Premium Challenges", "VIP Challenge Pass")

Each challenge should feel fresh, exciting, and valuable without monetary prizes!`;

    const userPrompt = `Generate ${count} ${type} creative challenge(s) for our community. Make them trendy, fun, and potentially viral. Include a mix of difficulties.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_challenges",
              description: "Generate creative challenges for the Questify app",
              parameters: {
                type: "object",
                properties: {
                  challenges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { 
                          type: "string",
                          description: "Catchy, short title (max 60 chars)"
                        },
                        description: { 
                          type: "string",
                          description: "Engaging description explaining the challenge (100-200 chars)"
                        },
                        prize: { 
                          type: "string",
                          description: "Non-monetary reward that feels exciting (e.g., 'Viral Star Badge + 2x XP', 'Gold Profile Frame', 'Featured on Leaderboard + 500 Bonus Points', 'VIP Challenge Pass', 'Legend Title + Rainbow Effect')"
                        },
                        difficulty: { 
                          type: "string",
                          enum: ["easy", "medium", "hard"],
                          description: "Challenge difficulty level"
                        },
                        points: {
                          type: "number",
                          description: "Points awarded (200-300 for easy, 400-600 for medium, 700-1000 for hard)"
                        }
                      },
                      required: ["title", "description", "prize", "difficulty", "points"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["challenges"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_challenges" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const generatedChallenges = JSON.parse(toolCall.function.arguments).challenges;

    // Calculate end dates based on challenge type
    const now = new Date();
    const endDate = new Date(now);
    if (type === 'daily') {
      endDate.setDate(endDate.getDate() + 1); // 1 day
    } else {
      endDate.setDate(endDate.getDate() + 7); // 7 days
    }

    // Insert challenges into database
    const challengesToInsert = generatedChallenges.map((challenge: any) => ({
      title: challenge.title,
      description: challenge.description,
      prize: challenge.prize,
      difficulty: challenge.difficulty,
      points: challenge.points,
      challenge_type: type,
      is_ai_generated: true,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      participants_count: Math.floor(Math.random() * 5000) + 1000 // Random initial count
    }));

    const { data: insertedChallenges, error: insertError } = await supabase
      .from('challenges')
      .insert(challengesToInsert)
      .select();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save challenges: ${insertError.message}`);
    }

    console.log(`Successfully generated and saved ${insertedChallenges.length} challenge(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        challenges: insertedChallenges,
        message: `Generated ${insertedChallenges.length} ${type} challenge(s)` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-challenge function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});