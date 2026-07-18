// PIP-MLK API resilience — idempotency middleware for POST routes.
// Truth Above All: when a user's network blips mid-LLM-call and their client
// retries, the assistant route would otherwise fire the (expensive) LLM
// twice. An idempotency key lets the second call return the cached result
// of the first instead of re-invoking the model. Critical for any POST that
// mutates state or bills per call.

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdempotencyEntry {
  /** epoch ms when this entry expires */
  expiresAt: number;
  /** the cached response status code */
  status: number;
  /** the cached response body (already-serialized JSON) */
  body: unknown;
  /** the cached response headers (subset we re-emit) */
  headers: Record<string, string>;
  /** "inflight" = a handler is currently running for this key; callers should
   *  wait and reuse the result. "done" = the result is cached. */
  phase: "inflight" | "done";
  /** when the handler started — used for inflight dedup timeouts */
  startedAt: number;
}

export interface IdempotencyOptions {
  /** TTL in ms for cached results. Default 24h. */
  ttlMs?: number;
  /** header name to read the idempotency key from. Default `Idempotency-Key`. */
  headerName?: string;
  /** max wait in ms for an inflight request to resolve. Default 30s. */
  maxWaitMs?: number;
  /** poll interval while waiting for an inflight request. Default 50ms. */
  pollIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Internal store — single Map for the whole process. Same caveat as
// cache.ts: per-instance on serverless, but a useful L1 for `next start`.
// ---------------------------------------------------------------------------

const store = new Map<string, IdempotencyEntry>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_MAX_WAIT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 50;

// Sweep on every write when the store grows past this size.
const SWEEP_THRESHOLD = 512;

function sweepExpired(now: number): void {
  for (const [k, e] of store) {
    // Also drop inflight entries older than maxWait — they're almost certainly
    // orphaned (handler crashed without ever resolving the entry).
    const staleInflight = e.phase === "inflight" && now - e.startedAt > DEFAULT_MAX_WAIT_MS * 2;
    if (e.expiresAt <= now || staleInflight) {
      store.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate the idempotency key. We accept any non-empty string up to 255 chars.
 * The spec recommends UUIDs but we don't enforce that — clients using a
 * content hash (e.g. hash(messages)) also work fine.
 */
function isValidKey(key: string | null): key is string {
  return typeof key === "string" && key.length > 0 && key.length <= 255;
}

/**
 * Pick a small set of headers from the original response to re-emit on
 * replay. We deliberately DO NOT cache Content-Type (always JSON), Set-Cookie
 * (security), or Vary (caching directives). We DO keep a few useful ones.
 */
function pickHeadersForReplay(res: NextResponse): Record<string, string> {
  const out: Record<string, string> = {};
  const keep = ["x-evidence-tier", "x-rag-used", "x-source", "x-idempotent-replay"];
  for (const h of keep) {
    const v = res.headers.get(h);
    if (v) out[h] = v;
  }
  return out;
}

function replayResponse(entry: IdempotencyEntry): NextResponse {
  const res = NextResponse.json(entry.body, { status: entry.status });
  for (const [k, v] of Object.entries(entry.headers)) {
    res.headers.set(k, v);
  }
  res.headers.set("x-idempotent-replay", "true");
  return res;
}

// ---------------------------------------------------------------------------
// withIdempotency — wrap a POST handler.
//
// Behaviour:
//   1. If the request has NO Idempotency-Key header → call the handler as-is.
//      (Backwards-compatible — idempotency is opt-in per request.)
//   2. If the request has an Idempotency-Key and we have a `done` entry for
//      it that hasn't expired → return the cached response with
//      `x-idempotent-replay: true`.
//   3. If the request has an Idempotency-Key and we have an `inflight` entry
//      for it → wait up to `maxWaitMs` for the inflight handler to resolve,
//      then return its result. If it doesn't resolve in time, fall through
//      and run the handler (defensive — should be extremely rare).
//   4. Otherwise → mark the key as `inflight`, run the handler, cache the
//      result as `done`, return it.
// ---------------------------------------------------------------------------

type PostHandler = (req: NextRequest) => Promise<NextResponse>;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function withIdempotency(handler: PostHandler, options: IdempotencyOptions = {}): PostHandler {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const headerName = (options.headerName ?? "Idempotency-Key").toLowerCase();
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  return async (req: NextRequest): Promise<NextResponse> => {
    // Only POST is meaningfully idempotent-keyed in this codebase.
    if (req.method !== "POST") {
      return handler(req);
    }

    const key = req.headers.get(headerName);
    if (!isValidKey(key)) {
      // No key → pass through.
      return handler(req);
    }

    const now = Date.now();
    if (store.size > SWEEP_THRESHOLD) {
      sweepExpired(now);
    }

    const existing = store.get(key);
    if (existing) {
      if (existing.expiresAt <= now) {
        store.delete(key);
      } else if (existing.phase === "done") {
        // Cache hit — replay.
        return replayResponse(existing);
      } else if (existing.phase === "inflight") {
        // Wait for the inflight request to finish, then replay its result
        // (or fall through if it never resolves within maxWaitMs).
        const deadline = now + maxWaitMs;
        while (Date.now() < deadline) {
          await sleep(pollIntervalMs);
          const cur = store.get(key);
          if (!cur || cur.expiresAt <= Date.now()) {
            break;
          }
          if (cur.phase === "done") {
            return replayResponse(cur);
          }
        }
        // Fall through to running the handler ourselves. (Extremely rare.)
      }
    }

    // Mark inflight.
    const entry: IdempotencyEntry = {
      expiresAt: now + ttlMs,
      status: 200,
      body: null,
      headers: {},
      phase: "inflight",
      startedAt: now,
    };
    store.set(key, entry);

    try {
      const res = await handler(req);
      // Only cache successful (2xx) responses — caching 4xx/5xx would
      // poison retries that the user might be able to fix.
      if (res.status >= 200 && res.status < 300) {
        const body = await res.json().catch(() => null);
        const headers = pickHeadersForReplay(res);
        const done: IdempotencyEntry = {
          ...entry,
          phase: "done",
          status: res.status,
          body,
          headers,
        };
        store.set(key, done);
        // Re-build the response — we consumed the body above.
        const fresh = NextResponse.json(body, { status: res.status });
        for (const [h, v] of Object.entries(headers)) {
          fresh.headers.set(h, v);
        }
        return fresh;
      }
      // Non-2xx — don't cache, remove the inflight entry so the client can retry.
      store.delete(key);
      return res;
    } catch (err) {
      // Handler threw — remove the inflight entry so the client can retry.
      store.delete(key);
      throw err;
    }
  };
}

/** Diagnostic accessor — number of cached idempotency entries. */
export function idempotencyStoreSize(): number {
  return store.size;
}

/** Test hook — clear the store. */
export function __resetIdempotencyForTests(): void {
  store.clear();
}
