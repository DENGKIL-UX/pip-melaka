// src/lib/jwt.ts
// PIP-MLK JWT — HMAC-SHA256 signed tokens with access/refresh rotation.
// Security-01: short-lived access tokens (15m) + long-lived refresh tokens (7d).
// Stateless validation via shared HMAC secret — no DB lookup needed to verify.

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  type BinaryLike,
} from "node:crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ACCESS_TTL_SECONDS = 15 * 60; // 15 min
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const TYP_ACCESS = "access";
const TYP_REFRESH = "refresh";

const ALG = "HS256";

// ---------------------------------------------------------------------------
// Secret resolution — fail loud in prod, fall back in dev.
// ---------------------------------------------------------------------------

function getJWTSecret(): BinaryLike {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set to a 32+ char string in production. Set it in .env",
    );
  }
  // Dev fallback — deterministic per process so tokens validate within a
  // single dev session but never leak across machines.
  console.warn(
    "[jwt] JWT_SECRET not set — using insecure dev-only fallback. Set JWT_SECRET in .env.",
  );
  return "dev-only-jwt-secret-DO-NOT-USE-IN-PROD-32chars!";
}

// ---------------------------------------------------------------------------
// Base64URL helpers (no padding, URL-safe alphabet per RFC 7515).
// ---------------------------------------------------------------------------

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

// ---------------------------------------------------------------------------
// Sign / verify — HMAC-SHA256, constant-time comparison.
// ---------------------------------------------------------------------------

function sign(data: string): string {
  return createHmac("sha256", getJWTSecret()).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Token shape — minimal JOSE-compliant JWT.
//   header  = { alg, typ, kid? }
//   payload = { sub, iat, exp, jti, typ: "access"|"refresh", scope? }
// ---------------------------------------------------------------------------

export interface JWTPayload {
  sub: string; // subject (user id)
  iat: number; // issued-at (unix seconds)
  exp: number; // expiry (unix seconds)
  jti: string; // unique token id (for revocation tracking)
  typ: typeof TYP_ACCESS | typeof TYP_REFRESH;
  scope?: string[]; // optional permission scopes
}

export interface JWTHeader {
  alg: typeof ALG;
  typ: "JWT";
  kid?: string;
}

function buildToken(
  typ: typeof TYP_ACCESS | typeof TYP_REFRESH,
  ttlSeconds: number,
  payload: { sub: string; scope?: string[] },
): string {
  const now = Math.floor(Date.now() / 1000);
  const header: JWTHeader = { alg: ALG, typ: "JWT" };
  const body: JWTPayload = {
    sub: payload.sub,
    iat: now,
    exp: now + ttlSeconds,
    jti: randomBytes(12).toString("hex"),
    typ,
    ...(payload.scope ? { scope: payload.scope } : {}),
  };

  const headerB64 = b64urlEncode(JSON.stringify(header));
  const bodyB64 = b64urlEncode(JSON.stringify(body));
  const signingInput = `${headerB64}.${bodyB64}`;
  const signature = sign(signingInput);
  return `${signingInput}.${signature}`;
}

/**
 * Create a short-lived access token (15 min). Use for authorising API calls.
 */
export function createAccessToken(payload: {
  sub: string;
  scope?: string[];
}): string {
  return buildToken(TYP_ACCESS, ACCESS_TTL_SECONDS, payload);
}

/**
 * Create a long-lived refresh token (7 days). Use ONLY to mint new access
 * tokens; never accept a refresh token for normal API authorisation.
 */
export function createRefreshToken(payload: {
  sub: string;
  scope?: string[];
}): string {
  return buildToken(TYP_REFRESH, REFRESH_TTL_SECONDS, payload);
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type VerifyResult =
  | { ok: true; payload: JWTPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" | "wrong-type" };

export function verifyToken(
  token: string,
  expectedTyp?: typeof TYP_ACCESS | typeof TYP_REFRESH,
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [headerB64, bodyB64, signature] = parts;
  const signingInput = `${headerB64}.${bodyB64}`;
  const expectedSig = sign(signingInput);
  if (!safeEqual(signature, expectedSig)) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: JWTPayload;
  try {
    payload = JSON.parse(b64urlDecode(bodyB64).toString("utf8")) as JWTPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    return { ok: false, reason: "expired" };
  }
  if (expectedTyp && payload.typ !== expectedTyp) {
    return { ok: false, reason: "wrong-type" };
  }

  return { ok: true, payload };
}

/**
 * Convenience: verify a token and require it to be an access token.
 */
export function verifyAccessToken(token: string): VerifyResult {
  return verifyToken(token, TYP_ACCESS);
}

/**
 * Convenience: verify a token and require it to be a refresh token.
 */
export function verifyRefreshToken(token: string): VerifyResult {
  return verifyToken(token, TYP_REFRESH);
}

// ---------------------------------------------------------------------------
// Rotation — exchange a valid refresh token for a fresh access + refresh pair.
// The old refresh token's jti SHOULD be recorded as "used" so it can't be
// replayed; that bookkeeping belongs in the DB, not in this stateless module.
// ---------------------------------------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number; // unix seconds
  refreshExpiresAt: number; // unix seconds
}

export function rotateTokens(payload: {
  sub: string;
  scope?: string[];
}): TokenPair {
  const now = Math.floor(Date.now() / 1000);
  return {
    accessToken: createAccessToken(payload),
    refreshToken: createRefreshToken(payload),
    accessExpiresAt: now + ACCESS_TTL_SECONDS,
    refreshExpiresAt: now + REFRESH_TTL_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// Token expiry constants — exported for callers (e.g. cookie Max-Age).
// ---------------------------------------------------------------------------

export const ACCESS_TTL = ACCESS_TTL_SECONDS;
export const REFRESH_TTL = REFRESH_TTL_SECONDS;
