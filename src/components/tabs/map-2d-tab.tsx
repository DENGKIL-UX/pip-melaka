"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, MapPin, Layers, ChevronDown, ChevronUp, MousePointer2, RefreshCw, Search, Database, Building2, Users } from "lucide-react";
import { PARTY_COLORS, MLK_ACCENT } from "@/lib/party-colors";
import { MLK_CENTER, MLK_DEFAULT_ZOOM, PARLIAMENTS } from "@/lib/melaka-constants";
import { DUN_SUMMARY, getDunByCode, type DunSummary } from "@/lib/dun-summary";
import { partyLogoUrl, type PartyCode } from "@/lib/party-metadata";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useI18n } from "@/lib/i18n";

// ─── Types ─────────────────────────────────────────────────────────────────

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface ElectionDoc {
  elections: Array<{
    id: string;
    dun_results?: Array<{
      parliament_code: string;
      dun_code: string;
      dun_name?: string;
      winner: string;
      winner_party?: string;
      winner_candidate?: string;
      winner_votes?: number;
      votes_pct?: number;
      margin_pct?: number;
      runner_up?: string;
      runner_up_party?: string;
      runner_up_candidate?: string;
      runner_up_votes?: number;
      vote_share?: Record<string, number>;
    }>;
    parliament_results?: Array<{
      parliament_code: string;
      parliament_name?: string;
      winner: string;
      winner_party?: string;
      winner_candidate?: string;
      winner_votes?: number;
      votes_pct?: number;
      margin_pct?: number;
      runner_up?: string;
      runner_up_party?: string;
      runner_up_candidate?: string;
      runner_up_votes?: number;
    }>;
  }>;
}

interface LayerDef {
  id: string;
  label: string;
  group: "boundary" | "electoral" | "data";
  defaultOn: boolean;
  color: string;
}

const LAYERS: LayerDef[] = [
  { id: "adm1", label: "State outline", group: "boundary", defaultOn: true, color: "#0ea5e9" },
  { id: "adm2", label: "Districts (3)", group: "boundary", defaultOn: true, color: "#7dd3fc" },
  { id: "par", label: "Parlimen (6)", group: "electoral", defaultOn: true, color: "#f59e0b" },
  { id: "dun", label: "DUN (28)", group: "electoral", defaultOn: true, color: "#38bdf8" },
  { id: "choropleth", label: "Winner choropleth", group: "data", defaultOn: true, color: "#0B3D91" },
  { id: "ge15", label: "GE15 parlimen", group: "data", defaultOn: false, color: "#019C2D" },
];

const SCENARIOS = ["PRN15", "GE14", "GE15"] as const;
type Scenario = (typeof SCENARIOS)[number];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract the 2-digit DUN code from a property like "N.01" → "01". */
function extractDunCode(raw: unknown): string {
  const s = String(raw ?? "");
  // Match "N.01", "N01", "01", or "N. 01"
  const m = s.match(/N\.?\s*(\d+)/i);
  return m ? m[1].padStart(2, "0") : s.replace(/\D/g, "");
}

/** Extract the 3-digit parlimen code from a property like "P.134" → "134". */
function extractParlCode(raw: unknown): string {
  const s = String(raw ?? "");
  const m = s.match(/P\.?\s*(\d+)/i);
  return m ? m[1] : s.replace(/\D/g, "");
}

/** Extract a clean DUN name from "N.01 Kuala Linggi" → "Kuala Linggi". */
function extractDunName(raw: unknown): string {
  const s = String(raw ?? "");
  return s.replace(/^N\.?\s*\d+\s*/i, "").trim() || s;
}

/** Get the DUN winner object from the election doc. */
function getDunResult(
  elDoc: ElectionDoc,
  parlCode: string,
  dunCode: string,
  scenario: Scenario,
): ElectionDoc["elections"][0]["dun_results"] extends (infer T)[] | undefined ? T | undefined : never {
  const election = elDoc.elections.find((e) => e.id === scenario);
  return election?.dun_results?.find(
    (r) => r.parliament_code === parlCode && r.dun_code === dunCode,
  ) as any;
}

