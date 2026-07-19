// PIP-MLK AI Assistant API route — RAG-enhanced chat with z-ai-web-dev-sdk.
// Truth Above All: every response is grounded in verified Melaka data.
//
// Resilience stack (see src/lib/* + docs/RESEARCH-RESILIENCE.md):
//   1. POST handler is wrapped by `withIdempotency()` so retried client calls
//      with the same Idempotency-Key return the cached LLM result instead of
//      re-invoking the (expensive) model.
//   2. `rateLimit()` enforces 5 req/min per IP — LLM calls cost real money
//      and time, and a single abusive client could exhaust the budget.
//   3. `assessBackpressure()` sheds load (429 + Retry-After) when the
//      in-process queue is overwhelmed even before the per-IP limit fires.
//   4. `circuitBreaker("llm-assistant", ...)` opens after 5 consecutive
//      ZAI failures so subsequent requests fail-fast into the static fallback
//      instead of queuing behind doomed calls.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import ZAI from "z-ai-web-dev-sdk";
import { rateLimit, assessBackpressure, withInflight, getClientIdentifier } from "@/lib/rate-limiter";
import { circuitBreaker, CircuitOpenError } from "@/lib/circuit-breaker";
import { withIdempotency } from "@/lib/idempotency";
import { withCORS } from "@/lib/cors";
import { cfChatCompletion, isCFConfigured, CF_MODELS, type CFChatMessage } from "@/lib/cloudflare-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Resilience config — task spec: 5 req/min per IP for the LLM route.
// ---------------------------------------------------------------------------

const ASSISTANT_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000, // 1 minute
};

const ASSISTANT_CIRCUIT = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000, // 30s cool-down before half-open probe
  halfOpenProbeBudget: 1,
};

// ---------------------------------------------------------------------------
// 12 VERIFIED MELAKA FACTS — the system-prompt anchor. Every AI reply must be
// reconcilable against one of these facts or the RAG context below.
// ---------------------------------------------------------------------------
const MELAKA_FACTS: string[] = [
  "P134 (Masjid Tanah) has 71,415 verified voters — built from the PIP-VOTER-INTELLIGENCE engine output, not raw SPR xlsx.",
  "PRN15 (Melaka state election, 20 Nov 2021): BN won 21/28 DUN seats in a landslide. PH won 5, PN won 2. BN regained the state government.",
  "GE15 (19 Nov 2022): PN won 3 parliaments (P134 Masjid Tanah, P136 Tangga Batu, P139 Jasin). PH won 3 (P135 Alor Gajah, P137 Hang Tuah Jaya, P138 Kota Melaka). BN won 0. Split: PN 3 / PH 3.",
  "GE14 (9 May 2018): PH won 4/6 parliaments + 15/28 DUN seats. BN won 2 parliaments + 13 DUN. PH formed the state government.",
  "Melaka state population: 932,700 (DOSM Census 2020).",
  "Melaka median household income: RM 5,670 (HIES 2022).",
  "DPT churn Jan-May 2026 (SPR Pameran): +8,420 additions, -3,180 deletions, +5,240 net growth across 6 parliaments.",
  "P134 demographics verified for 5 DUNs (N01-N05): Kuala Linggi, Tanjung Bidara, Ayer Limau, Lendu, Taboh Naning.",
  "N05 Taboh Naning: 30.6% senior dependency (56+) — CRITICAL threshold breached, aging DUN.",
  "N03 Ayer Limau: 27.7% senior dependency — WARNING threshold.",
  "P134 gender balance score: 97.53 (female-skewed, 36,588 female vs 34,827 male voters).",
  "P134 profile completeness: 99.93% (engine cleansed 71,415 records with avg confidence 0.9999).",
];

