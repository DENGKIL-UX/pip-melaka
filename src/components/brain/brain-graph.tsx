"use client";

// ponytail: MLK — Digital Brain graph component (SVG + d3-force).
// Implements WORKLOAD.md Phase 4 (Digital Brain — 4 lens modes, d3-force,
// SVG render) + DESIGN.md §3 row 3.
//
// 4 lens modes:
//   1. Constituency — 28 DUN + 6 parlimen + 3 district nodes; edges = DUN→parl,
//      parl→district (containment graph).
//   2. Coalition    — 3 coalition + 28 DUN nodes; edges = DUN→coalition (PRN15
//      winner → its coalition). DUN nodes colored by PRN15 winner.
//   3. Demographics — 28 DUN nodes only; colored by `dominant_ethnicity_group`,
//      sized by `total_voters`. Cluster force pulls same-ethnicity DUNs
//      together (no edges — visual cluster only).
//   4. Timeline     — 28 DUN + 6 parlimen nodes; DUN colors morph across 4
//      scenarios (GE14 → PRN15 → GE15 → PROJ_2026). Uses `useDashboardStore
//      .timelineScenario` (shared with 3D map). For PROJ_2026 the winners are
//      derived per-DUN by sorting PRN15 vote_share + assigning the top-N to
//      each scenario's surge party (UNVERIFIED — same method as map-3d).
//
// SVG (not canvas) for accessibility — every `<circle>` carries a `<title>`
// for screen readers. Node click → useBrainStore.setSelectedNodeId (side
// panel reads it). DUN node click also writes to useDashboardStore
// .setSelectedDun so the dashboard drawer follows (cross-module sync).
//
// Force simulation: d3-force, alphaDecay(0.05) for fast convergence (~30
// ticks). Simulation stops after 300 ticks OR when alpha < 0.005. Honours
// prefers-reduced-motion — in that case the layout is computed in one pass
// (no animation; positions snap).
//
// NO sentiment weighting (DG_NO_LIVE_SENTIMENT — the graph is structural only).

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PARTY_COLORS,
  MLK_ACCENT,
  ETHNICITY_COLORS,
  partyColor,
} from "@/lib/party-colors";
import { PARLIAMENTS, DISTRICTS, getDunName } from "@/lib/melaka-constants";
import { useBrainStore, type BrainLensMode } from "@/stores/brain-store";
import { useDashboardStore } from "@/stores/dashboard-store";

// ─────────────────────────────────────────────────────────────────────────────
// d3-force dynamic import (lazy — keeps SSR bundle clean + honors
// AGENT.md §4.1 "lazy-load heavy deps").
// ponytail: MLK — d3-force 3.0.0 ships no .d.ts of its own, and there's no
// `@types/d3-force` installed. We declare the minimal slice we use locally
// (SimulationNodeDatum + SimulationLinkDatum) so TypeScript is happy without
// pulling a new dep. Verified against d3-force's runtime API.
// ─────────────────────────────────────────────────────────────────────────────
interface ForceNodeDatum {
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}
interface ForceLinkDatum<N extends ForceNodeDatum = ForceNodeDatum> {
  source: N | string | number;
  target: N | string | number;
  index?: number;
}
// d3-force's forceSimulation has a fluent API returning the simulation
// instance. We only use `.force(name, fn)`, `.alphaDecay()`, `.alphaMin()`,
// `.alpha()`, `.tick()`, `.stop()`, `.on(event, fn)` — declare just those.
interface ForceSimulationInstance {
  force(name: string, force: unknown): this;
  alpha(): number;
  alphaDecay(d: number): this;
  alphaMin(a: number): this;
  tick(): this;
  stop(): this;
  on(event: string, fn: () => void): this;
}
type ForceSim = ForceSimulationInstance;
type ForceNode = ForceNodeDatum;
type ForceLink = ForceLinkDatum<ForceNode>;

// ─────────────────────────────────────────────────────────────────────────────
// Data types — engine intelligence rows (re-declared here to avoid coupling
// to map-3d/extrusions.ts per AGENT.md §2 "no unrequested abstractions").
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
    male_voters?: number;
    female_voters?: number;
    senior_voters_56_plus?: number;
    senior_dependency_percent?: number;
    gender_balance_score?: number;
    profile_completeness_score?: number;
    dominant_ethnicity_group?: string;
    average_cleansing_confidence?: number;
  };
}

