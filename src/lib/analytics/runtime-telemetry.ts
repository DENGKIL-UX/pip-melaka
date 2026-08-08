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
  /** Rows actually returned in `results` by D1 `.all()`, distinct from rows scanned/read. */
  resultRows: number;
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

export type RuntimeTelemetryWarningThresholds = {
  queryCount: number;
  rowsRead: number;
  responseBytes: number;
  cpuMsP95: number;
  durationMsP95: number;
  errorRate: number;
};

export type TelemetryErrorOptions = {
  requestId?: string;
  route?: string;
  tool?: string;
  cause?: unknown;
};

export class RuntimeTelemetryD1Error extends Error {
  readonly code = "D1_QUERY_FAILED";
  requestId?: string;
  route?: string;
  tool?: string;
  cause?: unknown;

  constructor(message: string, options: TelemetryErrorOptions = {}) {
    super(message);
    this.name = "RuntimeTelemetryD1Error";
    this.requestId = options.requestId;
    this.route = options.route;
    this.tool = options.tool;
    this.cause = options.cause;
  }
}

export function createRuntimeTelemetry(init: RuntimeTelemetryInit): RuntimeTelemetry {
  return {
    requestId: init.requestId,
    route: init.route,
    tool: init.tool,
    authenticated: Boolean(init.authenticated),
    cacheStatus: init.cacheStatus ?? "bypass",
    queryCount: 0,
    rowsRead: 0,
    resultRows: 0,
    rowsWritten: 0,
    durationMs: 0,
    responseBytes: 0,
    status: 200,
    dataVersion: init.dataVersion,
  };
}

export function estimateResponseBytes(payload: unknown): number {
  if (payload == null) return 0;
  if (typeof payload === "string") return new TextEncoder().encode(payload).byteLength;
  if (payload instanceof Uint8Array) return payload.byteLength;
  if (payload instanceof ArrayBuffer) return payload.byteLength;
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

export type FinalizeOptions = {
  status?: number;
  cpuMs?: number;
  cacheStatus?: RuntimeCacheStatus;
  responseBytes?: number;
  payload?: unknown;
  dataVersion?: string;
};

export function finalizeRuntimeTelemetry(
  telemetry: RuntimeTelemetry,
  startedAtMs: number,
  options: FinalizeOptions = {}
): RuntimeTelemetry {
  telemetry.durationMs = Math.max(0, performance.now() - startedAtMs);
  if (typeof options.status === "number") telemetry.status = options.status;
  if (typeof options.cpuMs === "number") telemetry.cpuMs = Math.max(0, options.cpuMs);
  if (options.cacheStatus) telemetry.cacheStatus = options.cacheStatus;
  if (typeof options.responseBytes === "number") {
    telemetry.responseBytes = Math.max(0, options.responseBytes);
  } else if ("payload" in options) {
    telemetry.responseBytes = estimateResponseBytes(options.payload);
  }
  if (typeof options.dataVersion === "string") telemetry.dataVersion = options.dataVersion;
  return telemetry;
}

/**
 * Execute a D1 `.all()` statement and add query/row counters to the telemetry
 * envelope. Compatible with the Cloudflare D1 binding shape used by Workers;
 * tests intentionally cover absent metadata because local mocks and future
 * runtime changes should not break successful requests.
 */
export async function runD1<T = unknown>(
  statement: D1PreparedStatementLike<T>,
  telemetry: RuntimeTelemetry
): Promise<T[]> {
  telemetry.queryCount += 1;

  try {
    const result = await statement.all<T>();
    const meta = result?.meta ?? {};

    telemetry.rowsRead += typeof meta.rows_read === "number" ? meta.rows_read : 0;
    telemetry.resultRows += result?.results?.length ?? 0;
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

export function getRuntimeTelemetryWarnings(
  telemetry: RuntimeTelemetry,
  thresholds: RuntimeTelemetryWarningThresholds = RUNTIME_TELEMETRY_WARNING_THRESHOLDS
): string[] {
  const warnings: string[] = [];
  if (telemetry.queryCount > thresholds.queryCount) warnings.push("queryCount");
  if (telemetry.rowsRead > thresholds.rowsRead) warnings.push("rowsRead");
  if (telemetry.responseBytes > thresholds.responseBytes) warnings.push("responseBytes");
  if (typeof telemetry.cpuMs === "number" && telemetry.cpuMs > thresholds.cpuMsP95) warnings.push("cpuMs");
  if (telemetry.durationMs > thresholds.durationMsP95) warnings.push("durationMs");
  if (telemetry.status >= 500) warnings.push("status");
  return warnings;
}
