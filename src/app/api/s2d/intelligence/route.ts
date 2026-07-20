// Root route for /api/s2d/intelligence — returns API info
import { NextRequest, NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withCORS(async () => {
  return NextResponse.json({
    endpoint: "/api/s2d/intelligence",
    description: "S2D Intelligence API — ported engine (Phase 2)",
    routes: [
      "GET /sentiment-snapshots — Daily sentiment snapshots",
      "GET /change-points — Change-point detection results",
      "GET /local-profiles — Local signal profiles",
      "GET /daily-brief — Daily Intelligence Brief",
      "POST /validate-context — PIP aggregate context validation",
    ],
    engineVersion: "v1.0.0 (ported)",
    governance: {
      aggregatePublicSignalsOnly: true,
      humanReviewRequired: true,
      pipIntegration: false,
    },
  });
});
