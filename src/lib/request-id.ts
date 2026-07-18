// PIP-MLK Request ID middleware — generates a unique ID per API request and
// propagates it through logs, traces, and response headers (X-Request-ID).
//
// Truth Above All: every request that touches the PIP-MLK API surface MUST
// carry a request ID so that downstream logs, metrics, traces, and alerts
// can be correlated end-to-end. The ID is generated here, stashed in an
// AsyncLocalStorage so deeper layers (logger / tracing / metrics) can read
// it without explicit threading, and emitted on the response header.
//
// Usage in a Next.js Route Handler:
//
//   import { withRequestId, getRequestId } from "@/lib/request-id";
//   import { NextResponse } from "next/server";
//
//   export const GET = withRequestId(async (req) => {
//     // getRequestId() now returns the per-request ID
//     return NextResponse.json({ ok: true, requestId: getRequestId() });
//   });
//
// The wrapper also accepts an incoming X-Request-ID header (e.g. forwarded
// by a gateway) and reuses it when present, so a request can be traced
// across hops.

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Next.js 16 App Router route-handler context type. We declare it here so
// the `withRequestId` wrapper can return a function with the exact
// signature Next.js's type validator expects, while still allowing callers
// to omit the `ctx` parameter when they don't need it.
// ---------------------------------------------------------------------------

export interface RouteHandlerContext<TParams = Record<string, string | string[]>> {
  params: Promise<TParams>;
}

// ---------------------------------------------------------------------------
// Request ID format: "req-" + 24 hex chars (96 bits of entropy).
// Compact, sortable-friendly prefix, easy to grep in logs.
// ---------------------------------------------------------------------------

const REQUEST_ID_PREFIX = "req-";

export function generateRequestId(): string {
  // randomUUID() returns 36 chars with dashes; strip them and truncate.
  const hex = randomUUID().replace(/-/g, "");
  return `${REQUEST_ID_PREFIX}${hex.slice(0, 24)}`;
}

export function isValidRequestId(id: string | null | undefined): id is string {
  if (!id || typeof id !== "string") return false;
  if (id.length < 8 || id.length > 128) return false;
  // Allow only safe characters: letters, digits, dashes, underscores.
  return /^[A-Za-z0-9_-]+$/.test(id);
}

// ---------------------------------------------------------------------------
// AsyncLocalStorage — keeps the current request ID alive for the duration
// of a request without explicit parameter passing. This is the canonical
// Node.js pattern for request-scoped context.
// ---------------------------------------------------------------------------

interface RequestContext {
  requestId: string;
  startedAt: number;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Returns the current request ID, or null if called outside a request.
 */
export function getRequestId(): string | null {
  return requestContextStorage.getStore()?.requestId ?? null;
}

/**
 * Returns the timestamp (ms since epoch) at which the current request
 * context was entered. Useful for computing request duration in logs.
 */
export function getRequestStartedAt(): number | null {
  return requestContextStorage.getStore()?.startedAt ?? null;
}

/**
 * Runs `fn` inside a new request context. If `incomingId` is provided and
 * valid (e.g. from an X-Request-ID header), it is reused; otherwise a fresh
 * ID is generated. Returns whatever `fn` returns.
 */
export function withRequestIdContext<T>(
  incomingId: string | null | undefined,
  fn: () => T,
): T {
  const requestId = isValidRequestId(incomingId) ? (incomingId as string) : generateRequestId();
  return requestContextStorage.run({ requestId, startedAt: Date.now() }, fn);
}

// ---------------------------------------------------------------------------
// Next.js Route Handler wrapper — high-level convenience for App Router.
// ---------------------------------------------------------------------------

/**
 * Wraps a Next.js App Router handler (GET/POST/...) so that:
 *   1. A request ID is generated (or reused from the incoming header).
 *   2. The handler runs inside a request context (getRequestId() works).
 *   3. The response carries X-Request-ID header.
 *
 * The wrapper always returns a function with the Next.js 16 canonical
 * signature `(req, ctx) => Promise<Response>` so it satisfies the route
 * handler type validator. The wrapped handler may use either `(req)` or
 * `(req, ctx)` — TypeScript's function-compatibility rule allows fewer
 * parameters, so both forms work.
 *
 * The handler may return NextResponse, Response, or throw; the wrapper
 * preserves the original behaviour and only adds the context + headers.
 */
export function withRequestId<TParams = Record<string, string | string[]>>(
  handler: (
    req: NextRequest,
    ctx: RouteHandlerContext<TParams>,
  ) => Promise<Response> | Response,
): (req: NextRequest, ctx: RouteHandlerContext<TParams>) => Promise<Response> {
  return async (req: NextRequest, ctx: RouteHandlerContext<TParams>): Promise<Response> => {
    const incoming = req.headers.get("x-request-id");
    return withRequestIdContext(incoming, async () => {
      const response = await handler(req, ctx);
      // Attach the request ID to the response so clients can correlate.
      // NextResponse and raw Response both support .headers.set().
      try {
        const rid = getRequestId();
        if (rid) {
          response.headers.set("x-request-id", rid);
        }
      } catch {
        // Some Response variants (e.g. opaque) may reject header writes.
        // Non-fatal — the request still completes normally.
      }
      return response;
    });
  };
}

/**
 * Generates a request ID without entering a context. Useful for tests or
 * for code paths that want an ID but cannot use the wrapper (e.g. a
 * streaming response that needs the ID up front).
 */
export function createRequestId(incomingId?: string | null): string {
  return isValidRequestId(incomingId) ? (incomingId as string) : generateRequestId();
}
