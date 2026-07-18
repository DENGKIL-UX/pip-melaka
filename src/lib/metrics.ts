// PIP-MLK Metrics Collector
// --------------------------
// In-process metrics for the PIP-MLK API surface. Three primitives:
//
//   1. Request counter — total requests per (method, route, status).
//   2. Latency histogram — global bucketed distribution of response times.
//   3. Error counter — responses with status >= 500.
//
// Plus a rolling 5-minute window of (ts, status, durationMs) samples so
// alerting and SLO modules can compute recent error rate + P99 without
// scanning the full cumulative history.
//
// Two export formats:
//   - getMetrics()        → structured JSON snapshot (for /api/health, etc.)
//   - formatPrometheus()  → Prometheus text exposition format (/api/metrics)
//
// All state is in-memory and process-local. On a multi-instance deploy the
// caller would aggregate via a Prometheus server.

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Configuration.
// ---------------------------------------------------------------------------

/** Histogram bucket upper bounds in milliseconds. Covers 5ms → 10s+. */
export const LATENCY_BUCKETS_MS = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
] as const;

/** Rolling window length (ms) for recent-rate calculations. */
const ROLLING_WINDOW_MS = 5 * 60 * 1000;

/** Max samples kept in the rolling window (oldest evicted first). */
const ROLLING_WINDOW_MAX = 10_000;

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

export interface MetricsSnapshot {
  capturedAt: string;
  processStartedAt: string;
  processUptimeSeconds: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latency: {
    count: number;
    sumMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    buckets: Array<{ le: number; count: number }>;
  };
  routes: Array<{
    method: string;
    route: string;
    status: number;
    count: number;
  }>;
  window: {
    durationMs: number;
    requestCount: number;
    errorCount: number;
    errorRate: number;
    p99Ms: number;
    requestsPerSecond: number;
  };
}

interface CounterKey {
  method: string;
  route: string;
  status: number;
}

interface Sample {
  ts: number;
  status: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Module state. Single-process; safe for concurrent async access (no shared
// mutable buffers being read by multiple workers).
// ---------------------------------------------------------------------------

const processStartedAt = Date.now();

const requestCountTotal = { value: 0 };
const errorCountTotal = { value: 0 };
const routeCounters = new Map<string, number>();
const latencyBuckets = new Array<number>(LATENCY_BUCKETS_MS.length + 1).fill(0); // last bucket = +Inf
let latencyCount = 0;
let latencySum = 0;
let latencyMin = Number.POSITIVE_INFINITY;
let latencyMax = 0;

// Rolling window — array used as ring; we periodically prune old samples.
const window: Sample[] = [];

function counterKey(k: CounterKey): string {
  return `${k.method} ${k.route} ${k.status}`;
}

function bucketIndexForDuration(durationMs: number): number {
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
    if (durationMs <= LATENCY_BUCKETS_MS[i]) return i;
  }
  return LATENCY_BUCKETS_MS.length; // +Inf bucket
}

function pruneWindow(now: number): void {
  const cutoff = now - ROLLING_WINDOW_MS;
  // Drop from the front while oldest is too old.
  while (window.length > 0 && window[0].ts < cutoff) {
    window.shift();
  }
  // Hard cap on size.
  while (window.length > ROLLING_WINDOW_MAX) {
    window.shift();
  }
}

// ---------------------------------------------------------------------------
// Public API: recordRequest.
// ---------------------------------------------------------------------------

/**
 * Records a single request observation. Call this once per request, after
 * the response status and duration are known. Idempotent per call (no
 * deduplication — every call counts).
 */
export function recordRequest(
  route: string,
  method: string,
  status: number,
  durationMs: number,
): void {
  // Top-level totals.
  requestCountTotal.value++;
  if (status >= 500) errorCountTotal.value++;

  // Per-route counter.
  const key = counterKey({ method, route, status });
  routeCounters.set(key, (routeCounters.get(key) ?? 0) + 1);

  // Latency histogram.
  const safeDuration = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
  latencyBuckets[bucketIndexForDuration(safeDuration)]++;
  latencyCount++;
  latencySum += safeDuration;
  if (safeDuration < latencyMin) latencyMin = safeDuration;
  if (safeDuration > latencyMax) latencyMax = safeDuration;

  // Rolling window.
  const now = Date.now();
  window.push({ ts: now, status, durationMs: safeDuration });
  pruneWindow(now);
}

// ---------------------------------------------------------------------------
// Percentile computation.
// ---------------------------------------------------------------------------

/**
 * Computes a percentile (0–100) from the cumulative histogram via linear
 * interpolation within the containing bucket. Returns 0 if no samples.
 */
export function percentileFromHistogram(p: number): number {
  if (latencyCount === 0) return 0;
  const target = (p / 100) * latencyCount;

  let cumulative = 0;
  let prevLe = 0;
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
    const le = LATENCY_BUCKETS_MS[i];
    const bucketCount = latencyBuckets[i];
    if (cumulative + bucketCount >= target) {
      // The p-th percentile lies inside this bucket.
      if (bucketCount === 0) return le;
      const position = (target - cumulative) / bucketCount;
      return prevLe + position * (le - prevLe);
    }
    cumulative += bucketCount;
    prevLe = le;
  }
  // Falls in the +Inf bucket — return the max observed.
  return latencyMax;
}

