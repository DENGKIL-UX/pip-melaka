// PIP-MLK Readiness Probe — GET /api/health/ready
// ------------------------------------------------
// Kubernetes-style readiness probe: "can the process serve requests?"
// Unlike liveness, this checks dependencies (database + memory). If it
// returns 200, the process is ready to receive user traffic. If it
// returns 503, the orchestrator should stop routing traffic but NOT
// restart the pod (the process is alive, just not ready).
//
// Difference vs /api/health:
//   - /api/health       → full report with database + engine + memory
//   - /api/health/ready → pass/fail readiness gate (database + memory only)
//
// We deliberately skip the engine check here because engine data files
// are static and shipped with the deploy — if they're missing, that's a
// deploy bug, not a readiness concern. The main /api/health endpoint
// catches that case.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

async function checkDatabase(): Promise<ReadinessCheck> {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      status: "pass",
      latencyMs: Date.now() - started,
      detail: "Database connection healthy.",
    };
  } catch (err) {
    return {
      status: "fail",
      latencyMs: Date.now() - started,
      detail: `Database connection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function checkMemory(): ReadinessCheck {
  const rssMb = process.memoryUsage().rss / (1024 * 1024);
  // For readiness, we fail at 1GB (process is about to OOM). Lower than
  // that and we'll still serve requests, just with degraded throughput.
  const RSS_FAIL_MB = 1024;
  if (rssMb >= RSS_FAIL_MB) {
    return {
      status: "fail",
      detail: `RSS ${rssMb.toFixed(0)}MB exceeds ${RSS_FAIL_MB}MB threshold.`,
    };
  }
  return {
    status: "pass",
    detail: `Memory OK (RSS ${rssMb.toFixed(0)}MB).`,
  };
}

async function handler(): Promise<Response> {
  const span = startSpan("GET /api/health/ready", { httpMethod: "GET", httpRoute: "/api/health/ready" });

  const database = await checkDatabase();
  const memory = checkMemory();
  const ready = database.status === "pass" && memory.status === "pass";
  const httpStatus = ready ? 200 : 503;

  endRouteSpan(span, httpStatus);
  logger.info("readiness.probed", { ready, database: database.status, memory: memory.status });

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      requestId: getRequestId(),
      checks: { database, memory },
    },
    { status: httpStatus },
  );
}

export const GET = withRequestId(handler);