const SYSTEM_PROMPT = `You are the PIP-MLK AI Assistant — a political intelligence assistant for Melaka state, Malaysia.
Operating principle: "Truth Above All." You NEVER speculate. Every figure must come from one of the verified Melaka facts or the RAG context block provided.

RULES:
1. If the user's question is answered by a verified fact or RAG context, cite the figure exactly and add a short source tag like [P134 engine] or [DOSM 2020] or [SPR DPT] or [ElectionData.my].
2. If the question falls outside Melaka political intelligence, politely decline and redirect to the dashboard tabs.
3. Do NOT fabricate seat counts, voter numbers, or percentages. If unknown, say "Not in verified dataset — see Governance tab for known gaps."
4. Keep answers under 180 words, in clear English. Use short bullets where useful.
5. When the user mentions a DUN code (e.g. N05), look it up in the RAG context; never guess demographics.
6. Acknowledge the Proxy evidence tier honestly: 8 of 9 provenance gates are closed; Gate 9 (raw SPR voter xlsx) remains open.

VERIFIED MELAKA FACTS (anchor — quote these exactly):
${MELAKA_FACTS.map((f, i) => `${i + 1}. ${f}`).join("\n")}
`;

// ---------------------------------------------------------------------------
// RAG CONTEXT BUILDER — keyword routing to 4 verified datasets.
// ---------------------------------------------------------------------------

interface RagResult {
  context: string;
  source: string;
  evidence_tier: "Verified" | "Proxy" | "Partial";
}

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJsonlSafe(rel: string): Promise<unknown[]> {
  try {
    const txt = await fs.readFile(path.join(DATA_DIR, rel), "utf8");
    return txt
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as unknown);
  } catch {
    return [];
  }
}

async function readJsonSafe(rel: string): Promise<unknown | null> {
  try {
    const txt = await fs.readFile(path.join(DATA_DIR, rel), "utf8");
    return JSON.parse(txt) as unknown;
  } catch {
    return null;
  }
}

function has(text: string, ...kw: string[]): boolean {
  const t = text.toLowerCase();
  return kw.some((k) => t.includes(k.toLowerCase()));
}

