// PIP-MLK Distributed Tracing
// ----------------------------
// A minimal in-process tracing primitive: each request can spawn one or more
// spans. A span records:
//
//   - traceId     : stable across all spans in a single trace (1 per request)
//   - spanId      : unique per span
//   - parentSpanId: the span that was active when this span started (or null)
//   - name        : human label (e.g. "GET /api/assistant")
//   - startedAt   : ms since epoch
//   - durationMs  : filled in by endSpan()
//
// The active span is stored in an AsyncLocalStorage so that logger.ts can
// attach traceId + spanId to every log line without explicit threading.
//
// Trace + span IDs are W3C-compatible (32-hex traceId, 16-hex spanId) so
// they interoperate cleanly with external collectors when present.
//
// Span lifecycle:
//   const span = startSpan("compute-forecast");
//   try { ...work... } finally { endSpan(span); }
//
// For convenience, `traceSync` and `traceAsync` wrap a function in a span.

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { logger, setTraceContextProvider } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";

// ---------------------------------------------------------------------------
// Trace context types.
// ---------------------------------------------------------------------------

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
}

export interface Span extends TraceContext {
  name: string;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  attributes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ID generators (W3C trace-context compatible lengths).
// ---------------------------------------------------------------------------

function toHex(bytes: number): string {
  const out: string[] = [];
  for (let i = 0; i < bytes; i++) {
    out.push(Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
  }
  return out.join("");
}

export function generateTraceId(): string {
  // 16 bytes = 32 hex chars. W3C forbids all-zero trace IDs; the chance of
  // collision is negligible but we re-roll just in case.
  let id = toHex(16);
  while (id === "00000000000000000000000000000000") id = toHex(16);
  return id;
}

export function generateSpanId(): string {
  // 8 bytes = 16 hex chars. W3C forbids all-zero span IDs.
  let id = toHex(8);
  while (id === "0000000000000000") id = toHex(8);
  return id;
}

// ---------------------------------------------------------------------------
// AsyncLocalStorage for the active span.
// ---------------------------------------------------------------------------

const spanStorage = new AsyncLocalStorage<Span>();

/**
 * Returns the trace context for the currently active span, or null if no
 * span is active. This function is registered with logger.ts so every log
 * entry can include traceId + spanId.
 */
export function getTraceContext(): TraceContext | null {
  const span = spanStorage.getStore();
  if (!span) return null;
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
  };
}

// Register the trace-context provider with the logger at module init time.
// Because this is a runtime lookup (logger.info calls getTraceContext()
// inside its function body), the ESM circular reference between logger.ts
// and tracing.ts is safe — both modules are fully initialized by the time
// any log call runs.
setTraceContextProvider(getTraceContext);

// ---------------------------------------------------------------------------
// Span lifecycle.
// ---------------------------------------------------------------------------

/**
 * Starts a new span. If a span is already active, the new span becomes its
 * child (parentSpanId is set); if not, a fresh trace is started. If a
 * request ID is present in the surrounding context, it is attached as an
 * attribute so traces and request IDs can be cross-correlated.
 */
export function startSpan(name: string, attributes: Record<string, unknown> = {}): Span {
  const parent = spanStorage.getStore();
  const traceId = parent?.traceId ?? generateTraceId();
  const spanId = generateSpanId();

  const span: Span = {
    name,
    traceId,
    spanId,
    parentSpanId: parent?.spanId ?? null,
    startedAt: Date.now(),
    endedAt: null,
    durationMs: null,
    attributes: {
      ...attributes,
      requestId: getRequestId(),
    },
  };

  logger.debug("span.start", { span: span.name, traceId: span.traceId, spanId: span.spanId });
  return span;
}

/**
 * Ends a span: records durationMs, marks endedAt, and emits an info-level
 * log line so the trace is observable in plain logs (no external collector
 * required). Safe to call multiple times — subsequent calls are no-ops.
 */
export function endSpan(span: Span): Span {
  if (span.endedAt !== null) return span;
  span.endedAt = Date.now();
  span.durationMs = span.endedAt - span.startedAt;

  logger.info("span.end", {
    span: span.name,
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    durationMs: span.durationMs,
    attributes: span.attributes,
  });
  return span;
}

/**
 * Runs `fn` inside a new span and ends the span automatically. Returns
 * whatever `fn` returns. If `fn` throws, the span is still ended and the
 * error is re-thrown after being recorded as an attribute.
 */
export function traceSync<T>(name: string, fn: () => T, attributes?: Record<string, unknown>): T {
  const span = startSpan(name, attributes);
  try {
    return spanStorage.run(span, fn);
  } catch (err) {
    span.attributes.error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    endSpan(span);
  }
}

/**
 * Async variant of `traceSync` for Promise-returning functions.
 */
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>,
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    return await spanStorage.run(span, fn);
  } catch (err) {
    span.attributes.error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    endSpan(span);
  }
}

/**
 * Returns the active span (full Span object, not just the public context).
 * Primarily for testing and internal tooling.
 */
export function getActiveSpan(): Span | null {
  return spanStorage.getStore() ?? null;
}

// ---------------------------------------------------------------------------
// Helper for route handlers: starts a span named after the HTTP method +
// route, attaches status + duration as attributes, and ends cleanly. The
// caller is responsible for actually invoking the handler.
// ---------------------------------------------------------------------------
export interface RouteSpanResult<T> {
  result: T;
  span: Span;
}

export function startRouteSpan(method: string, route: string, attributes: Record<string, unknown> = {}): Span {
  return startSpan(`${method} ${route}`, {
    httpMethod: method,
    httpRoute: route,
    ...attributes,
  });
}

export function endRouteSpan(span: Span, status: number): void {
  span.attributes.httpStatus = status;
  span.attributes.ok = status >= 200 && status < 400;
  endSpan(span);
}
