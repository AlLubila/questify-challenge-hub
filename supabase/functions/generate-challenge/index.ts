import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check if user is admin
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      throw new Error("Failed to check user role");
    }

    const isAdmin = userRoles?.some(r => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { type = 'daily', count = 1 } = await req.json();

    // Validate input
    if (!type || !["daily", "weekly"].includes(type)) {
      throw new Error("Invalid challenge type. Must be 'daily' or 'weekly'");
    }
    if (typeof count !== "number" || count < 1 || count > 10) {
      throw new Error("Invalid count. Must be between 1 and 10");
    }

    console.log(`Generating ${count} ${type} challenge(s)...`);

    const { data: recentChallenges } = await supabase
      .from("challenges")
      .select("title,description")
      .order("created_at", { ascending: false })
      .limit(30);

    const recentIdeas = (recentChallenges ?? []).map((item) => `${item.title}: ${item.description}`).join("\n");

    const systemPrompt = `You are Questify's senior challenge editor. Generate ${type} creator missions for a young audience. Every mission must be original, safe, cheap to attempt, visually obvious in the first second, and easy to explain in one TikTok caption.

Editorial rules:
- Build around a surprising constraint, transformation, social remix, or playful real-world observation—not a generic photo prompt.
- Give the creator a strong visual hook, a clear action, and room for personal interpretation.
- Make it achievable with a phone in the allotted time; never require trespassing, dangerous stunts, harassment, deception, or expensive equipment.
- Avoid engagement bait, brand impersonation, copyrighted characters, humiliation, pranks on strangers, and tired ideas such as dance challenges, golden-hour portraits, or "show your day".
- Titles must be memorable, natural, and under 60 characters. Descriptions must explain what to make and include the shareable twist in 100–200 characters.
- Vary the creative mechanic and difficulty. Do not repeat or lightly rename any recent challenge listed below.

Recent challenges to avoid:
${recentIdeas || "None yet."}

IMPORTANT: Only use NON-MONETARY rewards that feel exciting and valuable:
🏅 Exclusive badges or titles (e.g., "Trend Setter", "Legend", "Viral Star", "Challenge Master")
⚡ XP multipliers or point boosts (e.g., "2x XP Boost", "500 Bonus Points")
🚀 Ranking boosts or leaderboard highlights (e.g., "Featured on Leaderboard", "Top Creator Spotlight")
🌈 Profile effects or customizations (e.g., "Gold Profile Frame", "Animated Avatar", "Rainbow Username Effect")
🎯 Exclusive challenge access (e.g., "Early Access to Premium Challenges", "VIP Challenge Pass")

Each challenge should feel like a real editorial commission with genuine viral potential, not AI-generated filler.`;

    const userPrompt = `Create ${count} publish-ready ${type} mission(s). Internally evaluate at least five concepts for originality, visual clarity, safety, replayability, and TikTok shareability; return only the strongest non-duplicate concept(s).`;

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
      created_by: user.id,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      participants_count: 0,
      publish_status: "published",
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

    // Generate images for each challenge asynchronously
    for (const challenge of insertedChallenges) {
      try {
        const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-challenge-image`, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            challengeId: challenge.id,
            title: challenge.title,
            description: challenge.description
          }),
        });
        
        if (!imageResponse.ok) {
          console.error(`Failed to generate image for challenge ${challenge.id}`);
        } else {
          console.log(`Image generated for challenge ${challenge.id}`);
        }
      } catch (imageError) {
        console.error(`Error generating image for challenge ${challenge.id}:`, imageError);
        // Continue with other challenges even if one image fails
      }
    }

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
