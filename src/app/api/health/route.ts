// PIP-MLK Health Check — main endpoint (Cloudflare-Workers compatible).
// --------------------------------------------------------------------
// GET /api/health returns an aggregate health report.
//
// IMPORTANT — no Node `fs` at runtime: the deploy target is Cloudflare
// Workers, where the `unenv` polyfill throws "fs.X is not implemented yet!".
// So all data integrity is verified via BUILD-TIME JSON imports (bundled into
// the worker), and the Prisma/DB check was removed (the app is static-JSON
// based; there is no database on the serverless runtime).
//
// Response:
//   {
//     "status":      "healthy" | "degraded" | "unhealthy",
//     "uptime":      seconds since process start,
//     "version":     app version (build-time injected),
//     "requestId":   correlation ID for this probe,
//     "checks": {
//       "data":   { "status": ..., "detail": ... },   // critical
//       "memory": { "status": ..., "rssMb": ..., ... }
//     }
//   }
//
// Status mapping:
//   - All checks pass           → "healthy"   (HTTP 200)
//   - Non-critical check failed → "degraded"  (HTTP 200)
//   - Critical check failed     → "unhealthy" (HTTP 503)
//
// Critical check: data (the engine-built JSON the whole app reads).

import { NextResponse } from "next/server";
// Build-time imports — bundled, no runtime fs. (Pattern proven in
// src/app/api/deep-research/route.ts, which works on Workers.)
import overviewJson from "@/../public/data/p134/dashboard-overview.json";
import electionsJson from "@/../public/data/elections/melaka-elections.json";
import socioeconomicJson from "@/../public/data/socioeconomic/melaka-dosm.json";
import { logger } from "@/lib/logger";
import { getMetrics } from "@/lib/metrics";
import { withRequestId, getRequestId } from "@/lib/request-id";
import { startSpan, endRouteSpan } from "@/lib/tracing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// App version — injected at build time (next.config.ts reads package.json via
// fs at BUILD time, where fs is available, and exposes NEXT_PUBLIC_APP_VERSION).
function readAppVersion(): string {
  return (
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.PIP_MLK_VERSION ??
    "unknown"
  );
}

const APP_VERSION = readAppVersion();
const PROCESS_STARTED_AT = Date.now();

// ---------------------------------------------------------------------------
// Check types.
// ---------------------------------------------------------------------------

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  status: CheckStatus;
  latencyMs?: number;
  detail: string;
  [key: string]: unknown;
}

export interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  requestId: string | null;
  checks: {
    data: CheckResult;
    memory: CheckResult;
  };
}

// ---------------------------------------------------------------------------
// Data-integrity check (replaces the old Prisma DB check + the fs.stat
// engine check). Verifies the build-time-imported canonical datasets are
// present and have the expected shape — catches a broken/incomplete build.
// ---------------------------------------------------------------------------

interface OverviewShape {
  overview?: { metrics?: { total_voters?: number } };
}
interface ElectionsShape {
  elections?: unknown[];
}
interface SocioeconomicShape {
  state?: unknown;
}

function checkData(): CheckResult {
  const problems: string[] = [];

  const overview = overviewJson as OverviewShape;
  const voters = overview.overview?.metrics?.total_voters;
  if (!voters || voters <= 0) problems.push("dashboard-overview.json missing total_voters");

  const elections = electionsJson as ElectionsShape;
  if (!Array.isArray(elections.elections) || elections.elections.length === 0) {
    problems.push("melaka-elections.json has no elections array");
  }

  const socio = socioeconomicJson as SocioeconomicShape;
  if (!socio.state) problems.push("melaka-dosm.json missing state data");

  if (problems.length > 0) {
    return {
      status: "fail",
      detail: `Engine data integrity failed: ${problems.join("; ")}`,
    };
  }
  return {
    status: "pass",
    detail: `All 3 canonical datasets present (voters=${voters}).`,
    totalVoters: voters,
  };
}

function checkMemory(): CheckResult {
  // process.memoryUsage() is provided by the unenv polyfill on Workers.
  const mem = process.memoryUsage();
  const rssMb = mem.rss / (1024 * 1024);
  const heapUsedMb = mem.heapUsed / (1024 * 1024);
  const heapTotalMb = mem.heapTotal / (1024 * 1024);
  const RSS_WARN_MB = 512;
  const RSS_FAIL_MB = 1024;
  let status: CheckStatus = "pass";
  let detail = "Memory usage normal.";
  if (rssMb >= RSS_FAIL_MB) {
    status = "fail";
    detail = `RSS ${rssMb.toFixed(0)}MB exceeds ${RSS_FAIL_MB}MB threshold.`;
  } else if (rssMb >= RSS_WARN_MB) {
    status = "warn";
    detail = `RSS ${rssMb.toFixed(0)}MB exceeds ${RSS_WARN_MB}MB warning threshold.`;
  }
  return {
    status,
    detail,
    rssMb: Math.round(rssMb),
    heapUsedMb: Math.round(heapUsedMb),
    heapTotalMb: Math.round(heapTotalMb),
    externalMb: Math.round(mem.external / (1024 * 1024)),
  };
}

// ---------------------------------------------------------------------------
// Status aggregation.
// ---------------------------------------------------------------------------

function aggregateStatus(checks: HealthReport["checks"]): HealthReport["status"] {
  const all = Object.values(checks);
  if (all.some((c) => c.status === "fail")) {
    // data is critical — if it fails, we're unhealthy (503).
    if (checks.data.status === "fail") return "unhealthy";
    return "degraded";
  }
  if (all.some((c) => c.status === "warn")) return "degraded";
  return "healthy";
}

// ---------------------------------------------------------------------------
// GET handler — wrapped in request-id + trace span.
// ---------------------------------------------------------------------------

async function handler(): Promise<Response> {
  const span = startSpan("GET /api/health", { httpMethod: "GET", httpRoute: "/api/health" });
  const started = Date.now();

  try {
    const data = checkData();
    const memory = checkMemory();
    const checks: HealthReport["checks"] = { data, memory };
    const status = aggregateStatus(checks);

    const report: HealthReport = {
      status,
      uptime: Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000),
      version: APP_VERSION,
      requestId: getRequestId(),
      checks: {
        data: { status: checks.data.status, detail: checks.data.status === "pass" ? "ok" : checks.data.detail },
        memory: { status: checks.memory.status, detail: checks.memory.status === "pass" ? "ok" : "memory pressure detected" },
      },
    };

    const httpStatus = status === "unhealthy" ? 503 : 200;
    endRouteSpan(span, httpStatus);

    const m = getMetrics();
    logger.info("health.checked", {
      status,
      httpStatus,
      durationMs: Date.now() - started,
      data: data.status,
      memory: memory.status,
      routesObserved: m.routes.length,
    });

    return NextResponse.json(report, { status: httpStatus });
  } catch (err) {
    endRouteSpan(span, 500);
    logger.error("health.check.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        status: "unhealthy",
        uptime: Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000),
        version: APP_VERSION,
        requestId: getRequestId(),
        checks: {
          data: { status: "fail", detail: "Health check itself errored." },
          memory: { status: "fail", detail: "Health check itself errored." },
        },
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}

export const GET = withRequestId(handler);
