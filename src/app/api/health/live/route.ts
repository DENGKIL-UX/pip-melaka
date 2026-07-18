// PIP-MLK Liveness Probe — GET /api/health/live
// ----------------------------------------------
// Kubernetes-style liveness probe: "is the process running?" If this
// endpoint returns 200, the process is alive and the event loop is
// responsive. It performs NO dependency checks — a failing database or
// missing engine data files will NOT cause this to fail.
//
// Use this as the kubelet liveness probe. If it fails, the orchestrator
// should restart the pod.

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withRequestId } from "@/lib/request-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROCESS_STARTED_AT = Date.now();

async function handler(): Promise<Response> {
  const uptime = Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000);
  logger.debug("liveness.probed", { uptime });
  return NextResponse.json(
    {
      status: "alive",
      uptime,
      // The presence of this response itself proves the event loop is
      // responsive — no further checks are required for liveness.
    },
    { status: 200 },
  );
}

export const GET = withRequestId(handler);
