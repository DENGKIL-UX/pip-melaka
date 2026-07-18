# PIP-MLK Performance Research — `docs/RESEARCH-PERFORMANCE.md`

> Task ID: DB-CICD-01
> Scope: cold starts, latency budgets, P99 / tail latency, CDN + edge caching, cache invalidation, autoscaling.
> Target runtime: Cloudflare Workers (primary), Node.js standalone (fallback).

---

## Table of contents

12. [Cold Starts](#12-cold-starts)
13. [Latency, P99, Tail Latency](#13-latency-p99-tail-latency)
14. [CDN, Edge Caching, Cache Invalidation](#14-cdn-edge-caching-cache-invalidation)
15. [Autoscaling (Horizontal / Vertical)](#15-autoscaling-horizontal--vertical)

---

## 12. Cold Starts

### 12.1 What is a cold start?

A **cold start** is the latency penalty paid the first time a serverless function (Cloudflare Worker isolate, Lambda, Vercel Function) is invoked after being idle. It includes:

1. **Isolate / container startup** — Cloudflare Workers: ~5ms (V8 isolate spawn). AWS Lambda: 100–500ms (microVM boot). Vercel: similar to Lambda.
2. **Module initialization** — every `import` at the top of the entry file runs its top-level code. Heavy imports (Three.js, Prisma client, z-ai-sdk) bloat this.
3. **Connection establishment** — first DB connection, first TLS handshake to an upstream API.

### 12.2 PIP-MLK cold-start budget

| Component | Budget | Current |
|-----------|--------|---------|
| Cloudflare Workers isolate spawn | 5ms | (Cloudflare-pays) |
| Module init (top-level imports) | <50ms | Unknown — measure with `wrangler dev --local` + `console.time` |
| First DB connection | <100ms | Unknown — depends on DB region |
| **Total cold start** | **<200ms P99** | Target |

If cold start exceeds 200ms P99, the dashboard feels "stuck" on first load. The user already pays 100–300ms for the HTML/JS download, so 200ms of cold start pushes first-interaction past 500ms.

### 12.3 Lazy-loading heavy modules

The single most effective cold-start optimization is **deferring imports** until they're actually needed. PIP-MLK has three heavy modules:

| Module | Size (gzipped, approx) | When needed | Strategy |
|--------|------------------------|-------------|----------|
| `three` (3D map) | ~150KB | Only when user opens 3D Map tab | Dynamic `import()` on tab open |
| `leaflet` + plugins (2D map) | ~50KB | Only when user opens 2D Map tab | Dynamic `import()` on tab open |
| `z-ai-web-dev-sdk` (AI Assistant) | ~30KB | Only when user clicks "Ask AI" | Dynamic `import()` in route handler |
| `@prisma/client` | ~20KB | Every API route that touches DB | Already server-only — fine |

#### Pattern — dynamic import on tab open

```typescript
// src/components/dashboard.tsx
const Map3DTab = lazy(() => import("@/components/tabs/map-3d-tab"));
const Map2DTab = lazy(() => import("@/components/tabs/map-2d-tab"));

// In render:
<Suspense fallback={<TabSkeleton />}>
  {activeTab === "map3d" && <Map3DTab />}
  {activeTab === "map2d" && <Map2DTab />}
</Suspense>
```

This keeps `three` and `leaflet` OUT of the initial bundle. The user pays ~30ms of cold-start time for the dynamic import only when they actually open the map tab — a great tradeoff.

#### Pattern — dynamic import in route handler

```typescript
// src/app/api/assistant/route.ts
export async function POST(req: NextRequest) {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;  // lazy
  // ...
}
```

Defers the SDK parse cost until the first request hits the route. Subsequent requests reuse the cached module.

### 12.4 Bundle-size optimization

The Next.js build report (`.next/build-manifest.json` + the `next build` stdout) shows per-route JS payload. Targets:

| Route | First-load JS (gzipped) | Current status |
|-------|-------------------------|----------------|
| `/` (dashboard) | < 200KB | Verify after lazy-loading maps |
| `/api/v1/assistant` | (server-only, no client JS) | OK |
| `/api/v1/health` | (server-only) | OK |

Optimization checklist:

- ✅ `three` and `leaflet` lazy-loaded (see §12.3)
- ✅ `framer-motion` is in the main bundle but only ~30KB gzipped — acceptable
- ⚠️ `recharts` (~50KB gzipped) is imported by 5 tab components — consider dynamic import if first-load JS exceeds budget
- ⚠️ `@tanstack/react-query` is in deps but not yet used — if unused, remove from `package.json` to prevent accidental imports
- ✅ shadcn/ui components are tree-shakeable — only what's imported ships

### 12.5 Connection warmth

For serverless Workers:

- **DB connections** — Cloudflare Workers can't keep TCP connections alive between requests. Use **Hyperdrive** (Cloudflare's connection pooler) or **Prisma Accelerate** (HTTP-based, no TCP).
- **TLS to upstream APIs** (z-ai-sdk) — Workers reuse TLS sessions across isolate invocations within the same colo. No action needed.

### 12.6 Warmup strategies

- **Scheduled Worker** — a Cron Trigger hits `/api/v1/health?warmup=1` every minute. Keeps at least one isolate warm per colo.
- **Concurrent first request** — when a user lands on `/`, the client fires a parallel `fetch("/api/v1/health?warmup=1")` to warm the AI Assistant route before the user clicks "Ask AI".
- **Pre-fetch on hover** — `onMouseEnter` on the "Ask AI" button triggers `import("z-ai-web-dev-sdk")`. By the time the user clicks, the module is parsed.

### 12.7 Cold-start measurement

```bash
# Local: simulate cold start with wrangler
wrangler dev --local --minify
# Hit /api/v1/health with a fresh isolate (restart wrangler between calls)
# Measure TTFB with curl:
curl -w "%{time_starttransfer}\n" -o /dev/null -s https://pip-mlk.example.com/api/v1/health

# Prod: Cloudflare Analytics → Workers → Cold starts %
# Target: < 5% of requests are cold starts.
```

---

## 13. Latency, P99, Tail Latency

### 13.1 Latency budgets

A latency budget is the maximum time a request is allowed to take before the user perceives it as slow. PIP-MLK budgets:

| User action | P50 budget | P99 budget | Notes |
|-------------|-----------|-----------|-------|
| Dashboard tab switch (client-only) | 50ms | 200ms | recharts render dominates |
| `/api/v1/health` (no DB) | 30ms | 100ms | Just JSON |
| `/api/v1/assistant` (LLM call) | 1500ms | 4000ms | LLM stream starts < 1s |
| Static JSON from `/data/p134/*.json` | 20ms | 100ms | CDN-cached (see §14) |
| Initial HTML (`/`) | 200ms | 600ms | SSR + first byte |

**P99 is the metric that matters** — P50 (median) hides tail latency. If 1% of users wait 4 seconds for the AI Assistant, that's a real product problem even though P50 looks great.

### 13.2 What is P99?

`P99` = the latency below which 99% of requests complete. If P99 = 1000ms, then 99 out of 100 requests finish in ≤1000ms, and 1 out of 100 takes longer.

Other useful percentiles:

| Percentile | Meaning | Sensitivity |
|------------|---------|-------------|
| P50 (median) | typical request | hides tail |
| P90 | 1-in-10 request | catches common slow paths |
| P95 | 1-in-20 request | catches most slow paths |
| P99 | 1-in-100 request | catches rare slow paths |
| P99.9 | 1-in-1000 request | catches pathological slow paths |

### 13.3 Why tail latency exists (the "P99 tail")

Even on a fast server, the P99 tail is caused by:

1. **Cold starts** (see §12) — 1% of requests hit a fresh isolate.
2. **GC pauses** — V8 major GC can pause 50–200ms. Mitigate by reducing allocation rate.
3. **Network jitter** — 1% of TCP packets get retransmitted.
4. **Upstream slowness** — the LLM API has its own P99 tail; you inherit it.
5. **DB contention** — a slow query holds a lock, blocking 1% of subsequent queries.
6. **Noisy neighbors** — other tenants on the same Cloudflare colo spike CPU.

**You cannot eliminate tail latency.** You can only:

- Set a budget and alert when P99 exceeds it.
- Cut the *long* tail (10s+) into the *short* tail (1s) via timeouts + fallbacks.
- Reduce the *frequency* of slow requests via caching, batching, and warmup.

### 13.4 Tail-latency reduction strategies

#### A. Timeouts + fallbacks

Every external call has a timeout. On timeout, fall back to a degraded response (not an error).

```typescript
// src/app/api/assistant/route.ts (already implemented)
const llmPromise = zai.chat.completions.create({ ... });
const fallbackPromise = new Promise((resolve) =>
  setTimeout(() => resolve(cannedAnswer), 3000)
);

const response = await Promise.race([llmPromise, fallbackPromise]);
```

This caps the AI Assistant P99 at 3000ms — even if the LLM takes 30s, the user gets a canned answer at 3s. The fallback-data system (see `src/lib/fallback-data.ts`) applies the same pattern to dashboard tab fetches.

#### B. Request hedging

For P99-critical reads, fire the same request twice and take the first response:

```typescript
const primary = fetch("/api/v1/health");
const hedge = new Promise((r) => setTimeout(() => r(fetch("/api/v1/health")), 50));
const res = await Promise.race([primary, hedge]);
```

Costs 2× the load on the 1% of requests that need it, but cuts P99 from (say) 500ms to 100ms.

#### C. Caching (see §14)

Cache hits return in <10ms. Cache the response for any request that's idempotent and slow.

#### D. Connection pooling (see `docs/RESEARCH-DATABASE.md` §4)

Eliminates the 50–200ms connection-setup latency on the P99 tail.

#### E. Precomputation

If a query is expensive and the result changes slowly, precompute it. PIP-MLK already does this: the engine writes `dashboard-overview.json` once, and the dashboard reads the JSON (10ms) instead of re-running the engine (minutes).

### 13.5 P99 monitoring

#### Cloudflare Analytics

Workers Analytics exposes:

- `workersRequests` — count by status, by colo
- `workersDurationCdf` — CPU time histogram (P50, P90, P99, P99.9)
- `workersErrors` — by type

Set alerts:

```bash
# P99 wall-clock > 1000ms for 5 min → page
wrangler analytics alerts create \
  --name "pip-mlk-p99-high" \
  --metric "workersDurationCdf.p99" \
  --threshold 1000 --window 5m
```

#### In-app metrics

The `withTimer` helper in `src/lib/db-optimization.ts` logs every Prisma query as JSON:

```json
{"level":"warn","metric":"db.query.slow","name":"findMany.users","ms":120}
```

A future `/api/v1/metrics` endpoint (Prometheus format) can scrape these for P99 dashboards.

#### Real-User Monitoring (RUM)

Cloudflare Web Analytics (privacy-friendly, no cookies) gives:

- Page load time P50/P90/P99 per country
- Core Web Vitals (LCP, FID, CLS) per route

### 13.6 SLO definition

PIP-MLK SLOs (to be formalized):

| SLO | Target | Window |
|-----|--------|--------|
| `/api/v1/health` availability | 99.9% | 30 days |
| `/api/v1/health` P99 latency | < 200ms | 30 days |
| `/api/v1/assistant` availability | 99.5% | 30 days |
| `/api/v1/assistant` P99 latency | < 4000ms | 30 days |
| Static JSON (`/data/*`) P99 latency | < 100ms | 30 days |
| Initial HTML (`/`) P99 latency | < 800ms | 30 days |

If any SLO is violated for 2 consecutive windows, freeze feature deploys and run a postmortem.

---

## 14. CDN, Edge Caching, Cache Invalidation

### 14.1 PIP-MLK CDN architecture

```
                    ┌─────────────────────────────────────┐
                    │   Cloudflare Edge Network (300+ colos) │
                    │                                       │
   user ───────►   │   ┌──────────────┐                    │
                    │   │  CDN cache   │  ← cache static +  │
                    │   │  (per colo)  │    JSON for 5 min  │
                    │   └──────┬───────┘                    │
                    │          │ miss                       │
                    │          ▼                            │
                    │   ┌──────────────┐                    │
                    │   │  Worker      │  ← runs Next.js    │
                    │   │  (pip-mlk)   │    handler         │
                    │   └──────┬───────┘                    │
                    │          │                            │
                    │          ▼                            │
                    │   ┌──────────────┐                    │
                    │   │  Origin / DB │  ← Prisma          │
                    │   └──────────────┘                    │
                    └─────────────────────────────────────┘
```

Cloudflare's edge cache sits in front of the Worker. Each colo has its own cache. A cache hit returns in <10ms without invoking the Worker at all.

### 14.2 What to cache, and for how long

| Asset type | Path | Cache duration | Rationale |
|------------|------|----------------|-----------|
| Static JSON (immutable) | `/data/p134/*.json` | `1 year` (immutable) | Engine output, never changes per release |
| Static JSON (versioned) | `/data/elections/*.json` | `1 year` | Same — update by shipping a new file |
| Engine JSONL | `/data/p134/*.jsonl` | `1 year` | Same |
| GeoJSON boundaries | `/data/boundaries/*` | `1 year` | Same |
| Compiled JS chunks | `/_next/static/*` | `1 year` (immutable) | Hashed filenames |
| HTML (`/`) | `/` | `60s` (stale-while-revalidate) | SSR, can change on deploy |
| API routes | `/api/v1/*` | varies by route | See below |

### 14.3 Cache-Control headers

Set via `next.config.ts` `headers()` or via Worker `Response.headers`:

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: "/data/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/api/v1/health",
      headers: [
        { key: "Cache-Control", value: "no-store" },
      ],
    },
    {
      source: "/api/v1/assistant",
      headers: [
        { key: "Cache-Control", value: "no-store" },
      ],
    },
  ];
}
```

**Directive cheatsheet**:

| Directive | Meaning |
|-----------|---------|
| `public` | Any cache (CDN, browser) may store |
| `private` | Only the browser may store (not the CDN) |
| `max-age=N` | Cache for N seconds |
| `s-maxage=N` | CDN-only cache for N seconds (overrides `max-age` for shared caches) |
| `stale-while-revalidate=N` | Serve stale for up to N seconds while revalidating in background |
| `immutable` | The asset will never change — browser never revalidates |
| `no-store` | Never cache |
| `no-cache` | Cache but always revalidate before use |
| `must-revalidate` | After max-age, MUST revalidate (don't serve stale) |

### 14.4 Cloudflare CDN configuration

In `wrangler.jsonc` (or via the dashboard):

```jsonc
{
  "cache": {
    "enabled": true
  },
  "routes": [
    {
      "pattern": "pip-mlk.example.com/data/*",
      "custom_domain": false,
      "cache": {
        "ttl": 31536000,
        "edge_ttl": 31536000,
        "browser_ttl": 31536000
      }
    }
  ]
}
```

Alternatively, use Cloudflare **Cache Rules** (dashboard-driven, no code) for simple cases.

### 14.5 Cache invalidation strategies

#### A. Versioned filenames (best — never invalidate)

Static assets under `/_next/static/` have content-hashed filenames (`chunks/abc123.js`). When the content changes, the hash changes, the URL changes, and the new URL is a cache miss. The old URL stays cached forever (harmless — no one asks for it).

**Use this for everything you can.** PIP-MLK's `/data/p134/*.json` files could be renamed to include a content hash on each engine run: `/data/p134/dashboard-overview-abc123.json`. The dashboard then references the hashed filename. This makes cache invalidation free.

#### B. Purge by URL (targeted — fast)

When you must invalidate a specific URL:

```bash
# Purge one file
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://pip-mlk.example.com/data/p134/dashboard-overview.json"]}'
```

Or via `wrangler`:

```bash
wrangler cache purge --url https://pip-mlk.example.com/data/p134/dashboard-overview.json
```

Takes effect globally within ~30 seconds.

#### C. Purge everything (last resort — slow)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
  -H "Authorization: Bearer <token>" \
  --data '{"purge_everything":true}'
```

Invalidates every cached asset on every colo. **Use sparingly** — it causes a thundering herd of origin requests for the next few minutes. Only use this when you genuinely don't know which URLs changed (e.g. after a major deploy).

#### D. Tag-based purge (best for grouped assets)

Cloudflare Enterprise supports **Cache-Tag** purging. Tag responses with `Cache-Tag: p134-data`, then purge by tag:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
  -H "Authorization: Bearer <token>" \
  --data '{"tags":["p134-data"]}'
```

This is the right answer for PIP-MLK when we upgrade — every file related to P134 can be invalidated in one call without enumerating URLs.

#### E. Stale-while-revalidate (lazy invalidation)

```http
Cache-Control: public, max-age=60, stale-while-revalidate=86400
```

After 60s, the cache is "stale" but still served. Cloudflare fetches the fresh version in the background. The user sees the old version for one request, then the new version on the next. **No purge needed** — the cache self-heals within 1 request of any change.

Use this for `/api/v1/health`-style endpoints where eventual consistency is fine.

### 14.6 Cache invalidation matrix

| Asset type | Invalidation strategy |
|------------|----------------------|
| Hashed static (`/_next/static/*`) | Never invalidate (filename changes on content change) |
| Static JSON (`/data/p134/*.json`) | Purge by URL after engine re-run |
| HTML (`/`) | `max-age=60, stale-while-revalidate=600` (self-healing) |
| API (read) | Per-route — see below |
| API (write) | `no-store` |

### 14.7 API route caching rules

| Route | Cache? | TTL | Invalidation |
|-------|--------|-----|--------------|
| `GET /api/v1/health` | `no-store` | — | — |
| `POST /api/v1/assistant` | `no-store` | — | — |
| `GET /api/v1/voters/p134/summary` (future) | `s-maxage=300, stale-while-revalidate=3600` | 5 min fresh, 1h stale | Purge by URL on engine re-run |
| `GET /api/v1/elections/melaka` (future) | `s-maxage=86400` | 1 day | Purge by URL on elections update |

### 14.8 Cache key considerations

Cloudflare's default cache key is `(method, URL)`. To extend:

- **Vary by `Accept-Language`** — localize dashboard copy without separate URLs.
- **Vary by `X-API-Version`** — `/api/v1/...` and `/api/v2/...` are already different paths, so this is automatic.

Avoid varying by auth headers — that would defeat caching.

### 14.9 Verification

```bash
# Check if a response is cached
curl -I https://pip-mlk.example.com/data/p134/dashboard-overview.json
# Look for:
#   cf-cache-status: HIT       ← cached
#   cf-cache-status: MISS      ← not yet cached, will be after this request
#   cf-cache-status: EXPIRED   ← was cached, now revalidating
#   cf-cache-status: BYPASS    ← not cacheable (Cache-Control: no-store)
```

---

## 15. Autoscaling (Horizontal / Vertical)

### 15.1 Cloudflare Workers scaling model

Cloudflare Workers **autoscale automatically**. There is no:

- Instance count to configure
- Auto-scaling group to define
- Min/max capacity to set
- Scale-in cooldown to tune

Each Cloudflare colo runs Workers inside V8 isolates. When a request arrives:

1. If an idle isolate exists in this colo → reuse it (warm start, <5ms).
2. If not → spawn a new isolate (cold start, ~5ms).
3. If the colo is at capacity → queue the request briefly; if queue exceeds threshold → drop with HTTP 429.

There is **no theoretical concurrency limit** on a Worker — Cloudflare will spawn as many isolates as needed. The only limits are:

| Limit | Default | PIP-MLK target |
|-------|---------|-----------------|
| `cpu_ms` per request | 50ms (free), 30000ms (paid) | 50ms P99 for HTML routes, 4000ms for AI Assistant |
| Subrequests per request | 50 (free), 1000 (paid) | < 10 per dashboard render |
| Memory per isolate | 128MB | < 50MB (Next.js standalone) |
| Simultaneous isolates per colo | unlimited | (Cloudflare-managed) |

### 15.2 Horizontal vs vertical scaling

| | Horizontal | Vertical |
|---|-----------|----------|
| **What** | Add more instances (isolates, pods, containers) | Make each instance bigger (more CPU/RAM) |
| **Cloudflare Workers** | Automatic (per request) | N/A — Workers have fixed isolate size |
| **Node.js standalone** | Add more ECS tasks / K8s pods | Increase task CPU/memory |
| **DB** | Add read replicas | Upgrade to larger instance class |
| **Trade-off** | Stateless required; more connection overhead | Simpler state; ceiling on single-node throughput |

**PIP-MLK is designed for horizontal scaling**:

- ✅ Stateless Worker — all state lives in the DB or in `/data/*.json` (immutable files).
- ✅ No in-memory session store — sessions (if added) go in cookies or DB, not Worker memory.
- ✅ No sticky sessions required — any Worker can serve any request.
- ✅ Cache is per-colo (Cloudflare CDN), not per-instance — no cache-warming penalty on scale-out.

### 15.3 Stateless design rules

For horizontal scaling to work, every instance must be interchangeable:

1. **No in-memory caches** that depend on instance identity. Use the CDN (§14) or a shared cache (Cloudflare KV, Durable Objects) instead.
2. **No file-system state** — Worker isolates have ephemeral filesystems. Use R2 (object storage) for any persistent file.
3. **No long-lived connections** between requests — each request opens its own DB / API connections (or uses Hyperdrive / Prisma Accelerate for pooling).
4. **Idempotent writes** — a request retried (e.g. due to a network blip) must not double-write. Use idempotency keys on POST endpoints.

PIP-MLK already complies: the dashboard is read-mostly, the AI Assistant is stateless (each request re-builds the prompt from `/data/*.json`), and the only writes are to the DB via Prisma.

### 15.4 Node.js standalone autoscaling (fallback runtime)

If PIP-MLK runs on Node.js standalone (`.next/standalone/server.js`) instead of Cloudflare Workers, autoscaling is configured at the orchestrator:

#### ECS Fargate

```jsonc
// task-definition.json
{
  "family": "pip-mlk",
  "cpu": "512",          // 0.5 vCPU
  "memory": "1024",      // 1GB
  "requiresCompatibilities": ["FARGATE"]
}
```

```jsonc
// autoscaling-policy.json
{
  "TargetValue": 70,                  // target 70% CPU
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,             // add tasks quickly
  "ScaleInCooldown": 300,             // remove tasks slowly (avoid thrash)
  "MinCapacity": 2,                   // always-warm baseline
  "MaxCapacity": 20
}
```

#### Kubernetes (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pip-mlk
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pip-mlk
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # 5min cool-down before scale-in
      policies:
        - type: Percent
          value: 50                      # remove at most 50% of pods per scale-in
          periodSeconds: 60
```

### 15.5 Database autoscaling

SQLite (current PIP-MLK DB) does not autoscale — it's a file. When PIP-MLK graduates to Postgres:

- **Vertical** — upgrade instance class (`db.t3.micro` → `db.t3.small` → ...).
- **Horizontal reads** — add read replicas. Application reads go to replicas; writes go to primary.
- **Horizontal writes** — sharding by tenant / region. Complex; only do this when a single primary cannot keep up.

Cloudflare D1 (SQLite at the edge) is the natural Workers-native upgrade path — it shards automatically across colos.

### 15.6 Scale-in safety

When the autoscaler removes an instance:

1. **Drain** — stop sending new requests to the instance.
2. **Wait** — let in-flight requests finish (up to a grace period, e.g. 30s).
3. **SIGTERM** — send a termination signal.
4. **Cleanup** — the app calls `db.$disconnect()` and exits.

For Cloudflare Workers, this is automatic — isolates finish in-flight requests before being garbage-collected.

For Node.js standalone, wire `SIGTERM`:

```typescript
process.on("SIGTERM", async () => {
  server.close();              // stop accepting new connections
  await db.$disconnect();      // close DB pool
  process.exit(0);
});
```

### 15.7 Capacity planning

| Metric | PIP-MLK baseline | Headroom target |
|--------|-----------------|----------------|
| Dashboard renders / sec / colo | 100 (cached) / 10 (uncached) | 10× peak |
| AI Assistant calls / sec / colo | 5 | 5× peak |
| DB queries / sec / instance | 50 | 5× peak |
| DB connections / instance | 10 (pool) | 50% of `max_connections` headroom |

If any metric exceeds 50% of headroom for 1 hour, file a capacity-planning ticket.

### 15.8 Load testing

Before any major release, run a load test:

```bash
# Using k6 (https://k6.io)
k6 run --vus 50 --duration 5m scripts/load-test.js
```

```javascript
// scripts/load-test.js
import http from "k6/http";
export default function () {
  http.get("https://pip-mlk.example.com/");
  http.get("https://pip-mlk.example.com/data/p134/dashboard-overview.json");
  http.get("https://pip-mlk.example.com/api/v1/health");
}
```

Targets:

- P99 < 200ms for `/api/v1/health` at 50 VUs for 5 minutes
- Zero HTTP 5xx
- Zero HTTP 429 (rate-limited)

---

## Appendix — performance budget summary

| Budget | Target | Owner |
|--------|--------|-------|
| Initial JS payload (`/`) | < 200KB gzipped | Frontend |
| Cold start (Worker) | < 200ms P99 | Backend |
| `/api/v1/health` P99 | < 100ms | Backend |
| `/api/v1/assistant` P99 | < 4000ms | Backend |
| Static JSON P99 | < 100ms (CDN hit) | CDN |
| DB query P99 | < 50ms | Backend |
| Cache hit ratio (CDN) | > 90% for `/data/*` | CDN |
| Scale-out time | < 5s (Workers) / < 60s (ECS) | Infra |
