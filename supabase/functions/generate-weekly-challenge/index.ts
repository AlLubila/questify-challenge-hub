import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const expectedSecret = Deno.env.get("QUESTIFY_AUTOMATION_SECRET");
  if (!expectedSecret || req.headers.get("x-automation-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!url || !serviceKey || !aiKey) throw new Error("Server configuration missing");

    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: settings } = await db.from("challenge_automation_settings").select("enabled,creative_brief").eq("id", true).single();
    if (!settings?.enabled) return new Response(JSON.stringify({ skipped: true, reason: "Automation is disabled" }), { headers: { "Content-Type": "application/json" } });
    const { data: existing } = await db.from("challenges").select("id").eq("challenge_type", "weekly").eq("is_ai_generated", true).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1);
    if (existing?.length) return new Response(JSON.stringify({ skipped: true, reason: "Weekly challenge already exists" }), { headers: { "Content-Type": "application/json" } });

    const { data: recent } = await db.from("challenges").select("title,description").order("created_at", { ascending: false }).limit(30);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: `You are Questify's senior Gen Z challenge editor. Select one exceptional, safe, phone-first weekly creator mission with a surprising visual mechanic and genuine TikTok remix potential. It must be instantly understandable, inexpensive, inclusive, and avoid stunts, harassment, strangers, copyrighted characters, engagement bait, and generic photo prompts. Standing editor brief: ${settings.creative_brief}. Do not repeat these recent ideas:\n${(recent ?? []).map((x) => `${x.title}: ${x.description}`).join("\n")}` }, { role: "user", content: "Return the single strongest publish-ready weekly mission after internally comparing at least five concepts." }],
        tools: [{ type: "function", function: { name: "create_challenge", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, prize: { type: "string" }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, points: { type: "number" } }, required: ["title", "description", "prize", "difficulty", "points"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "create_challenge" } },
      }),
    });
    if (!response.ok) throw new Error(`AI generation failed: ${response.status}`);
    const payload = await response.json();
    const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no challenge");
    const challenge = JSON.parse(args);
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 86400000);
    const { data: inserted, error } = await db.from("challenges").insert({ ...challenge, challenge_type: "weekly", is_ai_generated: true, start_date: start.toISOString(), end_date: end.toISOString(), participants_count: 0, publish_status: "published" }).select().single();
    if (error) throw error;

    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: `Create a fun 16:9 editorial illustration specifically depicting this challenge: "${challenge.title}". ${challenge.description}. Bold flat screenprint and cut-paper collage, playful surreal action, chunky ink outlines, quest lime, sky blue, coral, warm paper and near-black. Clear at thumbnail size. Subtle paper grain. No photorealism, gradients, glow, 3D, text, letters, logos, watermark, or generic stock imagery.` }],
          modalities: ["image", "text"],
        }),
      });
      if (imageResponse.ok) {
        const imagePayload = await imageResponse.json();
        const dataUrl = imagePayload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (dataUrl) {
          const binary = atob(dataUrl.replace(/^data:image\/\w+;base64,/, ""));
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          const path = `${inserted.id}/${Date.now()}.png`;
          const { error: uploadError } = await db.storage.from("challenge-covers").upload(path, bytes, { contentType: "image/png", upsert: true });
          if (!uploadError) {
            const publicUrl = db.storage.from("challenge-covers").getPublicUrl(path).data.publicUrl;
            await db.from("challenges").update({ image_url: publicUrl }).eq("id", inserted.id);
            inserted.image_url = publicUrl;
          }
        }
      }
    } catch (imageError) {
      console.error("Weekly challenge artwork failed; client fallback will be used", imageError);
    }
    return new Response(JSON.stringify({ success: true, challenge: inserted }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Generation failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