async function buildRagContext(question: string): Promise<RagResult> {
  const q = question.toLowerCase();
  const sources: string[] = [];
  const evidenceSet = new Set<"Verified" | "Proxy" | "Partial">();
  const blocks: string[] = [];

  // Elections block
  if (
    has(
      q,
      "election",
      "prn15",
      "ge14",
      "ge15",
      "bn",
      "ph",
      "pn",
      "seat",
      "won",
      "votes",
      "winner",
      "result",
      "landslide",
    )
  ) {
    const el = (await readJsonSafe("elections/melaka-elections.json")) as {
      elections?: Array<{
        id: string;
        name: string;
        date: string;
        headline_fact: string;
        parliament_summary?: Record<string, number> | null;
        dun_summary?: Record<string, number> | null;
        parliament_results?: Array<{ parliament_code: string; winner: string; votes_pct: number; runner_up: string; margin_pct: number }>;
        dun_results?: Array<{ parliament_code: string; dun_code: string; winner: string; vote_share: Record<string, number> }>;
      }>;
    } | null;
    if (el?.elections) {
      blocks.push(
        "=== ELECTIONS (Verified, ElectionData.my sourced from SPR gazettes) ===\n" +
          el.elections
            .map(
              (e) =>
                `${e.id} (${e.date}): ${e.headline_fact}\n` +
                (e.parliament_summary ? `  Parliament: ${JSON.stringify(e.parliament_summary)}` : "") +
                (e.dun_summary ? `\n  DUN: ${JSON.stringify(e.dun_summary)}` : ""),
            )
            .join("\n"),
      );
      sources.push("elections/melaka-elections.json");
      evidenceSet.add("Verified");
    }
  }

  // DPT block
  if (has(q, "dpt", "voter roll", "additions", "deletions", "churn", "net", "pameran", "registration")) {
    const dpt = (await readJsonSafe("dpt/spr-dpt-pameran-summary.json")) as {
      total_additions?: number;
      total_deletions?: number;
      total_net?: number;
      months?: string[];
      per_month?: Array<{ month: string; additions: number; deletions: number; net: number }>;
      per_parliament?: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>;
    } | null;
    if (dpt) {
      blocks.push(
        "=== DPT CHURN Jan-May 2026 (Verified, SPR Pameran PDFs) ===\n" +
          `Totals: +${dpt.total_additions} additions / -${dpt.total_deletions} deletions / +${dpt.total_net} net\n` +
          `Per-parliament: ${(dpt.per_parliament ?? [])
            .map((p) => `P${p.parliament_code} ${p.parliament_name} +${p.additions}/-${p.deletions}/net+${p.net}`)
            .join("; ")}`,
      );
      sources.push("dpt/spr-dpt-pameran-summary.json");
      evidenceSet.add("Verified");
    }
  }

  // DUN demographics block
  if (
    has(
      q,
      "dun",
      "n01",
      "n02",
      "n03",
      "n04",
      "n05",
      "taboh",
      "ayer limau",
      "lendu",
      "kuala linggi",
      "tanjung bidara",
      "demographic",
      "senior",
      "gender",
      "voter",
      "age",
      "ethnicity",
      "p134",
      "masjid tanah",
    )
  ) {
    const duns = (await readJsonlSafe("p134/dun-intelligence.jsonl")) as Array<{
      geography?: { parliament_code?: string; dun_code?: string; dun_name?: string };
      metrics?: {
        total_voters?: number;
        male_voters?: number;
        female_voters?: number;
        senior_voters_56_plus?: number;
        senior_dependency_percent?: number;
        gender_balance_score?: number;
        male_percent?: number;
        female_percent?: number;
        dominant_age_group?: string;
        dominant_ethnicity_group?: string;
        profile_completeness_score?: number;
      };
    }>;
    if (duns.length > 0) {
      blocks.push(
        "=== DUN DEMOGRAPHICS (Proxy tier — engine-built P134, 5 DUNs N01-N05) ===\n" +
          duns
            .map((d) => {
              const g = d.geography ?? {};
              const m = d.metrics ?? {};
              return `N${g.dun_code} ${g.dun_name} (P${g.parliament_code}): voters=${m.total_voters}, male=${m.male_percent}%, female=${m.female_percent}%, senior_dep=${m.senior_dependency_percent}%, gender_bal=${m.gender_balance_score}, age=${m.dominant_age_group}`;
            })
            .join("\n"),
      );
      sources.push("p134/dun-intelligence.jsonl");
      evidenceSet.add("Proxy");
    }
  }

  // Socioeconomic block
  if (has(q, "income", "poverty", "gini", "unemployment", "dosm", "population", "socioeconomic", "median", "district")) {
    const socio = (await readJsonSafe("socioeconomic/melaka-dosm.json")) as {
      state?: { population?: number; median_household_income?: number; poverty_rate?: number; gini_coefficient?: number; unemployment_rate?: number };
      districts?: Array<{ name: string; population: number; median_income: number; poverty_rate: number; gini: number; unemployment: number }>;
    } | null;
    if (socio) {
      blocks.push(
        "=== SOCIOECONOMIC (Verified, DOSM Census 2020 + HIES 2022) ===\n" +
          `State: pop=${socio.state?.population}, median_income=RM${socio.state?.median_household_income}, poverty=${socio.state?.poverty_rate}%, gini=${socio.state?.gini_coefficient}, unemployment=${socio.state?.unemployment_rate}%\n` +
          `Districts: ${(socio.districts ?? [])
            .map((d) => `${d.name} (pop ${d.population}, RM${d.median_income}, poverty ${d.poverty_rate}%, gini ${d.gini})`)
            .join("; ")}`,
      );
      sources.push("socioeconomic/melaka-dosm.json");
      evidenceSet.add("Verified");
    }
  }

  if (blocks.length === 0) {
    return { context: "", source: "", evidence_tier: "Partial" };
  }

  const tier: RagResult["evidence_tier"] = evidenceSet.has("Verified")
    ? "Verified"
    : evidenceSet.has("Proxy")
      ? "Proxy"
      : "Partial";

  return {
    context: blocks.join("\n\n"),
    source: sources.join(", "),
    evidence_tier: tier,
  };
}

