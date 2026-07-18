# OBSERVABILITY-01 — main agent work record

**Task ID**: OBSERVABILITY-01
**Agent**: main
**Date**: 2026-07-18
**Scope**: Research and implement observability patterns for the PIP-MLK Next.js 16 API surface.

## Prior agent context reviewed

- `worklog.md` — read in full (7 tasks recorded before this one). Key prior work: PIP-MLK engine extraction (P134, 71,415 voters), 10 dashboard tabs, AI Assistant + DUN Drawer + Theme Toggle, fallback-data layer for OOM resilience, security hardening (CSP, rate limiting, JWT, SSRF protection, secrets check, CSRF). Project is Next.js 16.1.3 + Turbopack + Prisma 6 + SQLite + Tailwind 4 + shadcn/ui (New York).
- `agent-ctx/FALLBACK-DATA-01-main.md`, `BUILD-TABS-01-main.md`, `AI-ASSISTANT-01-main.md` — reviewed for project conventions: `"use client"` for components, MLK amber-gold theme classes, real P134 engine data in `public/data/`, all fetches use relative paths (Caddy-compatible), files kept under 300 lines where possible.
- Existing `src/lib/db.ts` (Prisma client singleton), `prisma/schema.prisma` (User + Post models), `src/app/api/assistant/route.ts` (reference for route handler style), `package.json` (z-ai-web-dev-sdk, Prisma, next-themes, framer-motion, zustand, etc.).

## Files created

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/request-id.ts` | ~145 | Request ID middleware: AsyncLocalStorage, `withRequestId` Next.js 16 wrapper, `X-Request-ID` header propagation. |
| `src/lib/logger.ts` | ~165 | Structured JSON logger: 4 levels, timestamp, level, message, requestId, traceId, spanId, context. Level filtering via `PIP_MLK_LOG_LEVEL`. |
| `src/lib/tracing.ts` | ~225 | Distributed tracing: W3C-compatible traceId/spanId, `startSpan`/`endSpan`/`traceSync`/`traceAsync`, AsyncLocalStorage-based active span. |
| `src/lib/metrics.ts` | ~290 | Metrics collector: per-route request counter, global latency histogram (11 buckets), rolling 5-min window, Prometheus text exporter. |
| `src/lib/alerting.ts` | ~245 | Threshold-based alerting: HighErrorRate (>5%), HighLatencyP99 (>2s), 1h TTL store, extensible rule registration. |
| `src/lib/slo.ts` | ~225 | SLIs (availability 99.9%, latency P99 <2s, error rate <0.1%), error budget tracking, met/at_risk/breached classification. |
| `src/app/api/health/route.ts` | ~205 | GET /api/health: database + engine + memory checks, healthy/degraded/unhealthy status, HTTP 200/503. |
| `src/app/api/health/live/route.ts` | ~35 | GET /api/health/live: liveness probe (always 200 if process is alive). |
| `src/app/api/health/ready/route.ts` | ~85 | GET /api/health/ready: readiness probe (checks DB + memory, 200/503). |
| `src/app/api/metrics/route.ts` | ~75 | GET /api/metrics: Prometheus text exposition format. `?format=json` for structured snapshot. |
| `docs/RESEARCH-OBSERVABILITY.md` | ~440 | Research document covering all 7 patterns + architecture diagram + "what's intentionally NOT here". |

## Files modified
- `db/custom.db` — created via `bun run db:push` (was missing; DATABASE_URL pointed at a non-existent file). The health check's database probe now has a real DB to query.

## Key design decisions

### 1. ESM circular dependency: logger ↔ tracing
`logger.ts` needs `traceId` from `tracing.ts`; `tracing.ts` logs via `logger.ts`. Resolved with a **provider registration** pattern — `tracing.ts` calls `setTraceContextProvider(getTraceContext)` at module init; `logger.ts` looks up the provider lazily at log time. This is more defensive than relying on ESM live-binding semantics alone and survives any future build-system changes.

### 2. Liveness vs Readiness split (Kubernetes-style)
- `/api/health/live` — no dependency checks. "Is the process alive?" Failure → restart pod.
- `/api/health/ready` — checks DB + memory. "Can we serve traffic?" Failure → stop routing (don't restart).
- `/api/health` — full report for ops dashboards. Engine + memory + database checks; status aggregation rules (database fail = unhealthy, others = degraded).

This split prevents cascading restarts when a downstream dependency blips — a failing database is the database's problem, not a reason to kill the app pod.

### 3. Histogram + rolling window (dual storage)
- **Histogram** (cumulative bucket counts): cheap percentiles for long-term trending, but approximate (linear interpolation within the containing bucket).
- **Rolling 5-min window** (last 10 000 samples): exact P99 via sort+index, used by alerting/SLO modules which need accurate recent rates.
- Capped at 10 000 samples (~80 KB) — can't grow unboundedly.

### 4. Error budget computation
For 99.9% availability SLO: `allowedErrorRate = 1 - 0.999 = 0.001`. `budgetRemaining = (allowed - observed) / allowed`. 1.0 = full, 0.0 = exhausted, <0 = overdrawn. Window caveat (5-min vs canonical 30-day) explicitly noted in `getSloStatus().notes[]`.

### 5. `withRequestId` wrapper signature
Updated to return the canonical Next.js 16 signature `(req, ctx: RouteHandlerContext) => Promise<Response>` so it satisfies the route handler type validator. Callers can still write `withRequestId(async (req) => ...)` — TypeScript allows fewer parameters.

### 6. Alerting minimum-sample guard
Rules only fire when the rolling window has ≥10 samples — avoids noisy alerts during cold start or low-traffic periods.

### 7. Pull-driven alerting
`checkAlerts()` runs on every `/api/metrics` scrape. This means alert freshness is tied to the Prometheus scrape cadence (typically 15–60s) — no separate timer/interval needed in the app process.

## Verification

- `bun run lint`: **0 errors, 1 pre-existing warning** (`react/no-danger` on untouched `src/components/ui/chart.tsx`).
- `bunx tsc --noEmit --skipLibCheck`: **0 errors** in any new file. All remaining TS errors are pre-existing in `examples/`, `skills/`, `src/components/tabs/`, `src/lib/db-optimization.ts`, `src/lib/websocket-server.ts`.
- Runtime smoke test (Bun script importing all 7 modules): all behaviors verified end-to-end:
  - Logger emits JSON with all 7 fields populated.
  - Tracing spans log `span.end` with `durationMs`, parent/child span linkage works.
  - Metrics: 5 recordRequest calls → `requestCount: 5, errorCount: 1, p99Ms: 2425, p50Ms: 75`. Prometheus export valid.
  - Alerting: 20 errors → `HighErrorRate` (critical) fires.
  - SLO: 20 errors → `overall: "breached"`, budget remaining `-839` (overdrawn).

## Issues / caveats for future agents

1. **Dev server was down** at task completion (pre-existing OOM crash on 4GB sandbox, see FALLBACK-DATA-01). Per instructions I did not restart it. When the system restarts it, the 4 new routes will compile on first hit. Verify by `curl http://localhost:3000/api/health/live` (expect 200 + `{status:"alive",uptime:N}`).
2. **SLO window is 5-min, not 30-day** — production deployment should persist `/api/metrics` to Prometheus and compute 30-day windows in PromQL.
3. **Alerting + metrics storage is process-local** — multi-instance deployments need Redis/Upstash backing. The `raiseAlert(id, {...})` and `registerAlertRule(rule)` APIs are designed so the storage backend can be swapped without changing call sites.
4. **No auth on `/api/metrics`** — gate behind ingress in production (basic auth, internal-only, mTLS).
5. **No OTel SDK** — W3C-compatible trace IDs are forward-compatible; adding OTel later requires only wrapping `startSpan` to also create an OTel span + configuring an OTLP exporter.

