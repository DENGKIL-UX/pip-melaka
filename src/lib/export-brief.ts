// PIP-MLK intelligence brief exporter.
//
// Generates a structured JSON snapshot of the dashboard state at the moment
// of export — useful for sharing an intelligence brief, audit trail, or
// pasting into a downstream system. Runs entirely client-side; no PDPA-
// sensitive data is included (only aggregate metrics + public election data).

import type { DashboardTab } from "@/stores/dashboard-store";

export interface BriefSnapshot {
  schema: "pip-mlk.brief.v1";
  exported_at: string; // ISO 8601
  exported_at_unix_ms: number;
  platform: {
    name: "PIP-MLK";
    version: string;
    geography: "Melaka";
    evidence_tier: "Proxy" | "Verified";
    provenance_gates_closed: number;
    provenance_gates_total: number;
  };
  active_tab: DashboardTab;
  ge15_summary: {
    parliament_split: { PN: number; PH: number; BN: number; total: number };
    winners: Array<{ code: string; name: string; winner: "PN" | "PH" | "BN" }>;
    source: string;
  };
  metrics: {
    total_voters_p134: number;
    dun_count: number;
    parliaments: number;
    s2d_signals: number;
  };
  notes: string[];
}

const GE15_WINNERS: Array<{ code: string; name: string; winner: "PN" | "PH" | "BN" }> = [
  { code: "P134", name: "Masjid Tanah", winner: "PN" },
  { code: "P135", name: "Alor Gajah", winner: "PH" },
  { code: "P136", name: "Tangga Batu", winner: "PN" },
  { code: "P137", name: "Hang Tuah Jaya", winner: "PH" },
  { code: "P138", name: "Kota Melaka", winner: "PH" },
  { code: "P139", name: "Jasin", winner: "PN" },
];

/**
 * Build the brief snapshot. Caller passes in the dynamic bits (active tab,
 * S2D signal count, etc.) so this stays pure + testable.
 */
export function buildBrief(opts: {
  activeTab: DashboardTab;
  totalVoters: number;
  dunCount: number;
  s2dSignals: number;
  provenanceClosed?: number;
  provenanceTotal?: number;
  notes?: string[];
}): BriefSnapshot {
  const now = new Date();
  return {
    schema: "pip-mlk.brief.v1",
    exported_at: now.toISOString(),
    exported_at_unix_ms: now.getTime(),
    platform: {
      name: "PIP-MLK",
      version: "1.0.0",
      geography: "Melaka",
      evidence_tier: "Proxy",
      provenance_gates_closed: opts.provenanceClosed ?? 8,
      provenance_gates_total: opts.provenanceTotal ?? 9,
    },
    active_tab: opts.activeTab,
    ge15_summary: {
      parliament_split: { PN: 3, PH: 3, BN: 0, total: 6 },
      winners: GE15_WINNERS,
      source: "ElectionData.my (community-maintained, sourced from SPR gazettes)",
    },
    metrics: {
      total_voters_p134: opts.totalVoters,
      dun_count: opts.dunCount,
      parliaments: 6,
      s2d_signals: opts.s2dSignals,
    },
    notes: opts.notes ?? [
      "PDPA Akta 709 compliant — no per-voter data shipped.",
      "Demographics from P134 transformer run (71,415 verified voters).",
      "Gate 9 (raw SPR voter xlsx) remains open — see Governance tab.",
    ],
  };
}

/**
 * Trigger a client-side JSON download of the brief snapshot.
 */
export function downloadBrief(brief: BriefSnapshot): void {
  const json = JSON.stringify(brief, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = new Date(brief.exported_at_unix_ms).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.download = `pip-mlk-brief-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
