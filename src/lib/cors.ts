// src/lib/cors.ts
// PIP-MLK CORS middleware — origin allowlist + preflight handler.
// Security-01: Allow only known origins to call API routes; reject everything else.

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Origin allowlist — never use "*" in production.
// Add the production domain via env so secrets stay out of source.
// ---------------------------------------------------------------------------

const PROD_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://pip-mlk.example.gov.my";

export const ALLOWED_ORIGINS: string[] = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  PROD_ORIGIN,
];

// Methods/Headers we permit on cross-origin API calls.
const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS =
  "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, X-Transform-Port";
const EXPOSED_HEADERS = "X-Request-Id, X-RateLimit-Remaining, X-RateLimit-Reset";
const MAX_AGE = "86400"; // 24h — preflight cache

/**
 * Resolve the effective origin to allow for a given request.
 * Returns the origin string if it is on the allowlist, otherwise null.
 */
export function resolveAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  // Exact-match only — no substring/wildcard tricks.
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

/**
 * Attach CORS response headers to an existing NextResponse.
 * Used by the middleware layer so every /api/* response carries the same policy.
 */
export function applyCORSHeaders(res: NextResponse, allowedOrigin: string | null): NextResponse {
  if (allowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);
  } else {
    // Explicitly unset so browsers fall back to same-origin semantics.
    res.headers.delete("Access-Control-Allow-Origin");
  }
  res.headers.set("Vary", "Origin");
  return res;
}

/**
 * Preflight OPTIONS responder. Returns 204 with the full preflight header set
 * if the origin is allowed; 403 otherwise.
 */
export function handlePreflight(req: NextRequest): NextResponse | null {
  if (req.method !== "OPTIONS") return null;
  const allowed = resolveAllowedOrigin(req);
  if (!allowed) {
    return new NextResponse(null, { status: 403 });
  }
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", allowed);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.headers.set("Access-Control-Max-Age", MAX_AGE);
  res.headers.set("Vary", "Origin");
  return res;
}

// ---------------------------------------------------------------------------
// withCORS — higher-order wrapper for App Router route handlers.
// ---------------------------------------------------------------------------

/**
 * Generic context type for a Next.js App Router route handler.
 * Next.js 16 calls every route handler as `(req, ctx)` where `ctx` has a
 * `params: Promise<Record<string, string | string[]>>` (or `params: Promise<{}>`
 * for routes without dynamic segments). We default `TCtx` to the canonical
 * shape so wrapped handlers typecheck against the Next.js validator.
 */
export type RouteContext = { params: Promise<Record<string, string | string[]>> };

type RouteHandler<TCtx> = (
  req: NextRequest,
  ctx: TCtx,
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a Next.js App Router route handler with CORS enforcement.
 *
 * Usage:
 *   export const POST = withCORS(async (req) => { ... });
 *   export const GET = withCORS(async (req) => { ... });
 *   // For routes with dynamic params:
 *   export const GET = withCORS<{ params: Promise<{ id: string }> }>(
 *     async (req, { params }) => { const { id } = await params; ... }
 *   );
 *
 * Behavior:
 *   - OPTIONS preflight → 204 with CORS headers if origin allowed, else 403.
 *   - Actual request    → invoke handler, then stamp CORS headers on response.
 *   - Disallowed origin → handler still runs, but no ACAO header is sent
 *                         (browser will block the cross-origin read).
 */
export function withCORS<TCtx = RouteContext>(
  handler: RouteHandler<TCtx>,
): RouteHandler<TCtx> {
  return async (req: NextRequest, ctx: TCtx): Promise<NextResponse> => {
    // 1. Preflight short-circuit.
    const preflight = handlePreflight(req);
    if (preflight) return preflight;

    // 2. Run the actual handler.
    const res = await handler(req, ctx);

    // 3. Stamp CORS headers on the response.
    const allowed = resolveAllowedOrigin(req);
    return applyCORSHeaders(res, allowed);
  };
}
