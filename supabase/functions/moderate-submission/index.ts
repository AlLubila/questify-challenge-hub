import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, caption, contentUrl } = await req.json();
    
    // Validate inputs
    if (!submissionId || typeof submissionId !== 'string' || !submissionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error("Valid submission ID (UUID) is required");
    }
    
    if (caption && typeof caption !== 'string') {
      throw new Error("Caption must be a string");
    }
    
    if (caption && caption.length > 1000) {
      throw new Error("Caption exceeds maximum length of 1000 characters");
    }
    
    if (contentUrl && typeof contentUrl !== 'string') {
      throw new Error("Content URL must be a string");
    }
    
    if (contentUrl && contentUrl.length > 2000) {
      throw new Error("Content URL exceeds maximum length");
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Moderating submission:", submissionId);

    // Use Lovable AI to analyze the caption for inappropriate content
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a content moderation AI. Analyze submissions for inappropriate content including hate speech, violence, explicit content, harassment, spam, or misleading information. Respond with a JSON object containing 'isFlagged' (boolean), 'confidence' (0-1), 'categories' (array of strings), and 'reason' (string)."
          },
          {
            role: "user",
            content: `Analyze this submission caption for moderation:\n\nCaption: ${caption || "No caption provided"}\nContent URL: ${contentUrl}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "flag_content",
              description: "Flag content as inappropriate",
              parameters: {
                type: "object",
                properties: {
                  isFlagged: { type: "boolean" },
                  confidence: { type: "number" },
                  categories: {
                    type: "array",
                    items: { type: "string" }
                  },
                  reason: { type: "string" }
                },
                required: ["isFlagged", "confidence", "categories", "reason"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "flag_content" } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("AI rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits depleted. Please add funds to your workspace.");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No moderation result from AI");
    }

    const moderationResult = JSON.parse(toolCall.function.arguments);
    console.log("Moderation result:", moderationResult);

    // Update submission with moderation results
    const newStatus = moderationResult.isFlagged ? 'flagged' : 'pending';
    
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        moderation_status: newStatus,
        moderation_flags: moderationResult,
      })
      .eq('id', submissionId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        moderation_status: newStatus,
        moderation_result: moderationResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    } catch (error) {
    console.error('Error in moderate-submission function:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});