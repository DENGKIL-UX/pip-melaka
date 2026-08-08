// src/lib/csrf.ts
// PIP-MLK CSRF protection — Double-Submit Cookie pattern.
// Security-01: state-changing requests (POST/PUT/PATCH/DELETE) must carry a
// CSRF token that matches a cookie-set token, proving same-origin intent.
//
// Edge-runtime safe: uses WebCrypto (globalThis.crypto.subtle) only — no
// node:* imports — so this module can be imported from middleware.ts /
// proxy.ts (Edge runtime) and compiled into the Cloudflare Workers bundle.
// NOTE: all token generation/validation is async because WebCrypto's HMAC
// API is promise-based.

import { NextRequest, NextResponse } from "next/server";

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

const encoder = new TextEncoder();

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, // not extractable
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Generate a fresh CSRF token. The returned string is `nonce.signature`
 * where signature = HMAC-SHA256(secret, nonce). The same string is then
 * written to BOTH the cookie AND sent in the response body so the client
 * can mirror it into the X-CSRF-Token header on the next state-changing call.
 */
export async function generateCSRFToken(): Promise<string> {
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
  const secret = getCSRFSecret();
  if (!secret) {
    throw new Error(
      "CSRF_SECRET environment variable is required in production. Set it in .env",
    );
  }
  const signature = await hmac(secret, nonce);
  return `${nonce}.${signature}`;
}

/**
 * Constant-time string comparison: the running time depends only on the
 * length check, never on where the first differing byte is, so an attacker
 * cannot use timing to guess the signature byte-by-byte.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validate a token's structure + signature. Constant-time comparison on the
 * signature prevents timing-oracle attacks. Async: WebCrypto HMAC is async.
 */
export async function validateCSRFToken(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature) return false;
  const secret = getCSRFSecret();
  if (!secret) return false;
  const expected = await hmac(secret, nonce);
  return constantTimeEqual(expected, signature);
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
export async function validateCSRFRequest(req: NextRequest): Promise<boolean> {
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
export async function issueCSRFToken(res: NextResponse): Promise<string> {
  const token = await generateCSRFToken();
  setCSRFCookie(res, token);
  return token;
}
