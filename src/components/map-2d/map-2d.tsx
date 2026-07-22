"use client";

// ponytail: MLK — 2D Leaflet map module for PIP-MLK.
// Implements WORKLOAD.md Phase 2 (13 layers; PRN15 choropleth = headline).
// DESIGN.md §3 row 1 + §5.7 (redelineation tooltips on N03/N04/N05).
//
// SSR-safety: Leaflet touches `window` at import time. We `await import("leaflet")`
// inside useEffect so the module is only evaluated client-side. CSS is imported
// statically (Next.js extracts CSS at build time — no runtime side-effects).
//
// Mobile: popups suppressed <640px (drawer takes over). Canvas renderer for the
// data-heavy layers (DPT heatmap, demographics overlay, town labels).
// Click on any DUN → useDashboardStore.setSelectedDun → drawer opens.

import * as React from "react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Layers as LayersIcon, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { redelineationTooltip, redelineationShortLabel } from "@/lib/dun-redelineation-map";
import { PARTY_COLORS, MLK_ACCENT } from "@/lib/party-colors";
import {
  LAYERS,
  LAYER_GROUPS,
  DEFAULT_LAYER_STATE,
  DATA_URLS,
  MLK_CENTER,
  MLK_DEFAULT_ZOOM,
  MLK_MIN_ZOOM,
  MLK_MAX_ZOOM,
  STYLES,
  partyFill,
  polygonCentroid,
  jitteredOffset,
  clusterPoints,
  parseJsonl,
  isMobileViewport,
  findDunResult,
  type LayerId,
  type ElectionsDoc,
} from "./layers";

// ─────────────────────────────────────────────────────────────────────────────
// Public component — renders the map container + layer control panel
// ─────────────────────────────────────────────────────────────────────────────

export interface Map2DProps {
  className?: string;
}

