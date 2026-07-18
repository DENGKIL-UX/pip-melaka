// src/lib/rate-limiter.ts
// PIP-MLK Rate Limiter — in-memory fixed-window limiter.
// Security-01: protect API routes from brute-force / scraping / DoS.
//
// Trade-off note: this is a single-instance in-memory limiter. For multi-node
// deployments, swap the Map for Redis (or Upstash) — the public API stays
// the same (rateLimit → RateLimitResult).

// ---------------------------------------------------------------------------
// Buckets — keyed by `${routeGroup}:${identifier}`.
// We expire stale buckets lazily on every check to keep memory bounded.
// ---------------------------------------------------------------------------

interface Bucket {
  windowStart: number; // unix ms
  count: number;
}

const buckets = new Map<string, Bucket>();

// Periodically sweep stale buckets. Runs on every rateLimit() call but only
// does the full sweep every SWEEP_INTERVAL ms.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = 0;

function sweepStaleBuckets(now: number, windowMs: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (now - b.windowStart > windowMs) buckets.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Unique key for the caller (IP, user id, …). */
  identifier: string;
  /** Logical route group, e.g. "api:assistant" or "api:auth:login". */
  route: string;
  /** Max requests allowed per window. Default 60. */
  limit?: number;
  /** Window size in seconds. Default 60. */
  windowSeconds?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** unix seconds — when the current window resets. */
  reset: number;
  /** unix ms — when the caller may retry (only meaningful if success=false). */
  retryAfter: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fixed-window rate limit check.
 *
 * Returns `{ success: true, ... }` if the caller is within the limit, or
 * `{ success: false, retryAfter }` if they are rate-limited.
 *
 * Side-effect: increments the bucket counter if and only if the call is
 * allowed (a rejected call does NOT consume quota — that's the fixed-window
 * contract; callers who want a "leaky bucket" should re-implement).
 */
export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const limit = opts.limit ?? 60;
  const windowSeconds = opts.windowSeconds ?? 60;
  const windowMs = windowSeconds * 1000;
  const now = Date.now();

  sweepStaleBuckets(now, windowMs);

  const key = `${opts.route}:${opts.identifier}`;
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    // Start a fresh window.
    buckets.set(key, { windowStart: now, count: 1 });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor((now + windowMs) / 1000),
      retryAfter: 0,
    };
  }

  // Within the current window — check capacity.
  if (bucket.count >= limit) {
    const resetMs = bucket.windowStart + windowMs;
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.floor(resetMs / 1000),
      retryAfter: Math.ceil((resetMs - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - bucket.count,
    reset: Math.floor((bucket.windowStart + windowMs) / 1000),
    retryAfter: 0,
  };
}

/**
 * Extract the best-guess client identifier from a Next.js Request.
 *
 * Order of preference:
 *   1. x-forwarded-for (first IP) — set by Caddy / load balancer
 *   2. x-real-ip — set by Caddy
 *   3. cf-connecting-ip — set by Cloudflare
 *   4. "anonymous" fallback (all unknowns share a single bucket)
 */
export function getClientIdentifier(req: Request): string {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xrip = headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  const cfip = headers.get("cf-connecting-ip");
  if (cfip) return cfip.trim();
  return "anonymous";
}

// ---------------------------------------------------------------------------
// Preset route policies — used by middleware.ts.
// ---------------------------------------------------------------------------

export interface RateLimitPolicy {
  route: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  // Default for any /api/* route not explicitly listed.
  default: { route: "api:default", limit: 60, windowSeconds: 60 },
  // AI assistant — expensive LLM calls, tighter limit.
  assistant: { route: "api:assistant", limit: 10, windowSeconds: 60 },
  // Auth endpoints — very tight to stop credential stuffing.
  auth: { route: "api:auth", limit: 5, windowSeconds: 60 },
};

/**
 * Resolve the rate-limit policy for a given URL pathname.
 * Returns the matching policy or the default.
 */
export function resolvePolicy(pathname: string): RateLimitPolicy {
  if (pathname.startsWith("/api/assistant")) return RATE_LIMIT_POLICIES.assistant;
  if (pathname.startsWith("/api/auth")) return RATE_LIMIT_POLICIES.auth;
  return RATE_LIMIT_POLICIES.default;
}

// ===========================================================================
// Backpressure + inflight tracking — used by resilience-layer route handlers
// (e.g. the assistant route) to shed load when the in-process queue is
// overwhelmed even before the per-IP limit fires. Preserved here so the
// existing assistant/route.ts imports continue to resolve.
// ===========================================================================

const MAX_INFLIGHT = 8; // concurrent LLM calls before backpressure kicks in
const BACKPRESSURE_RETRY_SECONDS = 5;

let _inflight = 0;

/**
 * Snapshot of the in-process concurrency. When `shedLoad` is true, callers
 * should reject new requests with 429 + Retry-After so the queue can drain.
 */
export interface BackpressureResult {
  shedLoad: boolean;
  inflight: number;
  reason: string;
  retryAfterSeconds: number;
}

export function assessBackpressure(): BackpressureResult {
  if (_inflight >= MAX_INFLIGHT) {
    return {
      shedLoad: true,
      inflight: _inflight,
      reason: `inflight ${_inflight} >= ${MAX_INFLIGHT}`,
      retryAfterSeconds: BACKPRESSURE_RETRY_SECONDS,
    };
  }
  return {
    shedLoad: false,
    inflight: _inflight,
    reason: "ok",
    retryAfterSeconds: 0,
  };
}

/**
 * Wrap an async function so the global inflight counter is incremented while
 * the function is running (and decremented in a finally block). Ensures
 * backpressure's `inflight` count is accurate even if the wrapped call hangs
 * or throws.
 */
export function withInflight<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    _inflight += 1;
    try {
      return await fn(...args);
    } finally {
      _inflight = Math.max(0, _inflight - 1);
    }
  };
}
