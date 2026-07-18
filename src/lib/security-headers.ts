// src/lib/security-headers.ts
// PIP-MLK Security Headers — applied to every response via Next.js middleware.
// Security-01: defense-in-depth headers to harden the browser-side surface.

import type { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// CSP — Content-Security-Policy.
// Tuned for Next.js 16 (Turbopack dev + prod builds) with:
//   - 'self' for everything by default
//   - 'unsafe-inline' on style-src (Tailwind injects <style> tags in dev)
//   - 'unsafe-eval' on script-src ONLY in dev (Turbopack HMR needs it)
//   - 'unsafe-inline' on script-src in dev (React DevTools / refresh)
//   - connect-src allows the dev WebSocket origin + same-origin + the
//     configured production API origin (for RSC/streaming)
//   - img-src allows data: (leaflet markers) + blob: (canvas exports)
//   - font-src includes Google Fonts (Geist) + data:
// ---------------------------------------------------------------------------

function buildCSP(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";

  // Dev: Turbopack HMR uses an inline script + eval'd source maps.
  const scriptSrc = isDev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", "'unsafe-inline'"];

  const styleSrc = ["'self'", "'unsafe-inline'"]; // Tailwind always needs inline
  const imgSrc = ["'self'", "data:", "blob:"];
  const fontSrc = ["'self'", "data:", "https://fonts.gstatic.com"];
  const connectSrc = isDev
    ? ["'self'", "ws://localhost:3000", "wss://localhost:3000"]
    : ["'self'"];
  if (appOrigin) connectSrc.push(appOrigin);

  // frame-ancestors 'none' == equivalent to X-Frame-Options: DENY.
  const frameAncestors = ["'none'"];
  const formAction = ["'self'"];
  const baseUri = ["'self'"];
  const objectSrc = ["'none'"]; // no Flash/Java/plugins
  const workerSrc = ["'self'", "blob:"];
  const manifestSrc = ["'self'"];

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `font-src ${fontSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    `frame-ancestors ${frameAncestors.join(" ")}`,
    `form-action ${formAction.join(" ")}`,
    `base-uri ${baseUri.join(" ")}`,
    `object-src ${objectSrc.join(" ")}`,
    `worker-src ${workerSrc.join(" ")}`,
    `manifest-src ${manifestSrc.join(" ")}`,
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join("; ");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SecurityHeaderSet {
  "X-Content-Type-Options": string;
  "X-Frame-Options": string;
  "X-XSS-Protection": string;
  "Referrer-Policy": string;
  "Content-Security-Policy": string;
  "Strict-Transport-Security": string;
  "Permissions-Policy": string;
  "Cross-Origin-Opener-Policy": string;
  "Cross-Origin-Resource-Policy": string;
}

/**
 * Build the full set of security headers for a response. Pure function —
 * safe to call from middleware on every request.
 */
export function getSecurityHeaders(): SecurityHeaderSet {
  const isProd = process.env.NODE_ENV === "production";
  // HSTS: 1 year, include subdomains, preload. ONLY emit over HTTPS —
  // middleware sets it unconditionally; Caddy terminates TLS so the upstream
  // is always over HTTP but the browser sees HTTPS. We emit HSTS in both
  // modes but enable preload only in production.
  const hsts = isProd
    ? "max-age=31536000; includeSubDomains; preload"
    : "max-age=0";

  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    // X-XSS-Protection is deprecated in modern browsers (replaced by CSP)
    // but harmless and still respected by older ones.
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": buildCSP(),
    "Strict-Transport-Security": hsts,
    // Lock down powerful APIs the app does not use.
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "interest-cohort=()", // opt out of FLoC
    ].join(", "),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

/**
 * Stamp all security headers onto a NextResponse. Idempotent — if a header
 * is already set (e.g. by an upstream handler), we overwrite it to ensure
 * the policy is consistent.
 */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}
