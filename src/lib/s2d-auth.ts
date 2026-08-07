// Session auth guard for S2D credential and scraper routes.
//
// Production requests must present the exact server-side S2D_AUTH_TOKEN. Role
// and user headers are trusted only after that token is validated. Merely
// having a cookie, a long bearer string, or a client-asserted role is never
// treated as authentication.

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const S2D_ROLES = ["OPERATIONS", "SECURITY_APPROVER", "S2D_ANALYST_WRITE"] as const;
export type S2dRole = typeof S2D_ROLES[number];

export interface Session {
  userId: string;
  role: S2dRole;
  email?: string;
}

function safeHeader(value: string | null, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function requestedRole(req: NextRequest, fallback: S2dRole): S2dRole {
  const value = safeHeader(req.headers.get("x-s2d-role"), 40).toUpperCase();
  return (S2D_ROLES as readonly string[]).includes(value) ? value as S2dRole : fallback;
}

export function authenticateSession(req: NextRequest): Session | null {
  const auth = safeHeader(req.headers.get("authorization"), 4096);
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerToken = safeHeader(req.headers.get("x-s2d-auth-token"), 4096);
  const suppliedToken = bearer || headerToken;

  const productionToken = process.env.S2D_AUTH_TOKEN?.trim() || "";
  // A weak/misconfigured production token fails closed rather than silently
  // becoming a valid shared administrator credential.
  if (productionToken.length >= 32 && suppliedToken && constantTimeEqual(suppliedToken, productionToken)) {
    return {
      userId: safeHeader(req.headers.get("x-s2d-authorized-user")) || "s2d-operator",
      role: requestedRole(req, "SECURITY_APPROVER"),
    };
  }

  // Local development remains convenient, but the bypass is impossible in a
  // production runtime. Supplying a bad token does not gain additional trust.
  if (process.env.NODE_ENV !== "production") {
    return {
      userId: safeHeader(req.headers.get("x-s2d-authorized-user")) || "local-s2d-developer",
      role: requestedRole(req, "SECURITY_APPROVER"),
      email: "dev@pip-melaka.local",
    };
  }

  return null;
}

export function requireRole(roles: readonly S2dRole[]) {
  return (session: Session | null): boolean => Boolean(session && roles.includes(session.role));
}

export function unauthorizedResponse(msg = "Unauthorized — valid S2D session token required"): NextResponse {
  return NextResponse.json({ error: msg, code: "UNAUTHENTICATED" }, { status: 401 });
}

export function forbiddenResponse(msg = "Forbidden — insufficient role"): NextResponse {
  return NextResponse.json({ error: msg, code: "FORBIDDEN" }, { status: 403 });
}
