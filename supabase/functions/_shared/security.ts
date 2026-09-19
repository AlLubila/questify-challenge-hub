import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const localOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "capacitor://localhost",
  "http://localhost",
]);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = localOrigins.has(origin) || configured.includes(origin);

  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export async function requireUser(req: Request): Promise<User> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Supabase configuration missing");

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(userId: string, roles: Array<"admin" | "moderator">): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Supabase configuration missing");

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roles);
  if (error || !data?.length) throw new Error("Forbidden");
}

export function safeOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  const allowed = corsHeaders(req)["Access-Control-Allow-Origin"];
  if (!origin || !allowed) throw new Error("Origin is not allowed");
  return origin;
}
