// ponytail: MLK — Honest gaps register. Every gap is tagged DG_* and tracked.
// A gap is OPEN, PARTIALLY_RESOLVED, or RESOLVED. Closing a gap requires
// closed_at + closed_by. Per AGENT.md §7, every agent updates this file.
// See MELAKA-FACTS.md §9, DESIGN.md §10.

export type GapStatus = "OPEN" | "PARTIALLY_RESOLVED" | "RESOLVED";

export interface Gap {
  id: string;
  title: string;
  status: GapStatus;
  description: string;
  opened_at: string;
  closed_at?: string;
  closed_by?: string;
  owner_phase?: string;
}

export const GAPS: Gap[] = [
  {
    id: "DG_DUN_NAME_REVIEW",
    title: "DUN N06–N28 name verification",
    status: "PARTIALLY_RESOLVED",
    description:
      "N01–N05 verified from engine P134 contract (2026 names: Kuala Linggi, Tanjung Bidara, Ayer Limau, Lendu, Taboh Naning). N06–N28 provisional from ElectionData.my 2018/2021 — pending DOSM kawasanku cross-check.",
    opened_at: "2026-01-01",
    owner_phase: "Phase 1.14–1.15",
  },
  {
    id: "DG_DUN_REDELINEATION_MAPPING",
    title: "2023 DUN redelineation name changes",
    status: "RESOLVED",
    description:
      "N03/N04/N05 renamed in 2023: Ayer Limau/Lendu/Taboh Naning ← Lubok China/Klebang/Gadek. Bidirectional map in src/lib/dun-redelineation-map.ts. Every renamed DUN shows '(formerly X)' tooltip.",
    opened_at: "2026-01-01",
    closed_at: "2026-01-15",
    closed_by: "PIP-MLK Phase 1.21",
    owner_phase: "Phase 1.21",
  },
  {
    id: "DG_PDM_DICTIONARY",
    title: "Polling-district (DM) name dictionary",
    status: "OPEN",
    description:
      "Engine emits DM codes (01–30 for P134) but the DM-to-readable-name mapping must be sourced from DOSM kawasanku. Synthetic DM names (e.g. 'DM 01 Kuala Linggi') used as placeholders.",
    opened_at: "2026-01-01",
    owner_phase: "Phase 1.14",
  },
  {
    id: "DG_CONFIDENCE_MODEL",
    title: "Confidence scoring model",
    status: "OPEN",
    description:
      "Engine emits `average_cleansing_confidence` (0–1 float per aggregate). PIP-MLK's evidence-tier model (Verified/Proxy/Indicative) is separate. Mapping documented in Risk module.",
    opened_at: "2026-01-01",
    owner_phase: "Phase 5",
  },
  {
    id: "DG_NO_GROUND_SURVEY",
    title: "No on-the-ground survey data",
    status: "OPEN",
    description:
      "PIP-MLK has no field survey. All demographics are passive (from voter rolls). Banner displayed on dashboard.",
    opened_at: "2026-01-01",
    owner_phase: "persistent",
  },
  {
    id: "DG_NO_LIVE_SENTIMENT",
    title: "No live sentiment feed",
    status: "OPEN",
    description:
      "No social-media / news sentiment feed. Digital Brain module is structural-only (gazette + contracts + constituency graph), not sentiment-weighted.",
    opened_at: "2026-01-01",
    owner_phase: "persistent",
  },
  {
    id: "DG_DPT_AGE_SCOPE",
    title: "DPT Pameran age-scope labelling",
    status: "OPEN",
    description:
      "DPT Pameran PDFs list additions/deletions by polling district (DM) only — no age breakdown. Every DPT chart must say 'no age breakdown'. Labelled in Methodology tab.",
    opened_at: "2026-01-01",
    owner_phase: "Phase 6.2 (Methodology tab)",
  },
  {
    id: "DG_ENGINE_VERSION",
    title: "Engine pipeline provenance (9 gates)",
    status: "OPEN",
    description:
      "Closes only when all 9 provenance gates pass: zip SHA-256 + script versions + runtime + entry points + salt rotation + 2 bug fixes + orchestrator + audit. Until then, all engine outputs ship as Proxy tier. Gates 1–8 closed; gate 9 (audit against ground-truth raw xlsx) pending user-provided xlsx.",
    opened_at: "2026-01-01",
    owner_phase: "Phase 1.7",
  },
  {
    id: "DG_GE15_PARL_SPLIT",
    title: "GE15 Melaka parliament split",
    status: "RESOLVED",
    description:
      "Original docs said PN3/PH3; verified count from ElectionData.my is PN4/PH2/BN0 (PN won P134, P135, P138, P139; PH won P136, P137; BN wiped out at federal level in Melaka).",
    opened_at: "2026-01-01",
    closed_at: "2026-01-15",
    closed_by: "PIP-MLK Phase 1.17",
    owner_phase: "Phase 1.17",
  },
  {
    id: "PDPA_DOMINANT_RACE",
    title: "dominant_race field absent by default",
    status: "OPEN",
    description:
      "Engine's `dominant_ethnicity_group` is per-aggregate (PDPA-safe) and IS shown. Per-voter `dominant_race` projection is OFF by default — opt-in only, requires explicit PDPA review.",
    opened_at: "2026-01-01",
    owner_phase: "persistent (PDPA)",
  },
];

export function getGap(id: string): Gap | undefined {
  return GAPS.find((g) => g.id === id);
}

export function openGaps(): Gap[] {
  return GAPS.filter((g) => g.status !== "RESOLVED");
}

export function resolvedGaps(): Gap[] {
  return GAPS.filter((g) => g.status === "RESOLVED");
}

export function gapStats() {
  const total = GAPS.length;
  const open = GAPS.filter((g) => g.status === "OPEN").length;
  const partial = GAPS.filter((g) => g.status === "PARTIALLY_RESOLVED").length;
  const resolved = GAPS.filter((g) => g.status === "RESOLVED").length;
  return { total, open, partial, resolved };
}
