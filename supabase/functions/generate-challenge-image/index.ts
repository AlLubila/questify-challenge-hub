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

    const { challengeId, title, description } = await req.json();

    if (!challengeId || !title) {
      throw new Error("Challenge ID and title are required");
    }

    console.log(`Generating image for challenge: ${title}`);

    // Generate image using Lovable AI (Gemini image generation)
    const imagePrompt = `A vibrant, eye-catching 16:9 social media challenge cover image for: "${title}". ${description || ''}. Style: Modern, colorful, Gen Z aesthetic, suitable for a viral social media challenge. No text in the image. Ultra high resolution.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    // Extract base64 image from response
    const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      throw new Error("No image generated in response");
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileName = `challenge-covers/${challengeId}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(fileName, bytes, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("submissions")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update challenge with new image URL
    const { error: updateError } = await supabase
      .from("challenges")
      .update({ image_url: imageUrl })
      .eq("id", challengeId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update challenge: ${updateError.message}`);
    }

    console.log(`Successfully generated and saved image for challenge ${challengeId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        message: "Challenge image generated successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-challenge-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
