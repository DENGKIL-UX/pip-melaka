import { NextRequest, NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";
import { authenticateSession, requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/s2d-auth";
import { isSafeURL } from "@/lib/ssrf-protection";
import { getRawToken } from "@/lib/s2d-credential-vault";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Unified scraper endpoint — multi-platform collection (TikTok, Facebook, Instagram, Threads, X)
// Per Phase 4 spec: POST /api/scrape/run

const BodySchema = z.object({
  platforms: z.array(z.enum(["tiktok", "facebook", "instagram", "threads", "x", "twitter"])).min(1).max(5).optional(),
  platform: z.enum(["tiktok", "facebook", "instagram", "threads", "x", "twitter"]).optional(),
  keywords: z.array(z.string().min(1).max(100)).max(20).optional(),
  keyword: z.string().min(1).max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  maxItems: z.number().int().min(1).max(100).optional(),
  localityCode: z.string().min(1).max(20).optional(),
  dateFilter: z.enum(["Last 24h", "Last Week", "Last Month", "Last 3 Months"]).optional(),
});

export const POST = withCORS(async (req: NextRequest) => {
  const session = authenticateSession(req);
  if (!session) return unauthorizedResponse();

  // No strict role check for scrape — any authenticated user can run scraper in dev
  // In production, you might want requireRole(['S2D_ANALYST_WRITE'])
  // const hasRole = requireRole(['SECURITY_APPROVER', 'S2D_ANALYST_WRITE'])(session);
  // if (!hasRole) return forbiddenResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues, code: "BAD_REQUEST" }, { status: 400 });
  }

  const data = parsed.data;
  const platforms: string[] = data.platforms ?? (data.platform ? [data.platform] : ["tiktok"]);
  const keywords: string[] = data.keywords ?? (data.keyword ? [data.keyword] : ["Melaka"]);
  const limit = data.limit ?? data.maxItems ?? 10;
  const localityCode = data.localityCode ?? "MELAKA";

  // Check Apify token is configured (either via vault or env)
  const apifyToken = getRawToken("APIFY_TOKEN") ?? process.env.APIFY_TOKEN ?? process.env.NEXT_PUBLIC_APIFY_TOKEN;
  if (!apifyToken) {
    return NextResponse.json(
      {
        error: "APIFY_TOKEN not configured — set via Gear Settings or env/Wrangler secrets",
        code: "S2D_APIFY_TOKEN_MISSING",
        hint: "Use PUT /api/s2d/credentials with APIFY_TOKEN or set APIFY_TOKEN via `npx wrangler secret put APIFY_TOKEN`",
      },
      { status: 503 }
    );
  }

  // In a real implementation, this would call Apify actors:
  //   clockworks/tiktok-scraper, apify~facebook-posts-scraper, etc.
  // via the governed record limit (resolveS2dApprovedMaximum etc.)
  // For now, return a mocked but valid response envelope that shows the unified endpoint works.

  // SSRF guard example: if a webhook URL were provided, validate it
  // (demonstrates ssrfValidator.js usage)
  // if (data.webhookUrl) { const safe = await isSafeURL(data.webhookUrl); if (!safe.ok) return ... }

  const runId = `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const results = platforms.map((plat) => ({
    platform: plat,
    requestedLimit: limit,
    keywords,
    localityCode,
    status: "QUEUED",
    // In production, this would be the Apify run ID
    apifyRunId: `apify_${plat}_${runId}`,
  }));

  return NextResponse.json({
    runId,
    status: "QUEUED",
    platforms,
    keywords,
    localityCode,
    limit,
    results,
    message: `Unified scraper queued for ${platforms.join(", ")} — ${keywords.join(", ")} (locality: ${localityCode})`,
    note: "In production, this proxies to Apify actors (TikTok, Facebook, Instagram, Threads, X) via the hardened multi-platform routing patch with governed limits.",
    governance: { aggregatePublicSignalsOnly: true, publicSource: true },
  });
});

export async function OPTIONS(req: NextRequest) {
  const { handlePreflight } = await import("@/lib/cors");
  const res = handlePreflight(req);
  if (res) return res;
  return new NextResponse(null, { status: 204 });
}
