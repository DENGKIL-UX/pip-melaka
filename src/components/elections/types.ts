// ponytail: MLK — Elections module shared types.
// Mirrors the shape of `/data/elections/melaka-elections.json`. Source is
// ElectionData.my (community-maintained, sourced from SPR gazettes) —
// NOT the engine. Evidence tier: Verified (per the JSON file's root).
// See MELAKA-FACTS.md §6 + DESIGN.md §3 row 4 + WORKLOAD.md Phase 6.1.

export type CoalitionCode = "BN" | "PH" | "PN" | "Others";

export interface ElectionDunResult {
  parliament_code: string;
  dun_code: string;
  dun_name_2018: string;
  dun_name_2026: string;
  winner: CoalitionCode | string;
  renamed: boolean;
  vote_share?: Record<string, number>;
}

export interface ElectionParlResult {
  parliament_code: string;
  parliament_name: string;
  winner: CoalitionCode | string;
  votes_pct: number;
  runner_up: CoalitionCode | string;
  margin_pct: number;
}

export interface SeatSummary {
  BN: number;
  PH: number;
  PN: number;
  Others: number;
  total: number;
}

export interface Election {
  id: "GE14" | "PRN15" | "GE15";
  name: string;
  date: string;
  type: string;
  description: string;
  parliament_results: ElectionParlResult[];
  parliament_summary: SeatSummary | null;
  dun_results: ElectionDunResult[];
  dun_summary: SeatSummary | null;
  headline_fact?: string;
}

export interface ProjectionScenario {
  id: string;
  label: string;
  dun_seats: SeatSummary;
  confidence_90: [number, number];
  color: string;
}

export interface Projection2026 {
  id: string;
  name: string;
  type: string;
  description: string;
  scenarios: ProjectionScenario[];
  methodology: string;
  evidence_tier: string;
}

export interface ElectionsDoc {
  state: string;
  state_code: string;
  source: string;
  evidence_tier: string;
  elections: Election[];
  projection_2026: Projection2026;
}
