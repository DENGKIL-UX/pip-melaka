# PIP-MLK Observability Research

**Task ID**: OBSERVABILITY-01
**Scope**: Production-grade observability for the PIP-MLK Next.js 16 API surface.

This document captures the patterns implemented in `src/lib/` and
`src/app/api/` and explains how they interconnect. The implementation is
self-contained (no external collectors required) but exports in
Prometheus format so a real Prometheus / Grafana / Loki stack can scrape
it without code changes.

---

## 1. Health Checks

**Files**:
- `src/app/api/health/route.ts` — main aggregate health report.
- `src/app/api/health/live/route.ts` — liveness probe.
- `src/app/api/health/ready/route.ts` — readiness probe.

### Pattern: Liveness vs Readiness (Kubernetes-style)

| Probe       | Question                                          | Checks dependencies? | Failure action            |
|-------------|---------------------------------------------------|----------------------|---------------------------|
| `/live`     | Is the process running and the event loop alive?  | NO                   | Restart the pod           |
| `/ready`    | Can the process serve user traffic?               | YES (DB + memory)    | Stop routing traffic      |
| `/health`   | Full status report for ops dashboards             | YES (DB + engine + memory) | Investigate / page on-call |

**Why split liveness from readiness**: a failing database is *not* a reason
to restart the pod — the database is the problem, not the app. But it IS a
reason to stop sending the pod traffic. Conversely, if the Node.js event
loop is hung (deadlock, infinite sync loop), only the liveness probe can
catch it because the readiness probe may also hang. Splitting the two
probes avoids cascading restarts when a downstream dependency blips.

### Response schema (`GET /api/health`)

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "uptime": 12345,
  "version": "0.2.0",
  "requestId": "req-abc123...",
  "checks": {
    "database": { "status": "pass", "latencyMs": 4, "detail": "..." },
    "engine":   { "status": "pass", "detail": "...", "fileCount": 4 },
    "memory":   { "status": "pass", "detail": "...", "rssMb": 220, "heapUsedMb": 80 }
  }
}
```

**Status aggregation**:
- Any check `fail` → `degraded` (HTTP 200), unless `database` is `fail` → `unhealthy` (HTTP 503).
- Any check `warn` (no `fail`) → `degraded` (HTTP 200).
- All checks `pass` → `healthy` (HTTP 200).

**Database check** uses `db.$queryRaw\`SELECT 1\`` — schema-independent so
it works on an empty database. The Prisma client is opened lazily, so this
also serves as the connection-pool warmup.

**Engine check** verifies that the four canonical PIP-VOTER-INTELLIGENCE
output files exist under `public/data/` and are non-empty. This catches
broken deploys where the engine output is missing.

**Memory check** warns at RSS ≥ 512 MB (PIP-MLK has a known OOM issue on
4 GB sandboxes — see worklog FALLBACK-DATA-01) and fails at RSS ≥ 1 GB.

---

## 2. Metrics + Monitoring

**Files**:
- `src/lib/metrics.ts` — collector + Prometheus exporter.
- `src/app/api/metrics/route.ts` — `GET /api/metrics` scrape endpoint.

### Primitives

| Primitive             | Storage                                                       | Exposed as                                                |
|-----------------------|---------------------------------------------------------------|-----------------------------------------------------------|
| Request counter       | `Map<method+route+status, count>` (cumulative)                | `pip_mlk_http_requests_total{method,route,status}`       |
| Error counter         | integer (cumulative, status ≥ 500)                            | `pip_mlk_http_errors_total`                              |
| Latency histogram     | 11 buckets (5/10/25/50/100/250/500/1000/2500/5000/10000 ms +Inf) | `pip_mlk_http_request_duration_ms_bucket{le=...}`        |
| Rolling window        | last 5 min of `(ts, status, durationMs)` samples, max 10 000  | `pip_mlk_window_*` gauges                                |

### Why a rolling window AND a histogram?

- The **histogram** gives cumulative distribution + cheap percentiles
  (P50/P95/P99) for long-term trending, but it's bucketed so percentiles
  are approximate (linear interpolation within the containing bucket).
- The **rolling window** gives exact P99 over the last 5 minutes by
  sorting the actual samples — used by the alerting + SLO modules which
  need accurate recent rates.
- The window is capped at 10 000 samples (~80 KB) so it can't grow
  unboundedly.

### API

- `recordRequest(route, method, status, durationMs)` — call once per
  request after the response is known. Idempotent per call.
- `getMetrics()` — structured JSON snapshot for programmatic consumers.
- `formatPrometheus()` — Prometheus text exposition format.