interface ElectionDunResult {
  parliament_code: string;
  dun_code: string;
  dun_name_2018?: string;
  dun_name_2026?: string;
  winner: string;
  renamed?: boolean;
  vote_share?: Record<string, number>;
}
interface ElectionParlResult {
  parliament_code: string;
  parliament_name: string;
  winner: string;
  votes_pct?: number;
  runner_up?: string;
}
interface ElectionsDoc {
  state: string;
  state_code: string;
  source: string;
  evidence_tier: string;
  elections: Array<{
    id: "GE14" | "PRN15" | "GE15";
    name: string;
    date: string;
    type: string;
    parliament_results: ElectionParlResult[];
    dun_results: ElectionDunResult[];
  }>;
  projection_2026?: {
    id: "PROJ_2026";
    scenarios: Array<{
      id: string;
      label: string;
      dun_seats: Record<string, number>;
      confidence_90: [number, number];
      color: string;
    }>;
    methodology: string;
    evidence_tier: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Brain node types — discriminated union by `kind`. The side panel reads
// these fields; the graph renderer reads `id`, `kind`, `color`, `radius`.
// ─────────────────────────────────────────────────────────────────────────────
export interface BaseBrainNode extends ForceNode {
  id: string;
  kind: "dun" | "parliament" | "district" | "coalition";
  title: string;
  subtitle?: string;
  /** Visual color (hex) — depends on lens mode. */
  color: string;
  /** Visual radius (px). */
  radius: number;
}

export interface DunBrainNode extends BaseBrainNode {
  kind: "dun";
  dunCode: string;
  parliamentCode: string;
  dunName: string;
  districtName: string;
  totalVoters: number;
  maleVoters: number;
  femaleVoters: number;
  seniorDependencyPercent: number;
  genderBalanceScore: number;
  profileCompletenessScore: number;
  dominantEthnicity: string;
  prn15Winner: string;
  ge15Winner: string;
  /** For timeline lens — winner under the active scenario. */
  scenarioWinner?: string;
}

export interface ParliamentBrainNode extends BaseBrainNode {
  kind: "parliament";
  parliamentCode: string;
  parliamentName: string;
  districtName: string;
  dunCount: number;
  totalVoters: number;
  ge14Winner: string;
  ge15Winner: string;
}

export interface DistrictBrainNode extends BaseBrainNode {
  kind: "district";
  districtCode: string;
  districtName: string;
  parliamentCount: number;
  dunCount: number;
  totalVoters: number;
}

export interface CoalitionBrainNode extends BaseBrainNode {
  kind: "coalition";
  coalitionCode: string;
  coalitionName: string;
  prn15Seats: number;
  ge15Seats: number;
  linkedDunCount: number;
}

export type BrainNode =
  | DunBrainNode
  | ParliamentBrainNode
  | DistrictBrainNode
  | CoalitionBrainNode;

export interface BrainEdge {
  source: string;
  target: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DATA_URLS = {
  elections: "/data/elections/melaka-elections.json",
  dunIntelligence: (parliamentCode: string) =>
    `/data/p${parliamentCode}/dun-intelligence.jsonl`,
} as const;

const PARLIAMENT_CODES = ["134", "135", "136", "137", "138", "139"] as const;

const NODE_RADIUS = {
  dun: 12,
  parliament: 20,
  district: 28,
  coalition: 32,
} as const;

const EDGE_STROKE = "#94a3b8";
const EDGE_OPACITY = 0.4;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]";

// ponytail: MLK — alphaDecay(0.05) gives ~30 ticks to converge (vs d3 default
// 0.0228 → ~300 ticks). Task spec asked for 60fps + 300-tick stop, so we use
// the fast decay AND cap at 300 ticks as a safety net.
const ALPHA_DECAY = 0.05;
const MAX_TICKS = 300;
const ALPHA_MIN = 0.005;

// ─────────────────────────────────────────────────────────────────────────────
// JSONL parsing (local helper — same 12-line pattern as map-3d, intentionally
// duplicated to avoid coupling per AGENT.md §2).
// ─────────────────────────────────────────────────────────────────────────────
function parseJsonl<T = unknown>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as T);
    } catch {
      // Defensive skip — never throw on a malformed line.
    }
  }
  return out;
}

function winnerHex(winner: string): string {
  return partyColor(winner);
}

// ─────────────────────────────────────────────────────────────────────────────
// Data loading
// ─────────────────────────────────────────────────────────────────────────────
interface LoadedData {
  elections: ElectionsDoc;
  intelligenceByCode: Map<string, DunIntelligenceRow>;
}

async function loadAllData(): Promise<LoadedData> {
  const [electionsRes, ...intelRes] = await Promise.all([
    fetch(DATA_URLS.elections),
    ...PARLIAMENT_CODES.map((p) => fetch(DATA_URLS.dunIntelligence(p))),
  ]);
  if (!electionsRes.ok)
    throw new Error(`Elections fetch failed: ${electionsRes.status}`);
  for (let i = 0; i < intelRes.length; i++) {
    if (!intelRes[i].ok)
      throw new Error(
        `Intelligence fetch failed for p${PARLIAMENT_CODES[i]}: ${intelRes[i].status}`
      );
  }
  const [elections, ...intelTexts] = await Promise.all([
    electionsRes.json() as Promise<ElectionsDoc>,
    ...intelRes.map((r) => r.text()),
  ]);

  const intelligenceByCode = new Map<string, DunIntelligenceRow>();
  for (const text of intelTexts) {
    const rows = parseJsonl<DunIntelligenceRow>(text);
    for (const r of rows) {
      const key = `${r.geography.parliament_code}|${r.geography.dun_code}`;
      intelligenceByCode.set(key, r);
    }
  }
  return { elections, intelligenceByCode };
}

