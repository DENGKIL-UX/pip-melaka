// src/middleware.ts
// PIP-MLK Security + resilience middleware.
//
// This is the single chokepoint that runs BEFORE every `/api/*` request. It
// was previously unimplemented even though `src/lib/rate-limiter.ts` and
// `src/lib/security-headers.ts` shipped fully built — this wires them in.
//
// NOTE on the Next.js 16 convention: Next renamed `middleware.ts` to
// `proxy.ts`, and a `proxy.ts` file is ALWAYS treated as Node.js middleware.
// OpenNext / Cloudflare Workers cannot run Node middleware, so we keep the
// classic `middleware.ts` file, which Next compiles as EDGE middleware
// (supported on Workers). Do NOT rename this back to `proxy.ts` or the
// Cloudflare build will fail with "Node.js middleware is not currently
// supported".
//
// What it does per /api request:
//   1. OPTIONS preflight  → passes through (CORS handled by next.config.ts).
//   2. Rate-limit         → fixed-window per-IP limit via resolvePolicy().
//      Rejects with 429 + Retry-After when exceeded.
//   3. Security headers   → applySecurityHeaders() on every API response
//      (CSP, HSTS, XFO, Permissions-Policy, etc).
//
// Edge-runtime safe: imports only edge-safe modules (no node:*), so this file
// compiles into the edge bundle.

import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, resolvePolicy } from "@/lib/rate-limiter";
import { applySecurityHeaders } from "@/lib/security-headers";
import { validateCSRFRequest } from "@/lib/csrf";

export const config = {
  matcher: ["/api/:path*"],
};

/**
 * Extract the client IP used for rate limiting.
 * Prefers the real client IP over proxy-added header lists.
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  // 1. Preflight — let the OPTIONS pass through (CORS headers are applied by
  //    the next.config.ts /api header rule). Do not consume rate-limit quota.
  if (req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // 2. Rate-limit per IP using the route policy (assistant tighter, default 60/min).
  const policy = resolvePolicy(req.nextUrl.pathname);
  const identifier = getClientIp(req);
  const rl = rateLimit({
    identifier,
    route: policy.route,
    limit: policy.limit,
    windowSeconds: policy.windowSeconds,
  });

  if (!rl.success) {
    const res = NextResponse.json(
      { error: "Too Many Requests", retryAfterSeconds: rl.retryAfter },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(rl.retryAfter || policy.windowSeconds));
    res.headers.set("X-RateLimit-Limit", String(rl.limit));
    res.headers.set("X-RateLimit-Remaining", "0");
    res.headers.set("X-RateLimit-Reset", String(rl.reset));
    return applySecurityHeaders(res);
  }

  // 3. CSRF validation for state-changing methods (double-submit cookie pattern)
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
    if (!validateCSRFRequest(req)) {
      const res = NextResponse.json(
        { error: "CSRF token missing or invalid" },
        { status: 403 },
      );
      return applySecurityHeaders(res);
    }
  }

  // 4. Forward with rate-limit context so route handlers / responses can echo it.
  const res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });
  res.headers.set("X-RateLimit-Limit", String(rl.limit));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(rl.reset));

  return applySecurityHeaders(res);
}

export default middleware;
