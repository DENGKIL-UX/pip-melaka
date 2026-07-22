// ponytail: MLK — DUN extrusions (28 boxes) + parlimen outlines (6 orange lines)
// + lat/lng → scene projection + scenario winner computation.
// Implements WORKLOAD.md Phase 3 §3.2 + DESIGN.md §3 row 2 (8-layer system:
// layers 1 terrain, 2 DUN extrusions, 4 parlimen outlines).
//
// Projection: linear around Melaka centroid [2.1930, 102.4247] —
//   x = (lng − 102.4247) × 1000
//   z = (lat − 2.1930) × 1000
// (See task spec + MELAKA-FACTS.md §1.) This is a flat equirectangular
// projection — accurate enough at state scale (~50 km wide).
//
// DUN extrusions: BoxGeometry positioned at the polygon centroid, footprint
// sized to roughly bound the polygon, height = total_voters / 1000 (so P134
// DUN with ~15k voters → ~15 units; max ~24 units for the densest DUN).
//
// Scenario winners (4 timeline scenarios × 28 DUNs):
//   GE14 / PRN15: DUN-level winner from melaka-elections.json directly.
//   GE15: DUNs inherit their parliament's GE15 winner (GE15 has no DUN results).
//   PROJ_2026: derived per-DUN winners via a deterministic "top-N by PRN15
//     vote_share" assignment, calibrated to match each scenario's target
//     seat count exactly. Per-DUN assignments are hypotheses, not forecasts
//     — see `// ponytail: MLK — UNVERIFIED` comment on `computeProjectionWinners`.

import type * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GeoJSON types (loose — `coordinates` is `any` to avoid strict-typing the
// nested-array shape, which is fine for read-only iteration).
// ─────────────────────────────────────────────────────────────────────────────

export interface DunFeatureProps {
  shapeName?: string;
  parliament_code: string;
  dun_code: string;
  dun_name?: string;
  dun_name_2018?: string;
  dun_name_2026?: string;
  renamed_in_2023?: boolean;
  state_code?: string;
  district?: string;
}

export interface ParlimenFeatureProps {
  shapeName?: string;
  parliament_code: string;
  parliament_name?: string;
  state_code?: string;
  district?: string;
  ge15_winner?: string;
  ge14_winner?: string;
}

export interface GeoJSONFeature<P = DunFeatureProps | ParlimenFeatureProps> {
  type: "Feature";
  properties: P;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}

export interface GeoJSONFC<P = DunFeatureProps | ParlimenFeatureProps> {
  type: "FeatureCollection";
  features: GeoJSONFeature<P>[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Projection: lat/lng → scene (x, z). Melaka centroid + linear scale.
// ─────────────────────────────────────────────────────────────────────────────

export const MLK_CENTER_LAT = 2.193;
export const MLK_CENTER_LNG = 102.4247;

export function projectLatLng(lat: number, lng: number): [number, number] {
  const x = (lng - MLK_CENTER_LNG) * 1000;
  const z = (lat - MLK_CENTER_LAT) * 1000;
  return [x, z];
}

/** Returns the centroid [x, z] of a Polygon / MultiPolygon in scene coords. */
export function geometryCentroid3D(geometry: GeoJSONFeature["geometry"]): [number, number] {
  let latSum = 0;
  let lngSum = 0;
  let n = 0;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates as number[][][]) {
      for (let i = 0; i < ring.length - 1; i++) {
        lngSum += ring[i][0];
        latSum += ring[i][1];
        n++;
      }
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates as number[][][][]) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          lngSum += ring[i][0];
          latSum += ring[i][1];
          n++;
        }
      }
    }
  }
  if (n === 0) return [0, 0];
  return projectLatLng(latSum / n, lngSum / n);
}