/** Get the parlimen winner object from the election doc. */
function getParlResult(elDoc: ElectionDoc, parlCode: string, scenario: Scenario) {
  if (scenario === "GE15") {
    const ge15 = elDoc.elections.find((e) => e.id === "GE15");
    return ge15?.parliament_results?.find((r) => r.parliament_code === parlCode);
  }
  // For GE14 / PRN15, derive from DUN winners in that parliament
  const election = elDoc.elections.find((e) => e.id === scenario);
  const dunResults = election?.dun_results?.filter((r) => r.parliament_code === parlCode) ?? [];
  const tally: Record<string, number> = {};
  for (const r of dunResults) {
    tally[r.winner] = (tally[r.winner] ?? 0) + 1;
  }
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (!winner) return undefined;
  return {
    parliament_code: parlCode,
    winner: winner[0],
    seatCount: winner[1],
    totalDun: dunResults.length,
  };
}

/** Coalition color or fallback grey. */
function coalitionColor(coalition: string | null | undefined): string {
  if (!coalition) return "#94A3B8";
  return PARTY_COLORS[coalition as keyof typeof PARTY_COLORS] ?? "#6B7280";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Map2DTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<Record<string, any>>({});
  const [layers, setLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYERS.map((l) => [l.id, l.defaultOn])),
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [scenario, setScenario] = useState<Scenario>("PRN15");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { setSelectedParliament, setSelectedDun } = useDashboardStore();
  const { t } = useI18n();

  // ─── Search logic ──────────────────────────────────────────────────────
  interface SearchResult {
    code: string;
    name: string;
    type: "DUN" | "Parlimen";
    parlCode?: string;
    dunCode?: string;
  }

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search DUNs
    DUN_SUMMARY.forEach((d) => {
      if (
        d.dunName.toLowerCase().includes(q) ||
        d.dunCodeLabel.toLowerCase().includes(q) ||
        d.dunCode.includes(q)
      ) {
        results.push({
          code: d.dunCodeLabel,
          name: d.dunName,
          type: "DUN",
          parlCode: d.parliamentCode,
          dunCode: d.dunCode,
        });
      }
    });

    // Search Parliaments
    PARLIAMENTS.forEach((p) => {
      if (
        p.name.toLowerCase().includes(q) ||
        p.code.includes(q) ||
        `p${p.code}`.includes(q)
      ) {
        results.push({
          code: `P${p.code}`,
          name: p.name,
          type: "Parlimen",
          parlCode: p.code,
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.parlCode) {
      setSelectedParliament(result.parlCode);
      if (result.dunCode) {
        setSelectedDun({ parliament: result.parlCode, dun: result.dunCode, name: result.name });
      }
      // Fly to the DUN/parlimen on the map
      const map = mapRef.current;
      if (map) {
        const dunLayer = layerRefs.current.dun;
        if (dunLayer && result.dunCode) {
          dunLayer.eachLayer((lyr: any) => {
            const code = extractDunCode(lyr.feature?.properties?.code_dun);
            if (code === result.dunCode) {
              map.fitBounds(lyr.getBounds(), { padding: [40, 40], maxZoom: 14 });
              lyr.openTooltip();
            }
          });
        }
      }
    }
    setSearchQuery("");
  }, [setSelectedParliament, setSelectedDun]);

  // Ref to hold the latest scenario so tooltip closures always read the current value
  // (fixes critical bug: tooltips showed stale scenario data after switching PRN15→GE14)
  const scenarioRef = useRef<Scenario>(scenario);
  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  // Stable callback for applying layer visibility
  const applyLayerVisibility = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const layer of LAYERS) {
      const ref = layerRefs.current[layer.id];
      if (!ref) continue;
      const isOnMap = !!ref._map;
      const wantOn = layers[layer.id];
      if (wantOn && !isOnMap) ref.addTo(map);
      else if (!wantOn && isOnMap) map.removeLayer(ref);
    }
  }, [layers]);

  // ─── Initialize Leaflet map (runs once) ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (cancelled || !containerRef.current) return;

        // Dynamic import of Leaflet — with retry to handle transient ChunkLoadError
        // (dev server may briefly OOM during on-demand chunk compilation)
        let L: any;
        let leafletAttempts = 0;
        for (;;) {
          leafletAttempts++;
          try {
            const Lmod = await import("leaflet");
            L = (Lmod as any).default ?? Lmod;
            // @ts-ignore — CSS import for Leaflet (no type declarations)
            await import("leaflet/dist/leaflet.css");
            break;
          } catch (chunkErr: any) {
            if (leafletAttempts >= 5) throw chunkErr;
            // Wait 2s before retrying — the dev server may have briefly OOM'd
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        if (cancelled || !containerRef.current) return;

        // Guard: if map already initialized on this container, Leaflet throws
        if ((containerRef.current as any)._leaflet_id) {
          (containerRef.current as any)._leaflet_id = null;
        }

        const map = L.map(containerRef.current, {
          center: MLK_CENTER,
          zoom: MLK_DEFAULT_ZOOM,
          zoomControl: false,
          // Use SVG renderer (default) instead of Canvas for better hover interactivity:
          // - Per-path CSS :hover styles work (highlight on hover)
          // - Sticky tooltips are smoother (no canvas repaint on mousemove)
          // - 37 polygons is negligible for SVG performance
          preferCanvas: false,
          minZoom: 8,
          maxZoom: 17,
        });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control.scale({ position: "bottomleft", metric: true, imperial: false }).addTo(map);
        mapRef.current = map;

        // Tile layer (CARTO Voyager — better contrast for boundaries)
        // §10.4: Tile caching via crossOrigin + browser HTTP cache headers
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          subdomains: "abcd",
          maxZoom: 19,
          crossOrigin: true,           // Enable CORS for tile caching
          keepBuffer: 4,               // Keep 4 tile rows/cols outside viewport for smooth panning
          updateWhenZooming: false,    // Don't update tiles during zoom animation (reduces requests)
          maxNativeZoom: 18,           // Don't request tiles above zoom 18 (use scaled tiles)
        }).addTo(map);

        // Fetch GeoJSON + elections data in parallel
        const [adm1Res, adm2Res, dunRes, parRes, elRes] = await Promise.all([
          fetch("/data/boundaries/mlk-adm1-geo.json"),
          fetch("/data/boundaries/mlk-adm2-geo.json"),
          fetch("/data/boundaries/mlk-dun-geo.json"),
          fetch("/data/boundaries/mlk-parlimen-geo.json"),
          fetch("/data/elections/melaka-elections.json"),
        ]);

        if (!adm1Res.ok || !dunRes.ok || !parRes.ok || !elRes.ok) {
          throw new Error(`Boundary fetch failed: adm1=${adm1Res.status}, dun=${dunRes.status}, par=${parRes.status}, el=${elRes.status}`);
        }

        const adm1Data: GeoJSONCollection = await adm1Res.json();
        const adm2Data: GeoJSONCollection = await adm2Res.json();
        const dunData: GeoJSONCollection = await dunRes.json();
        const parData: GeoJSONCollection = await parRes.json();
        const elDoc: ElectionDoc = await elRes.json();

        // Store on map instance for later access
        (map as any)._elections = elDoc;
        (map as any)._dunData = dunData;
        (map as any)._parData = parData;

        // ─── ADM1 — state outline ──────────────────────────────────────────
        const adm1Layer = L.geoJSON(adm1Data as any, {
          style: { color: "#0ea5e9", weight: 4, fillOpacity: 0.02, dashArray: "8,6" },
          onEachFeature: (_feat, lyr) => {
            lyr.bindTooltip(
              `<div style="font-size:13px;font-weight:600;color:#0ea5e9">Melaka (State)</div>
               <div style="font-size:10px;color:#64748b">ADM1 · State outline · 6 parlimen · 28 DUN</div>`,
              { sticky: true, className: "mlk-map-tooltip" },
            );
          },
        });
        layerRefs.current.adm1 = adm1Layer;

        // ─── ADM2 — districts (3) ──────────────────────────────────────────
        const adm2Layer = L.geoJSON(adm2Data as any, {
          style: { color: "#7dd3fc", weight: 2.5, fillOpacity: 0.04, dashArray: "4,4" },
          onEachFeature: (feat, lyr) => {
            const name = String(feat.properties?.name ?? "District");
            const dunCount = feat.properties?.dun_count ?? "?";
            lyr.bindTooltip(
              `<div style="font-size:12px;font-weight:600;color:#0284c7">${name} District</div>
               <div style="font-size:10px;color:#64748b">ADM2 · ${dunCount} DUN seats</div>`,
              { sticky: true, className: "mlk-map-tooltip" },
            );
          },
        });
        layerRefs.current.adm2 = adm2Layer;

        // ─── Parlimen (6) ──────────────────────────────────────────────────
        const buildParlTooltip = (feat: GeoJSONFeature, scen: Scenario): string => {
          const parlCode = extractParlCode(feat.properties?.code_parlimen);
          const parlName = String(feat.properties?.parlimen ?? "").replace(/^P\.\d+\s*/, "");
          const ge15 = elDoc.elections.find((e) => e.id === "GE15");
          const ge14 = elDoc.elections.find((e) => e.id === "GE14");
          const ge15r = ge15?.parliament_results?.find((r) => r.parliament_code === parlCode);
          const ge14r = getParlResult(elDoc, parlCode, "GE14");

          const row = (label: string, r?: any) => {
            if (!r) return `<div style="font-size:10px;color:#94a3b8">${label}: —</div>`;
            const c = coalitionColor(r.winner);
            const party = r.winner_party ? ` <span style="color:#475569">(${r.winner_party})</span>` : "";
            const cand = r.winner_candidate ? `<div style="font-size:9px;color:#64748b">${r.winner_candidate}</div>` : "";
            const pct = r.votes_pct != null ? ` · ${r.votes_pct.toFixed(1)}%` : "";
            return `<div style="font-size:10px"><span style="color:${c};font-weight:600">${label}: ${r.winner}${party}${pct}</span></div>${cand}`;
          };

          return `<div style="font-size:12px;min-width:180px">
            <div style="font-weight:700;color:${MLK_ACCENT}">P${parlCode} · ${parlName}</div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:4px">Parliamentary constituency</div>
            ${row("GE15", ge15r)}
            ${row("GE14", ge14r)}
          </div>`;
        };

        const parLayer = L.geoJSON(parData as any, {
          style: { color: "#f59e0b", weight: 3, fillOpacity: 0.05, className: "mlk-parl-path" },
          onEachFeature: (feat, lyr) => {
            lyr.bindTooltip(() => buildParlTooltip(feat as GeoJSONFeature, scenarioRef.current), {
              sticky: true,
              className: "mlk-map-tooltip",
            });
            lyr.on("click", () => {
              const code = extractParlCode(feat.properties?.code_parlimen);
              setSelectedParliament(code);
            });
            lyr.on("mouseover", () => {
              const code = extractParlCode(feat.properties?.code_parlimen);
              setHovered(`P${code}`);
            });
            lyr.on("mouseout", () => setHovered(null));
          },
        });
        layerRefs.current.par = parLayer;

        // ─── DUN (28) with choropleth ──────────────────────────────────────
        const buildDunTooltip = (feat: GeoJSONFeature, scen: Scenario): string => {
          const code = extractDunCode(feat.properties?.code_dun);
          const parlCode = extractParlCode(feat.properties?.code_parlimen);
          const name = extractDunName(feat.properties?.dun);
          const parlName = String(feat.properties?.parlimen ?? "").replace(/^P\.\d+\s*/, "");

          // Use DUN_SUMMARY for PRN15 (richer data with candidate + votes)
          const dunSum = getDunByCode(code);
          const prn15r = dunSum?.prn15;
          const ge14r = dunSum?.ge14;

          // GE15 — no DUN election, show parliament winner
          const ge15 = elDoc.elections.find((e) => e.id === "GE15");
          const ge15Parl = ge15?.parliament_results?.find((r) => r.parliament_code === parlCode);

          const winnerRow = (label: string, winner?: string, party?: string, cand?: string, votes?: number, pct?: number, margin?: number) => {
            if (!winner) return `<div style="font-size:10px;color:#94a3b8">${label}: —</div>`;
            const c = coalitionColor(winner);
            const partyStr = party ? ` <span style="color:#475569">(${party})</span>` : "";
            const logoStr = party ? `<img src="${partyLogoUrl(party as PartyCode)}" style="height:14px;width:14px;object-fit:contain;vertical-align:middle;margin-right:3px;border-radius:2px;background:#fff;padding:1px" onerror="this.style.display='none'" />` : "";
            const candStr = cand ? `<div style="font-size:9px;color:#64748b;padding-left:17px">${cand}</div>` : "";
            const stats = votes != null ? ` · ${votes.toLocaleString()}v` : "";
            const pctStr = pct != null ? ` · ${pct.toFixed(1)}%` : "";
            const marginStr = margin != null ? ` · margin ${margin.toFixed(1)}pp` : "";
            // §5.2.2: Mini vote-share bar
            const barWidth = pct != null ? Math.min(pct, 100) : 0;
            const barStr = pct != null
              ? `<div style="height:3px;width:100%;background:#e2e8f0;border-radius:2px;margin-top:2px;overflow:hidden"><div style="height:100%;width:${barWidth}%;background:${c};border-radius:2px"></div></div>`
              : "";
            return `<div style="font-size:10px;display:flex;align-items:center">${logoStr}<span style="color:${c};font-weight:600">${label}: ${winner}${partyStr}${stats}${pctStr}${marginStr}</span></div>${candStr}${barStr}`;
          };

          if (scen === "GE15") {
            return `<div style="font-size:12px;min-width:200px">
              <div style="font-weight:700;color:${MLK_ACCENT}">N${code} · ${name}</div>
              <div style="font-size:9px;color:#94a3b8;margin-bottom:4px">${parlName} · P${parlCode}</div>
              <div style="font-size:9px;color:#f59e0b;margin-bottom:4px">⚠ GE15 = federal only — no DUN ballot. Showing parliament result.</div>
              ${winnerRow("GE15 Parlimen", ge15Parl?.winner, ge15Parl?.winner_party, ge15Parl?.winner_candidate, ge15Parl?.winner_votes, ge15Parl?.votes_pct, ge15Parl?.margin_pct)}
              ${winnerRow("PRN15 DUN", prn15r?.coalition, prn15r?.party, prn15r?.candidate, prn15r?.votes, prn15r?.votesPct, prn15r?.marginPct)}
              ${winnerRow("GE14 DUN", ge14r?.coalition, ge14r?.party, ge14r?.candidate, ge14r?.votes, ge14r?.votesPct, ge14r?.marginPct)}
            </div>`;
          }

          const current = scen === "PRN15" ? prn15r : ge14r;
          const prev = scen === "PRN15" ? ge14r : prn15r;
          const swing = current && prev && current.coalition !== prev.coalition;

          return `<div style="font-size:12px;min-width:200px">
            <div style="font-weight:700;color:${MLK_ACCENT}">N${code} · ${name}</div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:4px">${parlName} · P${parlCode}</div>
            ${winnerRow(scen, current?.coalition, current?.party, current?.candidate, current?.votes, current?.votesPct, current?.marginPct)}
            ${swing ? `<div style="font-size:9px;color:${MLK_ACCENT};font-weight:600;margin-top:2px">⟳ Swing: ${prev?.coalition} → ${current?.coalition}</div>` : ""}
            <div style="font-size:9px;color:#94a3b8;margin-top:3px;border-top:1px solid #e2e8f0;padding-top:2px">
              ${winnerRow(scen === "PRN15" ? "GE14" : "PRN15", prev?.coalition, prev?.party, prev?.candidate, prev?.votes, prev?.votesPct, prev?.marginPct)}
            </div>
          </div>`;
        };

        const dunLayer = L.geoJSON(dunData as any, {
          style: (feat) => {
            const code = extractDunCode(feat?.properties?.code_dun);
            const dunSum = getDunByCode(code);
            const winner =
              scenarioRef.current === "PRN15" ? dunSum?.prn15.coalition :
              scenarioRef.current === "GE14" ? dunSum?.ge14.coalition :
              null; // GE15 has no DUN
            const color = layers.choropleth ? coalitionColor(winner) : "#38bdf8";
            return {
              color: "#1e293b",
              weight: 1,
              fillColor: color,
              fillOpacity: layers.choropleth ? 0.7 : 0.2,
              className: "mlk-dun-path",
            };
          },
          onEachFeature: (feat, lyr) => {
            lyr.bindTooltip(() => buildDunTooltip(feat as GeoJSONFeature, scenarioRef.current), {
              sticky: true,
              className: "mlk-map-tooltip",
            });
            lyr.on("click", () => {
              const code = extractDunCode(feat.properties?.code_dun);
              const parlCode = extractParlCode(feat.properties?.code_parlimen);
              const name = extractDunName(feat.properties?.dun);
              setSelectedParliament(parlCode);
              setSelectedDun({ parliament: parlCode, dun: code, name });
            });
            lyr.on("mouseover", () => {
              const code = extractDunCode(feat.properties?.code_dun);
              const parlCode = extractParlCode(feat.properties?.code_parlimen);
              setHovered(`${parlCode}-${code}`);
            });
            lyr.on("mouseout", () => setHovered(null));
          },
        });
        layerRefs.current.dun = dunLayer;
        layerRefs.current.choropleth = dunLayer; // same layer, choropleth is a style toggle

        // ─── GE15 parlimen layer (separate overlay) ───────────────────────
        const ge15Layer = L.geoJSON(parData as any, {
          style: (feat) => {
            const parlCode = extractParlCode(feat?.properties?.code_parlimen);
            const ge15 = elDoc.elections.find((e) => e.id === "GE15");
            const r = ge15?.parliament_results?.find((rr) => rr.parliament_code === parlCode);
            return {
              color: "#1e293b",
              weight: 2.5,
              fillColor: coalitionColor(r?.winner),
              fillOpacity: 0.6,
            };
          },
          onEachFeature: (feat, lyr) => {
            const parlCode = extractParlCode(feat.properties?.code_parlimen);
            const ge15 = elDoc.elections.find((e) => e.id === "GE15");
            const r = ge15?.parliament_results?.find((rr) => rr.parliament_code === parlCode);
            const parlName = String(feat.properties?.parlimen ?? "").replace(/^P\.\d+\s*/, "");
            lyr.bindTooltip(
              `<div style="font-size:12px;min-width:180px">
                <div style="font-weight:700;color:${MLK_ACCENT}">P${parlCode} · ${parlName}</div>
                <div style="font-size:9px;color:#94a3b8;margin-bottom:4px">GE15 Parlimen result</div>
                <div style="font-size:10px"><span style="color:${coalitionColor(r?.winner)};font-weight:600">Winner: ${r?.winner ?? "?"}</span> <span style="color:#475569">(${r?.winner_party ?? "?"})</span></div>
                <div style="font-size:9px;color:#64748b">${r?.winner_candidate ?? "—"}</div>
                <div style="font-size:9px;color:#64748b">${r?.winner_votes?.toLocaleString() ?? "—"} votes · ${r?.votes_pct?.toFixed(1) ?? "—"}%</div>
                ${r?.margin_pct != null ? `<div style="font-size:9px;color:#64748b">Margin: ${r.margin_pct.toFixed(1)}pp</div>` : ""}
              </div>`,
              { sticky: true, className: "mlk-map-tooltip" },
            );
          },
        });
        layerRefs.current.ge15 = ge15Layer;

        // Fit bounds to Melaka
        const bounds = dunLayer.getBounds();
        map.fitBounds(bounds, { padding: [20, 20] });

        // Apply initial layer visibility
        applyLayerVisibility();

        setLoading(false);
      } catch (e: any) {
        console.error("[Map2DTab] init error:", e);
        setLoadError(e?.message ?? String(e));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Re-apply when layers change
  useEffect(() => {
    applyLayerVisibility();
  }, [applyLayerVisibility]);

  // Update DUN choropleth colors when scenario or choropleth toggle changes.
  // Tooltips read scenarioRef.current (always up-to-date), so no re-bind needed here.
  useEffect(() => {
    const dunLayer = layerRefs.current.dun;
    if (!dunLayer) return;

    dunLayer.setStyle((feat: GeoJSONFeature) => {
      const code = extractDunCode(feat.properties?.code_dun);
      const dunSum = getDunByCode(code);
      const winner =
        scenario === "PRN15" ? dunSum?.prn15.coalition :
        scenario === "GE14" ? dunSum?.ge14.coalition :
        null;
      const color = layers.choropleth ? coalitionColor(winner) : "#38bdf8";
      return {
        fillColor: color,
        fillOpacity: layers.choropleth ? 0.7 : 0.2,
      };
    });

    // Also update the GE15 parlimen layer if it exists
    const ge15Layer = layerRefs.current.ge15;
    if (ge15Layer && layers.ge15) {
      ge15Layer.bringToFront();
    }
  }, [scenario, layers.choropleth]);

  const toggle = (id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCount = Object.values(layers).filter(Boolean).length;

  // Seat counts for current scenario — computed from DUN_SUMMARY (PRN15/GE14)
  // or from melaka-elections.json parliament_summary (GE15, since GE15 is federal-only)
  const seatCounts = useMemo(() => {
    const counts: Record<string, number> = { BN: 0, PH: 0, PN: 0 };
    if (scenario === "PRN15") {
      DUN_SUMMARY.forEach((d) => { counts[d.prn15.coalition]++; });
    } else if (scenario === "GE14") {
      DUN_SUMMARY.forEach((d) => { counts[d.ge14.coalition]++; });
    } else if (scenario === "GE15") {
      // GE15 is parlimen-level — derive from the 6 parliament results in DUN_SUMMARY
      // (each parliament's ge15Winner field, set from melaka-elections.json)
      PARLIAMENTS.forEach((p) => {
        const winner = p.ge15Winner;
        if (winner && winner in counts) counts[winner]++;
      });
    }
    return counts;
  }, [scenario]);

  // Hovered DUN/parlimen info for the bottom hover bar
  const hoveredInfo = useMemo(() => {
    if (!hovered) return null;
    if (hovered.startsWith("P") && !hovered.includes("-")) {
      // Parliament hover
      const code = hovered.slice(1);
      const parl = PARLIAMENTS.find((p) => p.code === code);
      return parl ? { type: "parlimen", code: `P${code}`, name: parl.name, district: parl.district } : null;
    }
    const [parlCode, dunCode] = hovered.split("-");
    const dun = getDunByCode(dunCode);
    return dun
      ? { type: "dun", code: `N${dunCode}`, name: dun.dunName, district: dun.district, parliament: dun.parliamentName }
      : null;
  }, [hovered]);

  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    // Force a full remount by toggling the key in the parent — simplest: reload
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <Card className="border-mlk/20" role="region" aria-label="2D Map module — Leaflet with real Melaka GeoJSON">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">2D Map — Leaflet ({scenario})</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real DOSM kawasanku GeoJSON · 28 DUN + 6 parlimen + 3 districts · Hover for election results
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {SCENARIOS.map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  scenario === s ? "bg-mlk text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend + Search */}
        <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
          <span className="text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" /> {t("map.legendTitle")}:</span>
          {Object.entries(PARTY_COLORS).map(([code, color]) => (
            <span key={code} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {code}
            </span>
          ))}
          {/* Search input */}
          <div className="relative ml-auto">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder={t("map.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-md border border-border/60 bg-card pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-mlk/40 focus:ring-1 focus:ring-mlk/20 transition-colors"
              aria-label={t("map.searchPlaceholder")}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-10 right-0 z-[1001] w-64 rounded-lg border border-mlk/20 bg-card shadow-lg overflow-hidden max-h-64 overflow-y-auto scrollbar-mlk">
                {searchResults.map((r) => (
                  <button
                    key={`${r.type}-${r.code}`}
                    onClick={() => handleSearchSelect(r)}
                    className="w-full text-left px-3 py-2 hover:bg-mlk/5 transition-colors border-b border-border/40 last:border-0 flex items-center gap-2"
                  >
                    <MapPin className="w-3 h-3 text-mlk flex-shrink-0" />
                    <span className="font-mono text-[10px] text-mlk font-bold">{r.code}</span>
                    <span className="text-xs font-medium truncate">{r.name}</span>
                    <Badge variant="outline" className="text-[8px] ml-auto">{r.type}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-muted-foreground flex items-center gap-1">
            <MousePointer2 className="h-3 w-3" /> {t("map.hoverResults")}
          </span>
        </div>

        {/* Map container */}
        <div className="relative rounded-lg border border-border overflow-hidden" style={{ height: 540 }}>
          <div ref={containerRef} className="w-full h-full" style={{ background: "#e5e7eb" }} />

          {/* Map statistics overlay — top-center floating pill */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="glass rounded-full px-5 py-2 flex items-center gap-4 text-xs shadow-lg">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-mlk" />
                <span className="font-medium">6 {t("map.statsParliaments")}</span>
              </span>
              <span className="w-px h-3 bg-border/40" />
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-mlk" />
                <span className="font-medium">28 {t("map.statsDun")}</span>
              </span>
              <span className="w-px h-3 bg-border/40" />
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-mlk" />
                <span className="font-medium">71,415 {t("map.statsVoters")}</span>
              </span>
              <span className="w-px h-3 bg-border/40" />
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-mlk" />
                <span className="font-medium text-mlk">{scenario}</span>
              </span>
            </div>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm z-[500]">
              <div className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm shadow-md">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-mlk border-t-transparent" />
                <span>{t("loading.map2d")}</span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {loadError && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm z-[500] p-4">
              <div className="rounded-lg bg-card border border-red-500/30 p-4 text-sm shadow-lg max-w-md">
                <div className="font-semibold text-red-600 dark:text-red-400 mb-1">Map failed to load</div>
                <div className="text-xs text-muted-foreground mb-3 font-mono break-all">{loadError}</div>
                <Button size="sm" onClick={handleRetry} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 me-1" /> Reload page
                </Button>
              </div>
            </div>
          )}

          {/* Layer control panel — top-right */}
          <div className="absolute right-3 top-3 z-[1000] w-64">
            <div className="rounded-lg border border-mlk/30 bg-card/95 shadow-lg backdrop-blur overflow-hidden">
              <div className="flex items-center justify-between p-2.5 border-b border-border">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-mlk" />
                  Map Layers
                  <Badge variant="outline" className="text-[9px] ml-1">{activeCount}/{LAYERS.length}</Badge>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setPanelOpen((p) => !p)}
                  aria-label={panelOpen ? "Collapse" : "Expand"}
                >
                  {panelOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {panelOpen && (
                <div className="p-2 space-y-1">
                  {LAYERS.map((layer) => (
                    <label
                      key={layer.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={layers[layer.id]}
                        onChange={() => toggle(layer.id)}
                        className="rounded"
                      />
                      <span
                        className="w-3 h-3 rounded-sm border border-black/20"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-xs flex-1">{layer.label}</span>
                      <Badge variant="outline" className="text-[8px]">{layer.group}</Badge>
                    </label>
                  ))}
                  <div className="mt-2 pt-2 border-t border-border text-[9px] text-muted-foreground">
                    Tip: toggle <strong className="text-mlk">Winner choropleth</strong> to color DUN by coalition
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seat summary — bottom-left */}
          <div className="absolute bottom-3 left-3 z-[1000]">
            <div className="rounded-lg border border-mlk/30 bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">{scenario} {scenario === "GE15" ? "parlimen" : "DUN"} seats</div>
              <div className="flex gap-3">
                {Object.entries(seatCounts).map(([party, count]) => (
                  <div key={party} className="text-center">
                    <div className="text-lg font-bold" style={{ color: coalitionColor(party) }}>{count}</div>
                    <div className="text-[9px] text-muted-foreground">{party}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glass map legend — bottom-right */}
          <div className="absolute bottom-3 right-3 z-[1000]">
            <div className="glass rounded-lg p-3 text-xs shadow-lg min-w-[120px]">
              <div className="font-semibold mb-2 text-foreground">{scenario} Winner</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: PARTY_COLORS.BN }} />
                  <span>BN</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: PARTY_COLORS.PH }} />
                  <span>PH</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: PARTY_COLORS.PN }} />
                  <span>PN</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#6B7280_2px,#6B7280_4px)]" />
                  <span>{t("map.legendNoData")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hover info bar */}
        <div className="mt-2 min-h-[28px] flex items-center">
          {hoveredInfo ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[9px] font-mono">
                {hoveredInfo.type === "dun" ? hoveredInfo.code : hoveredInfo.code}
              </Badge>
              <span className="font-medium text-foreground">{hoveredInfo.name}</span>
              <span className="text-muted-foreground">·</span>
              <span>{hoveredInfo.district}</span>
              {hoveredInfo.type === "dun" && hoveredInfo.parliament && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{hoveredInfo.parliament}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/60">
              {t("map.hoverResults")}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-2 text-center">
          Leaflet 1.9 + CARTO Voyager tiles · DOSM kawasanku GeoJSON (28 DUN + 6 parlimen + 3 districts) ·
          {scenario === "GE15" ? " GE15 parlimen choropleth" : ` ${scenario} DUN choropleth`} · 6 toggleable layers
        </p>
      </CardContent>
    </Card>
  );
}
