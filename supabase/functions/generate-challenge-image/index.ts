import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireRole, requireUser } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const user = await requireUser(req);
    await requireRole(user.id, ["admin"]);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const { challengeId } = await req.json();

    if (typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId)) {
      return json(req, { error: "Valid challenge ID is required" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("id,title,description")
      .eq("id", challengeId)
      .single();
    if (challengeError || !challenge) return json(req, { error: "Challenge not found" }, 404);
    const { title, description } = challenge;

    console.log(`Generating image for challenge: ${title}`);

    // Generate image using Lovable AI (Gemini image generation)
    const imagePrompt = `Create a fun 16:9 editorial illustration that specifically depicts this creative mission: "${title}". Brief: ${description || ''}.

Art direction: bold flat screenprint and cut-paper collage, playful surreal situation, chunky ink outlines, limited palette of quest lime, sky blue, coral, warm paper, and near-black. Dynamic composition that communicates the challenge instantly at thumbnail size. Add subtle paper grain only. No photorealism, no gradients, no glow, no 3D render, no text, no letters, no logos, no watermark, no generic stock imagery.`;

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
    const fileName = `${challengeId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("challenge-covers")
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
      .from("challenge-covers")
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
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-challenge-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
