// PIP-MLK API resilience — simple TTL cache.
// Truth Above All: PIP-MLK ships verified engine data that does not change
// frequently. The /api/dashboard route reads several JSON/JSONL files from
// public/data on every hit — caching the assembled payload for 5 minutes
// cuts filesystem reads + JSON parsing dramatically under load.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  value: T;
  /** epoch ms when this entry expires */
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}

// ---------------------------------------------------------------------------
// Internal store — a single module-level Map. Next.js route handlers share
// module state within a long-lived Node.js process, so this works in dev and
// in `next start`. On serverless platforms the cache is per-instance (which
// is still a useful L1 — just not a substitute for Redis).
// ---------------------------------------------------------------------------

const store = new Map<string, CacheEntry<unknown>>();
let hits = 0;
let misses = 0;
let evictions = 0;

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic lazy GC: entries are evicted on read or when set() prunes. We
// also run a sweep on every set() call when the Map exceeds 256 entries.
const SWEEP_THRESHOLD = 256;

function sweepExpired(now: number): void {
  for (const [k, e] of store) {
    if (e.expiresAt <= now) {
      store.delete(k);
      evictions++;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a cached value by key. Returns undefined if missing OR expired.
 * Expired entries are proactively deleted on read (lazy expiry).
 */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    misses++;
    return undefined;
  }
  const now = Date.now();
  if (entry.expiresAt <= now) {
    store.delete(key);
    evictions++;
    misses++;
    return undefined;
  }
  hits++;
  return entry.value;
}

/**
 * Set a cached value with an optional TTL. Falls back to DEFAULT_TTL_MS.
 * Pass `ttlMs = 0` to store with the default TTL (NOT to disable caching).
 */
export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  const now = Date.now();
  if (store.size > SWEEP_THRESHOLD) {
    sweepExpired(now);
  }
  store.set(key, { value, expiresAt: now + ttlMs });
}

/**
 * Invalidate a single key. Returns true if a key was removed.
 */
export function cacheInvalidate(key: string): boolean {
  return store.delete(key);
}

/**
 * Invalidate all keys matching a prefix (e.g. "dashboard:"). Useful when a
 * whole category of data has been refreshed and every cached entry in that
 * family must go.
 */
export function cacheInvalidateByPrefix(prefix: string): number {
  let removed = 0;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      removed++;
    }
  }
  return removed;
}

/** Clear everything. Test hook + admin flush. */
export function cacheClear(): void {
  store.clear();
  hits = 0;
  misses = 0;
  evictions = 0;
}

/** Diagnostic accessor for /api/health or admin dashboards. */
export function cacheStats(): CacheStats {
  return { size: store.size, hits, misses, evictions };
}

/**
 * Memoize an async producer behind the cache. If a fresh entry exists it is
 * returned without invoking `producer`. Otherwise the producer runs and its
 * result is cached before being returned. Useful for route handlers:
 *
 *   const data = await cacheGetOrSet("dashboard:overview", () => buildOverview(), 5 * 60_000);
 *
 * Note: this is NOT a distributed lock — concurrent first-time calls may both
 * invoke the producer. That's an acceptable trade-off for this codebase
 * (idempotent reads, cheap producer). If you need single-flight, wrap the
 * producer in a dedup layer externally.
 */
export async function cacheGetOrSet<T>(
  key: string,
  producer: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;
  const value = await producer();
  cacheSet(key, value, ttlMs);
  return value;
}
