"use client";

// ponytail: MLK — S2D signal seeder. On mount of the S2D tab, if the store has
// zero signals, fetches 3 static data sources and derives 3-4 realistic S2D
// signals. Mirrors the PIP-N9 seeder pattern but with MLK-specific sources.
//
// Per WORKLOAD.md Phase 7 §7.5–7.6:
//   - Demographics are read as signal CONTEXT (NOT as engine-produced signals).
//   - There is NO `/api/engine` route. Demographic signals are DERIVED from
//     aggregate JSONLs served as static assets.
//
// Sources read (all PDPA-safe aggregates already in /public/data/):
//   - /data/p134/dun-intelligence.jsonl → 5 DUNs, find highest
//     senior_dependency_percent → demographic signal
//   - /data/dpt/spr-dpt-pameran-summary.json → 5 months, find highest net
//     additions month → DPT signal
//   - /data/elections/melaka-elections.json → GE15 parliament split + PRN15
//     coalition split → coalition + election signals
//
// Each signal carries 2-3 suggested actions (the "Decide" phase of Sense →
// Decide → Act). Suggested-action IDs are stable so the operator's "active"
// choice can round-trip through the persisted Zustand store.

import { useS2DStore, type S2DSignal, type S2DAction } from "@/stores/s2d-store";

// ─────────────────────────────────────────────────────────────────────────────
// Types — minimal local shapes (avoids importing full module types from
// demographics / analysis / elections to keep this seeder standalone).
// ─────────────────────────────────────────────────────────────────────────────
interface DunIntelligenceRow {
  level: "DUN";
  geography: {
    parliament_code: string;
    parliament_name: string;
    dun_code: string;
    dun_name: string;
    district: string;
  };
  metrics: {
    total_voters: number;
    senior_dependency_percent?: number;
    gender_balance_score?: number;
    dominant_ethnicity_group?: string;
  };
}

interface DptPerMonth {
  month: string;
  month_label: string;
  additions: number;
  deletions: number;
  net: number;
}

interface DptSummaryDoc {
  per_month: DptPerMonth[];
}

interface ElectionsDoc {
  elections: Array<{
    id: string;
    parliament_summary?: Record<string, number>;
    dun_summary?: Record<string, number>;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseJsonl<T = unknown>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as T);
    } catch {
      // skip malformed line
    }
  }
  return out;
}

function isoNow(): string {
  return new Date().toISOString();
}

