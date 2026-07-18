# PIP-MLK API Resilience — Research & Implementation Notes

> Task ID: RESILIENCE-01
> Applies to: PIP-MLK Next.js 16 App Router (`/api/assistant`, `/api/dashboard`)
> Truth Above All — every pattern below is grounded in the verified engine data shipped in `public/data/`, never in speculative infra.

---

## TL;DR

Six independent resilience primitives live in `src/lib/` and are composed around two API routes:

| Pattern | File | Applied to | Why |
|---|---|---|---|
| Rate Limiting | `src/lib/rate-limiter.ts` | `/api/assistant` (5 req/min per IP) | LLM calls cost real money + time |
| Backpressure | `src/lib/rate-limiter.ts` | `/api/assistant` (soft 20 / hard 40 inflight) | 4GB sandbox OOMs under burst load |
| Caching | `src/lib/cache.ts` | `/api/dashboard` (5 min TTL) | Dashboard reads 5 static JSON/JSONL files per hit |
| Timeouts | `src/lib/fetch-with-timeout.ts` | (utility — used by retry wrapper) | Unbounded fetch hangs eat in-flight budget |
| Retries + Backoff | `src/lib/retry.ts` | (utility — applied where LLM/file calls are retried) | Network blips shouldn't propagate as 5xx |
| Circuit Breaker | `src/lib/circuit-breaker.ts` | `/api/assistant` (`llm-assistant`, 5 fails / 30s cool-down) | Fail-fast to static fallback when ZAI endpoint is down |
| Idempotency | `src/lib/idempotency.ts` | `/api/assistant` POST (24h TTL, `Idempotency-Key` header) | Client retries shouldn't double-bill the LLM |

All primitives are **opt-in**, **side-effect-free to existing routes**, and **pure-TypeScript** — no Redis, no external middleware, no serverless-platform-specific features. They work in `next dev`, `next start`, and (degraded-but-correct) on serverless.

---

## Why resilience matters for PIP-MLK specifically

PIP-MLK is a political-intelligence dashboard with three pressure points that generic web apps don't share:

1. **LLM cost + latency.** `/api/assistant` calls `z-ai-web-dev-sdk`'s chat completions endpoint on every POST. Each call costs real tokens and adds 1–4 seconds of latency. A single user mashing "Send" can burn the daily budget.
2. **Sandbox memory pressure.** The 4GB sandbox dev server periodically OOMs under burst load (see `worklog.md` FALLBACK-DATA-01). When it does, fetches die mid-flight and `inflight` requests can pile up.
3. **PDPA-grade data integrity.** PIP-MLK ships verified engine output, not raw SPR voter rolls (Gate 9 OPEN). The resilience layer must never silently *substitute* a wrong answer — only fail-fast to the **already-shipped static fallback** (see `staticFallback()` in `route.ts`).

The patterns below address these three pressure points without ever compromising the "Truth Above All" principle.

---

## 1. Rate Limiting

### What it is
A **sliding window** rate limiter allows N requests per time window per identity (IP, user, API key). The window *slides* — each new request pushes the oldest timestamp out — so the limit is enforced continuously, not in fixed buckets.

### Why it's relevant to PIP-MLK
`/api/assistant` makes a paid LLM call per request. A single user (or a script) hitting the route every second would:
- Burn through the ZAI token budget in minutes.
- Starve other dashboard users by occupying the in-flight LLM slot.
- Generate a backlog of failed requests when the endpoint inevitably throttles us upstream.

A 5 req/min per IP limit (per task spec — stricter than the 10 req/min lib default) caps a single client's blast radius while leaving headroom for legitimate interactive use.

### How it's implemented
**File:** `src/lib/rate-limiter.ts`

```
store: Map<key, number[]>   // timestamps of allowed requests in the window

rateLimit(req, { limit, windowMs }):
  1. key = getClientIp(req)  // x-forwarded-for > x-real-ip > "anonymous"
  2. prune timestamps older than (now - windowMs)   // sliding window
  3. if timestamps.length >= limit → reject, compute Retry-After
  4. else → push now, return { success, remaining, resetAt }
```

Periodic GC (every 60s) drops keys whose newest timestamp is older than 2 minutes, keeping the `Map` bounded under diverse-IP traffic.

The wrapper returns a structured `RateLimitResult`:

