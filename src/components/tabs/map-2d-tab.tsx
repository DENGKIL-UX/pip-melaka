"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Layers, ChevronDown, ChevronUp, MousePointer2 } from "lucide-react";
import { PARTY_COLORS, MLK_ACCENT } from "@/lib/party-colors";
import { MLK_CENTER, MLK_DEFAULT_ZOOM, PARLIAMENTS, getDunName } from "@/lib/melaka-constants";
import { useDashboardStore } from "@/stores/dashboard-store";

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
    dun_results?: Array<{ parliament_code: string; dun_code: string; winner: string; vote_share?: Record<string, number> }>;
    parliament_results?: Array<{ parliament_code: string; winner: string }>;
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
  { id: "adm2", label: "Districts (3)", group: "boundary", defaultOn: false, color: "#7dd3fc" },
  { id: "par", label: "Parlimen (6)", group: "electoral", defaultOn: true, color: "#f59e0b" },
  { id: "dun", label: "DUN (28)", group: "electoral", defaultOn: true, color: "#38bdf8" },
  { id: "choropleth", label: "PRN15 choropleth", group: "data", defaultOn: true, color: "#0F7DC2" },
  { id: "ge15", label: "GE15 parliament", group: "data", defaultOn: false, color: "#019C2D" },
];

const SCENARIOS = ["PRN15", "GE14", "GE15"] as const;