## Pattern → file map (for future agents wanting to extend)

| Pattern | File | Key exports |
|---------|------|-------------|
| Request ID | `src/lib/request-id.ts` | `withRequestId`, `getRequestId`, `withRequestIdContext`, `RouteHandlerContext` |
| Logging | `src/lib/logger.ts` | `logger.{debug,info,warn,error}`, `setTraceContextProvider`, `elapsedSinceRequestStart` |
| Tracing | `src/lib/tracing.ts` | `startSpan`, `endSpan`, `traceSync`, `traceAsync`, `getTraceContext`, `startRouteSpan`, `endRouteSpan` |
| Metrics | `src/lib/metrics.ts` | `recordRequest`, `getMetrics`, `formatPrometheus`, `percentileFromHistogram`, `percentileFromWindow` |
| Alerting | `src/lib/alerting.ts` | `checkAlerts`, `getActiveAlerts`, `raiseAlert`, `resolveAlert`, `registerAlertRule`, `getDefaultAlertRules` |
| SLO | `src/lib/slo.ts` | `getSloStatus`, `isSloBreached`, `SLO_TARGETS`, `SLO_AVAILABILITY`, `SLO_LATENCY_P99`, `SLO_ERROR_RATE` |
| Health | `src/app/api/health/route.ts` | `GET` (default export via `withRequestId`) |
| Liveness | `src/app/api/health/live/route.ts` | `GET` |
| Readiness | `src/app/api/health/ready/route.ts` | `GET` |
| Metrics scrape | `src/app/api/metrics/route.ts` | `GET` (supports `?format=json`, `?record=0`) |
| Docs | `docs/RESEARCH-OBSERVABILITY.md` | (reference) |
