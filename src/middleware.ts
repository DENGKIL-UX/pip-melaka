// src/middleware.ts
// PIP-MLK Next.js Middleware — applies three security layers to every request:
//   1. Security headers (CSP, HSTS, X-Frame-Options, …) on ALL responses.
//   2. CORS allowlist on /api/* responses + OPTIONS preflight handling.
//   3. In-memory rate limiting on /api/* requests (per route policy).
//
// Security-01: this is the single chokepoint that hardens every response
// leaving the Next.js server before Caddy terminates TLS to the browser.

import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders, getSecurityHeaders } from "@/lib/security-headers";
import { resolveAllowedOrigin, handlePreflight } from "@/lib/cors";
import {
  rateLimit,
  getClientIdentifier,
  resolvePolicy,
} from "@/lib/rate-limiter";

// ---------------------------------------------------------------------------
// Matcher — run on everything EXCEPT Next.js internals / static assets.
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static, _next/image   (static assets)
     *   - favicon.ico, logo.svg       (root static files)
     *   - data/                        (served as-is from public/)
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|data/).*)",
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAPIRoute(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Stamp CORS + security headers onto a NextResponse. */
function stampHeaders(res: NextResponse, req: NextRequest): NextResponse {
  const allowed = resolveAllowedOrigin(req);
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", allowed);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  applySecurityHeaders(res);
  return res;
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ---------------------------------------------------------------------
  // API routes: CORS preflight short-circuit (returns 204 or 403).
  // ---------------------------------------------------------------------
  if (isAPIRoute(pathname)) {
    const preflight = handlePreflight(req);
    if (preflight) {
      applySecurityHeaders(preflight);
      return preflight;
    }
  }

  // ---------------------------------------------------------------------
  // API routes: rate-limit check BEFORE invoking the route handler.
  // ---------------------------------------------------------------------
  if (isAPIRoute(pathname)) {
    const policy = resolvePolicy(pathname);
    const id = getClientIdentifier(req);
    const rl = rateLimit({
      identifier: id,
      route: policy.route,
      limit: policy.limit,
      windowSeconds: policy.windowSeconds,
    });

    if (!rl.success) {
      const res = NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Retry after ${rl.retryAfter}s.`,
          retry_after: rl.retryAfter,
        },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(rl.retryAfter));
      res.headers.set("X-RateLimit-Limit", String(rl.limit));
      res.headers.set("X-RateLimit-Remaining", "0");
      res.headers.set("X-RateLimit-Reset", String(rl.reset));
      // 429 still needs CORS + security headers so the browser can surface
      // the error to the originating client code.
      return stampHeaders(res, req);
    }

    // Forward the rate-limit info as request headers so route handlers
    // can read them and echo X-RateLimit-* on their own responses if needed.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-ratelimit-limit", String(rl.limit));
    requestHeaders.set("x-ratelimit-remaining", String(rl.remaining));
    requestHeaders.set("x-ratelimit-reset", String(rl.reset));

    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });

    res.headers.set("X-RateLimit-Limit", String(rl.limit));
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));
    return stampHeaders(res, req);
  }

  // ---------------------------------------------------------------------
  // Non-API routes — just stamp security headers on the response.
  // ---------------------------------------------------------------------
  const res = NextResponse.next({
    request: { headers: req.headers },
  });
  applySecurityHeaders(res);
  return res;
}

// Re-export so route handlers can import the same source of truth.
export { getSecurityHeaders };