/** Returns the bounding box [minX, maxX, minZ, maxZ] of a geometry in scene coords. */
export function geometryBounds3D(geometry: GeoJSONFeature["geometry"]): [number, number, number, number] {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const visit = (ring: number[][]) => {
    for (let i = 0; i < ring.length - 1; i++) {
      const [x, z] = projectLatLng(ring[i][1], ring[i][0]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  };
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates as number[][][]) visit(ring);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates as number[][][][]) for (const ring of poly) visit(ring);
  }
  if (!isFinite(minX)) return [0, 0, 0, 0];
  return [minX, maxX, minZ, maxZ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DUN intelligence + election result types
// ─────────────────────────────────────────────────────────────────────────────

export interface DunIntelligenceRow {
  level: "DUN";
  id: string;
  geography: {
    state_code: string;
    state_name: string;
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
    voter_density_score?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
    senior_dependency_percent?: number;
    gender_balance_score?: number;
    dominant_age_group?: string;
    dominant_ethnicity_group?: string;
    profile_completeness_score?: number;
  };
}

export interface ElectionDunResult {
  parliament_code: string;
  dun_code: string;
  dun_name_2018?: string;
  dun_name_2026?: string;
  winner: string;
  renamed?: boolean;
  vote_share?: Record<string, number>;
}

export interface ElectionParlResult {
  parliament_code: string;
  parliament_name: string;
  winner: string;
  votes_pct?: number;
  runner_up?: string;
  margin_pct?: number;
}

export interface ElectionsDoc {
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
    name: string;
    type: string;
    description: string;
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

export type ScenarioId = "GE14" | "PRN15" | "GE15" | "PROJ_2026";
export type ProjSubScenarioId =
  | "PN_SURGE"
  | "BN_SURGE"
  | "PH_SURGE"
  | "STATUS_QUO"
  | "UNDI18_YOUTH";

// ─────────────────────────────────────────────────────────────────────────────
// 4. DUN extrusion: BoxGeometry sized to polygon bounds + height by voters.
// ─────────────────────────────────────────────────────────────────────────────

export interface DunExtrusionSpec {
  feature: GeoJSONFeature<DunFeatureProps>;
  parliamentCode: string;
  dunCode: string;
  dunName: string;
  dunName2018?: string;
  renamed: boolean;
  centroid: [number, number]; // [x, z]
  footprint: [number, number]; // [width, depth]
  totalVoters: number;
}

export interface BuiltDunExtrusion {
  mesh: THREE.Mesh;
  spec: DunExtrusionSpec;
  /** Initial color (PRN15 winner color). */
  baseColor: THREE.Color;
  /** Current animated color (mutated by the morph loop). */
  currentColor: THREE.Color;
  /** Target color (set by morphScenario). */
  targetColor: THREE.Color;
  /** Current animated height (mutated by the morph loop). */
  currentHeight: number;
  /** Target height (set by morphScenario). */
  targetHeight: number;
  /** Current winner code (BN/PH/PN/OTH). */
  winner: string;
}

export const HEIGHT_SCALE = 0.5; // total_voters × 0.5 / 1000 → ~7-12 units per DUN
export const MIN_HEIGHT = 2;
export const PARLIMEN_OUTLINE_COLOR = 0xc77b2c; // MLK accent amber
export const PARLIMEN_OUTLINE_Y = 0.05; // slightly above the terrain

/**
 * Builds a single DUN extrusion mesh from its spec. The mesh origin sits at the
 * bottom-centre of the box, positioned at the centroid [x, 0, z]. The morph
 * loop scales Y by `currentHeight` and lerps `currentColor` → `targetColor`.
 */
export function buildDunExtrusion(
  THREE: typeof import("three"),
  spec: DunExtrusionSpec,
  initialColorHex: string,
  initialHeight: number
): BuiltDunExtrusion {
  const [w, d] = spec.footprint;
  const [cx, cz] = spec.centroid;
  // Box of unit height — we scale Y at runtime for smooth morph animation.
  const geometry = new THREE.BoxGeometry(w, 1, d);
  // Translate the box so its bottom face is at y=0 (BoxGeometry is centred at origin).
  geometry.translate(0, 0.5, 0);

  const baseColor = new THREE.Color(initialColorHex);
  const material = new THREE.MeshStandardMaterial({
    color: baseColor.clone(),
    roughness: 0.55,
    metalness: 0.15,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cx, 0, cz);
  mesh.scale.y = Math.max(initialHeight, MIN_HEIGHT);
  mesh.userData = {
    kind: "dun",
    parliamentCode: spec.parliamentCode,
    dunCode: spec.dunCode,
    dunName: spec.dunName,
    totalVoters: spec.totalVoters,
    renamed: spec.renamed,
  };

  return {
    mesh,
    spec,
    baseColor: baseColor.clone(),
    currentColor: baseColor.clone(),
    targetColor: baseColor.clone(),
    currentHeight: Math.max(initialHeight, MIN_HEIGHT),
    targetHeight: Math.max(initialHeight, MIN_HEIGHT),
    winner: "",
  };
}

/**
 * Builds all 28 DUN extrusions from a DUN GeoJSON FeatureCollection +
 * intelligence rows. Returns the BuiltDunExtrusion array (parent adds meshes).
 */
export function buildAllDunExtrusions(
  THREE: typeof import("three"),
  fc: GeoJSONFC<DunFeatureProps>,
  intelligenceByCode: Map<string, DunIntelligenceRow>,
  initialColorFn: (spec: DunExtrusionSpec) => string,
  initialHeightFn: (spec: DunIntelligenceRow | undefined) => number
): BuiltDunExtrusion[] {
  const built: BuiltDunExtrusion[] = [];
  for (const feature of fc.features) {
    const props = feature.properties;
    const centroid = geometryCentroid3D(feature.geometry);
    const [minX, maxX, minZ, maxZ] = geometryBounds3D(feature.geometry);
    const footprint: [number, number] = [Math.max(maxX - minX, 1.5), Math.max(maxZ - minZ, 1.5)];
    const intel = intelligenceByCode.get(`${props.parliament_code}|${props.dun_code}`);
    const spec: DunExtrusionSpec = {
      feature,
      parliamentCode: props.parliament_code,
      dunCode: props.dun_code,
      dunName: props.dun_name_2026 ?? props.dun_name ?? props.dun_name_2018 ?? props.shapeName ?? `N${props.dun_code}`,
      dunName2018: props.dun_name_2018,
      renamed: props.renamed_in_2023 === true,
      centroid,
      footprint,
      totalVoters: intel?.metrics.total_voters ?? 0,
    };
    const initialColor = initialColorFn(spec);
    const initialHeight = initialHeightFn(intel);
    built.push(buildDunExtrusion(THREE, spec, initialColor, initialHeight));
  }
  return built;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Parlimen outlines: orange line loops on top of the DUN extrusions.
// ─────────────────────────────────────────────────────────────────────────────

export interface BuiltParlimenOutline {
  lines: THREE.Line[];
  parliamentCode: string;
  parliamentName: string;
}

export function buildParlimenOutlines(
  THREE: typeof import("three"),
  fc: GeoJSONFC<ParlimenFeatureProps>
): BuiltParlimenOutline[] {
  const built: BuiltParlimenOutline[] = [];
  const material = new THREE.LineBasicMaterial({
    color: PARLIMEN_OUTLINE_COLOR,
    transparent: true,
    opacity: 0.95,
  });
  for (const feature of fc.features) {
    const lines: THREE.Line[] = [];
    const addRing = (ring: number[][]) => {
      // Skip the closing vertex (last == first) — Line doesn't need it.
      const pts: number[] = [];
      for (let i = 0; i < ring.length; i++) {
        const [x, z] = projectLatLng(ring[i][1], ring[i][0]);
        pts.push(x, PARLIMEN_OUTLINE_Y, z);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.LineLoop(geometry, material);
      line.userData = { kind: "parlimen-outline", parliamentCode: feature.properties.parliament_code };
      lines.push(line);
    };
    if (feature.geometry.type === "Polygon") {
      for (const ring of feature.geometry.coordinates as number[][][]) addRing(ring);
    } else if (feature.geometry.type === "MultiPolygon") {
      for (const poly of feature.geometry.coordinates as number[][][][])
        for (const ring of poly) addRing(ring);
    }
    built.push({
      lines,
      parliamentCode: feature.properties.parliament_code,
      parliamentName: feature.properties.parliament_name ?? feature.properties.shapeName ?? "",
    });
  }
  return built;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Terrain: flat plane with subtle gradient (vertex colours, no texture).
// ─────────────────────────────────────────────────────────────────────────────

export function buildTerrain(
  THREE: typeof import("three"),
  size = 240
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  geometry.rotateX(-Math.PI / 2); // lay flat on XZ plane
  const material = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // slate-800
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0.7,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.05;
  mesh.userData = { kind: "terrain" };
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Scenario winner computation.
//    GE14 / PRN15: DUN-level winner from melaka-elections.json directly.
//    GE15: DUNs inherit their parliament's GE15 winner.
//    PROJ_2026: derived per-DUN winners via deterministic top-N by PRN15
//    vote_share, calibrated to match each scenario's target seat count.
// ─────────────────────────────────────────────────────────────────────────────

export interface DunScenarioState {
  parliamentCode: string;
  dunCode: string;
  dunName: string;
  totalVoters: number;
  winner: string; // BN | PH | PN | OTH
  height: number; // target height for the morph
  voteShare?: Record<string, number>;
}

export interface ScenarioMorphPlan {
  scenario: ScenarioId;
  projSubId?: ProjSubScenarioId;
  states: DunScenarioState[];
  /** Headline seat count summary for the active scenario. */
  seatSummary: Record<string, number>;
  /** Caption shown in the UI text alternative. */
  caption: string;
}

const SCENARIO_HEIGHT_FACTOR: Record<ScenarioId, number> = {
  GE14: 0.95,
  PRN15: 1.0,
  GE15: 1.02,
  PROJ_2026: 1.1, // projected electorate growth
};

/**
 * ponytail: MLK — UNVERIFIED. Per-DUN PROJ_2026 winners are derived by
 * sorting DUNs by their PRN15 vote_share for each scenario's surge party
 * (descending) and assigning the top-N DUNs to that party, where N = the
 * scenario's target seat count from melaka-elections.json. This produces a
 * deterministic scenario visualization whose headline seat count matches the
 * target exactly, but the *which DUN flips* is a hypothesis (not a forecast).
 * Status Quo uses PRN15 winners unchanged. See election-projection skill spec.
 */
function computeProjectionWinners(
  prn15Results: ElectionDunResult[],
  scenarioId: ProjSubScenarioId,
  targetSeats: Record<string, number>
): string[] {
  const n = prn15Results.length;
  const winners = new Array<string>(n).fill("");
  if (scenarioId === "STATUS_QUO") {
    return prn15Results.map((r) => r.winner);
  }
  // Party assignment order: surge party first, then a chosen runner-up order.
  // For UNDI18_YOUTH the surge is mixed (youth skews PN per Undi18 analysis).
  const order: Record<ProjSubScenarioId, string[]> = {
    PN_SURGE: ["PN", "BN", "PH"],
    BN_SURGE: ["BN", "PN", "PH"],
    PH_SURGE: ["PH", "PN", "BN"],
    STATUS_QUO: [],
    UNDI18_YOUTH: ["PN", "PH", "BN"],
  };
  const assigned = new Set<number>();
  for (const party of order[scenarioId]) {
    const target = targetSeats[party] ?? 0;
    if (target === 0) continue;
    // Rank unassigned DUNs by this party's PRN15 vote_share (descending).
    const ranked = prn15Results
      .map((r, i) => ({ i, vs: r.vote_share?.[party] ?? 0 }))
      .filter((x) => !assigned.has(x.i))
      .sort((a, b) => b.vs - a.vs);
    for (let k = 0; k < Math.min(target, ranked.length); k++) {
      winners[ranked[k].i] = party;
      assigned.add(ranked[k].i);
    }
  }
  // Any leftover DUNs: fall back to their PRN15 winner (rare — seat counts sum
  // to 28 so this only fires if the JSON targets under-count).
  for (let i = 0; i < n; i++) {
    if (!winners[i]) winners[i] = prn15Results[i].winner;
  }
  return winners;
}

/**
 * Computes the per-DUN scenario state (winner + target height) for the given
 * scenario. This is the input to the morph animation.
 */
export function computeScenarioMorphPlan(
  scenario: ScenarioId,
  projSubId: ProjSubScenarioId,
  elections: ElectionsDoc,
  intelligenceByCode: Map<string, DunIntelligenceRow>,
  dunFeatures: GeoJSONFC<DunFeatureProps>
): ScenarioMorphPlan {
  // Index PRN15 + GE14 DUN results by `parlCode|dunCode`.
  const prn15 = elections.elections.find((e) => e.id === "PRN15");
  const ge14 = elections.elections.find((e) => e.id === "GE14");
  const ge15 = elections.elections.find((e) => e.id === "GE15");
  if (!prn15 || !ge14 || !ge15) {
    return { scenario, projSubId, states: [], seatSummary: {}, caption: "Election data missing" };
  }
  const prn15ByCode = new Map(prn15.dun_results.map((r) => [`${r.parliament_code}|${r.dun_code}`, r]));
  const ge14ByCode = new Map(ge14.dun_results.map((r) => [`${r.parliament_code}|${r.dun_code}`, r]));
  const ge15ByParl = new Map(ge15.parliament_results.map((r) => [r.parliament_code, r]));

  const heightFactor = SCENARIO_HEIGHT_FACTOR[scenario];
  const states: DunScenarioState[] = [];

  // Pre-compute PROJ_2026 winners (single array indexed by feature order).
  let projWinners: string[] | null = null;
  let projSeatSummary: Record<string, number> | null = null;
  if (scenario === "PROJ_2026" && elections.projection_2026) {
    const sub = elections.projection_2026.scenarios.find((s) => s.id === projSubId);
    if (sub) {
      // Build a PRN15 result array aligned to dunFeatures order.
      const prn15Arr = dunFeatures.features.map(
        (f) => prn15ByCode.get(`${f.properties.parliament_code}|${f.properties.dun_code}`) ?? {
          parliament_code: f.properties.parliament_code,
          dun_code: f.properties.dun_code,
          winner: "BN",
          vote_share: { BN: 0.42, PH: 0.32, PN: 0.24, Others: 0.02 },
        }
      );
      projWinners = computeProjectionWinners(prn15Arr, projSubId, sub.dun_seats);
      projSeatSummary = sub.dun_seats;
    }
  }

  const seatSummary: Record<string, number> = {};

  dunFeatures.features.forEach((feature, idx) => {
    const parlCode = feature.properties.parliament_code;
    const dunCode = feature.properties.dun_code;
    const intel = intelligenceByCode.get(`${parlCode}|${dunCode}`);
    const totalVoters = intel?.metrics.total_voters ?? 0;
    const targetHeight = Math.max(MIN_HEIGHT, (totalVoters / 1000) * HEIGHT_SCALE * heightFactor);

    let winner = "OTH";
    let voteShare: Record<string, number> | undefined;
    if (scenario === "GE14") {
      const r = ge14ByCode.get(`${parlCode}|${dunCode}`);
      winner = r?.winner ?? "OTH";
      voteShare = r?.vote_share;
    } else if (scenario === "PRN15") {
      const r = prn15ByCode.get(`${parlCode}|${dunCode}`);
      winner = r?.winner ?? "OTH";
      voteShare = r?.vote_share;
    } else if (scenario === "GE15") {
      // GE15 has no DUN results — inherit parliament winner.
      winner = ge15ByParl.get(parlCode)?.winner ?? "OTH";
    } else if (scenario === "PROJ_2026" && projWinners) {
      winner = projWinners[idx] ?? "OTH";
    }
    seatSummary[winner] = (seatSummary[winner] ?? 0) + 1;

    states.push({
      parliamentCode: parlCode,
      dunCode,
      dunName: feature.properties.dun_name_2026 ?? feature.properties.dun_name ?? `N${dunCode}`,
      totalVoters,
      winner,
      height: targetHeight,
      voteShare,
    });
  });

  // Caption: scenario label + seat summary.
  let caption = "";
  if (scenario === "PROJ_2026") {
    const sub = elections.projection_2026?.scenarios.find((s) => s.id === projSubId);
    caption = `PROJ_2026 · ${sub?.label ?? projSubId} · ${formatSeatSummary(projSeatSummary ?? seatSummary)}`;
    if (projSeatSummary) {
      // Override the per-DUN summary with the scenario's target seat counts
      // (the per-DUN assignment may differ by 1–2 seats due to ties).
      Object.keys(projSeatSummary).forEach((k) => (seatSummary[k] = projSeatSummary[k]));
    }
  } else {
    caption = `${scenario} · ${formatSeatSummary(seatSummary)}`;
  }

  return { scenario, projSubId, states, seatSummary, caption };
}

function formatSeatSummary(s: Record<string, number>): string {
  const parts: string[] = [];
  for (const k of ["BN", "PH", "PN", "OTH", "Others"]) {
    if (s[k]) parts.push(`${k} ${s[k]}`);
  }
  return parts.join(" / ");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. JSONL parsing helper (duplicated from map-2d/layers.ts to avoid coupling
// the 3D module to the 2D module's barrel — see AGENT.md §2 "no unrequested
// abstractions"; this 12-line helper is intentionally local).
// ─────────────────────────────────────────────────────────────────────────────

export function parseJsonl<T = unknown>(text: string): T[] {
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