### Prometheus output (`GET /api/metrics`)

```
# HELP pip_mlk_http_requests_total Total HTTP requests by method, route, status.
# TYPE pip_mlk_http_requests_total counter
pip_mlk_http_requests_total{method="GET",route="/api/health",status="200"} 42
pip_mlk_http_requests_total{method="POST",route="/api/assistant",status="200"} 7
...
# HELP pip_mlk_http_request_duration_ms HTTP request latency in milliseconds.
# TYPE pip_mlk_http_request_duration_ms histogram
pip_mlk_http_request_duration_ms_bucket{le="5"} 12
pip_mlk_http_request_duration_ms_bucket{le="10"} 28
...
pip_mlk_http_request_duration_ms_bucket{le="+Inf"} 49
pip_mlk_http_request_duration_ms_count 49
pip_mlk_http_request_duration_ms_sum 3821
# HELP pip_mlk_window_p99_ms P99 latency in the rolling 5-min window (ms).
# TYPE pip_mlk_window_p99_ms gauge
pip_mlk_window_p99_ms 312
```

**Content-Type**: `text/plain; version=0.0.4; charset=utf-8` (the
Prometheus standard). Use `?format=json` for a structured JSON snapshot
(metrics + alerts + SLO combined).

Each scrape also runs `checkAlerts()` so alert thresholds are evaluated
on the Prometheus scrape cadence — no separate timer required.

---

## 3. Logging

**File**: `src/lib/logger.ts`

### Pattern: Structured JSON logging

Every log line is a single JSON object written to stdout (debug/info) or
stderr (warn/error). One line = one entry — no multiline stack traces,
no ANSI colors in production. This makes logs trivially parseable by
Loki, CloudWatch Logs Insights, Elasticsearch, or `jq`.

### Schema

```json
{
  "ts": "2026-05-20T03:14:15.000Z",
  "level": "info",
  "message": "health.checked",
  "requestId": "req-abc123def456...",
  "traceId": "a1b2c3d4e5f6...",
  "spanId": "1122334455667788",
  "context": { "status": "healthy", "durationMs": 4 }
}
```

| Field       | Source                                                |
|-------------|------------------------------------------------------|
| `ts`        | ISO-8601 UTC timestamp (ms precision)                |
| `level`     | `debug` / `info` / `warn` / `error`                  |
| `message`   | Human-readable summary; dots namespace (`health.checked`) |
| `requestId` | From `AsyncLocalStorage` (see §7) — `null` outside a request |
| `traceId`   | From the active span (see §4) — `null` if no span is active |
| `spanId`    | From the active span — `null` if no span is active   |
| `context`   | Arbitrary structured key/value pairs                 |

### Level filtering

`PIP_MLK_LOG_LEVEL=debug|info|warn|error` (default `info`). Anything
below the configured level is dropped before formatting, so debug logs
have zero cost in production.

### API

```ts
import { logger } from "@/lib/logger";
logger.debug("span.start", { span: "GET /api/health" });
logger.info("health.checked", { status: "healthy", durationMs: 4 });
logger.warn("alert.raised: HighErrorRate", { value: 0.07, threshold: 0.05 });
logger.error("health.check.error", { error: "Prisma connection refused" });
```

---

## 4. Distributed Tracing

**File**: `src/lib/tracing.ts`

### Pattern: W3C-compatible trace context

