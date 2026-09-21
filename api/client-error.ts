export const config = { runtime: "edge" };

const MAX_BODY_BYTES = 16_000;
const MAX_FIELD_LENGTH = 4_000;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const sanitize = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(EMAIL_PATTERN, "[email removed]").slice(0, MAX_FIELD_LENGTH);
  }
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
};

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (!host || !origin || new URL(origin).host !== host) {
    return new Response("Forbidden", { status: 403 });
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return new Response("Invalid payload", { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.error(JSON.stringify({
    level: "error",
    message: "client_error",
    requestId: request.headers.get("x-vercel-id"),
    payload: sanitize(payload),
  }));

  return new Response(null, { status: 204 });
}
