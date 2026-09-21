import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const WEEKLY_BATCH_SIZE = 5;

type ChallengeDraft = {
  title: string;
  description: string;
  prize: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
};

const EDITORIAL_FALLBACKS: ChallengeDraft[] = [
  { title: "Pocket-Sized Movie Set", description: "Build a dramatic movie set inside a shoebox, then film a 7-second camera move that makes it look life-sized. Reveal the shoebox only in the final second.", prize: "450 points + Set Builder badge", difficulty: "medium", points: 450 },
  { title: "Same Object, Three Worlds", description: "Make one everyday object star in three completely different mini-scenes. Match-cut between them on the beat and show all three setups at the end.", prize: "450 points + World Hopper badge", difficulty: "medium", points: 450 },
  { title: "The Impossible Hand-Off", description: "Pass a harmless household object out of frame, then catch it in a surprising new place, outfit, or scale. Keep the hand-off seamless and invite a friend to remix it.", prize: "400 points + Remix Relay badge", difficulty: "easy", points: 400 },
  { title: "Tiny Problem, Epic Trailer", description: "Turn a tiny everyday inconvenience into a 10-second blockbuster trailer using only household props, bold sound, and exaggerated acting.", prize: "400 points + Trailer Hero badge", difficulty: "easy", points: 400 },
  { title: "Color Chase", description: "Choose one bold color and find five unexpected objects that match it. Film a fast visual chase where each object leads to the next.", prize: "350 points + Color Scout badge", difficulty: "easy", points: 350 },
  { title: "Reverse-Reveal Recipe", description: "Start with a funny finished creation, then show the process entirely in reverse so viewers guess what it is before the last cut.", prize: "450 points + Reverse Cut badge", difficulty: "medium", points: 450 },
  { title: "One-Room Time Travel", description: "Transform one corner of your room into three eras using only lighting, clothes, paper, and objects you already own. Use the same camera angle each time.", prize: "600 points + Time Warp badge", difficulty: "hard", points: 600 },
  { title: "Shadow Has Other Plans", description: "Create a short scene where your shadow appears to disobey you. Use practical lighting and editing; reveal the trick after the punchline.", prize: "600 points + Shadow Director badge", difficulty: "hard", points: 600 },
  { title: "Snack Architecture", description: "Build the most dramatic tiny landmark from safe snack foods, film a heroic reveal, then show the inevitable first bite.", prize: "350 points + Snack Architect badge", difficulty: "easy", points: 350 },
  { title: "Outfit From Another Object", description: "Style an outfit inspired by a completely unrelated household object without damaging it. End with a side-by-side runway reveal.", prize: "450 points + Style Remix badge", difficulty: "medium", points: 450 },
  { title: "The 5-Second Museum", description: "Curate three ordinary objects as priceless museum pieces. Give each one a dramatic one-second reveal and one absurdly serious label spoken aloud.", prize: "350 points + Mini Curator badge", difficulty: "easy", points: 350 },
  { title: "Frame-to-Frame Escape", description: "Film yourself escaping from one photo frame, phone screen, or paper window into another. Keep it playful, safe, and understandable without captions.", prize: "600 points + Portal Cutter badge", difficulty: "hard", points: 600 },
];

const MONEY_REWARD_PATTERN = /(?:[$€£]\s?\d|\d[\d.,]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b|\bcash\b)/i;

const sanitizeChallenge = (draft: ChallengeDraft): ChallengeDraft => {
  const points = Number.isFinite(draft.points) ? Math.max(200, Math.min(1000, Math.round(draft.points))) : 400;
  return {
    ...draft,
    points,
    prize: !draft.prize || MONEY_REWARD_PATTERN.test(draft.prize)
      ? `${points} points + Weekly Spotlight badge`
      : draft.prize,
  };
};

const weeklyFallbacks = (count: number, excludedTitles: Set<string>) => {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const available = EDITORIAL_FALLBACKS.filter((item) => !excludedTitles.has(item.title.toLowerCase()));
  const source = available.length >= count ? available : EDITORIAL_FALLBACKS;
  return Array.from({ length: count }, (_, index) => source[(week + index) % source.length]);
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

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: existing } = await db.from("challenges").select("id,title").eq("challenge_type", "weekly").eq("is_ai_generated", true).gte("created_at", sevenDaysAgo);
    const missingCount = Math.max(0, WEEKLY_BATCH_SIZE - (existing?.length ?? 0));
    if (missingCount === 0) return new Response(JSON.stringify({ skipped: true, reason: "Weekly batch already contains five challenges" }), { headers: { "Content-Type": "application/json" } });

    const { data: recent } = await db.from("challenges").select("title,description").order("created_at", { ascending: false }).limit(30);
    const excludedTitles = new Set((recent ?? []).map((item) => item.title.toLowerCase()));
    let challenges = weeklyFallbacks(missingCount, excludedTitles);

    if (aiKey) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are A Challenge's senior Gen Z challenge editor. Create exceptional, safe, phone-first weekly creator missions with surprising visual mechanics and genuine TikTok remix potential. Every mission must be instantly understandable, inexpensive, inclusive, and avoid stunts, harassment, strangers, copyrighted characters, engagement bait, and generic photo prompts. Rewards must be strictly non-cash points, badges, profile recognition, or clearly identified partner rewards—never money, currency, cash, gift cards, or withdrawals. Standing editor brief: ${settings.creative_brief}. Do not repeat these recent ideas:\n${(recent ?? []).map((x) => `${x.title}: ${x.description}`).join("\n")}` },
            { role: "user", content: `Return exactly ${missingCount} distinct publish-ready weekly missions after internally comparing multiple concepts for each slot.` },
          ],
          tools: [{ type: "function", function: { name: "create_challenges", parameters: { type: "object", properties: { challenges: { type: "array", minItems: missingCount, maxItems: missingCount, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, prize: { type: "string", description: "A non-cash reward made of points, a badge, profile recognition, or a clearly identified partner reward" }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, points: { type: "number" } }, required: ["title", "description", "prize", "difficulty", "points"], additionalProperties: false } } }, required: ["challenges"], additionalProperties: false } } }],
          tool_choice: { type: "function", function: { name: "create_challenges" } },
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          const generated = JSON.parse(args).challenges;
          if (Array.isArray(generated) && generated.length === missingCount) challenges = generated.map(sanitizeChallenge);
        }
      }
    }

    const start = new Date();
    const end = new Date(start.getTime() + 7 * 86400000);
    const rows = challenges.map((challenge) => ({
      ...sanitizeChallenge(challenge),
      challenge_type: "weekly",
      is_ai_generated: true,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      participants_count: 0,
      publish_status: "published",
    }));
    const { data: inserted, error } = await db.from("challenges").insert(rows).select();
    if (error) throw error;

    if (aiKey) {
      for (const challenge of inserted ?? []) {
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
              const path = `${challenge.id}/${Date.now()}.png`;
              const { error: uploadError } = await db.storage.from("challenge-covers").upload(path, bytes, { contentType: "image/png", upsert: true });
              if (!uploadError) {
                const publicUrl = db.storage.from("challenge-covers").getPublicUrl(path).data.publicUrl;
                await db.from("challenges").update({ image_url: publicUrl }).eq("id", challenge.id);
                challenge.image_url = publicUrl;
              }
            }
          }
        } catch (imageError) {
          console.error("Weekly challenge artwork failed; client fallback will be used", imageError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, created: inserted?.length ?? 0, challenges: inserted }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Generation failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