// ─────────────────────────────────────────────────────────────────────────────
// Node / edge builders — one per lens mode.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the DUN node list (28) with all metadata fields. The `color` field
 * is filled per-lens by the caller.
 */
function buildDunNodes(
  elections: ElectionsDoc,
  intelligenceByCode: Map<string, DunIntelligenceRow>
): DunBrainNode[] {
  const prn15 = elections.elections.find((e) => e.id === "PRN15");
  const ge15 = elections.elections.find((e) => e.id === "GE15");
  const ge15ByParl = new Map(
    (ge15?.parliament_results ?? []).map((r) => [r.parliament_code, r])
  );

  const nodes: DunBrainNode[] = [];
  for (const parl of PARLIAMENTS) {
    for (let i = 0; i < parl.dunCodes.length; i++) {
      const dunCode = parl.dunCodes[i];
      const dunName = getDunName(parl.code, dunCode);
      const intel = intelligenceByCode.get(`${parl.code}|${dunCode}`);
      const prn15Res = prn15?.dun_results.find(
        (r) => r.parliament_code === parl.code && r.dun_code === dunCode
      );
      const ge15Winner = ge15ByParl.get(parl.code)?.winner ?? "OTH";
      nodes.push({
        id: `dun:${parl.code}|${dunCode}`,
        kind: "dun",
        dunCode,
        parliamentCode: parl.code,
        dunName,
        districtName: parl.district,
        totalVoters: intel?.metrics.total_voters ?? 0,
        maleVoters: intel?.metrics.male_voters ?? 0,
        femaleVoters: intel?.metrics.female_voters ?? 0,
        seniorDependencyPercent:
          intel?.metrics.senior_dependency_percent ?? 0,
        genderBalanceScore: intel?.metrics.gender_balance_score ?? 0,
        profileCompletenessScore:
          intel?.metrics.profile_completeness_score ?? 0,
        dominantEthnicity: intel?.metrics.dominant_ethnicity_group ?? "UNKNOWN",
        prn15Winner: prn15Res?.winner ?? "OTH",
        ge15Winner,
        title: `N${dunCode} · ${dunName}`,
        subtitle: `P${parl.code} ${parl.name} · ${parl.district}`,
        color: winnerHex(prn15Res?.winner ?? "OTH"),
        radius: NODE_RADIUS.dun,
      });
    }
  }
  return nodes;
}

function buildParliamentNodes(
  elections: ElectionsDoc,
  intelligenceByCode: Map<string, DunIntelligenceRow>
): ParliamentBrainNode[] {
  const ge14 = elections.elections.find((e) => e.id === "GE14");
  const ge15 = elections.elections.find((e) => e.id === "GE15");
  const ge14ByParl = new Map(
    (ge14?.parliament_results ?? []).map((r) => [r.parliament_code, r])
  );
  const ge15ByParl = new Map(
    (ge15?.parliament_results ?? []).map((r) => [r.parliament_code, r])
  );

  return PARLIAMENTS.map((parl) => {
    const dunCount = parl.dunCodes.length;
    let totalVoters = 0;
    for (const dunCode of parl.dunCodes) {
      totalVoters +=
        intelligenceByCode.get(`${parl.code}|${dunCode}`)?.metrics.total_voters ?? 0;
    }
    return {
      id: `parl:${parl.code}`,
      kind: "parliament" as const,
      parliamentCode: parl.code,
      parliamentName: parl.name,
      districtName: parl.district,
      dunCount,
      totalVoters,
      ge14Winner: ge14ByParl.get(parl.code)?.winner ?? "OTH",
      ge15Winner: ge15ByParl.get(parl.code)?.winner ?? "OTH",
      title: `P${parl.code} · ${parl.name}`,
      subtitle: `${parl.district} · ${dunCount} DUN`,
      color: MLK_ACCENT,
      radius: NODE_RADIUS.parliament,
    };
  });
}