Each trace gets a 32-hex-char `traceId` (16 bytes), each span a 16-hex-char
`spanId` (8 bytes). Spans form a tree via `parentSpanId`. These lengths
match the [W3C Trace Context](https://www.w3.org/TR/trace-context/) spec,
so external collectors (Jaeger, Tempo, Datadog) can ingest them directly.

### Span lifecycle

```ts
const span = startSpan("compute-forecast");
try {
  // work...
  span.attributes.inputRows = 71415;
} finally {
  endSpan(span); // logs span.end with durationMs
}
```

Or use the convenience wrappers:

```ts
const result = traceSync("compute", () => heavyWork());
const data = await traceAsync("fetch-db", async () => db.user.findMany());
```

### Active span via AsyncLocalStorage

The current span is stored in an `AsyncLocalStorage<Span>` so the logger
can read `traceId` / `spanId` without explicit threading. Spans started
inside another span automatically become children (the parent's `spanId`
becomes the child's `parentSpanId`).

### Cross-module wiring (circular dep handling)

`logger.ts` needs to read `traceId` from `tracing.ts`; `tracing.ts` needs
to write log lines via `logger.ts`. We resolve this with a **provider
registration** pattern:

```ts
// tracing.ts (at module init)
setTraceContextProvider(getTraceContext);

// logger.ts (at log time)
const trace = traceContextProvider ? traceContextProvider() : null;
```

This is a runtime lookup, not a module-load-time call, so the ESM circular
reference resolves cleanly. (Both functions are defined by the time
either is called.)

### Trace ID in API responses

Every observability-wrapped route sets `X-Request-ID` on the response (see
§7). The `traceId` is also accessible via `getTraceContext()` for handlers
that want to include it explicitly in the response body — useful for
debugging cross-service calls.

---

## 5. Alerting

**File**: `src/lib/alerting.ts`

### Pattern: Threshold-based alerting with TTL

Two built-in rules (per task spec):

| Rule ID              | Severity   | Condition                                       | Threshold |
|----------------------|------------|-------------------------------------------------|-----------|
| `high-error-rate`    | critical   | Rolling 5-min error rate (status ≥ 500)         | > 5 %     |
| `high-latency-p99`   | warning    | Rolling 5-min P99 latency                       | > 2 000 ms |

**Minimum-sample guard**: rules only fire when the rolling window has at
least 10 samples — avoids noisy alerts during cold start or low-traffic
periods.

### Alert lifecycle

1. `checkAlerts()` is called on every `/api/metrics` scrape.
2. For each firing rule, `raiseAlert()` creates or refreshes an alert in
   the in-memory store. Refreshing rolls `lastSeenAt` and `expiresAt`
   forward by the TTL (1 hour).
3. For each non-firing rule whose alert was previously active, the alert
   is left in the store but its expiry is NOT refreshed — it ages out
   within 1 hour of the last firing. This gives operators a window to
   see recently-resolved alerts.
4. `pruneExpired()` drops alerts whose `expiresAt` has passed.

### Custom rules

Other modules can register additional rules via `registerAlertRule()` or
publish stateful alerts directly via `raiseAlert(id, {...})` /
`resolveAlert(id)`.

### API

- `checkAlerts()` → `{ checkedAt, firing, resolved, active: Alert[] }`
- `getActiveAlerts()` → `Alert[]` (sorted by severity, then recency)
- `getAlert(id)` → `Alert | null`
- `raiseAlert(id, {...})` / `resolveAlert(id)` — manual API
- `registerAlertRule(rule)` — extend the rule set

---

## 6. SLOs / SLIs / Error Budgets

**File**: `src/lib/slo.ts`

### Definitions

| SLI              | Target        | Source                       | Window            |
|------------------|---------------|------------------------------|-------------------|
| Availability     | ≥ 99.9 %      | (req − err) / req, status<500| Process lifetime  |
| Latency P99      | ≤ 2 000 ms    | Rolling 5-min window         | Rolling 5 min     |
| Error rate       | ≤ 0.1 %       | Rolling 5-min window         | Rolling 5 min     |

### Status classification

For each SLI:
- **met** — clearly inside target (e.g. availability ≥ 99.91 %, latency ≤ 1 800 ms).
- **at_risk** — within 10 % of target (e.g. availability in [99.899 %, 99.9 %],
  latency in [1 800, 2 000] ms).
- **breached** — outside target (e.g. availability < 99.9 %, latency > 2 000 ms).

Overall: `breached` if any SLI is breached; else `at_risk` if any is at-risk;
else `met`.

### Error budget

For a 99.9 % availability SLO, the allowed error rate is `1 − 0.999 = 0.001`
(0.1 %). The error budget is consumed by observed errors:

```
budgetRemaining = (allowedErrorRate − observedErrorRate) / allowedErrorRate
```

- `1.0` → full budget remaining
- `0.0` → budget exhausted
- `< 0` → budget overdrawn (the SLO is breached for the window)

**Window caveat**: in this implementation, budget consumption is computed
over the 5-min rolling window, not the canonical 30-day window. The
report's `notes[]` field flags this. For production SLO tracking, persist
the metrics to Prometheus and compute over 30 days.

### API

```ts
const report = getSloStatus();
// {
//   capturedAt, availability, latency, errorRate,
//   budgetRemaining, budget, overall, notes
// }
const breach = isSloBreached(); // true if overall === "breached"
```

The `/api/metrics?format=json` endpoint includes the full SLO report
alongside metrics + alerts in a single payload.

---

## 7. Request ID Middleware

**File**: `src/lib/request-id.ts`

### Pattern: Per-request correlation ID via AsyncLocalStorage

Every API request gets a unique `req-<24-hex>` ID (96 bits of entropy).
The ID is generated at the request boundary and stashed in an
`AsyncLocalStorage<RequestContext>` so deeper layers (logger, tracing,
metrics) can read it without explicit parameter threading.

### Generation + propagation

```ts
export const GET = withRequestId(async (req) => {
  // Inside this handler:
  //   getRequestId() returns the per-request ID
  //   getRequestStartedAt() returns the start timestamp
  return NextResponse.json({ requestId: getRequestId() });
});
```

The wrapper:
1. Reads the incoming `X-Request-ID` header (if any) — reuses it when
   valid (8–128 chars, `[A-Za-z0-9_-]+`), so a request can be traced
   across gateway hops. Otherwise generates a fresh ID.
2. Enters a new `AsyncLocalStorage` context for the handler.
3. After the handler returns, sets `X-Request-ID` on the response so the
   client can correlate.

### Why AsyncLocalStorage?

Thread-local storage is the canonical way to propagate request context
in Node.js. Alternatives (explicit `reqId` parameter, global variable,
React Context) are either too verbose, unsafe under concurrency, or
don't cross async boundaries. `AsyncLocalStorage` is the
recommended approach (Node.js docs, OpenTelemetry JS).

### ESM circular dependency resolution

The logger reads trace context from tracing; tracing writes logs via
logger. This is a circular import. In ESM this works because:
1. The imports are **live bindings** — they refer to the exported
   binding, not a snapshot of its value at import time.
2. Both modules' top-level code only **defines** functions; it doesn't
   **call** them.
3. By the time any function is called (at request time), both modules
   have finished initializing.

To make this explicit and resilient, we use a **provider registration**
pattern: `tracing.ts` calls `setTraceContextProvider(getTraceContext)`
at module init, and `logger.ts` looks up the provider lazily at log
time. This is more defensive than relying on ESM binding semantics
alone.

---

## Architecture diagram (text)

```
                ┌─────────────────────────────────────────┐
                │           Next.js API route             │
                │  wrapped with withRequestId(handler)    │
                └───────────────────┬─────────────────────┘
                                    │ enters AsyncLocalStorage
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ request-id.ts   │    │ tracing.ts       │    │ logger.ts        │
   │ (ALS context)   │◄───│ (ALS span)       │◄───│ reads requestId  │
   │                 │    │ startSpan/endSpan│    │ + traceId/spanId │
   └─────────────────┘    └─────────┬────────┘    └──────────────────┘
                                    │ logs
                                    ▼
                          ┌──────────────────┐
                          │ stdout / stderr  │
                          │ (JSON lines)     │
                          └──────────────────┘

   ┌──────────────────────────────────────────────────────────────┐
   │                    metrics.ts (in-memory)                     │
   │   recordRequest() → counters + histogram + rolling window     │
   │   getMetrics()    → JSON snapshot                             │
   │   formatPrometheus() → text exposition                        │
   └────────────────────────────────┬─────────────────────────────┘
                                    │ reads
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ alerting.ts     │    │ slo.ts           │    │ /api/metrics     │
   │ checkAlerts()   │    │ getSloStatus()   │    │ (Prometheus)     │
   │ 1h TTL store    │    │ error budget     │    │ /api/metrics?    │
   │                 │    │                  │    │   format=json    │
   └─────────────────┘    └──────────────────┘    └──────────────────┘

   ┌──────────────────────────────────────────────────────────────┐
   │                       Health endpoints                         │
   │  /api/health       → DB + engine + memory (full report)       │
   │  /api/health/live  → 200 OK (liveness)                        │
   │  /api/health/ready → DB + memory (readiness gate)             │
   └──────────────────────────────────────────────────────────────┘
```

---

## What's intentionally NOT here

- **External collectors** (Prometheus server, Grafana, Loki, Jaeger):
  the implementation is self-contained. Adding them is a config-only
  change — point Prometheus at `/api/metrics`, Loki at stdout, Jaeger
  at the trace IDs in the logs.
- **OpenTelemetry SDK**: a full OTel exporter would be the next step
  for cross-service traces. The W3C-compatible IDs we generate here
  are forward-compatible — drop in OTel later and existing log lines
  still correlate.
- **Persistent metric storage**: metrics are in-memory and reset on
  process restart. For production, scrape `/api/metrics` with
  Prometheus every 15–60 s; Prometheus becomes the source of truth.
- **Auth on /api/metrics**: in production, gate this behind your
  ingress (e.g. basic auth, internal-only network). It currently
  exposes counts and latencies that could leak traffic patterns.
