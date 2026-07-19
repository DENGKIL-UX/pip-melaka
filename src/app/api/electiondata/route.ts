// PIP-MLK ElectionData.MY API proxy route.
//
// Keeps the Bearer token server-side (never shipped to the client) and
// proxies requests to https://api.electiondata.my/v1/*.
//
// Supported endpoints (all require the API token):
//   GET /api/electiondata?endpoint=candidates/dropdown
//   GET /api/electiondata?endpoint=candidates&uid=QE3PJ
//   GET /api/electiondata?endpoint=seats/dropdown
//   GET /api/electiondata?endpoint=parties/results&type=coalition&uid=001-BN&state=Melaka&election_type=parlimen
//
// The `endpoint` query param maps to the path after /v1/. All other query
// params are forwarded to the upstream API.

import { NextRequest, NextResponse } from "next/server";

const EDM_API_BASE = "https://api.electiondata.my/v1";
const ALLOWED_ENDPOINTS = new Set([
  "candidates/dropdown",
  "candidates",
  "seats/dropdown",
  "parties/results",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing required parameter: endpoint" },
      { status: 400 }
    );
  }

  // Allowlist check — prevent SSRF / arbitrary proxying
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json(
      { error: `Endpoint not allowed: ${endpoint}. Allowed: ${Array.from(ALLOWED_ENDPOINTS).join(", ")}` },
      { status: 403 }
    );
  }

  const token = process.env.ELECTIONDATA_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "ELECTIONDATA_API_TOKEN not configured on the server" },
      { status: 500 }
    );
  }

  // Forward all query params except `endpoint` to the upstream API
  const upstreamParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") {
      upstreamParams.set(key, value);
    }
  });

  const upstreamUrl = `${EDM_API_BASE}/${endpoint}?${upstreamParams.toString()}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      // 15s timeout via AbortController
      signal: AbortSignal.timeout(15000),
    });

    const body = await upstream.text();

    // Forward the upstream status code and JSON body
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