/**
 * Computes a percentile (0–100) from the rolling-window samples by sorting.
 * More accurate than the histogram at the cost of a sort per call.
 */
export function percentileFromWindow(p: number): number {
  if (window.length === 0) return 0;
  const sorted = window.map((s) => s.durationMs).sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Public API: getMetrics.
// ---------------------------------------------------------------------------

export function getMetrics(): MetricsSnapshot {
  const now = Date.now();
  pruneWindow(now);

  const windowErrorCount = window.filter((s) => s.status >= 500).length;
  const windowRequestCount = window.length;
  const windowErrorRate = windowRequestCount > 0 ? windowErrorCount / windowRequestCount : 0;
  const windowP99 = percentileFromWindow(99);
  const windowAgeSpan = window.length > 0 ? now - window[0].ts : 0;
  const windowDurationMs = Math.min(ROLLING_WINDOW_MS, windowAgeSpan);
  const rps = windowDurationMs > 0 ? (windowRequestCount / windowDurationMs) * 1000 : 0;

  const routes: MetricsSnapshot["routes"] = [];
  for (const [key, count] of routeCounters.entries()) {
    const [method, ...rest] = key.split(" ");
    const status = Number(rest[rest.length - 1]);
    const route = rest.slice(0, -1).join(" ");
    routes.push({ method: method ?? "UNKNOWN", route, status, count });
  }
  routes.sort((a, b) => b.count - a.count);

  const buckets: MetricsSnapshot["latency"]["buckets"] = LATENCY_BUCKETS_MS.map((le, i) => ({
    le,
    count: latencyBuckets[i],
  }));
  buckets.push({ le: Number.POSITIVE_INFINITY, count: latencyBuckets[LATENCY_BUCKETS_MS.length] });

  return {
    capturedAt: new Date(now).toISOString(),
    processStartedAt: new Date(processStartedAt).toISOString(),
    processUptimeSeconds: Math.floor((now - processStartedAt) / 1000),
    requestCount: requestCountTotal.value,
    errorCount: errorCountTotal.value,
    errorRate: requestCountTotal.value > 0 ? errorCountTotal.value / requestCountTotal.value : 0,
    latency: {
      count: latencyCount,
      sumMs: latencySum,
      avgMs: latencyCount > 0 ? latencySum / latencyCount : 0,
      minMs: latencyCount > 0 ? latencyMin : 0,
      maxMs: latencyMax,
      p50Ms: percentileFromHistogram(50),
      p95Ms: percentileFromHistogram(95),
      p99Ms: percentileFromHistogram(99),
      buckets,
    },
    routes,
    window: {
      durationMs: windowDurationMs,
      requestCount: windowRequestCount,
      errorCount: windowErrorCount,
      errorRate: windowErrorRate,
      p99Ms: windowP99,
      requestsPerSecond: rps,
    },
  };
}

// ---------------------------------------------------------------------------
// Prometheus text exposition format.
// ---------------------------------------------------------------------------

function prometheusNumber(n: number): string {
  if (!Number.isFinite(n)) return "+Inf";
  return Number.isInteger(n) ? String(n) : n.toFixed(6).replace(/\.?0+$/, "");
}

/**
 * Returns the metrics in Prometheus text exposition format (version 0.0.4).
 * Suitable for serving from `GET /api/metrics` with Content-Type
 * `text/plain; version=0.0.4; charset=utf-8`.
 */
export function formatPrometheus(): string {
  const m = getMetrics();
  const lines: string[] = [];

  // --- Request count ---
  lines.push("# HELP pip_mlk_http_requests_total Total HTTP requests by method, route, status.");
  lines.push("# TYPE pip_mlk_http_requests_total counter");
  for (const r of m.routes) {
    lines.push(
      `pip_mlk_http_requests_total{method="${r.method}",route="${r.route}",status="${r.status}"} ${r.count}`,
    );
  }
  lines.push("");

  // --- Error count ---
  lines.push("# HELP pip_mlk_http_errors_total Total HTTP responses with status >= 500.");
  lines.push("# TYPE pip_mlk_http_errors_total counter");
  lines.push(`pip_mlk_http_errors_total ${m.errorCount}`);
  lines.push("");

  // --- Latency histogram ---
  lines.push("# HELP pip_mlk_http_request_duration_ms HTTP request latency in milliseconds.");
  lines.push("# TYPE pip_mlk_http_request_duration_ms histogram");
  let cumulative = 0;
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
    cumulative += m.latency.buckets[i].count;
    const le = LATENCY_BUCKETS_MS[i];
    lines.push(
      `pip_mlk_http_request_duration_ms_bucket{le="${le}"} ${cumulative}`,
    );
  }
  cumulative += m.latency.buckets[m.latency.buckets.length - 1].count;
  lines.push(`pip_mlk_http_request_duration_ms_bucket{le="+Inf"} ${cumulative}`);
  lines.push(`pip_mlk_http_request_duration_ms_count ${m.latency.count}`);
  lines.push(`pip_mlk_http_request_duration_ms_sum ${prometheusNumber(m.latency.sumMs)}`);
  lines.push("");

  // --- Latency quantiles (from histogram) ---
  lines.push("# HELP pip_mlk_http_request_duration_ms_quantile Latency quantiles in ms (from histogram).");
  lines.push("# TYPE pip_mlk_http_request_duration_ms_quantile gauge");
  lines.push(`pip_mlk_http_request_duration_ms_quantile{quantile="0.5"} ${prometheusNumber(m.latency.p50Ms)}`);
  lines.push(`pip_mlk_http_request_duration_ms_quantile{quantile="0.95"} ${prometheusNumber(m.latency.p95Ms)}`);
  lines.push(`pip_mlk_http_request_duration_ms_quantile{quantile="0.99"} ${prometheusNumber(m.latency.p99Ms)}`);
  lines.push("");

  // --- Window gauges (5-min rolling) ---
  lines.push("# HELP pip_mlk_window_requests_total Requests observed in the rolling 5-min window.");
  lines.push("# TYPE pip_mlk_window_requests_total gauge");
  lines.push(`pip_mlk_window_requests_total ${m.window.requestCount}`);
  lines.push("# HELP pip_mlk_window_errors_total Errors observed in the rolling 5-min window.");
  lines.push("# TYPE pip_mlk_window_errors_total gauge");
  lines.push(`pip_mlk_window_errors_total ${m.window.errorCount}`);
  lines.push("# HELP pip_mlk_window_error_rate Error rate in the rolling 5-min window (0..1).");
  lines.push("# TYPE pip_mlk_window_error_rate gauge");
  lines.push(`pip_mlk_window_error_rate ${prometheusNumber(m.window.errorRate)}`);
  lines.push("# HELP pip_mlk_window_p99_ms P99 latency in the rolling 5-min window (ms).");
  lines.push("# TYPE pip_mlk_window_p99_ms gauge");
  lines.push(`pip_mlk_window_p99_ms ${prometheusNumber(m.window.p99Ms)}`);
  lines.push("# HELP pip_mlk_window_requests_per_second Request rate in the rolling 5-min window.");
  lines.push("# TYPE pip_mlk_window_requests_per_second gauge");
  lines.push(`pip_mlk_window_requests_per_second ${prometheusNumber(m.window.requestsPerSecond)}`);
  lines.push("");

  // --- Process uptime ---
  lines.push("# HELP pip_mlk_process_uptime_seconds Seconds since the metrics process started.");
  lines.push("# TYPE pip_mlk_process_uptime_seconds gauge");
  lines.push(`pip_mlk_process_uptime_seconds ${m.processUptimeSeconds}`);

  logger.debug("metrics.exported", {
    requestCount: m.requestCount,
    routes: m.routes.length,
    windowSize: m.window.requestCount,
  });

  return lines.join("\n") + "\n";
}
