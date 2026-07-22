// src/proxy.ts
// PIP-MLK Next.js 16 Proxy — CORS + security headers + rate limiting.
// Next.js 16 renamed middleware → proxy. Proxy ALWAYS runs on Node.js runtime;
// route segment config (e.g. `export const runtime`) is NOT allowed in proxy
// files. See https://nextjs.org/docs/messages/middleware-to-proxy

import { NextRequest, NextResponse } from "next/server";

// ─── Allowed CORS origins ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS: string[] = [
  "http://localhost:3000",
  "https://pip-melaka.ritz-analytics.workers.dev",
];

// ─── Edge-compatible rate limiter ─────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

// ─── Security headers ─────────────────────────────────────────────────────────
function applySecurityHeaders(res: NextResponse): void {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  );
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
function applyCors(req: NextRequest, res: NextResponse): void {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-Request-ID,Idempotency-Key");
  res.headers.set("Access-Control-Max-Age", "86400");
}

// ─── Proxy function ───────────────────────────────────────────────────────────
export function proxy(request: NextRequest): NextResponse {
  if (request.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCors(request, res);
    applySecurityHeaders(res);
    return res;
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60", "Content-Type": "text/plain" },
    });
  }

  const res = NextResponse.next();
  applyCors(request, res);
  applySecurityHeaders(res);
  return res;
}

// ─── Route matcher ────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
