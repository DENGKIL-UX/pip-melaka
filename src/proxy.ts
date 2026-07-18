// src/proxy.ts
// PIP-MLK Next.js Proxy (middleware) — Edge-compatible only.
// Cloudflare Workers requires middleware to run on the Edge runtime.
// No Node.js APIs (no fs, no crypto.subtle sync, no process.env at module level).

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Security headers — inlined here (Edge-compatible, no external imports)
// ---------------------------------------------------------------------------

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

function applySecurityHeaders(res: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  // Content-Security-Policy — allow inline styles/scripts + data: images
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  );
}

// ---------------------------------------------------------------------------
// Simple Edge-compatible rate limiter (in-memory per Worker isolate)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function rateLimit(identifier: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(identifier);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

// ---------------------------------------------------------------------------
// CORS — Edge-compatible
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://pip-melaka.ritz-analytics.workers.dev",
];

function resolveOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|data/|robots.txt).*)",
  ],
};

// ---------------------------------------------------------------------------
// Main proxy function
// ---------------------------------------------------------------------------

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Handle CORS preflight for API routes
  if (pathname.startsWith("/api/") && req.method === "OPTIONS") {
    const origin = resolveOrigin(req);
    if (!origin) {
      return new NextResponse(null, { status: 403 });
    }
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, Idempotency-Key");
    res.headers.set("Access-Control-Max-Age", "86400");
    applySecurityHeaders(res);
    return res;
  }

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
    const allowed = rateLimit(`api:${ip}`, 60, 60000);
    if (!allowed) {
      const res = NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
      const origin = resolveOrigin(req);
      if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
      applySecurityHeaders(res);
      return res;
    }
  }

  // Continue to the route handler
  const res = NextResponse.next();
  const origin = resolveOrigin(req);
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  applySecurityHeaders(res);
  return res;
}