function makeAction(
  id: string,
  label: string,
  rationale: string
): S2DAction {
  return { id, label, rationale, status: "pending" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed builders — each returns a signal or null if the data didn't load.
// ─────────────────────────────────────────────────────────────────────────────
async function buildDemographicSignal(): Promise<S2DSignal | null> {
  try {
    const res = await fetch("/data/p134/dun-intelligence.jsonl");
    if (!res.ok) return null;
    const rows = parseJsonl<DunIntelligenceRow>(await res.text());
    if (rows.length === 0) return null;
    let highest: DunIntelligenceRow | null = null;
    for (const r of rows) {
      const v = r.metrics.senior_dependency_percent ?? 0;
      if (!highest || v > (highest.metrics.senior_dependency_percent ?? 0)) {
        highest = r;
      }
    }
    if (!highest) return null;
    const pct = highest.metrics.senior_dependency_percent ?? 0;
    const dunName = highest.geography.dun_name;
    const dunCode = highest.geography.dun_code;
    const severity: S2DSignal["severity"] = pct > 30 ? "critical" : pct > 25 ? "warning" : "info";
    return {
      id: "sig-001",
      ts: isoNow(),
      source: "demographics",
      severity,
      title: `High senior dependency in ${dunName} (N${dunCode})`,
      detail: `${pct.toFixed(1)}% — ${
        pct > 30 ? "above" : "approaching"
      } the 30% critical threshold. Derived from P134 dun-intelligence.jsonl (aggregate, PDPA-safe).`,
      evidence_tier: "Proxy",
      status: "new",
      suggested_actions: [
        makeAction(
          "a1",
          "Targeted senior outreach",
          "Senior-heavy DUNs respond to healthcare-access + pension-update messaging."
        ),
        makeAction(
          "a2",
          "Healthcare access audit",
          "Cross-reference with DOSM health-facility proximity data to find gaps."
        ),
        makeAction(
          "a3",
          "Elderly mobility survey",
          "Field check on the 56+ cohort's polling-station accessibility."
        ),
      ],
    };
  } catch {
    return null;
  }
}

async function buildDptSignal(): Promise<S2DSignal | null> {
  try {
    const res = await fetch("/data/dpt/spr-dpt-pameran-summary.json");
    if (!res.ok) return null;
    const doc = (await res.json()) as DptSummaryDoc;
    if (!doc.per_month || doc.per_month.length === 0) return null;
    let peak: DptPerMonth | null = null;
    for (const m of doc.per_month) {
      if (!peak || m.net > peak.net) peak = m;
    }
    if (!peak) return null;
    const severity: S2DSignal["severity"] =
      peak.net > 500 ? "critical" : peak.net > 300 ? "warning" : "info";
    return {
      id: "sig-002",
      ts: isoNow(),
      source: "dpt",
      severity,
      title: `Voter-roll churn peaked in ${peak.month_label}`,
      detail: `Net +${peak.net} additions (${peak.additions} added, ${peak.deletions} removed) — highest of the 5-month DPT window (Jan–May 2026). Source: SPR Pameran PDFs (Verified tier).`,
      evidence_tier: "Verified",
      status: "new",
      suggested_actions: [
        makeAction(
          "a1",
          "Youth registration drive",
          "Additions skew 18-21 — target outreach to first-time voters in the peak month's DMs."
        ),
        makeAction(
          "a2",
          "DPT-DM hotspot review",
          "Drill into the per-DM breakdown for the peak month to identify which DMs absorbed the churn."
        ),
        makeAction(
          "a3",
          "Opposition counter-mobilization",
          "Net additions signal electorate growth; coordinate registration drives with party youth wings."
        ),
      ],
    };
  } catch {
    return null;
  }
}

async function buildElectionAndCoalitionSignals(): Promise<
  [S2DSignal | null, S2DSignal | null]
> {
  try {
    const res = await fetch("/data/elections/melaka-elections.json");
    if (!res.ok) return [null, null];
    const doc = (await res.json()) as ElectionsDoc;

    // GE15 — PN gains in rural Melaka (parliament-level split PN4/PH2/BN0)
    const ge15 = doc.elections.find((e) => e.id === "GE15");
    const ge15Summary = ge15?.parliament_summary;
    let electionSignal: S2DSignal | null = null;
    if (ge15Summary) {
      const pnCount = ge15Summary["PN"] ?? 0;
      electionSignal = {
        id: "sig-003",
        ts: isoNow(),
        source: "elections",
        severity: pnCount >= 4 ? "warning" : "info",
        title: `PN gains in rural Melaka per GE15 (${pnCount}/6 parliaments)`,
        detail: `GE15 split: PN ${pnCount} / PH ${
          ge15Summary["PH"] ?? 0
        } / BN ${ge15Summary["BN"] ?? 0}. PN swept P134, P135, P138, P139 (rural+peri-urban). Source: ElectionData.my (Verified).`,
        evidence_tier: "Verified",
        status: "new",
        suggested_actions: [
          makeAction(
            "a1",
            "Rural messaging pivot",
            "PN's rural sweep suggests PH/BN messaging on development + grants has lost traction — test new framings."
          ),
          makeAction(
            "a2",
            "Coalition seat-defense audit",
            "For each PN-won parliament, list the 2-3 closest DUNs and review their vote-share margins."
          ),
        ],
      };
    }

    // PRN15 — BN holds 21/28 state seats (state-level coalition signal)
    const prn15 = doc.elections.find((e) => e.id === "PRN15");
    const prn15Summary = prn15?.dun_summary;
    let coalitionSignal: S2DSignal | null = null;
    if (prn15Summary) {
      const bnSeats = prn15Summary["BN"] ?? 0;
      const total = prn15Summary["total"] ?? 28;
      coalitionSignal = {
        id: "sig-004",
        ts: isoNow(),
        source: "coalition",
        severity: bnSeats >= 21 ? "warning" : "info",
        title: `BN holds ${bnSeats}/${total} state seats per PRN15`,
        detail: `PRN15 2021 was a BN landslide (21/28). State government is BN. Source: ElectionData.my (Verified). Resolves DG_GE15_PARL_SPLIT in the gaps register.`,
        evidence_tier: "Verified",
        status: "new",
        suggested_actions: [
          makeAction(
            "a1",
            "Incumbent-defense playbook",
            "PRN16 defense: focus on the 7 DUNs BN does NOT hold (PH-held) — list them + their 2026 incumbent names."
          ),
          makeAction(
            "a2",
            "PN-rural-probe strategy",
            "PRN15 had no PN state-level wins, but GE15 proved PN's rural strength. Probe whether PN can convert rural parliament strength into state seats."
          ),
        ],
      };
    }

    return [electionSignal, coalitionSignal];
  } catch {
    return [null, null];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — `seedSignalsIfEmpty()` reads the store; if empty, fetches and
// pushes 3-4 derived signals. Idempotent — safe to call on every S2D tab mount.
// ─────────────────────────────────────────────────────────────────────────────
export async function seedSignalsIfEmpty(): Promise<number> {
  const state = useS2DStore.getState();
  if (state.signals.length > 0) {
    return 0;
  }

  // Mark the loop as "sensing" while we fetch.
  state.setLoopStatus("sensing");

  const [demo, dpt, [election, coalition]] = await Promise.all([
    buildDemographicSignal(),
    buildDptSignal(),
    buildElectionAndCoalitionSignals(),
  ]);

  const toSeed: S2DSignal[] = [];
  if (demo) toSeed.push(demo);
  if (dpt) toSeed.push(dpt);
  if (election) toSeed.push(election);
  if (coalition) toSeed.push(coalition);

  // Push into the store in stable order. addSignal prepends + caps at 50,
  // so we reverse-iterate to preserve chronological sig-001..sig-004 ordering.
  const fresh = useS2DStore.getState();
  for (let i = toSeed.length - 1; i >= 0; i--) {
    fresh.addSignal(toSeed[i]!);
  }

  // After seeding, loop transitions to "deciding" (waiting for operator ack).
  useS2DStore.getState().setLoopStatus("deciding");

  return toSeed.length;
}
