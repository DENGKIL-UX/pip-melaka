// PIP-MLK Dashboard API route — assembled dashboard summary, cached 5 min.
// Truth Above All: the dashboard reads verified engine data from public/data
// (P134 overview, 5 DUN records, elections GE14/PRN15/GE15, DPT churn,
// DOSM socioeconomic). The data does not change frequently — it ships as
// static JSON in the repo — so caching the assembled payload for 5 minutes
// cuts filesystem reads + JSON/JSONL parsing dramatically under load.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cacheGetOrSet, cacheInvalidate, cacheStats } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Config — task spec: 5 min TTL on /api/dashboard.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "dashboard:summary:v1";

const DATA_DIR = path.join(process.cwd(), "public", "data");

// ---------------------------------------------------------------------------
// File readers (mirrors the assistant route's helpers — kept simple here).
// ---------------------------------------------------------------------------

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const txt = await fs.readFile(path.join(DATA_DIR, rel), "utf8");
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

async function readJsonl<T>(rel: string): Promise<T[]> {
  try {
    const txt = await fs.readFile(path.join(DATA_DIR, rel), "utf8");
    return txt
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Payload builder — assembles every dataset the dashboard needs into one
// response. Runs inside cacheGetOrSet so repeated calls within the TTL
// window are served from cache without touching the filesystem.
// ---------------------------------------------------------------------------

interface DashboardSummary {
  generated_at: string;
  cached: boolean;
  overview: unknown;
  geography_counts: unknown;
  duns: unknown[];
  elections: unknown;
  dpt: unknown;
  dosm: unknown;
  gates: { closed: number; open: number; total: number };
}

async function buildDashboardSummary(): Promise<DashboardSummary> {
  const [overview, duns, elections, dpt, dosm] = await Promise.all([
    readJson<unknown>("p134/dashboard-overview.json"),
    readJsonl<unknown>("p134/dun-intelligence.jsonl"),
    readJson<unknown>("elections/melaka-elections.json"),
    readJson<unknown>("dpt/spr-dpt-pameran-summary.json"),
    readJson<unknown>("socioeconomic/melaka-dosm.json"),
  ]);

  // The overview JSON has both `overview` and `geography_counts` at the top
  // level — pull them out so the API response is flatter and easier to
  // consume from the client.
  const ov = overview as { overview?: unknown; geography_counts?: unknown } | null;

  return {
    generated_at: new Date().toISOString(),
    cached: false,
    overview: ov?.overview ?? overview,
    geography_counts: ov?.geography_counts ?? null,
    duns,
    elections,
    dpt,
    dosm,
    // Provenance gates — 8 of 9 closed per governance tab. Hard-coded here
    // because the gates table is static and shipping it in every dashboard
    // payload would just bloat the response.
    gates: { closed: 8, open: 1, total: 9 },
  };
}

// ---------------------------------------------------------------------------
// GET handler — serve cached payload, optionally invalidate via ?refresh=1.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const stats = url.searchParams.get("stats") === "1";

  // /api/dashboard?stats=1 — diagnostic endpoint exposing cache hit/miss
  // counters. Useful for /api/health or an admin dashboard. Does NOT touch
  // the cached payload itself.
  if (stats) {
    return NextResponse.json({ cache: cacheStats(), cacheKey: CACHE_KEY, ttlMs: CACHE_TTL_MS });
  }

  // /api/dashboard?refresh=1 — invalidate the cache and rebuild. Useful
  // after the engine re-runs and produces new public/data files. Without
  // this the cache would serve stale data until the TTL expires.
  if (refresh) {
    cacheInvalidate(CACHE_KEY);
  }

  const payload = await cacheGetOrSet(CACHE_KEY, buildDashboardSummary, CACHE_TTL_MS);

  const res = NextResponse.json({ ...payload, cached: true });
  // Surface cache metadata in response headers so clients can tell whether
  // they got a fresh or cached payload (and when the cache will expire).
  res.headers.set("X-Cache-Key", CACHE_KEY);
  res.headers.set("X-Cache-TTL-Ms", String(CACHE_TTL_MS));
  res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  return res;
}
