// src/lib/csrf.ts
// PIP-MLK CSRF protection — Double-Submit Cookie pattern.
// Security-01: state-changing requests (POST/PUT/PATCH/DELETE) must carry a
// CSRF token that matches a cookie-set token, proving same-origin intent.

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const CSRF_COOKIE_NAME = "pipmlk_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

// Cookie attributes — SameSite=Lax + Secure (prod) + HttpOnly=false (so the
// JS client can read the cookie and mirror it into the X-CSRF-Token header).
const COOKIE_PATH = "/";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

// Safe methods that do NOT require CSRF protection (RFC 7231 §4.2.1).
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

// ---------------------------------------------------------------------------
// Token generation — random nonce + HMAC-SHA256(secret, nonce).
// The HMAC binds the cookie to a server secret so an attacker cannot forge a
// matching pair even if they can write a cookie.
// ---------------------------------------------------------------------------

function getCSRFSecret(): string {
  // Falls back to a per-process random secret in dev so the app still runs
  // without env config. Production MUST set CSRF_SECRET explicitly.
  return (
    process.env.CSRF_SECRET ??
    // dev-only fallback — regenerated each process restart, fine for local.
    (process.env.NODE_ENV === "production"
      ? ""
      : "dev-only-csrf-secret-DO-NOT-USE-IN-PROD")
  );
}

function hmac(secret: string, message: string): string {
  return createHash("sha256").update(`${secret}:${message}`).digest("hex");
}

/**
 * Generate a fresh CSRF token. The returned string is `nonce.signature`
 * where signature = HMAC-SHA256(secret, nonce). The same string is then
 * written to BOTH the cookie AND sent in the response body so the client
 * can mirror it into the X-CSRF-Token header on the next state-changing call.
 */
export function generateCSRFToken(): string {
  const nonce = randomBytes(24).toString("hex");
  const secret = getCSRFSecret();
  if (!secret) {
    throw new Error(
      "CSRF_SECRET environment variable is required in production. Set it in .env",
    );
  }
  const signature = hmac(secret, nonce);
  return `${nonce}.${signature}`;
}

/**
 * Validate a token's structure + signature. Constant-time comparison on the
 * signature prevents timing-oracle attacks.
 */
export function validateCSRFToken(token: unknown): token is string {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature) return false;
  const secret = getCSRFSecret();
  if (!secret) return false;
  const expected = hmac(secret, nonce);
  // timingSafeEqual needs equal-length buffers.
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Double-submit validation — the cookie value MUST equal the header value,
// AND both must carry a valid HMAC signature.
// ---------------------------------------------------------------------------

/**
 * Returns true if the request satisfies the double-submit CSRF contract:
 *   1. The request method is "safe" (GET/HEAD/OPTIONS/TRACE) → no check.
 *   2. Else: cookie[CSRF_COOKIE_NAME] === header[CSRF_HEADER_NAME]
 *      AND both validate as a properly-signed token.
 */
export function validateCSRFRequest(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) return false;
  if (cookieToken !== headerToken) return false;
  // Constant-time signature check on the (already-matching) token.
  return validateCSRFToken(headerToken);
}

/**
 * Stamp a fresh CSRF token onto a response via Set-Cookie. The response body
 * should also echo the token so the client can store it for the next call.
 *
 * Returns the token so the route handler can include it in the JSON body.
 */
export function setCSRFCookie(res: NextResponse, token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    `Path=${COOKIE_PATH}`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    isProd ? "Secure" : "",
    // NOT HttpOnly — client JS must read this to mirror into header.
  ].filter(Boolean);
  res.headers.append("Set-Cookie", cookieParts.join("; "));
  return token;
}

/**
 * Issue a fresh CSRF token + cookie on a response. Convenience wrapper used
 * by the `/api/csrf` endpoint and by auth login responses.
 */
export function issueCSRFToken(res: NextResponse): string {
  const token = generateCSRFToken();
  setCSRFCookie(res, token);
  return token;
}
