// PIP-MLK Metrics Endpoint — GET /api/metrics
// ---------------------------------------------
// Exposes collected metrics in Prometheus text exposition format
// (version 0.0.4). Suitable for scraping by a Prometheus server.
//
//   Content-Type: text/plain; version=0.0.4; charset=utf-8
//
// Query parameters:
//   ?format=json  → return the structured JSON snapshot instead of text.
//   ?record=0     → skip recording this scrape in the metrics (default:
//                   record=1 so /api/metrics shows up in its own count).
//
// Also runs an alert check on each scrape so the alerting module has fresh
// thresholds evaluated whenever a Prometheus server polls us. This makes
// the alerting system "pull-driven" rather than requiring a separate timer.

import { NextResponse } from "next/server";
import { formatPrometheus, getMetrics, recordRequest } from "@/lib/metrics";
import { checkAlerts } from "@/lib/alerting";
import { getSloStatus } from "@/lib/slo";
import { logger } from "@/lib/logger";
import { withRequestId } from "@/lib/request-id";
import { startSpan, endRouteSpan } from "@/lib/tracing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";

async function handler(req: Request): Promise<Response> {
  const span = startSpan("GET /api/metrics", { httpMethod: "GET", httpRoute: "/api/metrics" });
  const started = Date.now();
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const record = (url.searchParams.get("record") ?? "1") !== "0";

  let httpStatus = 200;

  try {
    // Evaluate alerts on each scrape so alerting stays fresh.
    const alertCheck = checkAlerts();
    const slo = getSloStatus();

    // Optionally record this scrape itself.
    if (record) {
      recordRequest("/api/metrics", "GET", 200, Date.now() - started);
    }

    if (format === "json") {
      const metrics = getMetrics();
      endRouteSpan(span, 200);
      logger.debug("metrics.served", { format: "json", alerts: alertCheck.active.length });
      return NextResponse.json(
        {
          metrics,
          alerts: alertCheck,
          slo,
        },
        { status: 200 },
      );
    }

    const text = formatPrometheus();
    endRouteSpan(span, 200);
    logger.debug("metrics.served", {
      format: "prometheus",
      alerts: alertCheck.active.length,
      sloOverall: slo.overall,
    });
    return new Response(text, {
      status: 200,
      headers: {
        "content-type": PROMETHEUS_CONTENT_TYPE,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    httpStatus = 500;
    endRouteSpan(span, httpStatus);
    logger.error("metrics.serve.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    if (record) {
      recordRequest("/api/metrics", "GET", httpStatus, Date.now() - started);
    }
    return new Response(
      `# error rendering metrics: ${err instanceof Error ? err.message : String(err)}\n`,
      { status: httpStatus, headers: { "content-type": PROMETHEUS_CONTENT_TYPE } },
    );
  }
}

export const GET = withRequestId(handler);
