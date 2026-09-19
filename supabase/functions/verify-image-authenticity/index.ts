import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireUser } from "../_shared/security.ts";
import { advisoryModerationState, type AuthenticityAnalysis } from "../_shared/authenticity.ts";
import { canRunOwnerAnalysis } from "../_shared/moderation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!gatewayKey || !supabaseUrl || !serviceKey) throw new Error("Server configuration missing");

    const { submissionId } = await req.json();
    if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
      return json(req, { error: "Valid submission ID is required" }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: submission, error: submissionError } = await service
      .from("submissions")
      .select("id,user_id,content_url,status,moderation_status")
      .eq("id", submissionId)
      .single();
    if (submissionError || !submission) return json(req, { error: "Submission not found" }, 404);

    const { data: staffRoles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);
    const isStaff = Boolean(staffRoles?.length);
    if (submission.user_id !== user.id && !isStaff) return json(req, { error: "Forbidden" }, 403);
    if (submission.status !== "pending") return json(req, { error: "Submission is not pending" }, 409);
    if (!canRunOwnerAnalysis(submission.moderation_status, isStaff)) {
      return json(req, { error: "Flagged submissions require staff review" }, 409);
    }

    const contentUrl = new URL(submission.content_url);
    const projectUrl = new URL(supabaseUrl);
    const expectedPrefix = `/storage/v1/object/public/submissions/${submission.user_id}/`;
    if (contentUrl.origin !== projectUrl.origin || !contentUrl.pathname.startsWith(expectedPrefix)) {
      return json(req, { error: "Submission media URL is invalid" }, 400);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Analyze image authenticity. Return only JSON with isAuthentic boolean, confidence 0-100, reason string, and type original|ai_generated|stock_photo|uncertain. Use uncertain when evidence is insufficient.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Determine whether this is an original real-world photo rather than generated or stock media." },
              { type: "image_url", image_url: { url: submission.content_url } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });
    if (!response.ok) throw new Error(`Image analysis failed (${response.status})`);

    const aiResponse = await response.json();
    const text = String(aiResponse.choices?.[0]?.message?.content ?? "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Image analysis returned an invalid response");
    const raw = JSON.parse(match[0]) as Partial<AuthenticityAnalysis>;
    const allowedTypes = new Set(["original", "ai_generated", "stock_photo", "uncertain"]);
    const analysis: AuthenticityAnalysis = {
      isAuthentic: raw.isAuthentic === true,
      confidence: Math.max(0, Math.min(100, Number(raw.confidence) || 0)),
      reason: String(raw.reason ?? "No explanation provided").slice(0, 500),
      type: allowedTypes.has(String(raw.type)) ? raw.type as AuthenticityAnalysis["type"] : "uncertain",
    };

    // AI analysis is advisory only. A staff member must perform the separate
    // reward-bearing transition to approved.
    const { status, moderationStatus } = advisoryModerationState(analysis);

    let updateQuery = service
      .from("submissions")
      .update({
        status,
        moderation_status: moderationStatus,
        moderation_flags: { ...analysis, verified: true, verified_at: new Date().toISOString() },
        moderated_at: null,
        moderated_by: null,
      })
      .eq("id", submission.id)
      .eq("status", "pending")
      .eq("content_url", submission.content_url);
    updateQuery = submission.moderation_status === null
      ? updateQuery.is("moderation_status", null)
      : updateQuery.eq("moderation_status", submission.moderation_status);
    const { data: updated, error: updateError } = await updateQuery.select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json(req, { error: "Submission changed during analysis; retry with the current version" }, 409);

    return json(req, { success: true, analysis, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    console.error("verify-image-authenticity failed", { message });
    return json(req, { error: message }, status);
  }
});
