// Shared request hardening for S2D mutation routes.
// Keep this module dependency-free so the checks are usable in both Next.js
// route handlers and focused Node tests.

const PROTOTYPE_POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_SCAN_DEPTH = 64;
const MAX_SCAN_NODES = 10_000;

/**
 * Reject prototype-manipulation keys anywhere in a parsed JSON payload.
 * Access property descriptors rather than values so a non-JSON caller cannot
 * trigger an accessor while this guard is walking an object.
 */
export function hasPrototypePollution(value: unknown): boolean {
  const seen = new WeakSet<object>();
  let visited = 0;

  function walk(current: unknown, depth: number): boolean {
    if (!current || typeof current !== "object") return false;
    if (depth > MAX_SCAN_DEPTH || ++visited > MAX_SCAN_NODES) return true;
    if (seen.has(current)) return false;
    seen.add(current);

    for (const key of Object.keys(current)) {
      if (PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())) return true;
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor && "value" in descriptor && walk(descriptor.value, depth + 1)) return true;
    }
    return false;
  }

  return walk(value, 0);
}

const SECRET_ENV_KEYS = [
  "APIFY_TOKEN",
  "S2D_ALERT_WHATSAPP_TOKEN",
  "S2D_ALERT_EMAIL_TOKEN",
  "S2D_BURP_DAST_API_KEY",
  "S2D_NETWORK_EVIDENCE_PRIVACY_KEY",
  "S2D_APIFY_WEBHOOK_SHARED_SECRET",
  "TIKTOK_API_KEY",
  "S2D_AUTH_TOKEN",
] as const;

/** Redact likely credential material before returning provider errors. */
export function sanitizeS2dError(error: unknown, fallback = "S2D request failed"): string {
  const raw = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : fallback;

  let message = String(raw || fallback)
    .replace(/apify_api_[A-Za-z0-9_-]+/gi, "[REDACTED_TOKEN]")
    .replace(/bearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [REDACTED]")
    .replace(/(authorization\s*[:=]\s*)[^,;\s]+/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|api[_-]?key|access[_-]?token)=)[^&\s]+/gi, "$1[REDACTED]");

  for (const key of SECRET_ENV_KEYS) {
    const secret = process.env[key];
    if (secret && secret.length >= 4) message = message.split(secret).join(`[REDACTED:${key}]`);
  }

  return message.replace(/[\r\n\t]+/g, " ").slice(0, 220);
}

/** Return true only when a trustworthy Content-Length exceeds the route cap. */
export function requestBodyTooLarge(contentLength: string | null, maxBytes: number): boolean {
  if (!contentLength) return false;
  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes > maxBytes;
}
