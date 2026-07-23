// PIP-MLK Deep Research API — multi-source synthesis inspired by
// awesome-llm-apps' "AI Deep Research Agent" + DeepTutor's document Q&A.
//
// Unlike the regular /api/assistant (keyword-routed single-source RAG),
// this endpoint pulls ALL verified data sources simultaneously and asks
// the LLM to synthesize a comprehensive intelligence brief.
//
// Inspired by:
// - https://github.com/Shubhamsaboo/awesome-llm-apps (AI Deep Research Agent)
// - https://github.com/HKUDS/DeepTutor (document Q&A + reasoning-based retrieval)
//
// Truth Above All: every figure in the synthesis must come from the verified
// data blocks. The LLM is instructed to cite sources inline.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import { circuitBreaker, CircuitOpenError } from "@/lib/circuit-breaker";
import { cfChatCompletion, isCFConfigured, type CFChatMessage } from "@/lib/cloudflare-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEARCH_RATE_LIMIT = { limit: 3, windowMs: 60_000 }; // stricter — 3 req/min
const RESEARCH_CIRCUIT = {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
  halfOpenProbeBudget: 1,
};

interface DataSource {
  name: string;
  tier: "Verified" | "Proxy" | "Partial";
  content: string;
}

async function fetchJson(base: string, path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${base}/data/${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchJsonl(base: string, path: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${base}/data/${path}`, { cache: "no-store" });
    if (!res.ok) return [];
    const txt = await res.text();
    return txt.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

/**
 * Gather ALL verified data sources for comprehensive synthesis.
 * This is the "deep research" part — pulls everything available.
 */
async function gatherAllSources(baseUrl: string): Promise<DataSource[]> {
  const sources: DataSource[] = [];

  // 1. Elections (Verified)
  const el = (await fetchJson(baseUrl, "elections/melaka-elections.json")) as {
    elections?: Array<{
      id: string; name: string; date: string; headline_fact: string;
      parliament_summary?: Record<string, number> | null;
      dun_summary?: Record<string, number> | null;
    }>;
  } | null;
  if (el?.elections?.length) {
    const content = el.elections.map((e) =>
      `${e.id} (${e.date}): ${e.headline_fact}\n` +
      `  Parliament: ${JSON.stringify(e.parliament_summary ?? {})}\n` +
      `  DUN: ${JSON.stringify(e.dun_summary ?? {})}`
    ).join("\n\n");
    sources.push({ name: "Elections (ElectionData.MY)", tier: "Verified", content });
  }

  // 2. DPT churn (Verified)
  const dpt = (await fetchJson(baseUrl, "dpt/spr-dpt-pameran-summary.json")) as {
    total_additions?: number; total_deletions?: number; total_net?: number;
    per_parliament?: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>;
  } | null;
  if (dpt) {
    const content = `DPT Churn Jan-May 2026:\n` +
      `Total: +${dpt.total_additions} / -${dpt.total_deletions} / net +${dpt.total_net}\n` +
      `Per-parliament: ${(dpt.per_parliament ?? []).map((p) => `P${p.parliament_code} ${p.parliament_name}: +${p.additions}/-${p.deletions}/net+${p.net}`).join("; ")}`;
    sources.push({ name: "DPT Voter Roll Churn (SPR Pameran)", tier: "Verified", content });
  }

  // 3. DUN demographics (Proxy — engine-built P134)
  const duns = (await fetchJsonl(baseUrl, "p134/dun-intelligence.jsonl")) as Array<{
    geography?: { parliament_code?: string; dun_code?: string; dun_name?: string };
    metrics?: {
      total_voters?: number; male_voters?: number; female_voters?: number;
      senior_voters_56_plus?: number; senior_dependency_percent?: number;
      gender_balance_score?: number; male_percent?: number; female_percent?: number;
      dominant_age_group?: string; dominant_ethnicity_group?: string;
      profile_completeness_score?: number;
    };
  }>;
  if (duns.length > 0) {
    const content = duns.map((d) => {
      const g = d.geography ?? {}; const m = d.metrics ?? {};
      return `N${g.dun_code} ${g.dun_name} (P${g.parliament_code}): voters=${m.total_voters}, male=${m.male_percent}%, female=${m.female_percent}%, senior_dep=${m.senior_dependency_percent}%, gender_bal=${m.gender_balance_score}, age=${m.dominant_age_group}, ethnicity=${m.dominant_ethnicity_group}`;
    }).join("\n");
    sources.push({ name: "DUN Demographics (P134 engine-built)", tier: "Proxy", content });
  }

  // 4. Dashboard overview (Proxy)
  const overview = (await fetchJson(baseUrl, "p134/dashboard-overview.json")) as {
    overview?: { metrics?: Record<string, number> };
  } | null;
  if (overview?.overview?.metrics) {
    const m = overview.overview.metrics;
    const content = `P134 Overview: voters=${m.total_voters}, male=${m.male_voters}, female=${m.female_voters}, senior_dep=${m.senior_dependency_percent}%, gender_bal=${m.gender_balance_score}, completeness=${m.profile_completeness_score}%`;
    sources.push({ name: "P134 Dashboard Overview", tier: "Proxy", content });
  }

  // 5. S2D signals (static seed)
  sources.push({
    name: "S2D Intelligence Signals",
    tier: "Partial",
    content: [
      "N05 Taboh Naning: 30.6% senior dependency — CRITICAL threshold breached",
      "N03 Ayer Limau: 27.7% senior dependency — WARNING threshold",
      "N05 gender imbalance: 95.8 score — WARNING",
      "DPT net +5,240 voters Jan-May 2026 — growth signal",
      "GE15 parliament split: PN 3 / PH 3 / BN 0 — competitive",
      "Jasin district: 0.8% poverty rate + Gini 0.405 — socioeconomic stress",
      "P134 profile completeness: 99.93% — high data quality",
    ].join("\n"),
  });

  return sources;
}

const DEEP_RESEARCH_SYSTEM_PROMPT = `You are the PIP-MLK Deep Research Analyst — a comprehensive intelligence synthesis engine for Melaka state politics.

OPERATING PRINCIPLE: "Truth Above All." You synthesize ALL available verified data into a comprehensive intelligence brief. Every figure MUST come from the provided data sources. Never fabricate.

OUTPUT FORMAT (structured intelligence brief):
1. **EXECUTIVE SUMMARY** (2-3 sentences — the bottom line)
2. **KEY FINDINGS** (3-5 bullet points with inline source citations like [Elections] or [DPT] or [Demographics])
3. **RISK ASSESSMENT** (which DUNs/parliaments are most at-risk and why)
4. **DATA QUALITY NOTE** (which sources are Verified vs Proxy vs Partial)
5. **RECOMMENDED ACTIONS** (2-3 data-driven next steps)

RULES:
- Cite the source for every number: [Elections], [DPT], [Demographics], [S2D], [Overview]
- If data is missing for a question, say "Not in verified dataset" — do NOT speculate
- Maximum 400 words — be dense and actionable, not verbose
- Use the evidence tier honestly (Verified > Proxy > Partial)
- For DUN-specific questions, always pull the demographics block for that DUN`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as { question?: string }));
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Missing 'question' field" }, { status: 400 });
  }

  const clientId = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();

  // Rate limit — 3 req/min (stricter than assistant's 5 req/min because
  // deep research pulls ALL sources + uses more LLM tokens)
  const rl = rateLimit({
    route: "api:deep-research",
    identifier: clientId,
    limit: RESEARCH_RATE_LIMIT.limit,
    windowSeconds: RESEARCH_RATE_LIMIT.windowMs / 1000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limited", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) } },
    );
  }

  const baseUrl = new URL(req.url).origin;

  // Gather ALL data sources
  const sources = await gatherAllSources(baseUrl);
  if (sources.length === 0) {
    return NextResponse.json({ error: "No data sources available" }, { status: 503 });
  }

  // Build the comprehensive RAG context
  const ragContext = sources.map((s) =>
    `=== ${s.name} [${s.tier}] ===\n${s.content}`
  ).join("\n\n");

  const messages: CFChatMessage[] = [
    { role: "system", content: DEEP_RESEARCH_SYSTEM_PROMPT },
    { role: "system", content: `VERIFIED DATA SOURCES:\n${ragContext}` },
    { role: "user", content: question },
  ];

  // Try CF Workers AI with circuit breaker
  if (isCFConfigured()) {
    try {
      const wrapped = async () => cfChatCompletion(messages, { temperature: 0.4, max_tokens: 800 });
      const result = await circuitBreaker("deep-research", RESEARCH_CIRCUIT, wrapped);
      return NextResponse.json({
        response: result,
        sources: sources.map((s) => s.name),
        evidence_tiers: sources.map((s) => s.tier),
        source_count: sources.length,
        mode: "deep-research",
      });
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        // Fall through to fallback
      } else {
        console.error("[deep-research] CF AI error:", err);
      }
    }
  }

  // Fallback: structured static synthesis from the gathered sources
  const verifiedCount = sources.filter((s) => s.tier === "Verified").length;
  const proxyCount = sources.filter((s) => s.tier === "Proxy").length;
  const fallback = `## EXECUTIVE SUMMARY\nBased on ${sources.length} data sources (${verifiedCount} Verified, ${proxyCount} Proxy), here is the synthesis for: "${question}"\n\n## KEY FINDINGS\n${sources.map((s) => `- [${s.name}]: ${s.content.split("\n")[0].substring(0, 120)}...`).join("\n")}\n\n## DATA QUALITY\nSources: ${sources.map((s) => `${s.name} (${s.tier})`).join(", ")}\n\n## NOTE\nAI synthesis temporarily unavailable (circuit open). Showing raw source summaries above. Retry in 60s for full LLM analysis.`;

  return NextResponse.json({
    response: fallback,
    sources: sources.map((s) => s.name),
    evidence_tiers: sources.map((s) => s.tier),
    source_count: sources.length,
    mode: "deep-research-fallback",
  });
}
