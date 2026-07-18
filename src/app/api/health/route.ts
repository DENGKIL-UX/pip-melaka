// PIP-MLK Health Check — main endpoint.
// ---------------------------------------
// GET /api/health returns an aggregate health report:
//
//   {
//     "status":      "healthy" | "degraded" | "unhealthy",
//     "uptime":      seconds since process start,
//     "version":     app version (from package.json or env),
//     "requestId":   correlation ID for this probe,
//     "checks": {
//       "database": { "status": ..., "latencyMs": ..., "detail": ... },
//       "engine":   { "status": ..., "detail": ... },
//       "memory":   { "status": ..., "rssMb": ..., "heapUsedMb": ... }
//     }
//   }
//
// Status mapping:
//   - All checks pass           → "healthy"   (HTTP 200)
//   - Non-critical check failed → "degraded"  (HTTP 200)
//   - Critical check failed     → "unhealthy" (HTTP 503)
//
// Critical checks: database (a hard dependency for any stateful operation).
// Non-critical: engine (read-only data files), memory (warn-only).

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getMetrics } from "@/lib/metrics";
import { withRequestId, getRequestId } from "@/lib/request-id";
import { startSpan, endRouteSpan } from "@/lib/tracing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// App version — read once at module init.
// ---------------------------------------------------------------------------

function readAppVersion(): string {
  if (process.env.PIP_MLK_VERSION) return process.env.PIP_MLK_VERSION;
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
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
  /** Optional structured fields (e.g. observed value, threshold). */
  [key: string]: unknown;
}

export interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  requestId: string | null;
  checks: {
    database: CheckResult;
    engine: CheckResult;
    memory: CheckResult;
  };
}

// ---------------------------------------------------------------------------
// Individual checks.
// ---------------------------------------------------------------------------

async function checkDatabase(): Promise<CheckResult> {
  const started = Date.now();
  try {
    // Simple `SELECT 1` via Prisma's raw query — verifies the client can
    // open a connection and execute SQL. Does not depend on any model
    // existing, so it works even on an empty DB.
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - started;
    return {
      status: "pass",
      latencyMs,
      detail: "Database connection healthy.",
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    return {
      status: "fail",
      latencyMs,
      detail: `Database connection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function checkEngine(): Promise<CheckResult> {
  // The "engine" is the PIP-VOTER-INTELLIGENCE pipeline whose outputs ship
  // as static JSON/JSONL files under public/data/. We verify that a few
  // canonical files exist and are non-empty — this catches a broken
  // deployment where the data files are missing.
  const requiredFiles = [
    "p134/dashboard-overview.json",
    "p134/dun-intelligence.jsonl",
    "elections/melaka-elections.json",
    "socioeconomic/melaka-dosm.json",
  ];
  const dataDir = path.join(process.cwd(), "public", "data");
  const missing: string[] = [];
  const empty: string[] = [];
  for (const rel of requiredFiles) {
    try {
      const full = path.join(dataDir, rel);
      const stat = await fs.stat(full);
      if (stat.size === 0) empty.push(rel);
    } catch {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    return {
      status: "fail",
      detail: `Engine data files missing: ${missing.join(", ")}`,
      missing,
    };
  }
  if (empty.length > 0) {
    return {
      status: "warn",
      detail: `Engine data files empty: ${empty.join(", ")}`,
      empty,
    };
  }
  return {
    status: "pass",
    detail: `All ${requiredFiles.length} engine data files present and non-empty.`,
    fileCount: requiredFiles.length,
  };
}

function checkMemory(): CheckResult {
  // Memory check — warns when RSS exceeds 512MB (PIP-MLK has a known OOM
  // issue on 4GB sandboxes), fails when RSS exceeds 1GB.
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
    // Database is critical — if it fails, we're unhealthy (503).
    // Engine + memory failures degrade but don't take us offline.
    if (checks.database.status === "fail") return "unhealthy";
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
    const [database, engine] = await Promise.all([checkDatabase(), checkEngine()]);
    const memory = checkMemory();
    const checks: HealthReport["checks"] = { database, engine, memory };
    const status = aggregateStatus(checks);

    const report: HealthReport = {
      status,
      uptime: Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000),
      version: APP_VERSION,
      requestId: getRequestId(),
      checks: {
        database: { status: checks.database.status, detail: checks.database.status === "pass" ? "ok" : checks.database.detail },
        engine: { status: checks.engine.status, detail: checks.engine.status === "pass" ? "ok" : checks.engine.detail },
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
      database: database.status,
      engine: engine.status,
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
          database: { status: "fail", detail: "Health check itself errored." },
          engine: { status: "fail", detail: "Health check itself errored." },
          memory: { status: "fail", detail: "Health check itself errored." },
        },
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}

export const GET = withRequestId(handler);