// ---------------------------------------------------------------------------
// Static fallback — used when ZAI fails or env is unset.
// ---------------------------------------------------------------------------
function staticFallback(question: string): string {
  const q = question.toLowerCase();
  if (has(q, "voter", "p134", "71")) {
    return "P134 (Masjid Tanah) has 71,415 verified voters — built by the PIP-VOTER-INTELLIGENCE engine from a cleansed voter roll (99.93% profile completeness, 0.9999 avg cleansing confidence). [P134 engine]";
  }
  if (has(q, "prn15", "state election", "bn 21")) {
    return "PRN15 (20 Nov 2021): BN won 21/28 DUN seats — a landslide. PH won 5, PN won 2. BN regained the Melaka state government. [ElectionData.my]";
  }
  if (has(q, "ge15", "pn 4", "parliament")) {
    return "GE15 (19 Nov 2022): PN won 3 parliaments (P134, P136, P139). PH won 3 (P135, P137, P138). BN won 0. Melaka's parliamentary delegation split. [ElectionData.my]";
  }
  if (has(q, "senior", "taboh", "n05")) {
    return "N05 Taboh Naning has 30.6% senior dependency (56+) — CRITICAL threshold breached. N03 Ayer Limau is at 27.7% (WARNING). These are aging DUNs under healthcare pressure. [P134 engine]";
  }
  if (has(q, "dpt", "churn", "registration")) {
    return "DPT churn Jan-May 2026: +8,420 additions, -3,180 deletions, +5,240 net growth across 6 parliaments. P137 Hang Tuah Jaya leads with +1,100 net. [SPR Pameran]";
  }
  return "I can answer questions about Melaka elections (GE14/PRN15/GE15), P134 voter demographics, DPT churn, and DOSM socioeconomic indicators. Try: 'How many voters in P134?' or 'Who won PRN15?' [Static fallback — LLM offline]";
}

// ---------------------------------------------------------------------------
// POST handler
//
// The full handler is wrapped by `withIdempotency()` so clients that retry
// with the same `Idempotency-Key` header get the cached LLM response back
// without re-invoking the model. Inside, we run:
//   1. rateLimit() — 5 req/min per IP (per task spec for LLM routes)
//   2. assessBackpressure() — 429 + Retry-After if the queue is overflowing
//   3. parse body, build RAG context (no breaker — local fs reads rarely fail)
//   4. circuitBreaker("llm-assistant", ...) around the ZAI call so 5
//      consecutive LLM failures open the circuit and we fail-fast into the
//      static fallback. The static fallback is ALWAYS returned (never a 5xx)
//      so end users never see a hard error — the resilience primitives are
//      for budget/backpressure protection, not for degrading UX.
// ---------------------------------------------------------------------------

