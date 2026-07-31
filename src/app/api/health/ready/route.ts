// PIP-MLK Readiness Probe — GET /api/health/ready (Cloudflare-Workers compatible)
// ----------------------------------------------------------------------------
// Kubernetes-style readiness probe: "can the process serve requests?"
// Returns 200 when ready, 503 when not.
//
// Workers-compatible: no Node `fs`, no Prisma (unenv throws on both). The
// app's real dependency on the serverless runtime is the engine-built JSON
// (imported at build time) + memory headroom. We verify both.

import { NextResponse } from "next/server";
import overviewJson from "@/../public/data/p134/dashboard-overview.json";
import { logger } from "@/lib/logger";
import { withRequestId, getRequestId } from "@/lib/request-id";
import { startSpan, endRouteSpan } from "@/lib/tracing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReadinessCheck {
  status: "pass" | "fail";
  latencyMs?: number;
  detail: string;
}

// Replaces the Prisma DB check: the app's source of truth is the engine-built
// JSON, so "ready" == "the canonical dataset imported at build time is present".
function checkData(): ReadinessCheck {
  const voters = (overviewJson as { overview?: { metrics?: { total_voters?: number } } }).overview?.metrics?.total_voters;
  if (!voters || voters <= 0) {
    return { status: "fail", detail: "Canonical dataset (dashboard-overview) not bundled." };
  }
  return { status: "pass", detail: `Engine data ready (voters=${voters}).` };
}

function checkMemory(): ReadinessCheck {
  const rssMb = process.memoryUsage().rss / (1024 * 1024);
  const RSS_FAIL_MB = 1024;
  if (rssMb >= RSS_FAIL_MB) {
    return { status: "fail", detail: `RSS ${rssMb.toFixed(0)}MB exceeds ${RSS_FAIL_MB}MB threshold.` };
  }
  return { status: "pass", detail: `Memory OK (RSS ${rssMb.toFixed(0)}MB).` };
}

async function handler(): Promise<Response> {
  const span = startSpan("GET /api/health/ready", { httpMethod: "GET", httpRoute: "/api/health/ready" });

  const data = checkData();
  const memory = checkMemory();
  const ready = data.status === "pass" && memory.status === "pass";
  const httpStatus = ready ? 200 : 503;

  endRouteSpan(span, httpStatus);
  logger.info("readiness.probed", { ready, data: data.status, memory: memory.status });

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      requestId: getRequestId(),
      checks: { data, memory },
    },
    { status: httpStatus },
  );
}

export const GET = withRequestId(handler);
