import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, json, requireUser } from "../_shared/security.ts";
import { canRunOwnerAnalysis } from "../_shared/moderation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!gatewayKey || !url || !serviceKey) throw new Error("Server configuration missing");

    const { submissionId } = await req.json();
    if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
      return json(req, { error: "Valid submission ID is required" }, 400);
    }

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: submission, error } = await service
      .from("submissions")
      .select("id,user_id,caption,content_url,status,moderation_status")
      .eq("id", submissionId)
      .single();
    if (error || !submission) return json(req, { error: "Submission not found" }, 404);

    const { data: roles } = await service.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "moderator"]);
    const isStaff = Boolean(roles?.length);
    if (submission.user_id !== user.id && !isStaff) return json(req, { error: "Forbidden" }, 403);
    if (submission.status !== "pending") return json(req, { error: "Submission is not pending" }, 409);
    if (!canRunOwnerAnalysis(submission.moderation_status, isStaff)) {
      return json(req, { error: "Flagged submissions require staff review" }, 409);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Moderate for hate, violence, explicit content, harassment, spam, and deception. Use the flag_content tool." },
          { role: "user", content: `Caption: ${String(submission.caption ?? "").slice(0, 1000)}\nMedia URL host: ${new URL(submission.content_url).host}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "flag_content",
            description: "Return a bounded moderation decision",
            parameters: {
              type: "object",
              properties: {
                isFlagged: { type: "boolean" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                categories: { type: "array", items: { type: "string" }, maxItems: 10 },
                reason: { type: "string", maxLength: 500 },
              },
              required: ["isFlagged", "confidence", "categories", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "flag_content" } },
      }),
    });
    if (!response.ok) throw new Error(`Moderation service failed (${response.status})`);

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (typeof args !== "string") throw new Error("Moderation service returned an invalid response");
    const result = JSON.parse(args);
    const flags = {
      isFlagged: result.isFlagged === true,
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
      categories: Array.isArray(result.categories) ? result.categories.slice(0, 10).map(String) : [],
      reason: String(result.reason ?? "").slice(0, 500),
      checked_at: new Date().toISOString(),
    };

    let updateQuery = service
      .from("submissions")
      .update({ moderation_status: flags.isFlagged ? "flagged" : "pending_review", moderation_flags: flags })
      .eq("id", submission.id)
      .eq("status", "pending")
      .eq("content_url", submission.content_url);
    updateQuery = submission.moderation_status === null
      ? updateQuery.is("moderation_status", null)
      : updateQuery.eq("moderation_status", submission.moderation_status);
    updateQuery = submission.caption === null
      ? updateQuery.is("caption", null)
      : updateQuery.eq("caption", submission.caption);
    const { data: updated, error: updateError } = await updateQuery.select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json(req, { error: "Submission changed during analysis; retry with the current version" }, 409);

    return json(req, { success: true, moderation_status: flags.isFlagged ? "flagged" : "pending_review", moderation_result: flags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("moderate-submission failed", { message });
    return json(req, { error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
