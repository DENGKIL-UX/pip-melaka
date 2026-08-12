import { NextRequest, NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";
import { authenticateSession, requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/s2d-auth";
import { getRawToken } from "@/lib/s2d-credential-vault";
import { buildS2dApifyPlan, resolveApifyToken, runS2dApifyPlan, S2D_APPROVED_RECORD_CAP } from "@/lib/s2d-apify";
import { hasPrototypePollution, requestBodyTooLarge, sanitizeS2dError } from "@/lib/s2d-request-security";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const PlatformSchema = z.enum(["tiktok", "facebook", "instagram", "threads", "x", "twitter"]);
const BodySchema = z.object({
  platforms: z.array(PlatformSchema).min(1).max(5).optional(),
  platform: PlatformSchema.optional(),
  keywords: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  keyword: z.string().trim().min(1).max(100).optional(),
  query: z.string().trim().max(500).optional(),
  limit: z.number().int().min(1).max(S2D_APPROVED_RECORD_CAP).optional(),
  maxItems: z.number().int().min(1).max(S2D_APPROVED_RECORD_CAP).optional(),
  localityCode: z.string().trim().min(1).max(20).optional(),
  dateFilter: z.enum(["Last 24h", "Last Week", "Last Month", "Last 3 Months"]).optional(),
  scanType: z.enum(["Dengkil Constituency", "Keyword Search", "Hashtag", "Profile / Page", "Post URL"]).optional(),
  proxy: z.boolean().optional(),
  // Accepted governance scope fields from the current upstream UI. Actor and
  // source URLs remain server-configured to prevent arbitrary paid execution.
  stateCode: z.string().trim().max(12).optional(),
  corpusId: z.string().trim().max(80).optional(),
  sourceTypes: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  planningProfileId: z.string().trim().max(80).optional(),
  queryId: z.string().trim().max(80).optional(),
}).strict();

export const POST = withCORS(async (req: NextRequest) => {
  const session = authenticateSession(req);
  if (!session) return unauthorizedResponse();
  if (!requireRole(["SECURITY_APPROVER", "S2D_ANALYST_WRITE"])(session)) {
    return forbiddenResponse("Requires SECURITY_APPROVER or S2D_ANALYST_WRITE role");
  }
  if (requestBodyTooLarge(req.headers.get("content-length"), MAX_BODY_BYTES)) {
    return NextResponse.json({ error: "Request body exceeds 32 KiB", code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues, code: "BAD_REQUEST" }, { status: 400 });
  }

  const data = parsed.data;
  const requestedPlatforms = data.platforms ?? (data.platform ? [data.platform] : ["tiktok"]);
  const platforms = [...new Set(requestedPlatforms.map((platform) => platform === "twitter" ? "x" : platform))];
  const keywords = data.keywords ?? (data.keyword ? [data.keyword] : []);
  const limit = data.limit ?? data.maxItems ?? 10;
  const localityCode = data.localityCode ?? "MELAKA";
  const apifyToken = getRawToken("APIFY_TOKEN") ?? resolveApifyToken();

  if (!apifyToken) {
    return NextResponse.json({
      error: "APIFY_TOKEN not configured — set it via Gear Settings or Wrangler secrets",
      code: "S2D_APIFY_TOKEN_MISSING",
      hint: "Use PUT /api/s2d/credentials or `npx wrangler secret put APIFY_TOKEN`.",
    }, { status: 503 });
  }

  let plans;
  try {
    plans = platforms.map((platform) => buildS2dApifyPlan({
      platform,
      keywords,
      query: data.query,
      limit,
      dateFilter: data.dateFilter,
      scanType: data.scanType,
      proxy: data.proxy,
    }));
  } catch (error) {
    return NextResponse.json({
      error: sanitizeS2dError(error, "Scraper route configuration rejected"),
      code: (error as { code?: string })?.code ?? "S2D_SCRAPE_CONFIGURATION_ERROR",
    }, { status: 400 });
  }

  const settled = await Promise.allSettled(plans.map((plan) => runS2dApifyPlan(plan, apifyToken)));
  const results = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failures = settled.flatMap((result, index) => result.status === "rejected" ? [{
    platform: plans[index]?.platform,
    error: sanitizeS2dError(result.reason, "Apify actor execution failed"),
    code: (result.reason as { code?: string })?.code ?? "S2D_SCRAPE_ROUTE_ERROR",
  }] : []);

  if (!results.length) {
    return NextResponse.json({
      status: "FAILED",
      results: [],
      failures,
      governance: { approvedRecordCapPerPlatform: S2D_APPROVED_RECORD_CAP, publicSourcesOnly: true },
    }, { status: 502 });
  }

  const multiPlatform = results.length > 1;
  const items = results.flatMap((result) => result.items.map((item) => multiPlatform
    ? { ...(item as Record<string, unknown>), _s2dPlatform: result.platform }
    : item));
  const runId = `RUN-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const status = failures.length ? "PARTIAL" : "COMPLETED";

  return NextResponse.json({
    runId,
    status,
    items,
    results: results.map(({ items: _items, ...stats }) => stats),
    failures,
    runStats: {
      requested: limit,
      returned: items.length,
      platforms: results.map((result) => result.platform),
      localityCode,
    },
    governance: {
      approvedRecordCapPerPlatform: S2D_APPROVED_RECORD_CAP,
      serverSideCredentialOnly: true,
      publicSourcesOnly: true,
      humanReviewRequiredBeforeIntelligenceExchange: true,
    },
  }, { status: failures.length ? 207 : 200 });
});

export async function OPTIONS(req: NextRequest) {
  const { handlePreflight } = await import("@/lib/cors");
  return handlePreflight(req) ?? new NextResponse(null, { status: 403 });
}
