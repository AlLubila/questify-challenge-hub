import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const EDITORIAL_FALLBACKS = [
  { title: "Pocket-Sized Movie Set", description: "Build a dramatic movie set inside a shoebox, then film a 7-second camera move that makes it look life-sized. Reveal the shoebox only in the final second.", prize: "$250 Creator Prize", difficulty: "medium", points: 450 },
  { title: "Same Object, Three Worlds", description: "Make one everyday object star in three completely different mini-scenes. Match-cut between them on the beat and show all three setups at the end.", prize: "$250 Creator Prize", difficulty: "medium", points: 450 },
  { title: "The Impossible Hand-Off", description: "Pass a harmless household object out of frame, then catch it in a surprising new place, outfit, or scale. Keep the hand-off seamless and invite a friend to remix it.", prize: "$300 Remix Prize", difficulty: "easy", points: 400 },
  { title: "Tiny Problem, Epic Trailer", description: "Turn a tiny everyday inconvenience into a 10-second blockbuster trailer using only household props, bold sound, and exaggerated acting.", prize: "$250 Creator Prize", difficulty: "easy", points: 400 },
  { title: "Color Chase", description: "Choose one bold color and find five unexpected objects that match it. Film a fast visual chase where each object leads to the next.", prize: "$200 Color Hunt", difficulty: "easy", points: 350 },
  { title: "Reverse-Reveal Recipe", description: "Start with a funny finished creation, then show the process entirely in reverse so viewers guess what it is before the last cut.", prize: "$250 Reverse Cut", difficulty: "medium", points: 450 },
  { title: "One-Room Time Travel", description: "Transform one corner of your room into three eras using only lighting, clothes, paper, and objects you already own. Use the same camera angle each time.", prize: "$300 Time Warp", difficulty: "hard", points: 600 },
  { title: "Shadow Has Other Plans", description: "Create a short scene where your shadow appears to disobey you. Use practical lighting and editing; reveal the trick after the punchline.", prize: "$300 Shadow Story", difficulty: "hard", points: 600 },
  { title: "Snack Architecture", description: "Build the most dramatic tiny landmark from safe snack foods, film a heroic reveal, then show the inevitable first bite.", prize: "$200 Snack Build", difficulty: "easy", points: 350 },
  { title: "Outfit From Another Object", description: "Style an outfit inspired by a completely unrelated household object without damaging it. End with a side-by-side runway reveal.", prize: "$250 Style Remix", difficulty: "medium", points: 450 },
  { title: "The 5-Second Museum", description: "Curate three ordinary objects as priceless museum pieces. Give each one a dramatic one-second reveal and one absurdly serious label spoken aloud.", prize: "$200 Mini Museum", difficulty: "easy", points: 350 },
  { title: "Frame-to-Frame Escape", description: "Film yourself escaping from one photo frame, phone screen, or paper window into another. Keep it playful, safe, and understandable without captions.", prize: "$300 Portal Cut", difficulty: "hard", points: 600 },
] as const;

const weeklyFallback = () => {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return EDITORIAL_FALLBACKS[week % EDITORIAL_FALLBACKS.length];
};

serve(async (req) => {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!url || !serviceKey) throw new Error("Server configuration missing");

    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: settings } = await db.from("challenge_automation_settings").select("enabled,creative_brief,weekday,hour_utc").eq("id", true).single();
    if (!settings?.enabled) return new Response(JSON.stringify({ skipped: true, reason: "Automation is disabled" }), { headers: { "Content-Type": "application/json" } });

    const now = new Date();
    const isScheduledHour = now.getUTCDay() === settings.weekday && now.getUTCHours() === settings.hour_utc;
    if (!isScheduledHour) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: authData } = await db.auth.getUser(token);
      const userId = authData.user?.id;
      const { data: role } = userId
        ? await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
        : { data: null };
      if (!role) return new Response(JSON.stringify({ error: "Admin access required outside the scheduled hour" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    const { data: existing } = await db.from("challenges").select("id").eq("challenge_type", "weekly").eq("is_ai_generated", true).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1);
    if (existing?.length) return new Response(JSON.stringify({ skipped: true, reason: "Weekly challenge already exists" }), { headers: { "Content-Type": "application/json" } });

    const { data: recent } = await db.from("challenges").select("title,description").order("created_at", { ascending: false }).limit(30);
    let challenge = weeklyFallback();
    if (aiKey) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: `You are A Challenge's senior Gen Z challenge editor. Select one exceptional, safe, phone-first weekly creator mission with a surprising visual mechanic and genuine TikTok remix potential. It must be instantly understandable, inexpensive, inclusive, and avoid stunts, harassment, strangers, copyrighted characters, engagement bait, and generic photo prompts. Standing editor brief: ${settings.creative_brief}. Do not repeat these recent ideas:\n${(recent ?? []).map((x) => `${x.title}: ${x.description}`).join("\n")}` }, { role: "user", content: "Return the single strongest publish-ready weekly mission after internally comparing at least five concepts." }],
        tools: [{ type: "function", function: { name: "create_challenge", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, prize: { type: "string" }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, points: { type: "number" } }, required: ["title", "description", "prize", "difficulty", "points"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "create_challenge" } },
      }),
      });
      if (response.ok) {
        const payload = await response.json();
        const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) challenge = JSON.parse(args);
      }
    }
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