function buildDistrictNodes(
  intelligenceByCode: Map<string, DunIntelligenceRow>
): DistrictBrainNode[] {
  return DISTRICTS.map((d) => {
    const parlsInDistrict = PARLIAMENTS.filter((p) => p.district === d.name);
    const dunCodes = parlsInDistrict.flatMap((p) =>
      p.dunCodes.map((c) => ({ parl: p.code, dun: c }))
    );
    let totalVoters = 0;
    for (const { parl, dun } of dunCodes) {
      totalVoters +=
        intelligenceByCode.get(`${parl}|${dun}`)?.metrics.total_voters ?? 0;
    }
    return {
      id: `district:${d.code}`,
      kind: "district" as const,
      districtCode: d.code,
      districtName: d.name,
      parliamentCount: parlsInDistrict.length,
      dunCount: dunCodes.length,
      totalVoters,
      title: d.name,
      subtitle: `${parlsInDistrict.length} parliaments · ${dunCodes.length} DUN`,
      color: MLK_ACCENT,
      radius: NODE_RADIUS.district,
    };
  });
}

function buildCoalitionNodes(
  elections: ElectionsDoc,
  dunNodes: DunBrainNode[]
): CoalitionBrainNode[] {
  const prn15 = elections.elections.find((e) => e.id === "PRN15");
  const ge15 = elections.elections.find((e) => e.id === "GE15");
  const prn15Seats: Record<string, number> = { BN: 0, PH: 0, PN: 0, OTH: 0 };
  for (const r of prn15?.dun_results ?? []) {
    const k = (r.winner || "OTH").toUpperCase();
    prn15Seats[k] = (prn15Seats[k] ?? 0) + 1;
  }
  const ge15Seats: Record<string, number> = { BN: 0, PH: 0, PN: 0, OTH: 0 };
  for (const r of ge15?.parliament_results ?? []) {
    const k = (r.winner || "OTH").toUpperCase();
    ge15Seats[k] = (ge15Seats[k] ?? 0) + 1;
  }

  const coalitionDefs = [
    { code: "BN", name: "Barisan Nasional" },
    { code: "PH", name: "Pakatan Harapan" },
    { code: "PN", name: "Perikatan Nasional" },
  ];
  return coalitionDefs.map((c) => {
    const linked = dunNodes.filter((d) => d.prn15Winner.toUpperCase() === c.code);
    return {
      id: `coalition:${c.code}`,
      kind: "coalition" as const,
      coalitionCode: c.code,
      coalitionName: c.name,
      prn15Seats: prn15Seats[c.code] ?? 0,
      ge15Seats: ge15Seats[c.code] ?? 0,
      linkedDunCount: linked.length,
      title: `${c.code} · ${c.name}`,
      subtitle: `PRN15 ${prn15Seats[c.code] ?? 0} / GE15 ${ge15Seats[c.code] ?? 0} seats`,
      color: PARTY_COLORS[c.code as keyof typeof PARTY_COLORS] ?? PARTY_COLORS.OTH,
      radius: NODE_RADIUS.coalition,
    };
  });
}