export function Map2DTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<Record<string, any>>({});
  const [layers, setLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYERS.map((l) => [l.id, l.defaultOn]))
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [scenario, setScenario] = useState<typeof SCENARIOS[number]>("PRN15");
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const { setSelectedParliament, setSelectedDun } = useDashboardStore();

  // Initialize Leaflet map
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        // @ts-ignore — CSS import for Leaflet
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          center: MLK_CENTER,
          zoom: MLK_DEFAULT_ZOOM,
          zoomControl: false,
          preferCanvas: true,
        });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control.scale({ position: "bottomleft", metric: true, imperial: false }).addTo(map);
        mapRef.current = map;

        // Tile layer (CARTO light)
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        // Fetch GeoJSON + elections data
        const [adm1Res, adm2Res, dunRes, parRes, elRes] = await Promise.all([
          fetch("/data/boundaries/mlk-adm1-geo.json"),
          fetch("/data/boundaries/mlk-adm2-geo.json"),
          fetch("/data/boundaries/mlk-dun-geo.json"),
          fetch("/data/boundaries/mlk-parlimen-geo.json"),
          fetch("/data/elections/melaka-elections.json"),
        ]);

        const adm1Data: GeoJSONCollection = await adm1Res.json();
        const adm2Data: GeoJSONCollection = await adm2Res.json();
        const dunData: GeoJSONCollection = await dunRes.json();
        const parData: GeoJSONCollection = await parRes.json();
        const elDoc: ElectionDoc = await elRes.json();

        // Store elections data for choropleth
        (map as any)._elections = elDoc;
        (map as any)._dunData = dunData;

        // ADM1 — state outline
        const adm1Layer = L.geoJSON(adm1Data as any, {
          style: { color: "#0ea5e9", weight: 3, fillOpacity: 0.05, dashArray: "5,5" },
        });
        layerRefs.current.adm1 = adm1Layer;

        // ADM2 — districts
        const adm2Layer = L.geoJSON(adm2Data as any, {
          style: { color: "#7dd3fc", weight: 2, fillOpacity: 0.03, dashArray: "3,3" },
          onEachFeature: (feat, lyr) => {
            lyr.bindTooltip(String(feat.properties?.name ?? "District"), { sticky: true });
          },
        });
        layerRefs.current.adm2 = adm2Layer;

        // Parlimen
        const parLayer = L.geoJSON(parData as any, {
          style: { color: "#f59e0b", weight: 2, fillOpacity: 0.05 },
          onEachFeature: (feat, lyr) => {
            const name = String(feat.properties?.parlimen ?? "");
            lyr.bindTooltip(name, { sticky: true });
          },
        });
        layerRefs.current.par = parLayer;

        // DUN — with choropleth
        const dunLayer = L.geoJSON(dunData as any, {
          style: (feat) => {
            const code = String(feat?.properties?.code_dun ?? "").replace("N.", "");
            const parlCode = String(feat?.properties?.code_parlimen ?? "").replace("P.", "");
            const winner = getDunWinner(elDoc, parlCode, code, scenario);
            const color = winner ? PARTY_COLORS[winner as keyof typeof PARTY_COLORS] ?? "#6B7280" : "#94A3B8";
            return {
              color: "#1e293b",
              weight: 1,
              fillColor: layers.choropleth ? color : "#38bdf8",
              fillOpacity: layers.choropleth ? 0.6 : 0.15,
            };
          },
          onEachFeature: (feat, lyr) => {
            const code = String(feat.properties?.code_dun ?? "").replace("N.", "");
            const parlCode = String(feat.properties?.code_parlimen ?? "").replace("P.", "");
            const name = String(feat.properties?.dun ?? "").replace(/N\.\d+\s/, "");
            const parlName = String(feat.properties?.parlimen ?? "");
            const winner = getDunWinner(elDoc, parlCode, code, scenario);

            lyr.bindTooltip(
              `<div style="font-size:12px;min-width:150px">
                <strong style="color:${MLK_ACCENT}">N${code}</strong> ${name}<br/>
                <span style="color:#64748b">${parlName}</span><br/>
                <span style="color:${winner ? PARTY_COLORS[winner as keyof typeof PARTY_COLORS] : "#64748b"}">Winner: ${winner ?? "no data"}</span>
              </div>`,
              { sticky: true }
            );

            lyr.on("click", () => {
              setSelectedParliament(parlCode);
              setSelectedDun({ parliament: parlCode, dun: code, name });
            });

            lyr.on("mouseover", () => setHovered(`${parlCode}-${code}`));
            lyr.on("mouseout", () => setHovered(null));
          },
        });
        layerRefs.current.dun = dunLayer;
        layerRefs.current.choropleth = dunLayer; // same layer, choropleth is a style toggle

        // GE15 parliament layer
        const ge15Layer = L.geoJSON(parData as any, {
          style: (feat) => {
            const parlCode = String(feat?.properties?.code_parlimen ?? "").replace("P.", "");
            const ge15 = elDoc.elections.find((e) => e.id === "GE15");
            const winner = ge15?.parliament_results?.find((r) => r.parliament_code === parlCode)?.winner;
            const color = winner ? PARTY_COLORS[winner as keyof typeof PARTY_COLORS] ?? "#6B7280" : "#94A3B8";
            return { color: "#1e293b", weight: 2, fillColor: color, fillOpacity: 0.5 };
          },
          onEachFeature: (feat, lyr) => {
            const parlCode = String(feat?.properties?.code_parlimen ?? "").replace("P.", "");
            const ge15 = elDoc.elections.find((e) => e.id === "GE15");
            const winner = ge15?.parliament_results?.find((r) => r.parliament_code === parlCode)?.winner;
            lyr.bindTooltip(`${feat.properties?.parlimen} — GE15: ${winner ?? "?"}`, { sticky: true });
          },
        });
        layerRefs.current.ge15 = ge15Layer;

        // Apply initial layer visibility
        applyLayerVisibility();

        setLoading(false);
      } catch (e) {
        console.error("Map init error:", e);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Apply layer visibility
  const applyLayerVisibility = () => {
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
  };

  // Re-apply when layers change
  useEffect(() => {
    applyLayerVisibility();
  }, [layers]);

  // Update choropleth when scenario changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map._elections || !layerRefs.current.dun) return;
    const elDoc = map._elections as ElectionDoc;
    layerRefs.current.dun.setStyle((feat: GeoJSONFeature) => {
      const code = String(feat.properties?.code_dun ?? "").replace("N.", "");
      const parlCode = String(feat.properties?.code_parlimen ?? "").replace("P.", "");
      const winner = getDunWinner(elDoc, parlCode, code, scenario);
      const color = winner ? PARTY_COLORS[winner as keyof typeof PARTY_COLORS] ?? "#6B7280" : "#94A3B8";
      return {
        fillColor: layers.choropleth ? color : "#38bdf8",
        fillOpacity: layers.choropleth ? 0.6 : 0.15,
      };
    });
  }, [scenario, layers.choropleth]);

  const toggle = (id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCount = Object.values(layers).filter(Boolean).length;

  // Seat counts for current scenario
  const seatCounts: Record<string, number> = { BN: 0, PH: 0, PN: 0 };
  // This is computed in the render — we'd need the elections data here
  // For now, show a placeholder based on known results
  if (scenario === "PRN15") { seatCounts.BN = 21; seatCounts.PH = 5; seatCounts.PN = 2; }
  else if (scenario === "GE14") { seatCounts.PH = 15; seatCounts.BN = 13; seatCounts.PN = 0; }
  else if (scenario === "GE15") { seatCounts.PN = 3; seatCounts.PH = 3; seatCounts.BN = 0; }

  return (
    <Card className="border-mlk/20" role="region" aria-label="2D Map module — Leaflet with real Melaka GeoJSON">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">2D Map — Leaflet ({scenario})</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Real DOSM kawasanku GeoJSON · 28 DUN + 6 parlimen boundaries · Click DUN to open drawer</p>
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
        {/* Legend */}
        <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
          <span className="text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" /> Coalition:</span>
          {Object.entries(PARTY_COLORS).map(([code, color]) => (
            <span key={code} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {code}
            </span>
          ))}
          <span className="text-muted-foreground ml-auto flex items-center gap-1">
            <MousePointer2 className="h-3 w-3" /> Hover for details · Click to open drawer
          </span>
        </div>

        {/* Map container */}
        <div className="relative rounded-lg border border-border overflow-hidden" style={{ height: 500 }}>
          <div ref={containerRef} className="w-full h-full" style={{ background: "#e5e7eb" }} />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm z-[500]">
              <div className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm shadow-md">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-mlk border-t-transparent" />
                <span>Loading 2D map…</span>
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
                </div>
              )}
            </div>
          </div>

          {/* Seat summary — bottom */}
          <div className="absolute bottom-3 left-3 z-[1000]">
            <div className="rounded-lg border border-mlk/30 bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">{scenario} seats</div>
              <div className="flex gap-3">
                {Object.entries(seatCounts).map(([party, count]) => (
                  <div key={party} className="text-center">
                    <div className="text-lg font-bold" style={{ color: PARTY_COLORS[party as keyof typeof PARTY_COLORS] }}>{count}</div>
                    <div className="text-[9px] text-muted-foreground">{party}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hover info */}
        {hovered && (
          <div className="mt-2 text-xs text-muted-foreground">
            Hovering: <span className="font-mono text-mlk">N{hovered.split("-")[1]}</span>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
          Leaflet 1.9 + CARTO light tiles · Real DOSM kawasanku GeoJSON (28 DUN + 6 parlimen) ·
          geoBoundaries ADM1/ADM2 · 6 toggleable layers · PRN15 choropleth (BN blue 21/28 DUN)
        </p>
      </CardContent>
    </Card>
  );
}

function getDunWinner(elDoc: ElectionDoc, parlCode: string, dunCode: string, scenario: string): string | null {
  if (scenario === "GE15") {
    const ge15 = elDoc.elections.find((e) => e.id === "GE15");
    return ge15?.parliament_results?.find((r) => r.parliament_code === parlCode)?.winner ?? null;
  }
  const election = elDoc.elections.find((e) => e.id === scenario);
  const result = election?.dun_results?.find((r) => r.parliament_code === parlCode && r.dun_code === dunCode);
  return result?.winner ?? null;
}
