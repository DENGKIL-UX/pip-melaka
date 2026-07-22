// ponytail: MLK — 2D Map layer definitions + helpers.
// Implements WORKLOAD.md Phase 2 (13 layers) + DESIGN.md §3 row 1.
// Headline layer = #6 PRN15 2021 choropleth (BN blue 21 / PH red 5 / PN green 2).
// All Leaflet interaction is done inside the client component (map-2d.tsx) —
// this file is pure data + small geometry helpers (no L.* symbols) so it can
// be safely imported server-side too.

import { PARTY_COLORS } from "@/lib/party-colors";
import { MLK_ACCENT } from "@/lib/party-colors";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Layer registry (13 layers — matches WORKLOAD.md §2.1 exactly)
// ─────────────────────────────────────────────────────────────────────────────

export type LayerId =
  | "base-osm"
  | "adm1-state"
  | "adm2-districts"
  | "parlimen-outlines"
  | "dun-outlines"
  | "choropleth-prn15"
  | "choropleth-ge15"
  | "choropleth-ge14"
  | "dpt-heatmap"
  | "town-labels"
  | "dun-labels"
  | "parlimen-labels"
  | "engine-demographics";

export interface LayerDef {
  id: LayerId;
  label: string;
  /** Tailwind-safe hex color swatch shown in the control panel. */
  swatch: string;
  /** Whether the layer is on by default. */
  defaultOn: boolean;
  /** One-line description for the aria-label + tooltip. */
  description: string;
  /** Group label for collapsible grouping in the control panel. */
  group: "Base" | "Boundaries" | "Elections" | "Data" | "Labels";
}

export const LAYERS: LayerDef[] = [
  {
    id: "base-osm",
    label: "Base OSM (light)",
    swatch: "#A8B5C4",
    defaultOn: true,
    description: "OpenStreetMap light tile base layer",
    group: "Base",
  },
  {
    id: "adm1-state",
    label: "Melaka state outline",
    swatch: MLK_ACCENT,
    defaultOn: true,
    description: "ADM1 state boundary — amber border",
    group: "Boundaries",
  },
  {
    id: "adm2-districts",
    label: "3 District outlines",
    swatch: "#F59E0B",
    defaultOn: true,
    description: "ADM2 — Melaka Tengah / Alor Gajah / Jasin",
    group: "Boundaries",
  },
  {
    id: "parlimen-outlines",
    label: "6 Parliament outlines",
    swatch: "#0EA5E9",
    defaultOn: true,
    description: "P134–P139 boundaries coloured by GE15 winner",
    group: "Boundaries",
  },
  {
    id: "dun-outlines",
    label: "28 DUN outlines",
    swatch: "#64748B",
    defaultOn: true,
    description: "N01–N28 state seats — neutral outlines",
    group: "Boundaries",
  },
  {
    id: "choropleth-prn15",
    label: "PRN15 2021 choropleth (headline)",
    swatch: PARTY_COLORS.BN,
    defaultOn: true,
    description: "Melaka state election — BN 21 / PH 5 / PN 2",
    group: "Elections",
  },
  {
    id: "choropleth-ge15",
    label: "GE15 2022 parliament choropleth",
    swatch: PARTY_COLORS.PN,
    defaultOn: false,
    description: "Federal election — Melaka parliament PN 4 / PH 2",
    group: "Elections",
  },
  {
    id: "choropleth-ge14",
    label: "GE14 2018 DUN choropleth",
    swatch: PARTY_COLORS.PH,
    defaultOn: false,
    description: "GE14 state results — PH 12 / BN 16 baseline",
    group: "Elections",
  },
  {
    id: "dpt-heatmap",
    label: "DPT 5-month heatmap",
    swatch: "#EF4444",
    defaultOn: false,
    description: "Net voter-roll additions by parliament (Jan–May 2026)",
    group: "Data",
  },
  {
    id: "town-labels",
    label: "Town labels (~50)",
    swatch: "#1E40AF",
    defaultOn: false,
    description: "Major towns — circle markers + tooltip",
    group: "Labels",
  },
  {
    id: "dun-labels",
    label: "DUN labels (28)",
    swatch: "#DC2626",
    defaultOn: false,
    description: "N01–N28 — redelineation tooltip on N03/N04/N05",
    group: "Labels",
  },
  {
    id: "parlimen-labels",
    label: "Parliament labels (6)",
    swatch: "#0891B2",
    defaultOn: true,
    description: "P134–P139 names",
    group: "Labels",
  },
  {
    id: "engine-demographics",
    label: "Engine demographics overlay",
    swatch: "#9333EA",
    defaultOn: false,
    description: "Voter-density circle markers from locality-intelligence.jsonl",
    group: "Data",
  },
];