// ponytail: MLK — UNVERIFIED. Per-DUN PROJ_2026 winners are derived by sorting
// DUNs by PRN15 vote_share for each scenario's surge party (descending) and
// assigning the top-N to that party, where N = scenario target seats. Same
// algorithm as map-3d's computeProjectionWinners (extrusions.ts). Status Quo
// uses PRN15 winners. The headline seat count matches the target; the *which
// DUN flips* is a visualization hypothesis, not a forecast.
function computeProj2026Winners(
  dunNodes: DunBrainNode[],
  elections: ElectionsDoc,
  subId: "PN_SURGE" | "BN_SURGE" | "PH_SURGE" | "STATUS_QUO" | "UNDI18_YOUTH"
): Record<string, string> {
  const out: Record<string, string> = {};
  const prn15 = elections.elections.find((e) => e.id === "PRN15");
  const prn15ByCode = new Map(
    (prn15?.dun_results ?? []).map((r) => [`${r.parliament_code}|${r.dun_code}`, r])
  );
  if (subId === "STATUS_QUO") {
    for (const n of dunNodes) out[n.id] = n.prn15Winner;
    return out;
  }
  const sub = elections.projection_2026?.scenarios.find((s) => s.id === subId);
  if (!sub) {
    for (const n of dunNodes) out[n.id] = n.prn15Winner;
    return out;
  }
  type SubId = "PN_SURGE" | "BN_SURGE" | "PH_SURGE" | "STATUS_QUO" | "UNDI18_YOUTH";
  const order: Record<SubId, string[]> = {
    PN_SURGE: ["PN", "BN", "PH"],
    BN_SURGE: ["BN", "PN", "PH"],
    PH_SURGE: ["PH", "PN", "BN"],
    STATUS_QUO: [],
    UNDI18_YOUTH: ["PN", "PH", "BN"],
  };
  const assigned = new Set<string>();
  for (const party of order[subId]) {
    const target = sub.dun_seats[party] ?? 0;
    if (target === 0) continue;
    const ranked = dunNodes
      .map((n) => ({
        id: n.id,
        vs: prn15ByCode.get(`${n.parliamentCode}|${n.dunCode}`)?.vote_share?.[party] ?? 0,
      }))
      .filter((x) => !assigned.has(x.id))
      .sort((a, b) => b.vs - a.vs);
    for (let k = 0; k < Math.min(target, ranked.length); k++) {
      out[ranked[k].id] = party;
      assigned.add(ranked[k].id);
    }
  }
  for (const n of dunNodes) {
    if (!out[n.id]) out[n.id] = n.prn15Winner;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-lens graph builders — return { nodes, edges } with positions seeded.
// ─────────────────────────────────────────────────────────────────────────────
interface BuiltGraph {
  nodes: BrainNode[];
  edges: BrainEdge[];
}

function buildConstituencyGraph(data: LoadedData): BuiltGraph {
  const dunNodes = buildDunNodes(data.elections, data.intelligenceByCode);
  const parlNodes = buildParliamentNodes(data.elections, data.intelligenceByCode);
  const districtNodes = buildDistrictNodes(data.intelligenceByCode);
  const nodes: BrainNode[] = [...dunNodes, ...parlNodes, ...districtNodes];
  const edges: BrainEdge[] = [];
  // DUN → parlimen
  for (const d of dunNodes) {
    edges.push({ source: d.id, target: `parl:${d.parliamentCode}` });
  }
  // Parlimen → district
  for (const p of parlNodes) {
    const districtCode =
      DISTRICTS.find((d) => d.name === p.districtName)?.code ?? "041";
    edges.push({ source: p.id, target: `district:${districtCode}` });
  }
  return { nodes, edges };
}

function buildCoalitionGraph(data: LoadedData): BuiltGraph {
  const dunNodes = buildDunNodes(data.elections, data.intelligenceByCode);
  const coalitionNodes = buildCoalitionNodes(data.elections, dunNodes);
  // Recolor DUN nodes by PRN15 winner (already default, but explicit).
  for (const d of dunNodes) d.color = winnerHex(d.prn15Winner);
  const nodes: BrainNode[] = [...dunNodes, ...coalitionNodes];
  const edges: BrainEdge[] = dunNodes.map((d) => ({
    source: d.id,
    target: `coalition:${d.prn15Winner.toUpperCase() === "BN" || d.prn15Winner.toUpperCase() === "PH" || d.prn15Winner.toUpperCase() === "PN" ? d.prn15Winner.toUpperCase() : "OTH"}`,
  }));
  return { nodes, edges };
}

function buildDemographicsGraph(data: LoadedData): BuiltGraph {
  const dunNodes = buildDunNodes(data.elections, data.intelligenceByCode);
  // Recolor DUN nodes by dominant ethnicity, size by total_voters.
  const maxVoters = Math.max(1, ...dunNodes.map((d) => d.totalVoters));
  for (const d of dunNodes) {
    const eth = (d.dominantEthnicity || "UNKNOWN").toUpperCase();
    d.color = ETHNICITY_COLORS[eth] ?? ETHNICITY_COLORS.UNKNOWN;
    // Scale 8 → 20 by sqrt(total_voters / maxVoters).
    d.radius = 8 + 12 * Math.sqrt(d.totalVoters / maxVoters);
  }
  return { nodes: dunNodes, edges: [] };
}

function buildTimelineGraph(
  data: LoadedData,
  scenario: "GE14" | "PRN15" | "GE15" | "PROJ_2026",
  projSubId: "PN_SURGE" | "BN_SURGE" | "PH_SURGE" | "STATUS_QUO" | "UNDI18_YOUTH"
): BuiltGraph {
  const dunNodes = buildDunNodes(data.elections, data.intelligenceByCode);
  const parlNodes = buildParliamentNodes(data.elections, data.intelligenceByCode);
  // Compute winners under the active scenario.
  let winners: Record<string, string> = {};
  if (scenario === "GE14") {
    const ge14 = data.elections.elections.find((e) => e.id === "GE14");
    const ge14ByCode = new Map(
      (ge14?.dun_results ?? []).map((r) => [`${r.parliament_code}|${r.dun_code}`, r])
    );
    for (const d of dunNodes) {
      const w = ge14ByCode.get(`${d.parliamentCode}|${d.dunCode}`)?.winner ?? "OTH";
      winners[d.id] = w;
    }
  } else if (scenario === "PRN15") {
    for (const d of dunNodes) winners[d.id] = d.prn15Winner;
  } else if (scenario === "GE15") {
    // DUNs inherit parliament winner (GE15 has no DUN results).
    for (const d of dunNodes) winners[d.id] = d.ge15Winner;
  } else {
    winners = computeProj2026Winners(dunNodes, data.elections, projSubId);
  }
  for (const d of dunNodes) {
    d.scenarioWinner = winners[d.id] ?? d.prn15Winner;
    d.color = winnerHex(d.scenarioWinner);
  }
  const nodes: BrainNode[] = [...dunNodes, ...parlNodes];
  const edges: BrainEdge[] = dunNodes.map((d) => ({
    source: d.id,
    target: `parl:${d.parliamentCode}`,
  }));
  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export interface BrainGraphProps {
  className?: string;
  /** Called whenever the built node set changes (lens mode / scenario). */
  onNodesChange?: (nodes: BrainNode[]) => void;
}

export function BrainGraph({ className, onNodesChange }: BrainGraphProps) {
  const lensMode = useBrainStore((s) => s.lensMode);
  const selectedNodeId = useBrainStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useBrainStore((s) => s.setSelectedNodeId);
  const setHoverNodeId = useBrainStore((s) => s.setHoverNodeId);
  const setForceAlpha = useBrainStore((s) => s.setForceAlpha);
  const scenario = useDashboardStore((s) => s.timelineScenario);
  const setScenario = useDashboardStore((s) => s.setTimelineScenario);

  // PROJ_2026 sub-scenario (local — not in the shared store).
  const [projSubId, setProjSubId] = React.useState<
    "PN_SURGE" | "BN_SURGE" | "PH_SURGE" | "STATUS_QUO" | "UNDI18_YOUTH"
  >("STATUS_QUO");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [graph, setGraph] = React.useState<BuiltGraph | null>(null);
  const [tick, setTick] = React.useState(0); // forces re-render on sim tick

  const dataRef = React.useRef<LoadedData | null>(null);
  const simRef = React.useRef<ForceSim | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sizeRef = React.useRef<{ width: number; height: number }>({
    width: 720,
    height: 560,
  });

  // ── Load data on mount ────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAllData()
      .then((data) => {
        if (cancelled) return;
        dataRef.current = data;
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[brain-graph] data load failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Measure container width ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      sizeRef.current = {
        width: Math.max(rect.width, 320),
        height: Math.max(rect.height, 320),
      };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Build graph + run d3-force sim when lens mode / scenario changes ─────
  // ponytail: MLK — re-build on lensMode, scenario, projSubId change. The
  // simulation is torn down + recreated each time (small graph; ~40 nodes).
  React.useEffect(() => {
    const data = dataRef.current;
    if (!data) return;

    // Stop any existing simulation.
    if (simRef.current) {
      simRef.current.stop();
      simRef.current = null;
    }

    let built: BuiltGraph;
    if (lensMode === "constituency") built = buildConstituencyGraph(data);
    else if (lensMode === "coalition") built = buildCoalitionGraph(data);
    else if (lensMode === "demographics")
      built = buildDemographicsGraph(data);
    else
      built = buildTimelineGraph(
        data,
        scenario,
        projSubId
      );

    // Seed initial positions in a circle around the centre (d3-force needs a
    // starting point; otherwise everything starts at [0,0] and explodes).
    const { width, height } = sizeRef.current;
    const cx = width / 2;
    const cy = height / 2;
    const ringR = Math.min(width, height) * 0.35;
    built.nodes.forEach((n, i) => {
      const a = (i / built.nodes.length) * Math.PI * 2;
      n.x = cx + Math.cos(a) * ringR + (Math.random() - 0.5) * 20;
      n.y = cy + Math.sin(a) * ringR + (Math.random() - 0.5) * 20;
      n.vx = 0;
      n.vy = 0;
    });

    setGraph(built);
    // Surface nodes to the parent (Brain wrapper) so the side panel can
    // resolve the selected id. ponytail: MLK — `onNodesChange` is a stable
    // callback from the parent's useState setter, so it's safe to call here.
    onNodesChange?.(built.nodes);
    setTick((t) => t + 1);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ponytail: MLK — dynamic-import d3-force inside the effect so it stays
    // out of the SSR bundle.
    let active = true;
    let tickCount = 0;
    import("d3-force")
      .then((d3) => {
        if (!active) return;
        const sim = d3.forceSimulation(built.nodes as ForceNode[])
          .force(
            "link",
            d3
              .forceLink(
                built.edges.map((e) => ({
                  source: e.source,
                  target: e.target,
                })) as ForceLink[]
              )
              .id((d) => (d as BrainNode).id)
              .distance(70)
              .strength(0.4)
          )
          .force("charge", d3.forceManyBody().strength(-120))
          .force("center", d3.forceCenter(cx, cy))
          .force(
            "collide",
            d3.forceCollide().radius((d) => (d as BrainNode).radius + 4)
          )
          .alphaDecay(ALPHA_DECAY)
          .alphaMin(ALPHA_MIN);

        // Demographics lens — add cluster pulls so same-ethnicity DUNs clump.
        if (lensMode === "demographics") {
          const clusters: Record<string, [number, number]> = {
            MALAY: [cx - width * 0.2, cy - height * 0.15],
            CHINESE: [cx + width * 0.2, cy - height * 0.15],
            INDIAN: [cx - width * 0.2, cy + height * 0.15],
            BUMIPUTERA: [cx + width * 0.2, cy + height * 0.15],
            OTHER: [cx, cy + height * 0.25],
            UNKNOWN: [cx, cy - height * 0.25],
          };
          sim.force(
            "x",
            d3.forceX((d) => {
              const eth = ((d as DunBrainNode).dominantEthnicity ?? "UNKNOWN").toUpperCase();
              return clusters[eth]?.[0] ?? cx;
            }).strength(0.15)
          );
          sim.force(
            "y",
            d3.forceY((d) => {
              const eth = ((d as DunBrainNode).dominantEthnicity ?? "UNKNOWN").toUpperCase();
              return clusters[eth]?.[1] ?? cy;
            }).strength(0.15)
          );
        }

        sim.on("tick", () => {
          tickCount++;
          setForceAlpha(sim.alpha());
          setTick((t) => t + 1);
          if (tickCount >= MAX_TICKS) {
            sim.stop();
          }
        });
        sim.on("end", () => {
          setForceAlpha(0);
        });
        simRef.current = sim;

        // prefers-reduced-motion: run simulation synchronously to layout,
        // then stop (no animation). d3-force has `.tick(n)` for this.
        if (prefersReducedMotion) {
          for (let i = 0; i < MAX_TICKS; i++) {
            sim.tick();
            if (sim.alpha() < ALPHA_MIN) break;
          }
          sim.stop();
          setTick((t) => t + 1);
          setForceAlpha(0);
        }
      })
      .catch((err) => {
        console.error("[brain-graph] d3-force import failed:", err);
        setError("Failed to load d3-force — graph layout disabled.");
      });

    return () => {
      active = false;
      if (simRef.current) {
        simRef.current.stop();
        simRef.current = null;
      }
    };
  }, [lensMode, scenario, projSubId, loading]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const { width, height } = sizeRef.current;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  // Build an id → node lookup for edge endpoint resolution.
  const nodeById = React.useMemo(() => {
    const m = new Map<string, BrainNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Resolve edge endpoints to current x/y (d3-force mutates link.source/target
  // to the node object after first tick — handle both shapes).
  function edgeEndpoints(e: BrainEdge): { x1: number; y1: number; x2: number; y2: number } | null {
    const s = (e.source as unknown) as BrainNode | string;
    const t = (e.target as unknown) as BrainNode | string;
    const sn = typeof s === "string" ? nodeById.get(s) : s;
    const tn = typeof t === "string" ? nodeById.get(t) : t;
    if (!sn || !tn) return null;
    if (sn.x == null || sn.y == null || tn.x == null || tn.y == null) return null;
    return { x1: sn.x, y1: sn.y, x2: tn.x, y2: tn.y };
  }

  const scenarioLabel =
    scenario === "PROJ_2026"
      ? `PROJ 2026 · ${projSubId.replace("_", " ").toLowerCase()}`
      : scenario;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-md border border-slate-800 bg-slate-950/40",
        className
      )}
    >
      {/* Timeline scenario controls — only for timeline lens */}
      {lensMode === "timeline" && (
        <div
          className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 p-2"
          role="toolbar"
          aria-label="Timeline scenario"
        >
          {(["GE14", "PRN15", "GE15", "PROJ_2026"] as const).map((s) => {
            const active = scenario === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                aria-label={`${s} scenario${active ? " (active)" : ""}`}
                onClick={() => setScenario(s)}
                className={cn(
                  "h-9 min-w-[72px] rounded px-2.5 text-xs font-medium",
                  "touch-manipulation select-none",
                  FOCUS_RING,
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                )}
              >
                {s}
              </button>
            );
          })}
          {scenario === "PROJ_2026" && (
            <select
              aria-label="2026 sub-scenario"
              value={projSubId}
              onChange={(e) =>
                setProjSubId(
                  e.target.value as typeof projSubId
                )
              }
              className={cn(
                "h-9 rounded border border-slate-700 bg-slate-900/70 px-2 text-xs text-slate-200",
                FOCUS_RING
              )}
            >
              <option value="STATUS_QUO">Status Quo</option>
              <option value="PN_SURGE">PN Surge</option>
              <option value="BN_SURGE">BN Surge</option>
              <option value="PH_SURGE">PH Surge</option>
              <option value="UNDI18_YOUTH">Undi18 Youth Wave</option>
            </select>
          )}
          <span className="ml-auto text-[11px] text-slate-400">
            {scenarioLabel}
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative h-[440px] md:h-[560px] w-full overflow-hidden"
        role="application"
        aria-label={`Digital Brain ${lensMode} lens graph — ${nodes.length} nodes, ${edges.length} edges. Click a node to see details.`}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <p className="text-sm">Loading Brain graph…</p>
          </div>
        )}
        {error && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/80 p-4 text-center text-red-200"
            role="alert"
          >
            <p className="text-sm font-semibold">Brain graph failed to load</p>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
        {!loading && !error && graph && (
          <svg
            // `tick` forces a re-render on every simulation tick.
            key={`${lensMode}-${scenario}-${projSubId}-${tick}`}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block h-full w-full"
            aria-hidden="false"
            role="group"
          >
            {/* Edges first (under nodes) */}
            <g aria-hidden="true">
              {edges.map((e, i) => {
                const ends = edgeEndpoints(e);
                if (!ends) return null;
                return (
                  <line
                    key={`edge-${i}`}
                    x1={ends.x1}
                    y1={ends.y1}
                    x2={ends.x2}
                    y2={ends.y2}
                    stroke={EDGE_STROKE}
                    strokeOpacity={EDGE_OPACITY}
                    strokeWidth={1}
                  />
                );
              })}
            </g>
            {/* Nodes */}
            <g>
              {nodes.map((n) => (
                <NodeShape
                  key={n.id}
                  node={n}
                  selected={n.id === selectedNodeId}
                  onSelect={() => setSelectedNodeId(n.id)}
                  onHover={(h) => setHoverNodeId(h ? n.id : null)}
                />
              ))}
            </g>
          </svg>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 px-3 py-2 text-[11px] text-slate-400">
        <span>{nodes.length} nodes</span>
        <span>·</span>
        <span>{edges.length} edges</span>
        <span>·</span>
        <span className="italic">Click a node to open the side panel.</span>
        {lensMode === "timeline" && scenario === "PROJ_2026" && (
          <span className="text-amber-400">
            · Per-DUN PROJ_2026 winners derived from PRN15 vote_share (visualization, not forecast)
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeShape — renders a node as SVG circle / diamond / coalition circle.
// Each shape has a `<title>` for screen readers + onClick/onHover handlers.
// ─────────────────────────────────────────────────────────────────────────────
interface NodeShapeProps {
  node: BrainNode;
  selected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

function NodeShape({ node, selected, onSelect, onHover }: NodeShapeProps) {
  const r = node.radius;
  const stroke = selected ? MLK_ACCENT : "rgba(255,255,255,0.55)";
  const strokeWidth = selected ? 3 : node.kind === "parliament" ? 2 : 1;

  const ariaLabel = `${node.kind} node: ${node.title}${
    node.subtitle ? ` — ${node.subtitle}` : ""
  }${selected ? " (selected)" : ""}`;

  const commonProps = {
    role: "button",
    tabIndex: 0,
    "aria-label": ariaLabel,
    onClick: onSelect,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect();
      }
    },
    onMouseEnter: () => onHover(true),
    onMouseLeave: () => onHover(false),
    onFocus: () => onHover(true),
    onBlur: () => onHover(false),
    style: { cursor: "pointer" },
    className: FOCUS_RING,
  };

  // ponytail: MLK — d3-force writes x/y as optional numbers; once the
  // simulation has run at least one tick, they're always set. We coalesce to
  // 0 for the very first paint so the SVG doesn't render NaN coords.
  const nx = node.x ?? 0;
  const ny = node.y ?? 0;

  if (node.kind === "district") {
    // Diamond shape — rotated square.
    const pts = `${nx},${ny - r} ${nx + r},${ny} ${nx},${ny + r} ${nx - r},${ny}`;
    return (
      <g {...commonProps}>
        <polygon
          points={pts}
          fill={node.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <title>{ariaLabel}</title>
        <text
          x={nx}
          y={ny + r + 12}
          textAnchor="middle"
          fontSize={10}
          fill="#cbd5e1"
          pointerEvents="none"
        >
          {node.title}
        </text>
      </g>
    );
  }

  if (node.kind === "coalition" || node.kind === "parliament") {
    return (
      <g {...commonProps}>
        <circle
          cx={nx}
          cy={ny}
          r={r}
          fill={node.color}
          stroke="#ffffff"
          strokeWidth={strokeWidth}
        />
        <title>{ariaLabel}</title>
        <text
          x={nx}
          y={ny + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#ffffff"
          pointerEvents="none"
        >
          {node.kind === "coalition"
            ? (node as CoalitionBrainNode).coalitionCode
            : `P${(node as ParliamentBrainNode).parliamentCode}`}
        </text>
      </g>
    );
  }

  // DUN node — plain circle, colored by lens.
  return (
    <g {...commonProps}>
      <circle
        cx={nx}
        cy={ny}
        r={r}
        fill={node.color}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <title>{ariaLabel}</title>
    </g>
  );
}
