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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("AI_GATEWAY_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY/AI_GATEWAY_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const { imageUrl, submissionId } = await req.json();

    if (!imageUrl || !submissionId) {
      throw new Error("Image URL and submission ID are required");
    }

    console.log(`Verifying image authenticity for submission: ${submissionId}`);

    // Use Gemini to analyze the image for AI generation or internet sourcing
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
            content: `You are an expert image authenticity analyzer. Your job is to determine if an image appears to be:
1. AI-generated (by DALL-E, Midjourney, Stable Diffusion, etc.)
2. A stock photo or taken from the internet
3. An original, authentic photo taken by a real person

Look for these AI-generation signs:
- Unnatural smoothness or perfect skin
- Weird fingers, hands, or limbs
- Inconsistent lighting or shadows
- Text that doesn't make sense
- Unrealistic reflections
- Perfect symmetry that's unnatural
- Telltale AI artifacts

Look for these stock/internet photo signs:
- Professional studio lighting
- Watermarks (even removed ones leave traces)
- Too perfect composition
- Generic, staged appearance
- Common stock photo poses

Respond with a JSON object containing:
- isAuthentic: boolean (true if likely original, false if likely AI or stock)
- confidence: number (0-100, how confident you are)
- reason: string (brief explanation)
- type: "original" | "ai_generated" | "stock_photo" | "uncertain"`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and determine if it appears to be an original photo taken by a real person, or if it seems AI-generated or taken from the internet. Be strict in your analysis."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`Failed to analyze image: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("AI Analysis:", analysisText);

    // Try to parse JSON from the response
    let analysis;
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Default to uncertain if we can't parse
        analysis = {
          isAuthentic: true,
          confidence: 50,
          reason: "Unable to parse analysis result",
          type: "uncertain"
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysis = {
        isAuthentic: true,
        confidence: 50,
        reason: "Unable to parse analysis result",
        type: "uncertain"
      };
    }

    // Update submission with verification results
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const verificationFlags = {
      verified: true,
      is_authentic: analysis.isAuthentic,
      confidence: analysis.confidence,
      type: analysis.type,
      reason: analysis.reason,
      verified_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        moderation_flags: verificationFlags,
        moderation_status: analysis.isAuthentic ? "approved" : "flagged",
        status: analysis.isAuthentic ? "approved" : "rejected",
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Update error:", updateError);
      // Don't throw - we still want to return the analysis
    }

    console.log(`Verification complete for submission ${submissionId}: ${analysis.type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        message: analysis.isAuthentic 
          ? "Image appears to be authentic" 
          : `Image flagged as potentially ${analysis.type}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-image-authenticity function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