export function Map2D({ className }: Map2DProps) {
  const [visible, setVisible] = React.useState<Record<LayerId, boolean>>({
    ...DEFAULT_LAYER_STATE,
  });
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // Module-level map state (kept in refs so re-renders don't trigger Leaflet).
  const mapRef = React.useRef<any>(null);
  const layerRefs = React.useRef<Record<string, any>>({});
  const dataCacheRef = React.useRef<Record<string, unknown>>({});
  const visibleRef = React.useRef(visible);
  visibleRef.current = visible;

  const toggle = React.useCallback((id: LayerId, on: boolean) => {
    setVisible((prev) => {
      const next = { ...prev, [id]: on };
      // Reflect immediately into the ref so the effect doesn't need a render cycle.
      visibleRef.current = next;
      if (mapRef.current) {
        applyLayerVisibility(mapRef.current, layerRefs.current, next);
      }
      return next;
    });
  }, []);

  // ─── Mount: initialise Leaflet + load all data ───────────────────────────
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;

        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const map = L.map(containerRef.current, {
          center: MLK_CENTER,
          zoom: MLK_DEFAULT_ZOOM,
          minZoom: MLK_MIN_ZOOM,
          maxZoom: MLK_MAX_ZOOM,
          zoomControl: true,
          // Canvas renderer for vector-heavy layers (perf).
          preferCanvas: true,
          renderer: L.canvas({ padding: 0.5 }),
          // Honour reduced-motion preference.
          zoomAnimation: !prefersReduced,
          fadeAnimation: !prefersReduced,
          markerZoomAnimation: !prefersReduced,
          inertia: !prefersReduced,
          worldCopyJump: false,
        });
        mapRef.current = map;

        // ── Layer 1: Base OSM (light CARTO basemap, no API key required) ──
        const baseLayer = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
          }
        );
        baseLayer.addTo(map);
        layerRefs.current["base-osm"] = baseLayer;

        // ── Fetch all static data in parallel ──
        const [
          adm1Res,
          adm2Res,
          parlimenRes,
          dunRes,
          townsRes,
          electionsRes,
          dptRes,
          localityP134,
          localityP135,
          localityP136,
          localityP137,
          localityP138,
          localityP139,
        ] = await Promise.all([
          fetch(DATA_URLS.adm1).then((r) => r.json()),
          fetch(DATA_URLS.adm2).then((r) => r.json()),
          fetch(DATA_URLS.parlimen).then((r) => r.json()),
          fetch(DATA_URLS.dun).then((r) => r.json()),
          fetch(DATA_URLS.towns).then((r) => r.json()),
          fetch(DATA_URLS.elections).then((r) => r.json()),
          fetch(DATA_URLS.dptSummary).then((r) => r.json()),
          fetch(DATA_URLS.locality("134")).then((r) => r.text()),
          fetch(DATA_URLS.locality("135")).then((r) => r.text()),
          fetch(DATA_URLS.locality("136")).then((r) => r.text()),
          fetch(DATA_URLS.locality("137")).then((r) => r.text()),
          fetch(DATA_URLS.locality("138")).then((r) => r.text()),
          fetch(DATA_URLS.locality("139")).then((r) => r.text()),
        ]);
        if (cancelled) return;

        const elections = electionsRes as ElectionsDoc;
        dataCacheRef.current = {
          adm1: adm1Res,
          adm2: adm2Res,
          parlimen: parlimenRes,
          dun: dunRes,
          towns: townsRes,
          elections,
          dpt: dptRes,
          localities: [
            ...parseJsonl<any>(localityP134),
            ...parseJsonl<any>(localityP135),
            ...parseJsonl<any>(localityP136),
            ...parseJsonl<any>(localityP137),
            ...parseJsonl<any>(localityP138),
            ...parseJsonl<any>(localityP139),
          ],
        };

        const store = useDashboardStore.getState();

        // ── Layer 2: ADM1 state outline (amber) ──
        const adm1Layer = L.geoJSON(adm1Res, {
          style: () => ({ ...STYLES.adm1 }),
          interactive: false,
        });
        layerRefs.current["adm1-state"] = adm1Layer;

        // ── Layer 3: ADM2 districts (amber dashed) ──
        const adm2Layer = L.geoJSON(adm2Res, {
          style: () => ({ ...STYLES.adm2 }),
          onEachFeature: (feature, lyr) => {
            const name = feature?.properties?.shapeName ?? "District";
            lyr.bindTooltip(
              `<div class="text-xs"><div class="font-semibold">${name}</div><div class="text-muted-foreground">Administrative district</div></div>`,
              { sticky: true, direction: "top" }
            );
          },
        });
        layerRefs.current["adm2-districts"] = adm2Layer;

        // ── Layer 4: Parlimen outlines (colored by GE15 winner) ──
        const parlimenLayer = L.geoJSON(parlimenRes, {
          style: (feature) =>
            STYLES.parlimenOutline(feature?.properties?.ge15_winner),
          onEachFeature: (feature, lyr) => {
            const p = feature?.properties ?? {};
            const winner = p.ge15_winner ?? "—";
            const winner14 = p.ge14_winner ?? "—";
            lyr.bindTooltip(
              `<div class="text-xs min-w-[160px]">
                <div class="font-semibold">P${p.parliament_code} ${p.parliament_name}</div>
                <div>GE15 2022 winner: <span style="color:${partyFill(winner)};font-weight:600">${winner}</span></div>
                <div>GE14 2018 winner: <span style="color:${partyFill(winner14)};font-weight:600">${winner14}</span></div>
                <div class="text-muted-foreground">${p.district} district</div>
              </div>`,
              { sticky: true, direction: "top" }
            );
          },
        });
        layerRefs.current["parlimen-outlines"] = parlimenLayer;

        // ── Layer 5: 28 DUN outlines (neutral) — click → drawer ──
        const dunOutlineLayer = L.geoJSON(dunRes, {
          style: () => ({ ...STYLES.dunOutline }),
          onEachFeature: (feature, lyr) => {
            const p = feature?.properties ?? {};
            const dunCode = `N${String(p.dun_code).padStart(2, "0")}`;
            const parlCode = String(p.parliament_code);
            const name = p.dun_name ?? "";
            const oldName = p.dun_name_2018;

            lyr.bindTooltip(
              buildDunTooltipHtml(dunCode, parlCode, name, oldName, p.renamed_in_2023, elections),
              { sticky: true, direction: "top", className: "pip-mlk-tooltip" }
            );

            lyr.on("click", () => {
              store.setSelectedDun({
                parliament: parlCode,
                dun: dunCode,
                name,
              });
              if (isMobileViewport()) {
                map.closePopup();
              }
            });
            lyr.on("mouseover", () => {
              try {
                (lyr as any).setStyle({ weight: 2, color: MLK_ACCENT, fillOpacity: 0.05 });
              } catch {
                /* noop */
              }
            });
            lyr.on("mouseout", () => {
              try {
                (lyr as any).setStyle({ ...STYLES.dunOutline });
              } catch {
                /* noop */
              }
            });
          },
        });
        layerRefs.current["dun-outlines"] = dunOutlineLayer;

        // ── Layer 6: PRN15 2021 DUN choropleth (headline) ──
        const prn15Layer = L.geoJSON(dunRes, {
          style: (feature) => {
            const p = feature?.properties ?? {};
            const r = findDunResult(elections, "PRN15", String(p.parliament_code), String(p.dun_code));
            return { ...STYLES.choropleth(r?.winner) };
          },
          onEachFeature: (feature, lyr) => {
            const p = feature?.properties ?? {};
            const dunCode = `N${String(p.dun_code).padStart(2, "0")}`;
            const parlCode = String(p.parliament_code);
            const name = p.dun_name ?? "";
            const oldName = p.dun_name_2018;
            lyr.bindTooltip(
              buildDunTooltipHtml(dunCode, parlCode, name, oldName, p.renamed_in_2023, elections, "PRN15"),
              { sticky: true, direction: "top", className: "pip-mlk-tooltip" }
            );
            lyr.on("click", () => {
              store.setSelectedDun({ parliament: parlCode, dun: dunCode, name });
              if (isMobileViewport()) map.closePopup();
            });
          },
        });
        layerRefs.current["choropleth-prn15"] = prn15Layer;

        // ── Layer 7: GE15 2022 parlimen choropleth ──
        const ge15Layer = L.geoJSON(parlimenRes, {
          style: (feature) => {
            const p = feature?.properties ?? {};
            return { ...STYLES.choropleth(p.ge15_winner) };
          },
          onEachFeature: (feature, lyr) => {
            const p = feature?.properties ?? {};
            const code = `P${p.parliament_code}`;
            lyr.bindTooltip(
              `<div class="text-xs min-w-[160px]">
                <div class="font-semibold">${code} ${p.parliament_name}</div>
                <div>GE15 winner: <span style="color:${partyFill(p.ge15_winner)};font-weight:600">${p.ge15_winner ?? "—"}</span></div>
                <div class="text-muted-foreground">${p.district} district</div>
              </div>`,
              { sticky: true, direction: "top" }
            );
          },
        });
        layerRefs.current["choropleth-ge15"] = ge15Layer;

        // ── Layer 8: GE14 2018 DUN choropleth ──
        const ge14Layer = L.geoJSON(dunRes, {
          style: (feature) => {
            const p = feature?.properties ?? {};
            const r = findDunResult(elections, "GE14", String(p.parliament_code), String(p.dun_code));
            return { ...STYLES.choropleth(r?.winner) };
          },
          onEachFeature: (feature, lyr) => {
            const p = feature?.properties ?? {};
            const dunCode = `N${String(p.dun_code).padStart(2, "0")}`;
            const parlCode = String(p.parliament_code);
            const name = p.dun_name ?? "";
            const oldName = p.dun_name_2018;
            lyr.bindTooltip(
              buildDunTooltipHtml(dunCode, parlCode, name, oldName, p.renamed_in_2023, elections, "GE14"),
              { sticky: true, direction: "top", className: "pip-mlk-tooltip" }
            );
            lyr.on("click", () => {
              store.setSelectedDun({ parliament: parlCode, dun: dunCode, name });
              if (isMobileViewport()) map.closePopup();
            });
          },
        });
        layerRefs.current["choropleth-ge14"] = ge14Layer;

        // ── Layer 9: DPT 5-month heatmap (per-parliament net additions) ──
        // Source: spr-dpt-pameran-summary.json → per_parliament[].net.
        // Place a circle marker sized by net at each parliament centroid.
        const dpt = dptRes as { per_parliament: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }> };
        const dptLayer = L.layerGroup();
        const maxNet = Math.max(...dpt.per_parliament.map((p) => p.net || 0), 1);
        for (const p of dpt.per_parliament) {
          const feat = (parlimenRes as any).features.find(
            (f: any) => String(f.properties.parliament_code) === String(p.parliament_code)
          );
          if (!feat) continue;
          const [lat, lng] = polygonCentroid(feat.geometry);
          const r = 16 + Math.sqrt((p.net || 0) / maxNet) * 28; // 16–44 px radius
          const marker = L.circleMarker([lat, lng], {
            ...STYLES.dptHeat,
            radius: r,
            fillColor: dptHeatColor(p.net),
            fillOpacity: 0.55,
          });
          marker.bindTooltip(
            `<div class="text-xs min-w-[160px]">
              <div class="font-semibold">P${p.parliament_code} ${p.parliament_name}</div>
              <div>5-month net additions: <span class="font-semibold">${p.net}</span></div>
              <div>Additions: ${p.additions} · Deletions: ${p.deletions}</div>
              <div class="text-muted-foreground">Source: SPR DPT Pameran (Jan–May 2026)</div>
            </div>`,
            { sticky: true, direction: "top" }
          );
          dptLayer.addLayer(marker);
        }
        layerRefs.current["dpt-heatmap"] = dptLayer;

        // ── Layer 10: Town labels (mlk-towns.json) ──
        const towns = (townsRes as { towns: Array<{ name: string; lat: number; lng: number; district?: string; parliament?: string; dun?: string; postcode?: string }> }).towns;
        const townLayer = L.layerGroup();
        for (const t of towns) {
          const m = L.circleMarker([t.lat, t.lng], STYLES.town as any);
          m.bindTooltip(
            `<div class="text-xs">
              <div class="font-semibold">${t.name}</div>
              <div class="text-muted-foreground">${t.postcode ?? ""} · ${t.district ?? ""}</div>
              <div>${t.parliament ?? ""} · ${t.dun ?? ""}</div>
            </div>`,
            { sticky: true, direction: "top" }
          );
          townLayer.addLayer(m);
        }
        layerRefs.current["town-labels"] = townLayer;

        // ── Layer 11: DUN labels (28 — redelineation tooltip) ──
        const dunLabelLayer = L.layerGroup();
        for (const feature of (dunRes as any).features) {
          const p = feature.properties;
          const [lat, lng] = polygonCentroid(feature.geometry);
          const dunCode = `N${String(p.dun_code).padStart(2, "0")}`;
          const name = p.dun_name ?? "";
          const oldName = p.dun_name_2018;
          const renamed = !!p.renamed_in_2023;
          const shortLabel = renamed ? redelineationShortLabel(name) : "";
          const fullTip = renamed ? redelineationTooltip(name) : `${dunCode} ${name}`;
          const marker = L.circleMarker([lat, lng], STYLES.dunLabel as any);
          marker.bindTooltip(
            `<div class="text-xs">
              <div class="font-semibold">${dunCode} ${name}${shortLabel ? ` <span class="text-muted-foreground">${shortLabel}</span>` : ""}</div>
              <div class="text-muted-foreground">P${p.parliament_code} · ${p.district ?? ""}</div>
              ${renamed ? `<div class="text-[10px] text-amber-600">Renamed in 2023 redelineation</div>` : ""}
            </div>`,
            { sticky: true, direction: "top" }
          );
          // aria: attach via DOM (Leaflet doesn't natively expose aria-label on paths)
          marker.on("click", () => {
            store.setSelectedDun({ parliament: String(p.parliament_code), dun: dunCode, name });
            if (isMobileViewport()) map.closePopup();
          });
          // Stash tooltip text for screen-reader consumption
          (marker as any)._pipAriaLabel = fullTip;
          dunLabelLayer.addLayer(marker);
        }
        layerRefs.current["dun-labels"] = dunLabelLayer;

        // ── Layer 12: Parlimen labels (6) ──
        const parlLabelLayer = L.layerGroup();
        for (const feature of (parlimenRes as any).features) {
          const p = feature.properties;
          const [lat, lng] = polygonCentroid(feature.geometry);
          const marker = L.circleMarker([lat, lng], STYLES.parlimenLabel as any);
          marker.bindTooltip(
            `<div class="text-xs">
              <div class="font-semibold">P${p.parliament_code} ${p.parliament_name}</div>
              <div class="text-muted-foreground">${p.district ?? ""} district</div>
              <div>GE15: ${p.ge15_winner ?? "—"} · GE14: ${p.ge14_winner ?? "—"}</div>
            </div>`,
            { sticky: true, direction: "top" }
          );
          parlLabelLayer.addLayer(marker);
        }
        layerRefs.current["parlimen-labels"] = parlLabelLayer;

        // ── Layer 13: Engine demographics overlay (voter-density) ──
        // localities lack lat/lng → anchor at DUN centroid + deterministic jitter.
        // Cluster when >1000 points (skill spec) — we have ~2,016 across Melaka.
        const localities = (dataCacheRef.current.localities ?? []) as Array<{
          geography: { parliament_code?: string; dun_code?: string; locality_code?: string };
          metrics: { total_voters?: number; voter_density_score?: string };
        }>;
        const points: Array<{ lat: number; lng: number; totalVoters: number; density: string }> = [];
        for (const loc of localities) {
          const pCode = String(loc.geography?.parliament_code ?? "");
          const dCode = String(loc.geography?.dun_code ?? "");
          const feat = (dunRes as any).features.find(
            (f: any) => String(f.properties.parliament_code) === pCode && String(f.properties.dun_code) === dCode
          );
          if (!feat) continue;
          const [lat, lng] = polygonCentroid(feat.geometry);
          const seed = `${pCode}|${dCode}|${loc.geography?.locality_code ?? ""}`;
          const [jlat, jlng] = jitteredOffset([lat, lng], seed);
          points.push({
            lat: jlat,
            lng: jlng,
            totalVoters: loc.metrics?.total_voters ?? 0,
            density: loc.metrics?.voter_density_score ?? "UNKNOWN",
          });
        }
        // Cluster (>1000 points → grid-based).
        const clustered =
          points.length > 1000 ? clusterPoints(points, 0.008) : points.map((p) => ({ ...p, count: 1, single: true }));

        const demoLayer = L.layerGroup();
        for (const c of clustered) {
          const r = (c as any).single
            ? 3 + Math.sqrt(Math.min((c as any).totalVoters ?? 1, 400)) * 0.6
            : 6 + Math.sqrt((c as any).count) * 4;
          const marker = L.circleMarker([c.lat, c.lng], {
            ...STYLES.demographics,
            radius: r,
            fillColor: demoColor((c as any).density ?? (c as any).totalVoters),
            fillOpacity: 0.5,
          });
          marker.bindTooltip(
            `<div class="text-xs min-w-[140px]">
              <div class="font-semibold">Engine demographics</div>
              <div>${(c as any).single ? "1 locality" : `${(c as any).count} localities (cluster)`}</div>
              <div>Total voters: ${(c as any).totalVoters?.toLocaleString?.() ?? (c as any).totalVoters}</div>
              <div class="text-muted-foreground">Source: locality-intelligence.jsonl (Proxy tier)</div>
            </div>`,
            { sticky: true, direction: "top" }
          );
          demoLayer.addLayer(marker);
        }
        layerRefs.current["engine-demographics"] = demoLayer;

        // ─── Apply initial visibility ───
        applyLayerVisibility(map, layerRefs.current, visibleRef.current);

        // Fit bounds to Melaka outline (gentle).
        try {
          const bounds = adm1Layer.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20], animate: !prefersReduced });
        } catch {
          /* noop */
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("[Map2D] init failed:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map data");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {
        /* noop */
      }
      layerRefs.current = {};
    };
  }, []);

  // Invalidate map size when fullscreen toggles (Leaflet needs to recalc).
  React.useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => {
      try {
        mapRef.current?.invalidateSize();
      } catch {
        /* noop */
      }
    }, 120);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  const activeCount = React.useMemo(
    () => Object.values(visible).filter(Boolean).length,
    [visible]
  );

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        isFullscreen && "fixed inset-0 z-[2000] rounded-none border-0 shadow-2xl",
        className
      )}
    >
      <div
        ref={containerRef}
        role="application"
        aria-label="Interactive Melaka 2D map — 13 toggleable layers, click any DUN to open the drawer"
        className={cn(
          "relative w-full",
          isFullscreen ? "h-screen" : "h-[600px] md:h-[700px]"
        )}
        style={{ background: "#e5e7eb" }}
      />
      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm shadow-md">
            <Loader2 className="size-4 animate-spin text-amber-600" aria-hidden />
            <span>Loading 2D map…</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-w-sm rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-md">
            <div className="font-semibold">Map load error</div>
            <div className="mt-1 break-words">{error}</div>
          </div>
        </div>
      )}

      {/* Layer control panel — top-right, collapsible */}
      <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex max-h-[calc(100%-1.5rem)] w-[280px] flex-col">
        <Card className="pointer-events-auto flex flex-col gap-0 overflow-hidden bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <CardHeader className="gap-0 px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <LayersIcon className="size-4 text-amber-600" aria-hidden />
                Map Layers
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 text-[10px] font-medium"
                  aria-label={`${activeCount} of 13 layers active`}
                >
                  {activeCount}/13
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  aria-pressed={isFullscreen}
                  title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4" aria-hidden />
                  ) : (
                    <Maximize2 className="size-4" aria-hidden />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={panelOpen ? "Collapse layer panel" : "Expand layer panel"}
                  aria-expanded={panelOpen}
                  onClick={() => setPanelOpen((p) => !p)}
                >
                  {panelOpen ? (
                    <ChevronUp className="size-4" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {panelOpen && (
            <CardContent className="max-h-96 overflow-y-auto px-2 py-2">
              <div className="flex flex-col gap-3">
                {LAYER_GROUPS.map((group) => (
                  <LayerGroup
                    key={group}
                    group={group}
                    visible={visible}
                    onToggle={toggle}
                  />
                ))}
              </div>
              <div className="mt-3 border-t pt-2 text-[10px] leading-tight text-muted-foreground">
                Click a DUN to open the drawer. Mobile: popups suppressed below
                640&nbsp;px.
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Legend — bottom-left, only when an election layer is on */}
      {(visible["choropleth-prn15"] ||
        visible["choropleth-ge15"] ||
        visible["choropleth-ge14"]) && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000]">
          <Card className="pointer-events-auto bg-card/95 px-3 py-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Coalition
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                <LegendRow color={PARTY_COLORS.BN} label="BN" />
                <LegendRow color={PARTY_COLORS.PH} label="PH" />
                <LegendRow color={PARTY_COLORS.PN} label="PN" />
                <LegendRow color={PARTY_COLORS.OTH} label="Others" />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-3 rounded-sm border border-black/20"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}

function LayerGroup({
  group,
  visible,
  onToggle,
}: {
  group: (typeof LAYER_GROUPS)[number];
  visible: Record<LayerId, boolean>;
  onToggle: (id: LayerId, on: boolean) => void;
}) {
  const items = LAYERS.filter((l) => l.group === group);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {group}
      </span>
      {items.map((l) => (
        <LayerToggle
          key={l.id}
          layer={l}
          on={visible[l.id]}
          onToggle={(on) => onToggle(l.id, on)}
        />
      ))}
    </div>
  );
}

function LayerToggle({
  layer,
  on,
  onToggle,
}: {
  layer: (typeof LAYERS)[number];
  on: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        "hover:bg-accent/60 focus-within:bg-accent/60",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1 focus-visible:ring-offset-card"
      )}
      aria-label={`${on ? "Hide" : "Show"} layer: ${layer.label}. ${layer.description}`}
    >
      <span
        className="inline-block size-3 shrink-0 rounded-sm border border-black/20"
        style={{ backgroundColor: layer.swatch }}
        aria-hidden
      />
      <span className="flex-1 text-xs leading-tight">
        <span className="font-medium">{layer.label}</span>
        <span className="block text-[10px] text-muted-foreground">
          {layer.description}
        </span>
      </span>
      <Switch
        checked={on}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${layer.label}`}
        className="shrink-0"
      />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — pure functions only
// ─────────────────────────────────────────────────────────────────────────────

/** Add/remove layers from the map based on the visibility map. */
function applyLayerVisibility(
  map: any,
  refs: Record<string, any>,
  visible: Record<LayerId, boolean>
) {
  for (const layer of LAYERS) {
    const ref = refs[layer.id];
    if (!ref) continue;
    // Determine current presence: every LayerGroup / TileLayer / CircleMarker
    // exposes a `_map` reference when added.
    const isOnMap = !!ref._map;
    const wantOn = !!visible[layer.id];
    if (wantOn && !isOnMap) {
      ref.addTo(map);
    } else if (!wantOn && isOnMap) {
      map.removeLayer(ref);
    }
  }
}

/** Build the DUN hover-tooltip HTML (redelineation-aware). */
function buildDunTooltipHtml(
  dunCode: string,
  parlCode: string,
  name: string,
  oldName: string | undefined,
  renamed: boolean,
  elections: ElectionsDoc | null,
  electionId?: "GE14" | "PRN15" | "GE15"
): string {
  const prn15 = findDunResult(elections, "PRN15", parlCode, dunCode.replace(/^N/, ""));
  const ge14 = findDunResult(elections, "GE14", parlCode, dunCode.replace(/^N/, ""));
  const shortLabel = renamed && oldName ? redelineationShortLabel(name) : "";
  const ariaTip = renamed ? redelineationTooltip(name) : `${dunCode} ${name}`;
  const share = prn15?.vote_share;
  const shareRow = share
    ? `<div class="text-[10px] text-muted-foreground">PRN15 share: BN ${(share.BN ? share.BN * 100 : 0).toFixed(0)}% · PH ${(share.PH ? share.PH * 100 : 0).toFixed(0)}% · PN ${(share.PN ? share.PN * 100 : 0).toFixed(0)}%</div>`
    : "";
  return `<div class="text-xs min-w-[180px]" aria-label="${escapeHtml(ariaTip)}">
    <div class="font-semibold">${dunCode} ${escapeHtml(name)}${shortLabel ? ` <span class="text-muted-foreground">${escapeHtml(shortLabel)}</span>` : ""}</div>
    <div class="text-muted-foreground">P${parlCode} · ${renamed ? "renamed in 2023" : "no rename"}</div>
    <div>PRN15 2021 winner: <span style="color:${partyFill(prn15?.winner)};font-weight:600">${prn15?.winner ?? "—"}</span></div>
    <div>GE14 2018 winner: <span style="color:${partyFill(ge14?.winner)};font-weight:600">${ge14?.winner ?? "—"}</span></div>
    ${shareRow}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Heat color for DPT net-additions: yellow → orange → red. */
function dptHeatColor(net: number): string {
  if (net <= 0) return "#6B7280";
  if (net < 200) return "#FBBF24"; // amber
  if (net < 400) return "#F97316"; // orange
  if (net < 600) return "#EF4444"; // red
  return "#B91C1C"; // dark red
}

/** Demographics overlay color: purple intensity by voter-density label. */
function demoColor(density: string | number): string {
  if (typeof density === "number") {
    if (density < 100) return "#DDD6FE";
    if (density < 300) return "#A78BFA";
    if (density < 600) return "#7C3AED";
    return "#5B21B6";
  }
  switch (String(density).toUpperCase()) {
    case "LOW":
      return "#DDD6FE";
    case "MEDIUM":
      return "#A78BFA";
    case "HIGH":
      return "#7C3AED";
    case "VERY_HIGH":
    case "VERY-HIGH":
      return "#5B21B6";
    default:
      return "#C4B5FD";
  }
}

export default Map2D;