export const DEFAULT_LAYER_STATE: Record<LayerId, boolean> = LAYERS.reduce(
  (acc, l) => {
    acc[l.id] = l.defaultOn;
    return acc;
  },
  {} as Record<LayerId, boolean>
);

export const LAYER_GROUPS: LayerDef["group"][] = [
  "Base",
  "Boundaries",
  "Elections",
  "Data",
  "Labels",
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Static-data URLs (resolve to /public/data/* at runtime)
// ─────────────────────────────────────────────────────────────────────────────

export const DATA_URLS = {
  adm1: "/data/boundaries/mlk-adm1-geo.json",
  adm2: "/data/boundaries/mlk-adm2-geo.json",
  parlimen: "/data/boundaries/mlk-parlimen-geo.json",
  dun: "/data/boundaries/mlk-dun-geo.json",
  towns: "/data/mlk-towns.json",
  elections: "/data/elections/melaka-elections.json",
  dptSummary: "/data/dpt/spr-dpt-pameran-summary.json",
  locality: (parliamentCode: string) =>
    `/data/p${parliamentCode}/locality-intelligence.jsonl`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Map constants
// ─────────────────────────────────────────────────────────────────────────────

/** Melaka centroid (DESIGN.md §1 + MELAKA-FACTS.md §1). */
export const MLK_CENTER: [number, number] = [2.193, 102.4247];
export const MLK_DEFAULT_ZOOM = 10;
export const MLK_MIN_ZOOM = 9;
export const MLK_MAX_ZOOM = 16;

/** Boundary stroke styles (DESIGN.md §3 row 1). */
export const STYLES = {
  adm1: {
    color: MLK_ACCENT, // #C77B2C amber state outline
    weight: 4,
    opacity: 0.95,
    fillColor: MLK_ACCENT,
    fillOpacity: 0.04,
  },
  adm2: {
    color: "#F59E0B", // amber district border
    weight: 2,
    opacity: 0.7,
    dashArray: "6 4",
    fillColor: "#F59E0B",
    fillOpacity: 0.02,
  },
  parlimenOutline: (winner: string | undefined) => ({
    color: winner ? partyFill(winner) : "#0EA5E9",
    weight: 2.5,
    opacity: 0.9,
    fillOpacity: 0.04,
  }),
  dunOutline: {
    color: "#64748B",
    weight: 1,
    opacity: 0.55,
    fillOpacity: 0,
  },
  choropleth: (winner: string | undefined) => ({
    color: "#0F172A",
    weight: 1,
    opacity: 0.7,
    fillColor: partyFill(winner),
    fillOpacity: 0.78,
  }),
  dptHeat: {
    color: "#B91C1C",
    weight: 1,
    opacity: 0.85,
  },
  town: {
    color: "#1E40AF",
    fillColor: "#3B82F6",
    weight: 1.5,
    fillOpacity: 0.95,
    radius: 4,
  },
  dunLabel: {
    color: "#DC2626",
    fillColor: "#FCA5A5",
    weight: 1,
    fillOpacity: 0.9,
    radius: 3.5,
  },
  parlimenLabel: {
    color: "#0891B2",
    fillColor: "#67E8F9",
    weight: 1.5,
    fillOpacity: 0.95,
    radius: 6,
  },
  demographics: {
    color: "#9333EA",
    weight: 0.8,
    opacity: 0.65,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Party color helpers (re-export of @/lib/party-colors for layer consumers)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the coalition hex (BN blue / PH red / PN green / OTH grey). */
export function partyFill(winner: string | undefined | null): string {
  if (!winner) return PARTY_COLORS.OTH;
  const c = winner.toUpperCase();
  if (c === "BN") return PARTY_COLORS.BN;
  if (c === "PH") return PARTY_COLORS.PH;
  if (c === "PN") return PARTY_COLORS.PN;
  return PARTY_COLORS.OTH;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Geometry helpers (pure TS — no Leaflet dep so this module is SSR-safe)
// ─────────────────────────────────────────────────────────────────────────────

type LatLng = [number, number];

/** Computes the centroid of a Polygon / MultiPolygon ring list. */
export function polygonCentroid(geometry: { type: string; coordinates: any }): LatLng {
  // Collect all vertices from the outer rings of (Multi)Polygon.
  const verts: LatLng[] = [];
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates as number[][][]) {
      // Skip first = last duplicate.
      for (let i = 0; i < ring.length - 1; i++) {
        verts.push([ring[i][1], ring[i][0]]);
      }
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates as number[][][][]) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          verts.push([ring[i][1], ring[i][0]]);
        }
      }
    }
  }
  if (verts.length === 0) return MLK_CENTER;
  let lat = 0,
    lng = 0;
  for (const [la, lo] of verts) {
    lat += la;
    lng += lo;
  }
  return [lat / verts.length, lng / verts.length];
}