async function handlePost(req: NextRequest): Promise<NextResponse> {
  // --- 1. Rate limit (5 req/min per IP) ---
  // Security-01: rate-limit every LLM call to protect the ZAI budget and to
  // blunt brute-force prompt-injection attempts. Uses the shared
  // rate-limiter (`@/lib/rate-limiter`) so middleware and route-level limits
  // share a single in-memory bucket store.
  const rl = rateLimit({
    identifier: getClientIdentifier(req),
    route: "api:assistant",
    limit: ASSISTANT_RATE_LIMIT.limit,
    windowSeconds: ASSISTANT_RATE_LIMIT.windowMs / 1000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: rl.retryAfter, resetAt: rl.reset * 1000 },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": String(ASSISTANT_RATE_LIMIT.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.reset),
        },
      },
    );
  }

  // --- 2. Backpressure (429 if server is overwhelmed) ---
  const bp = assessBackpressure();
  if (bp.shedLoad) {
    return NextResponse.json(
      { error: "backpressure", inflight: bp.inflight, reason: bp.reason },
      {
        status: 429,
        headers: { "Retry-After": String(bp.retryAfterSeconds) },
      },
    );
  }

  // --- 3. Parse body ---
  let messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  let backend: "zai" | "cf" = "zai";
  let cfModel: string = CF_MODELS[0].id;
  try {
    const body = (await req.json()) as {
      messages?: Array<{ role: string; content: string }>;
      backend?: string;
      model?: string;
    };
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages[] required" }, { status: 400 });
    }
    // R10: Limit message count and content length to prevent abuse
    if (body.messages.length > 20) {
      return NextResponse.json({ error: "Too many messages (max 20)" }, { status: 413 });
    }
    messages = body.messages
      .filter((m) => typeof m.content === "string" && m.content.length <= 5000)
      .slice(-20) // Keep only last 20 messages
      .map((m) => ({ role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant", content: m.content.slice(0, 5000) }));

    // Parse backend selection (default: zai, fallback to cf if requested)
    if (body.backend === "cf" && isCFConfigured()) {
      backend = "cf";
    }
    // Parse CF model ID
    if (body.model && CF_MODELS.some((m) => m.id === body.model)) {
      cfModel = body.model!;
    }
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Build RAG context from the latest user question.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const rag = lastUser ? await buildRagContext(lastUser.content) : { context: "", source: "", evidence_tier: "Partial" as const };

  const augmentedSystem = SYSTEM_PROMPT + (rag.context ? `\n\nRAG CONTEXT (verified, use these exact figures):\n${rag.context}\n` : "");

  // --- 4. Call the LLM through the circuit breaker + inflight tracker ---
  // Supports two backends:
  //   - "zai" (default): z-ai-web-dev-sdk (GLM-4.6, built-in to the platform)
  //   - "cf": Cloudflare Workers AI (Llama 3.1, Mistral, Qwen — requires CF_AI_TOKEN)
  //
  // `withInflight` ensures backpressure's `inflight` count is accurate even
  // if the LLM call hangs or throws. `circuitBreaker` opens after 5
  // consecutive failures so subsequent requests fail-fast.
  const runLlm = withInflight(async () => {
    if (backend === "cf") {
      // === Cloudflare Workers AI backend ===
      const cfMessages: CFChatMessage[] = [
        { role: "system", content: augmentedSystem },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];
      const result = await cfChatCompletion(cfMessages, cfModel);
      return result.response.trim();
    }

    // === Default: z-ai-web-dev-sdk backend ===
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: augmentedSystem },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      thinking: { type: "disabled" },
      temperature: 0.2,
      max_tokens: 600,
    });
    return completion?.choices?.[0]?.message?.content?.trim() || "";
  });

  let responseText: string;
  let llmSource = backend === "cf" ? `cf:${cfModel}` : "zai";

  try {
    const text = await circuitBreaker("llm-assistant", runLlm, ASSISTANT_CIRCUIT);
    responseText = text || staticFallback(lastUser?.content ?? "");
  } catch (err) {
    // CircuitOpenError = breaker is open OR a probe just failed. Log and fall
    // back to the static answer — the user still gets a verified response.
    if (err instanceof CircuitOpenError) {
      console.warn("[assistant] circuit open:", err.message);
      llmSource = "circuit-open-fallback";
    } else {
      console.error(`[assistant] ${backend} error:`, err instanceof Error ? err.message : String(err));
      llmSource = "static-fallback";
    }
    responseText = staticFallback(lastUser?.content ?? "");
  }

  const res = NextResponse.json({
    response: responseText,
    rag_used: !!rag.context,
    source: rag.source || llmSource,
    evidence_tier: rag.context ? rag.evidence_tier : "Partial",
  });

  // Always emit rate-limit headers on successful responses so clients can
  // self-throttle (X-RateLimit-* is the de-facto convention).
  res.headers.set("X-RateLimit-Limit", String(ASSISTANT_RATE_LIMIT.limit));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(rl.reset));
  // Surface the evidence tier + rag flag so the assistant-panel badges can
  // read them from response headers (idempotency replay re-emits these).
  res.headers.set("X-Evidence-Tier", rag.context ? rag.evidence_tier : "Partial");
  res.headers.set("X-Rag-Used", String(!!rag.context));
  res.headers.set("X-Source", rag.source || llmSource);
  return res;
}

// Export the idempotency-wrapped POST handler.
// Security-01: wrap the entire chain in withCORS so the origin allowlist +
// preflight handling apply even when the request is rejected by the rate
// limiter or backpressure gate (withCORS runs OUTERMOST so the rejection
// response still carries Access-Control-Allow-Origin + the security headers
// applied by middleware).
export const POST = withCORS(withIdempotency(handlePost));

export const GET = withCORS(async () => {
  return NextResponse.json({
    endpoint: "/api/assistant",
    method: "POST",
    schema: { messages: "Array<{ role: 'user'|'assistant', content: string }>" },
    response: { response: "string", rag_used: "boolean", source: "string", evidence_tier: "Verified|Proxy|Partial" },
    facts_count: MELAKA_FACTS.length,
    resilience: {
      rate_limit: `${ASSISTANT_RATE_LIMIT.limit} req / ${ASSISTANT_RATE_LIMIT.windowMs / 1000}s per IP`,
      circuit_breaker: {
        name: "llm-assistant",
        failure_threshold: ASSISTANT_CIRCUIT.failureThreshold,
        reset_timeout_ms: ASSISTANT_CIRCUIT.resetTimeoutMs,
      },
      idempotency: "POST with Idempotency-Key header returns cached result for 24h",
    },
  });
});
