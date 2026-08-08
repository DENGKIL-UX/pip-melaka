/**
 * Shared runtime telemetry contract for the Ethnic Analytics v0 surfaces.
 *
 * This module is intentionally framework-agnostic: analytics services, REST
 * routes, MCP tools, and map-data handlers can all create one envelope per
 * request and pass it through shared D1/cache helpers. D1 counters are read
 * from Cloudflare's per-query metadata when available; missing metadata must
 * never fail an otherwise successful request.
 */

export type RuntimeCacheStatus = "hit" | "miss" | "stale" | "bypass";

export type RuntimeTelemetry = {
  requestId: string;
  route: string;
  tool?: string;
  authenticated: boolean;
  cacheStatus: RuntimeCacheStatus;
  queryCount: number;
  /** D1 rows scanned/read during SQL execution, not result-row count. */
  rowsRead: number;
  rowsWritten: number;
  cpuMs?: number;
  durationMs: number;
  responseBytes: number;
  status: number;
  dataVersion?: string;
};

export type RuntimeTelemetryInit = {
  requestId: string;
  route: string;
  authenticated: boolean;
  tool?: string;
  cacheStatus?: RuntimeCacheStatus;
  dataVersion?: string;
};

export type D1QueryMeta = {
  rows_read?: number;
  rows_written?: number;
  [key: string]: unknown;
};

export type D1AllResult<T> = {
  results?: T[];
  meta?: D1QueryMeta;
  [key: string]: unknown;
};

export type D1PreparedStatementLike<T = unknown> = {
  all<U = T>(): Promise<D1AllResult<U>>;
};

export const RUNTIME_TELEMETRY_WARNING_THRESHOLDS = Object.freeze({
  queryCount: 2,
  rowsRead: 100,
  responseBytes: 8 * 1024,
  cpuMsP95: 8,
  durationMsP95: 500,
  errorRate: 0.01,
});

export class RuntimeTelemetryD1Error extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RuntimeTelemetryD1Error";
    this.code = "D1_QUERY_FAILED";
    this.requestId = options.requestId;
    this.route = options.route;
    this.tool = options.tool;
    this.cause = options.cause;
  }
}

export function createRuntimeTelemetry(init) {
  return {
    requestId: init.requestId,
    route: init.route,
    tool: init.tool,
    authenticated: Boolean(init.authenticated),
    cacheStatus: init.cacheStatus ?? "bypass",
    queryCount: 0,
    rowsRead: 0,
    rowsWritten: 0,
    durationMs: 0,
    responseBytes: 0,
    status: 200,
    dataVersion: init.dataVersion,
  };
}

export function estimateResponseBytes(payload) {
  if (payload == null) return 0;
  if (typeof payload === "string") return new TextEncoder().encode(payload).byteLength;
  if (payload instanceof Uint8Array) return payload.byteLength;
  if (payload instanceof ArrayBuffer) return payload.byteLength;
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

export function finalizeRuntimeTelemetry(telemetry, startedAtMs, options = {}) {
  const finalizeOptions = options as any;
  telemetry.durationMs = Math.max(0, performance.now() - startedAtMs);
  if (typeof finalizeOptions.status === "number") telemetry.status = finalizeOptions.status;
  if (typeof finalizeOptions.cpuMs === "number") telemetry.cpuMs = Math.max(0, finalizeOptions.cpuMs);
  if (finalizeOptions.cacheStatus) telemetry.cacheStatus = finalizeOptions.cacheStatus;
  if (typeof finalizeOptions.responseBytes === "number") {
    telemetry.responseBytes = Math.max(0, finalizeOptions.responseBytes);
  } else if ("payload" in finalizeOptions) {
    telemetry.responseBytes = estimateResponseBytes(finalizeOptions.payload);
  }
  if (typeof finalizeOptions.dataVersion === "string") telemetry.dataVersion = finalizeOptions.dataVersion;
  return telemetry;
}

/**
 * Execute a D1 `.all()` statement and add query/row counters to the telemetry
 * envelope. Compatible with the Cloudflare D1 binding shape used by Workers;
 * tests intentionally cover absent metadata because local mocks and future
 * runtime changes should not break successful requests.
 */
export async function runD1(statement, telemetry) {
  telemetry.queryCount += 1;

  try {
    const result = await statement.all();
    const meta = result?.meta ?? {};

    telemetry.rowsRead += typeof meta.rows_read === "number" ? meta.rows_read : 0;
    telemetry.rowsWritten += typeof meta.rows_written === "number" ? meta.rows_written : 0;

    return Array.isArray(result?.results) ? result.results : [];
  } catch (cause) {
    telemetry.status = telemetry.status >= 400 ? telemetry.status : 500;
    throw new RuntimeTelemetryD1Error("D1 query failed", {
      requestId: telemetry.requestId,
      route: telemetry.route,
      tool: telemetry.tool,
      cause,
    });
  }
}

export function getRuntimeTelemetryWarnings(telemetry, thresholds = RUNTIME_TELEMETRY_WARNING_THRESHOLDS) {
  const warnings = [];
  if (telemetry.queryCount > thresholds.queryCount) warnings.push("queryCount");
  if (telemetry.rowsRead > thresholds.rowsRead) warnings.push("rowsRead");
  if (telemetry.responseBytes > thresholds.responseBytes) warnings.push("responseBytes");
  if (typeof telemetry.cpuMs === "number" && telemetry.cpuMs > thresholds.cpuMsP95) warnings.push("cpuMs");
  if (telemetry.durationMs > thresholds.durationMsP95) warnings.push("durationMs");
  if (telemetry.status >= 500) warnings.push("status");
  return warnings;
}
