import { NextRequest, NextResponse } from "next/server";
import { issueCSRFToken, validateCSRFRequest } from "@/lib/csrf";

/**
 * CSRF token issuance endpoint.
 * GET  → issues a fresh token (sets pipmlk_csrf cookie + returns token in body)
 * POST → validates the double-submit token (used by clients to test)
 */
export async function GET() {
  const res = NextResponse.json({ csrfToken: "" });
  const token = issueCSRFToken(res);
  return NextResponse.json({ csrfToken: token }, { headers: res.headers });
}

export async function POST(req: NextRequest) {
  if (!validateCSRFRequest(req)) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
