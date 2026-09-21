type ErrorContext = Record<string, unknown>;

const MAX_TEXT_LENGTH = 4_000;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const sanitize = (value: unknown) => String(value ?? "")
  .replace(EMAIL_PATTERN, "[email removed]")
  .slice(0, MAX_TEXT_LENGTH);

export const reportClientError = (error: unknown, context: ErrorContext = {}) => {
  if (!import.meta.env.PROD || typeof window === "undefined") return;

  const normalized = error instanceof Error ? error : new Error(String(error));
  const payload = JSON.stringify({
    message: sanitize(normalized.message),
    name: sanitize(normalized.name),
    stack: sanitize(normalized.stack),
    page: window.location.pathname,
    userAgent: sanitize(window.navigator.userAgent),
    context: Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, sanitize(value)]),
    ),
    timestamp: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/client-error", new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }

  void fetch("/api/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
};

export const installGlobalErrorReporting = () => {
  if (!import.meta.env.PROD || typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    reportClientError(event.error ?? event.message, { source: "window-error" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, { source: "unhandled-rejection" });
  });
};