```ts
interface RateLimitResult {
  success: boolean;            // allow through?
  remaining: number;           // remaining requests in this window for this IP
  resetAt: number;             // epoch ms when the window fully resets
  retryAfterSeconds: number;   // suggested Retry-After (0 if allowed)
  key: string;                 // IP / custom key (for logging)
}
```

The `/api/assistant` route converts a rejection into a `429` with `Retry-After` and `X-RateLimit-*` headers:

```ts
if (!rl.success) {
  return NextResponse.json(
    { error: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds), ... } },
  );
}
```

### When to use it
- **Always** on any API route that calls a paid/external service (LLM, payment gateway, geocoder).
- On routes that mutate state (POST/PUT/DELETE) — defends against accidental retry storms.
- On login / OTP routes — defends against credential stuffing.

### When NOT to use it
- On static asset routes (`/data/*.json` is served by Next.js's static handler, no rate limit needed).
- On read-only internal admin routes behind authentication (the auth gate already bounds the audience).

---

## 2. Caching

### What it is
A **TTL cache** stores the result of an expensive computation for a fixed duration. Subsequent reads within the TTL return the cached value without re-running the computation.

### Why it's relevant to PIP-MLK
`/api/dashboard` reads **five files** on every hit:
- `p134/dashboard-overview.json` (small)
- `p134/dun-intelligence.jsonl` (5 lines — JSONL parse + 5 JSON.parse calls)
- `elections/melaka-elections.json` (3 elections × nested results arrays)
- `dpt/spr-dpt-pameran-summary.json` (5 months × 6 parliaments)
- `socioeconomic/melaka-dosm.json` (state + 3 districts)

That's 5 `fs.readFile` + ~10 `JSON.parse` calls per request. With 10 concurrent dashboard users it's 50 file reads and 100 JSON parses per second — pointless work because **the data ships as static JSON in the repo** and doesn't change between engine runs.

A 5-minute cache cuts that to **one** rebuild per 5 minutes regardless of traffic.

### How it's implemented
**File:** `src/lib/cache.ts`

```
store: Map<string, { value, expiresAt }>

cacheGet<T>(key):
  entry = store.get(key)
  if !entry → miss, return undefined
  if entry.expiresAt <= now → evict + miss, return undefined
  return entry.value   // hit

cacheSet(key, value, ttlMs):
  // lazy sweep when store > 256 entries
  store.set(key, { value, expiresAt: now + ttlMs })

cacheInvalidate(key)       // for ?refresh=1
cacheInvalidateByPrefix(p) // for category-wide invalidation
cacheGetOrSet(key, fn, ttl) // memoize an async producer
```

The `/api/dashboard` route uses `cacheGetOrSet` so the cache miss path is the producer function:

```ts
const payload = await cacheGetOrSet(
  "dashboard:summary:v1",
  buildDashboardSummary,    // reads 5 files, assembles payload
  5 * 60_000,
);
```

The route also exposes:
- `?refresh=1` → `cacheInvalidate("dashboard:summary:v1")` then rebuild (useful after engine re-runs)
- `?stats=1` → returns `{ cache: { size, hits, misses, evictions } }` for `/api/health`

### When to use it
- Read-heavy routes backed by static or slowly-changing data (this is the PIP-MLK dashboard case).
- Aggregation routes that compute the same answer for every caller (e.g. KPI rollups).
- Routes that hit a slow upstream where staleness is acceptable (e.g. DOSM stats — refreshed annually).

### When NOT to use it
- Per-user personalised responses (cache key would have to include user id — usually a sign you want a different pattern).
- Routes returning time-sensitive data (e.g. "DPT churn *this hour*").
- Without an invalidation strategy — a 5-min cache that can't be force-refreshed will eventually serve wrong data after an engine re-run. PIP-MLK solves this with `?refresh=1`.

---

## 3. Timeouts

### What it is
A wrapper around `fetch()` that aborts the request via `AbortController` after a configurable deadline. Without it, a stalled upstream can hold a connection (and a server-side worker) open indefinitely.

### Why it's relevant to PIP-MLK
The z-ai-web-dev-sdk LLM endpoint can stall for tens of seconds when it's saturated or when an upstream queue is backed up. Without a timeout:
- The `/api/assistant` route holds an in-flight slot for the whole stall (inflating the backpressure counter and blocking other users).
- The client's own fetch (which has no default timeout) also hangs.
- The static fallback never fires — the user is stuck on a spinner.

A 5-second timeout is generous enough for normal LLM responses (max_tokens=600 streams in well under 3s) but short enough to fail-fast into the static fallback when the endpoint is misbehaving.

### How it's implemented
**File:** `src/lib/fetch-with-timeout.ts`

```ts
async function fetchWithTimeout(input, options, timeoutMs = 5000):
  controller = new AbortController()
  timer = setTimeout(() => controller.abort(new FetchTimeoutError(...)), timeoutMs)
  // compose with caller-provided signal (whichever fires first wins)
  try:
    return await fetch(input, { ...options, signal: controller.signal })
  catch err:
    if controller.signal.aborted:
      if reason is FetchTimeoutError → throw it
      else → throw the user-abort reason
    else → throw err (real network error)
  finally:
    clearTimeout(timer)
```

A companion `fetchJsonWithTimeout<T>()` adds JSON parsing + non-2xx rejection in one call.

The wrapper throws a typed `FetchTimeoutError` (with `.url` + `.timeoutMs`) so callers can distinguish "we aborted because of timeout" from "the user manually aborted" from "a real network error" — three semantically different situations that the native `DOMException('Aborted')` collapses into one.

### When to use it
- **Every** outbound `fetch()` from a server route. Always. No exceptions.
- Especially on routes that hold an in-flight slot (so the slot is released when the timeout fires).

### When NOT to use it
- Streaming endpoints where you want a per-chunk timeout instead of a per-request timeout (use a watchdog timer that resets on each chunk).

---

## 4. Retries + Exponential Backoff

### What it is
When an operation fails transiently (network blip, 502 from upstream, rate-limited 429), retry it a few times with **exponentially growing delays** between attempts. Add **jitter** (random offset) so concurrent retries from multiple clients don't synchronise into a "thundering herd".

### Why it's relevant to PIP-MLK
The ZAI endpoint, the filesystem reads (especially under sandbox memory pressure), and any future upstream sources (SPR, ElectionData.my) all occasionally glitch for <1s. Without retries, a single blip propagates as a 5xx to the user. Without backoff, naive retries amplify the blip into a self-inflicted DDoS.

### How it's implemented
**File:** `src/lib/retry.ts`

Defaults (per task spec): 3 attempts, base 500ms, max 5s, multiplier 2.

```
attempt 0 (after first failure) → 500ms
attempt 1                       → 1000ms
attempt 2                       → 2000ms
attempt 3                       → 4000ms
attempt 4+                      → 5000ms (capped)
```

With **full jitter** (default, AWS-recommended) we then pick a uniform random in `[0, delay]`. Full jitter spreads retries maximally — the *expected* delay is half the non-jittered value, but the *worst-case* synchronisation is broken.

Two overloads:
- `retryWithBackoff(fn, opts)` — throws the last error if all attempts fail (drop-in `await` replacement).
- `retryWithBackoffDetailed(fn, opts)` — returns `{ value, attempts, lastError }` for callers that want to branch on failure without try/catch.

`retryIf` lets the caller decide which errors are retryable. The classic example: a 4xx client error is **not** retryable (the same request will fail the same way) but a 5xx or network error is.

### When to use it
- Network calls (LLM, third-party APIs).
- Filesystem operations on a flaky volume.
- Database queries that occasionally deadlock.

### When NOT to use it
- Inside a hot loop — the cumulative delay can be huge.
- For non-idempotent operations unless you also have idempotency keys (otherwise retrying a successful-but-unacked write double-applies it).
- Without an outer circuit breaker — retries alone can amplify an outage. The PIP-MLK stack pairs retries (per-call) with a circuit breaker (per-endpoint) so retries stop firing once the breaker is open.

---

## 5. Circuit Breaker

### What it is
A state machine that tracks recent failures on a *named operation*. After N consecutive failures it **opens** — subsequent calls fail-fast without even attempting the underlying operation. After a cool-down it transitions to **half-open** and allows a single probe; success closes the breaker, failure re-opens it.

```
   closed  ──(N consecutive failures)──►  open
     ▲                                       │
     │                                       │ (cool-down elapses + a call arrives)
     │                                       ▼
   closed  ◄──(probe succeeds)──  half-open  ──(probe fails)──►  open
```

### Why it's relevant to PIP-MLK
When the ZAI endpoint is down (or saturated), every `/api/assistant` call queues behind a doomed LLM request. Without a breaker:
- Each request burns the full 5s timeout before falling back.
- The in-flight count climbs, eventually triggering backpressure 429s for everyone.
- The retry layer adds its own backoff delays on top.

With a breaker named `llm-assistant`:
- After 5 consecutive ZAI failures, the breaker **opens**.
- Subsequent requests fail-fast (instant) into `staticFallback()`.
- Users still get a verified answer — just one from the canned fallback set instead of the LLM.
- After 30s the breaker goes **half-open**, lets ONE probe through, and either recovers (closes) or re-arms (opens for another 30s).

### How it's implemented
**File:** `src/lib/circuit-breaker.ts`

```ts
circuitBreaker<T>(name, fn, options):
  breaker = getOrCreate(name, options)
  if breaker.state == "open":
    waitMs = msUntilHalfOpen(breaker, now)
    if waitMs > 0 → throw CircuitOpenError(name, waitMs)   // fail-fast
    else → transition(breaker, "half-open")
  if breaker.state == "half-open" && probeCount >= budget → throw CircuitOpenError
  try:
    value = await fn()
    if state was half-open → transition to closed
    else if state was closed → reset consecutiveFailures to 0
    return value
  catch err:
    if !isFailure(err) → re-throw without state change
    consecutiveFailures++
    if state == half-open → transition to open (re-arm)
    else if state == closed && consecutiveFailures >= threshold → transition to open
    throw err
```

The `CircuitOpenError` is a typed error with `retryAfterMs` — the `/api/assistant` route catches it specifically and routes the user to the static fallback instead of propagating a 5xx.

The `/api/assistant` route config:
```ts
circuitBreaker("llm-assistant", runLlm, {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,    // 30s cool-down before half-open probe
  halfOpenProbeBudget: 1,    // only one probe through per cool-down
});
```

Diagnostics: `getCircuitBreakerStatus(name)` returns `{ state, consecutiveFailures, totalCalls, totalFailures, totalRejections, openedAt, lastStateChangeAt }` for `/api/health`.

### When to use it
- Around **every** call to a flaky external service (LLM, payment gateway, SMS provider).
- Around database calls when the DB is known to be unstable.
- In combination with retries — retries handle transient blips, the breaker handles sustained outages.

### When NOT to use it
- Around CPU-bound local work (it can't fail by definition; a breaker just adds overhead).
- Around operations whose failure isn't correlated (each call would need its own breaker name).

---

## 6. Idempotency

### What it is
A middleware that lets a POST route treat duplicate requests as a single request. The client sends an `Idempotency-Key` header; the server caches the *result* of the first request under that key and replays it for subsequent requests with the same key.

### Why it's relevant to PIP-MLK
Network blips are common on mobile and on the 4GB sandbox. When a client's network dies mid-LLM-call, the client doesn't know whether the server received the request — so it retries. Without idempotency:
- The user gets billed twice for the LLM call.
- The dashboard shows duplicate messages in the chat history.
- The ZAI endpoint sees double the traffic.

With idempotency:
- The second call (same key) returns the *exact same* response as the first, with an `x-idempotent-replay: true` header.
- The LLM is invoked at most once per key.

### How it's implemented
**File:** `src/lib/idempotency.ts`

```
store: Map<key, { expiresAt, status, body, headers, phase, startedAt }>

withIdempotency(handler):
  return async (req) => {
    if req.method != "POST" → return handler(req)
    key = req.headers.get("Idempotency-Key")
    if !key → return handler(req)   // opt-in; no key = no caching

    existing = store.get(key)
    if existing:
      if existing.phase == "done" → replay response (with x-idempotent-replay: true)
      if existing.phase == "inflight":
        // wait up to maxWaitMs for the inflight handler to finish
        while now < deadline:
          sleep(pollIntervalMs)
          if store[key].phase == "done" → replay it
        // fall through and run the handler ourselves (rare)

    // mark inflight, run handler, cache result, return
    store.set(key, { phase: "inflight", ... })
    try:
      res = await handler(req)
      if res.status is 2xx:
        body = await res.json()
        store.set(key, { phase: "done", status, body, headers, expiresAt: now + 24h })
        return NextResponse.json(body, { status, headers })   // rebuild (body consumed)
      else:
        store.delete(key)   // don't cache 4xx/5xx — client should be able to retry
        return res
    catch err:
      store.delete(key)
      throw err
  }
```

Key design decisions:
- **24h TTL** — long enough for any reasonable client retry window, short enough to keep the `Map` bounded.
- **2xx-only caching** — a 4xx validation error must NOT be cached (the user can fix the request body and retry).
- **Inflight dedup** — concurrent requests with the same key share one LLM call instead of double-billing.
- **Opt-in** — requests without an `Idempotency-Key` header pass straight through. Backwards-compatible.

### When to use it
- **Every** POST route that has side effects (database writes, payment charges, LLM calls).
- Routes where the client might legitimately retry (mobile networks, sandbox environments).

### When NOT to use it
- GET routes (they should already be idempotent by HTTP spec).
- Routes whose response depends on time (e.g. "current queue depth") — replaying a stale answer misleads the user.

---

## 7. Backpressure

### What it is
**Load shedding** when the server is overwhelmed. Distinct from rate limiting: rate limiting is *per-client*; backpressure is *server-wide*. When the in-flight request count exceeds a soft cap, the server starts returning `429 Too Many Requests` even for clients who are individually well-behaved.

### Why it's relevant to PIP-MLK
The 4GB sandbox dev server periodically approaches OOM under burst load (see `worklog.md` FALLBACK-DATA-01). When it does, in-flight requests pile up:
- Each LLM call holds a worker for up to 5s (the fetch-with-timeout default).
- Each dashboard call holds a worker for the duration of the file reads + JSON parses (cached otherwise).
- Beyond a certain inflight count, accepting more work just makes everything slower (context-switching, GC pressure).

Backpressure sheds load *before* the OOM kills the process: once inflight hits 20 (soft cap), new requests get `429 + Retry-After`. Once it hits 40 (hard cap), the Retry-After is always 5s.

### How it's implemented
**File:** `src/lib/rate-limiter.ts` (same file as rate limiting — they share the in-flight counter)

```ts
assessBackpressure(opts = { softCap: 20, hardCap: 40 }):
  if inflight >= hardCap → return { shedLoad: true, retryAfterSeconds: 5, reason: "hard-cap" }
  if inflight >= softCap:
    overage = inflight - softCap
    ratio = min(1, overage / (hardCap - softCap))
    return { shedLoad: true, retryAfterSeconds: max(1, ceil(5 * ratio)), reason: "soft-cap" }
  return { shedLoad: false, ... }
```

In-flight tracking is provided by `withInflight()`:

```ts
withInflight(async () => { /* the work */ })
```

The wrapper increments `inflight` on entry and decrements it on exit (success or failure). The `/api/assistant` route wraps the LLM call in `withInflight()` so the counter reflects *only* the expensive work, not the entire request lifecycle.

The route converts a backpressure rejection into a 429:

```ts
const bp = assessBackpressure();
if (bp.shedLoad) {
  return NextResponse.json(
    { error: "backpressure", inflight: bp.inflight, reason: bp.reason },
    { status: 429, headers: { "Retry-After": String(bp.retryAfterSeconds) } },
  );
}
```

### When to use it
- **Always** on routes that hold an expensive in-flight slot (LLM calls, slow DB queries, large file reads).
- On any route running on a memory-constrained host (the 4GB sandbox is the textbook case).

### When NOT to use it
- On routes whose work is cheap and fast (static JSON reads, cache hits). Shedding those would just degrade UX for no benefit.
- Without an accurate `inflight` counter — a stale counter causes false-positive shedding.

---

## Composition: how the patterns layer on `/api/assistant`

The full request flow for `POST /api/assistant`:

```
client sends POST with (optional) Idempotency-Key header
       │
       ▼
[withIdempotency]  ──►  if key matches a cached result → replay (no LLM call)
       │
       ▼
[rateLimit]       ──►  if over 5/min/IP → 429 + Retry-After (no LLM call)
       │
       ▼
[assessBackpressure]  ──►  if inflight >= 20 → 429 + Retry-After (no LLM call)
       │
       ▼
[parse body + build RAG context]
       │
       ▼
[circuitBreaker("llm-assistant", ...)]
       │  ──►  if breaker OPEN → catch CircuitOpenError, fall back to static
       │  ──►  if breaker HALF-OPEN and probe budget exhausted → ditto
       │
       ▼
[withInflight(runLlm)]  ──►  increments inflight counter
       │
       ▼
   ZAI.chat.completions.create()   ← expensive call
       │
       ▼
return response with X-RateLimit-* + X-Evidence-Tier + X-Rag-Used headers
       │
       ▼
[withIdempotency caches the 2xx response under the key for 24h]
```

**Defence-in-depth:** each layer can reject the request *before* the expensive LLM call fires. A user mashing "Send" hits rate limiting. A burst from many users hits backpressure. A sustained ZAI outage opens the circuit. A network blip mid-call is recovered by retry + timeout. A client retry after a network blip is de-duplicated by idempotency.

**Crucially: the user never sees a 5xx.** The static fallback (verified canned answers from the 12 MELAKA_FACTS) is the floor. Resilience primitives protect the budget and the worker pool; the UX floor is unchanged.

---

## Composition: how the patterns layer on `/api/dashboard`

```
client sends GET /api/dashboard
       │
       ▼
[?refresh=1 → cacheInvalidate]
[?stats=1 → return cacheStats, exit]
       │
       ▼
[cacheGetOrSet("dashboard:summary:v1", buildDashboardSummary, 5*60_000)]
       │  ──►  if cached entry fresh → return cached payload
       │
       ▼
[buildDashboardSummary]  ──►  read 5 files in parallel, assemble payload
       │
       ▼
return response with X-Cache-Key + X-Cache-TTL-Ms + Cache-Control headers
```

Note that rate limiting + backpressure are **not** applied to `/api/dashboard` — it's a read-only route backed by local files, the expensive work is cached away after the first hit, and the per-request cost is negligible. Applying rate limiting here would degrade UX for no benefit. **The right amount of resilience is "enough" — not "maximum".**

---

## Operational hooks

Every primitive exposes a diagnostic accessor for an `/api/health` route (not built in this task, but the surface is ready):

| Primitive | Diagnostic |
|---|---|
| Rate Limiter | `getRateLimiterStats()` → `{ trackedKeys, inflight }` |
| Cache | `cacheStats()` → `{ size, hits, misses, evictions }` |
| Circuit Breaker | `getCircuitBreakerStatus(name)` / `getAllCircuitBreakerStatuses()` |
| Idempotency | `idempotencyStoreSize()` |
| Backpressure | `assessBackpressure()` (also the runtime check) |

Each primitive also exposes a `__reset*ForTests()` hook so future unit tests can isolate state.

---

## Known limitations

1. **Per-instance state.** The rate limiter's `Map`, the cache's `Map`, the breaker registry, and the idempotency store are all module-level `Map`s. They are **per-Node.js-process**. On `next start` (long-lived process) this is fine. On serverless (Vercel Edge, Lambda) each cold start gets a fresh state — the primitives still work as an L1 cache but they're **not a substitute for Redis**. For PIP-MLK (single-process `next start` on the sandbox) this is the right trade-off: zero new dependencies, zero external infrastructure.
2. **No distributed rate limiting.** If PIP-MLK ever scales horizontally, the per-IP limit becomes per-instance. A Redis-backed limiter (e.g. `@upstash/ratelimit`) would be the drop-in upgrade path.
3. **`getClientIp` falls back to "anonymous".** If both `x-forwarded-for` and `x-real-ip` are absent (e.g. direct connection without a proxy), all anonymous clients share a single rate-limit bucket. Acceptable for the sandbox; in production, Caddy or Vercel always sets the header.
4. **Idempotency inflight polling is busy-wait.** A `Promise`-based single-flight would be more efficient under high concurrency, but adds complexity. The 50ms poll interval is a fine trade-off for the expected load.
5. **Circuit breaker's `isFailure` defaults to "every thrown error counts".** The `/api/assistant` route doesn't override this — every ZAI throw counts. If we later want to ignore e.g. 429-from-ZAI (which is *our* rate limit being hit, not a ZAI outage), we'd pass `isFailure: (err) => !(err is ZaiRateLimitError)`.

---

## File map

```
src/lib/
├── rate-limiter.ts        ← sliding window rate limit + backpressure + inflight
├── cache.ts               ← TTL cache + cacheGetOrSet memoizer
├── fetch-with-timeout.ts  ← fetch() + AbortController + JSON variant
├── retry.ts               ← exponential backoff + full jitter
├── circuit-breaker.ts     ← closed/open/half-open state machine
└── idempotency.ts         ← POST middleware, 24h TTL, inflight dedup

src/app/api/
├── assistant/route.ts     ← POST = withIdempotency(handlePost)
│                            handlePost: rateLimit → backpressure → circuitBreaker("llm-assistant")
└── dashboard/route.ts     ← GET = cacheGetOrSet("dashboard:summary:v1", build, 5*60_000)

docs/
└── RESEARCH-RESILIENCE.md ← this document
```
