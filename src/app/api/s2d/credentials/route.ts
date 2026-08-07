import { NextRequest, NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";
import { authenticateSession, requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/s2d-auth";
import {
  S2D_CREDENTIAL_KEYS,
  setVaultEntry,
  getMaskedVault,
  getRawToken,
  maskToken,
} from "@/lib/s2d-credential-vault";
import { verifyS2dCredential } from "@/lib/s2d-credential-verification";
import { hasPrototypePollution, requestBodyTooLarge, sanitizeS2dError } from "@/lib/s2d-request-security";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const PutBodySchema = z.object({
  key: z.enum(S2D_CREDENTIAL_KEYS),
  token: z.string().trim().min(4).max(4096),
}).strict();

// Return masked status only. Environment-backed and dynamic credentials are
// both represented, but raw values never cross this boundary.
export const GET = withCORS(async (req: NextRequest) => {
  const session = authenticateSession(req);
  if (!session) return unauthorizedResponse();

  const vault = getMaskedVault();
  const response = NextResponse.json({
    vault,
    count: Object.keys(vault).length,
    note: "Raw credentials are never returned. Dynamic vault entries are process-local; Wrangler secrets are the durable production source.",
    governance: { aggregatePublicSignalsOnly: true },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
});

// Validate against the provider (or an explicitly labelled local/format check)
// before committing to the process-local dynamic vault.
export const PUT = withCORS(async (req: NextRequest) => {
  const session = authenticateSession(req);
  if (!session) return unauthorizedResponse();
  if (!requireRole(["SECURITY_APPROVER"])(session)) {
    return forbiddenResponse("Requires SECURITY_APPROVER role");
  }
  if (requestBodyTooLarge(req.headers.get("content-length"), MAX_BODY_BYTES)) {
    return NextResponse.json({ error: "Request body exceeds 16 KiB", code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, { status: 400 });
  }
  if (hasPrototypePollution(body)) {
    return NextResponse.json({ error: "Prototype pollution payload rejected", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues, code: "BAD_REQUEST" }, { status: 400 });
  }

  const { key, token } = parsed.data;
  const verification = await verifyS2dCredential(key, token, { getCredential: getRawToken });

  if (!verification.verified) {
    const safeError = sanitizeS2dError(verification.error, "Verification failed");
    return NextResponse.json({
      verified: false,
      liveVerified: false,
      key,
      masked: maskToken(token),
      verificationMode: verification.mode,
      error: safeError,
      message: `Verification failed for ${key}: ${safeError}`,
    }, { status: 400 });
  }

  const entry = setVaultEntry(key, token, {
    verified: true,
    provider: verification.provider,
    verificationMode: verification.mode,
  });
  const liveVerified = verification.mode === "LIVE_PROVIDER";

  return NextResponse.json({
    verified: true,
    liveVerified,
    key,
    masked: entry.masked,
    verifiedAt: entry.verifiedAt,
    provider: verification.provider,
    verificationMode: verification.mode,
    message: liveVerified
      ? `VERIFIED PASS — ${key} live-verified via ${verification.provider}`
      : `VALIDATION PASS — ${key} accepted via ${verification.mode}; no universal live provider check is available`,
  });
});

export async function OPTIONS(req: NextRequest) {
  const { handlePreflight } = await import("@/lib/cors");
  return handlePreflight(req) ?? new NextResponse(null, { status: 403 });
}