/**
 * Deterministic pseudo-offset for localities lacking their own lat/lng.
 * Anchors a point near the DUN centroid with a small jitter derived from the
 * locality code, so the same input always renders at the same pixel.
 */
export function jitteredOffset(
  base: LatLng,
  seed: string,
  radiusDeg = 0.012
): LatLng {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const r1 = ((h >>> 0) % 1000) / 1000;
  const r2 = (((h >>> 11) ^ (h >>> 23)) % 1000) / 1000;
  const angle = r1 * Math.PI * 2;
  const r = Math.sqrt(r2) * radiusDeg;
  return [base[0] + Math.sin(angle) * r, base[1] + Math.cos(angle) * r];
}

/**
 * Simple grid-based point clustering for localities (>1000 points).
 * Returns a list of cluster centroids with counts + total_voters sums.
 * Pure-function — the Leaflet layer renders circle markers from this.
 */
export interface ClusterPoint {
  lat: number;
  lng: number;
  count: number;
  totalVoters: number;
  /** True if a single point (no merge). */
  single: boolean;
}

export function clusterPoints(
  points: { lat: number; lng: number; totalVoters: number }[],
  gridSizeDeg = 0.008
): ClusterPoint[] {
  const buckets = new Map<string, ClusterPoint>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / gridSizeDeg)}:${Math.floor(p.lng / gridSizeDeg)}`;
    const existing = buckets.get(key);
    if (existing) {
      // Weighted centroid (by voter count so dense localities pull the marker).
      const w = existing.totalVoters;
      const w2 = p.totalVoters;
      const total = w + w2;
      existing.lat = (existing.lat * w + p.lat * w2) / total;
      existing.lng = (existing.lng * w + p.lng * w2) / total;
      existing.totalVoters = total;
      existing.count += 1;
      existing.single = false;
    } else {
      buckets.set(key, {
        lat: p.lat,
        lng: p.lng,
        count: 1,
        totalVoters: p.totalVoters,
        single: true,
      });
    }
  }
  return [...buckets.values()];
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Election lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ElectionsDoc {
  state: string;
  state_code: string;
  source: string;
  evidence_tier: string;
  elections: Array<{
    id: string;
    name: string;
    date: string;
    type: string;
    parliament_results: Array<{
      parliament_code: string;
      parliament_name: string;
      winner: string;
      votes_pct?: number;
      runner_up?: string;
      margin_pct?: number;
    }>;
    dun_results: Array<{
      parliament_code: string;
      dun_code: string;
      dun_name_2018?: string;
      dun_name_2026?: string;
      winner: string;
      renamed?: boolean;
      vote_share?: Record<string, number>;
    }>;
    dun_summary?: Record<string, number>;
    parliament_summary?: Record<string, number>;
  }>;
}

/** Find a DUN result row by parliament code + dun code for an election id. */
export function findDunResult(
  doc: ElectionsDoc | null,
  electionId: "GE14" | "PRN15" | "GE15",
  parliamentCode: string,
  dunCode: string
): ElectionsDoc["elections"][number]["dun_results"][number] | undefined {
  if (!doc) return undefined;
  const e = doc.elections.find((x) => x.id === electionId);
  if (!e) return undefined;
  return e.dun_results.find(
    (r) => r.parliament_code === parliamentCode && r.dun_code === dunCode
  );
}

/** Find a parliament result row by parliament code for an election id. */
export function findParlResult(
  doc: ElectionsDoc | null,
  electionId: "GE14" | "PRN15" | "GE15",
  parliamentCode: string
): ElectionsDoc["elections"][number]["parliament_results"][number] | undefined {
  if (!doc) return undefined;
  const e = doc.elections.find((x) => x.id === electionId);
  if (!e) return undefined;
  return e.parliament_results.find((r) => r.parliament_code === parliamentCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. JSONL parsing helper
// ─────────────────────────────────────────────────────────────────────────────

/** Parses a JSONL string into an array of typed objects (skipping blank lines). */
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

// ─────────────────────────────────────────────────────────────────────────────
// 8. Mobile-detection helper (used for popup suppression)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true below 640px viewport width (DESIGN.md §3 + skill spec). */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}
