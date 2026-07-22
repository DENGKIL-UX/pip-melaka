"use client";

// ponytail: MLK — Three.js 3D map module for PIP-MLK.
// Implements WORKLOAD.md Phase 3 (3D Map — Three.js, 28 DUN extrusions,
// timeline morph) + DESIGN.md §3 row 2 (8-layer system) +
// 3d-map-architecture skill spec.
//
// SSR-safety: Three.js touches `window` / `WebGL` at import time. This file is
// marked `"use client"` AND the parent dashboard mounts it via
// `next/dynamic(..., { ssr: false })` (see index.ts). All Three.js imports
// happen inside the mount `useEffect` via dynamic `await import("three")`.
//
// 8-layer system:
//   1. Terrain — flat plane (slate-800, subtle).
//   2. DUN extrusions (28) — BoxGeometry at each centroid, height ∝ total_voters,
//      colored by the active scenario winner (BN blue / PH red / PN green).
//   3. Election-history morph — animate color + height across 4 scenarios.
//   4. Parlimen outlines (6) — orange LineLoops on top of the DUN extrusions.
//   5. Scatter — locality point cloud (InstancedMesh, P134 ~360 points).
//   6. HUD ring — rotating cyan torus around the perimeter.
//   7. DUN labels (top-10) — red badge sprites.
//   8. Parlimen labels (6) — amber badge sprites.
//
// Timeline morph: 4 scenarios (GE14 / PRN15 / GE15 / PROJ_2026). Clicking a
// scenario button computes a per-DUN morph plan (winner + height) and the RAF
// loop lerps current → target. prefers-reduced-motion snaps instantly.
//
// Raycaster: hover on a DUN extrusion → HTML tooltip (role="tooltip") with
// DUN code + name + winner + total_voters. Click → useDashboardStore
// .setSelectedDun → drawer opens (per the 2D map pattern).

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MousePointer2, Orbit as OrbitIcon, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PARTY_COLORS, MLK_ACCENT } from "@/lib/party-colors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { redelineationShortLabel } from "@/lib/dun-redelineation-map";
import { TimelineControls } from "./timeline-controls";
import {
  createScene,
  type SceneBundle,
} from "./scene-setup";
import {
  buildTerrain,
  buildAllDunExtrusions,
  buildParlimenOutlines,
  computeScenarioMorphPlan,
  geometryCentroid3D,
  parseJsonl,
  HEIGHT_SCALE,
  type GeoJSONFC,
  type DunFeatureProps,
  type ParlimenFeatureProps,
  type DunIntelligenceRow,
  type ElectionsDoc,
  type ScenarioId,
  type ProjSubScenarioId,
  type BuiltDunExtrusion,
  type BuiltParlimenOutline,
  type ScenarioMorphPlan,
} from "./extrusions";
import { buildScatter, indexDunCentroids, type LocalityRow, type BuiltScatter } from "./scatter";
import { buildHudRing, type BuiltHudRing } from "./hud-ring";
import { buildRipples, type BuiltRipple } from "./ripple-effects";
import { buildFlyLines, type BuiltFlyLines, type FlyLineTarget } from "./fly-lines";
import { buildChaseLight, type BuiltChaseLight } from "./chase-light";
import {
  buildDunLabels,
  buildParlimenLabels,
  clearLabelTextureCache,
  type BuiltLabel,
} from "./labels";

export interface Map3DProps {
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data URLs (resolve to /public/data/* at runtime — see DESIGN.md §3 row 2).
// ─────────────────────────────────────────────────────────────────────────────
const DATA_URLS = {
  dun: "/data/boundaries/mlk-dun-geo.json",
  parlimen: "/data/boundaries/mlk-parlimen-geo.json",
  elections: "/data/elections/melaka-elections.json",
  dunIntelligence: (parliamentCode: string) => `/data/p${parliamentCode}/dun-intelligence.jsonl`,
  localityP134: "/data/p134/locality-intelligence.jsonl",
} as const;

const PARLIAMENT_CODES = ["134", "135", "136", "137", "138", "139"] as const;

// ponytail: MLK — morph animation lerp factor. ~8% per frame at 60fps reaches
// ~95% of target in ~36 frames (~600 ms). prefers-reduced-motion → snap (1.0).
const MORPH_LERP = 0.08;

/** Returns the hex color for a coalition winner code. */
function winnerHex(winner: string): string {
  const c = winner.toUpperCase();
  if (c === "BN") return PARTY_COLORS.BN;
  if (c === "PH") return PARTY_COLORS.PH;
  if (c === "PN") return PARTY_COLORS.PN;
  return PARTY_COLORS.OTH;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip state (HTML overlay, not a Three.js sprite).
// ─────────────────────────────────────────────────────────────────────────────
interface TooltipState {
  x: number;
  y: number;
  parliamentCode: string;
  dunCode: string;
  dunName: string;
  winner: string;
  totalVoters: number;
  renamed: boolean;
  dunName2018?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loaded data (kept in a ref so re-renders don't refetch).
// ─────────────────────────────────────────────────────────────────────────────
interface LoadedData {
  dunFC: GeoJSONFC<DunFeatureProps>;
  parlimenFC: GeoJSONFC<ParlimenFeatureProps>;
  elections: ElectionsDoc;
  intelligenceByCode: Map<string, DunIntelligenceRow>;
  localitiesP134: LocalityRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Built scene objects (kept in a ref so re-renders don't rebuild).
// ─────────────────────────────────────────────────────────────────────────────
interface BuiltScene {
  bundle: SceneBundle;
  terrain: import("three").Mesh;
  extrusions: BuiltDunExtrusion[];
  parlimenOutlines: BuiltParlimenOutline[];
  scatter: BuiltScatter | null;
  hudRing: BuiltHudRing;
  ripples: BuiltRipple;
  flyLines: BuiltFlyLines;
  chaseLight: BuiltChaseLight;
  dunLabels: BuiltLabel[];
  parlimenLabels: BuiltLabel[];
  /** Map: extrusion index by `parlCode|dunCode` for O(1) morph updates. */
  extrusionIndex: Map<string, number>;
  prefersReducedMotion: boolean;
}

async function loadAllData(): Promise<LoadedData> {
  const [dunRes, parlimenRes, electionsRes, localityRes, ...intelRes] =
    await Promise.all([
      fetch(DATA_URLS.dun),
      fetch(DATA_URLS.parlimen),
      fetch(DATA_URLS.elections),
      fetch(DATA_URLS.localityP134),
      ...PARLIAMENT_CODES.map((p) => fetch(DATA_URLS.dunIntelligence(p))),
    ]);
  if (!dunRes.ok) throw new Error(`DUN geo fetch failed: ${dunRes.status}`);
  if (!parlimenRes.ok) throw new Error(`Parlimen geo fetch failed: ${parlimenRes.status}`);
  if (!electionsRes.ok) throw new Error(`Elections fetch failed: ${electionsRes.status}`);
  for (let i = 0; i < intelRes.length; i++) {
    if (!intelRes[i].ok) throw new Error(`Intelligence fetch failed for p${PARLIAMENT_CODES[i]}: ${intelRes[i].status}`);
  }
  if (!localityRes.ok) throw new Error(`Locality fetch failed: ${localityRes.status}`);

  const [dunFC, parlimenFC, elections, localityText, ...intelTexts] = await Promise.all([
    dunRes.json() as Promise<GeoJSONFC<DunFeatureProps>>,
    parlimenRes.json() as Promise<GeoJSONFC<ParlimenFeatureProps>>,
    electionsRes.json() as Promise<ElectionsDoc>,
    localityRes.text(),
    ...intelRes.map((r) => r.text()),
  ]);

  // Parse all 6 dun-intelligence JSONLs + index by `parlCode|dunCode`.
  const intelligenceByCode = new Map<string, DunIntelligenceRow>();
  for (let i = 0; i < intelTexts.length; i++) {
    const rows = parseJsonl<DunIntelligenceRow>(intelTexts[i]);
    for (const r of rows) {
      const key = `${r.geography.parliament_code}|${r.geography.dun_code}`;
      intelligenceByCode.set(key, r);
    }
  }
  const localitiesP134 = parseJsonl<LocalityRow>(localityText);

  return { dunFC, parlimenFC, elections, intelligenceByCode, localitiesP134 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function Map3D({ className }: Map3DProps) {
  // ── React state (drives re-renders for the UI shell only) ─────────────────
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);
  const [caption, setCaption] = React.useState<string>("");
  const [seatSummary, setSeatSummary] = React.useState<Record<string, number>>({});
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  // ── Store sync (timelineScenario is shared with the rest of the dashboard) ─
  const timelineScenario = useDashboardStore((s) => s.timelineScenario);
  const setTimelineScenario = useDashboardStore((s) => s.setTimelineScenario);
  const setSelectedDun = useDashboardStore((s) => s.setSelectedDun);

  // projSubId is local — not in the shared store (only the 3D map needs it).
  const [projSubId, setProjSubId] = React.useState<ProjSubScenarioId>("STATUS_QUO");

  // ── Refs (Three.js objects live here; re-renders don't touch them) ────────
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasHostRef = React.useRef<HTMLDivElement | null>(null);
  const builtRef = React.useRef<BuiltScene | null>(null);
  const dataRef = React.useRef<LoadedData | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number>(0);
  // ponytail: MLK — `ready` flips to true once the scene is built. The
  // scenario-change effect listens on `ready` so it runs once on mount (with
  // the current scenario/projSubId) AND on every subsequent change. This
  // avoids the "refs updated during render" lint pattern.
  const [ready, setReady] = React.useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Recomputes the morph plan for the current scenario + projSubId and writes
   * the new target color + height into each BuiltDunExtrusion. The RAF loop
   * picks up the targets and lerps current → target.
   */
  const applyMorphPlan = React.useCallback((plan: ScenarioMorphPlan) => {
    const built = builtRef.current;
    if (!built) return;
    const THREE = built.bundle.THREE;
    for (const state of plan.states) {
      const idx = built.extrusionIndex.get(`${state.parliamentCode}|${state.dunCode}`);
      if (idx === undefined) continue;
      const ex = built.extrusions[idx];
      ex.targetColor = new THREE.Color(winnerHex(state.winner));
      ex.targetHeight = state.height;
      ex.winner = state.winner;
    }
    setCaption(plan.caption);
    setSeatSummary(plan.seatSummary);
  }, []);

  // ── Mount: load data + build scene + start RAF loop ──────────────────────
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const data = await loadAllData();
        if (cancelled) return;
        dataRef.current = data;

        if (!canvasHostRef.current) return;
        const host = canvasHostRef.current;
        const rect = host.getBoundingClientRect();
        const width = Math.max(rect.width, 320);
        const height = Math.max(rect.height, 320);

        const prefersReducedMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const bundle = await createScene({
          width,
          height,
          prefersReducedMotion,
        });
        if (cancelled) {
          bundle.dispose();
          return;
        }

        const THREE = bundle.THREE;
        const scene = bundle.scene;

        // ── Layer 1: Terrain ─────────────────────────────────────────────────
        const terrain = buildTerrain(THREE, 240);
        scene.add(terrain);

        // ── Layer 2 + 3: DUN extrusions (initial state = PRN15) ──────────────
        const extrusions = buildAllDunExtrusions(
          THREE,
          data.dunFC,
          data.intelligenceByCode,
          // initialColorFn: PRN15 winner color
          (spec) => {
            const prn15 = data.elections.elections.find((e) => e.id === "PRN15");
            const r = prn15?.dun_results.find(
              (d) => d.parliament_code === spec.parliamentCode && d.dun_code === spec.dunCode
            );
            return winnerHex(r?.winner ?? "OTH");
          },
          (intel) =>
            Math.max(2, ((intel?.metrics.total_voters ?? 0) / 1000) * HEIGHT_SCALE)
        );
        const extrusionIndex = new Map<string, number>();
        extrusions.forEach((ex, i) => {
          scene.add(ex.mesh);
          extrusionIndex.set(`${ex.spec.parliamentCode}|${ex.spec.dunCode}`, i);
        });

        // ── Layer 4: Parlimen outlines ───────────────────────────────────────
        const parlimenOutlines = buildParlimenOutlines(THREE, data.parlimenFC);
        for (const p of parlimenOutlines) {
          for (const line of p.lines) scene.add(line);
        }

        // ── Layer 5: Scatter (P134 localities, InstancedMesh) ────────────────
        const dunCentroids = indexDunCentroids(extrusions.map((e) => e.spec));
        const scatter = data.localitiesP134.length > 0
          ? buildScatter(THREE, data.localitiesP134, dunCentroids)
          : null;
        if (scatter) scene.add(scatter.mesh);

        // ── Layer 6: HUD ring (segmented ticked design) ─────────────────
        const hudRing = buildHudRing(THREE);
        scene.add(hudRing.group);

        // ── Layer 6b: Chase light (outer-contour animated border) ──────────
        // Per three-scope-map-skill: animated THREE.Line segments around the
        // perimeter. Bright head + fading trail travels around the ring.
        const chaseLight = buildChaseLight(THREE);
        scene.add(chaseLight.group);

        // ── Layer 6c: Ripple effects (expanding rings from map center) ─────
        // Per three-scope-map-skill: ripple effects from a source point.
        // Source = Melaka center (0,0 in scene coords).
        const ripples = buildRipples(THREE, { source: [0, 0] });
        scene.add(ripples.group);

        // ── Layer 6d: Fly lines (arced paths from center to parliaments) ───
        // Per three-scope-map-skill: fly lines from source (capital) to targets.
        // Source = Melaka center; Targets = 6 parliament centroids.
        const flyLineTargets: FlyLineTarget[] = data.parlimenFC.features.map((f) => {
          const c = geometryCentroid3D(f.geometry);
          // geometryCentroid3D returns [x, z] (2-tuple), NOT [x, y, z]
          return { x: c[0], z: c[1], label: f.properties.parliament_name };
        });
        const flyLines = buildFlyLines(THREE, {
          source: [0, 0],
          targets: flyLineTargets,
        });
        scene.add(flyLines.group);

        // ── Layer 7 + 8: Labels (rebuilt on every morph) ─────────────────────
        // Build once with initial state — the morph effect updates positions.
        const maxDunHeight = Math.max(...extrusions.map((e) => e.currentHeight));
        const parlimenCentroids = data.parlimenFC.features.map((f) => {
          const centroid = geometryCentroid3D(f.geometry);
          const ge15Winner =
            data.elections.elections.find((e) => e.id === "GE15")?.parliament_results.find(
              (r) => r.parliament_code === f.properties.parliament_code
            )?.winner;
          return {
            parliamentCode: f.properties.parliament_code,
            parliamentName: f.properties.parliament_name ?? f.properties.shapeName ?? `P${f.properties.parliament_code}`,
            centroid,
            winner: ge15Winner,
          };
        });
        const dunLabels = buildDunLabels(THREE, extrusions, 10);
        const parlimenLabels = buildParlimenLabels(THREE, parlimenCentroids, maxDunHeight);
        for (const l of dunLabels) scene.add(l.sprite);
        for (const l of parlimenLabels) scene.add(l.sprite);

        builtRef.current = {
          bundle,
          terrain,
          extrusions,
          parlimenOutlines,
          scatter,
          hudRing,
          ripples,
          flyLines,
          chaseLight,
          dunLabels,
          parlimenLabels,
          extrusionIndex,
          prefersReducedMotion,
        };

        // Append the renderer's canvas to the host div.
        host.appendChild(bundle.renderer.domElement);
        bundle.renderer.domElement.setAttribute(
          "aria-label",
          "Interactive 3D map of Melaka showing 28 DUN extrusions colored by election winner. Use mouse to rotate."
        );
        bundle.renderer.domElement.setAttribute("tabindex", "0");
        bundle.renderer.domElement.style.display = "block";
        bundle.renderer.domElement.style.width = "100%";
        bundle.renderer.domElement.style.height = "100%";
        bundle.renderer.domElement.style.touchAction = "none";

        // ── Initial morph plan (current scenario + projSubId from state) ─────
        // ponytail: MLK — captured at mount time. Subsequent changes flow
        // through the dedicated scenario-change effect below. The mount-effect
        // application is the first paint; the scenario-change effect (fired
        // by setReady(true)) is idempotent for the same scenario.
        const initialPlan = computeScenarioMorphPlan(
          timelineScenario,
          projSubId,
          data.elections,
          data.intelligenceByCode,
          data.dunFC
        );
        applyMorphPlan(initialPlan);
        if (prefersReducedMotion) {
          // Snap to initial state immediately (no lerp). The RAF loop will
          // also short-circuit with lerpFactor=1, but we snap here so the
          // first paint is correct rather than lerping from the default color.
          for (const ex of extrusions) {
            const mat = ex.mesh.material as import("three").MeshStandardMaterial;
            ex.currentColor.copy(ex.targetColor);
            mat.color.copy(ex.targetColor);
            // Update emissive to match (so glow stays consistent with winner color)
            mat.emissive.copy(ex.targetColor).multiplyScalar(0.3);
            ex.currentHeight = ex.targetHeight;
            ex.mesh.scale.y = ex.targetHeight;
          }
          updateLabelPositions();
        }

        // ── RAF loop ────────────────────────────────────────────────────────
        const animate = (time: number) => {
          if (cancelled) return;
          const dt = lastTimeRef.current === 0 ? 0 : (time - lastTimeRef.current) / 1000;
          lastTimeRef.current = time;

          // Lerp each extrusion's color + height toward target.
          const lerpFactor = builtRef.current?.prefersReducedMotion ? 1 : MORPH_LERP;
          let morphedAny = false;
          for (const ex of extrusions) {
            const mat = ex.mesh.material as import("three").MeshStandardMaterial;
            const colorDelta = Math.abs(ex.currentColor.r - ex.targetColor.r)
              + Math.abs(ex.currentColor.g - ex.targetColor.g)
              + Math.abs(ex.currentColor.b - ex.targetColor.b);
            const heightDelta = Math.abs(ex.currentHeight - ex.targetHeight);
            if (colorDelta > 0.001) {
              ex.currentColor.lerp(ex.targetColor, lerpFactor);
              mat.color.copy(ex.currentColor);
              mat.emissive.copy(ex.currentColor).multiplyScalar(0.3);
              morphedAny = true;
            } else if (!ex.currentColor.equals(ex.targetColor)) {
              ex.currentColor.copy(ex.targetColor);
              mat.color.copy(ex.targetColor);
              mat.emissive.copy(ex.targetColor).multiplyScalar(0.3);
              morphedAny = true;
            }
            if (heightDelta > 0.01) {
              ex.currentHeight += (ex.targetHeight - ex.currentHeight) * lerpFactor;
              ex.mesh.scale.y = ex.currentHeight;
              morphedAny = true;
            } else if (ex.currentHeight !== ex.targetHeight) {
              ex.currentHeight = ex.targetHeight;
              ex.mesh.scale.y = ex.targetHeight;
              morphedAny = true;
            }
          }
          if (morphedAny) updateLabelPositions();

          // HUD ring rotation (skipped if prefers-reduced-motion).
          hudRing.update(dt, !builtRef.current?.prefersReducedMotion);
          // Chase light animation.
          chaseLight.update(dt, !builtRef.current?.prefersReducedMotion);
          // Ripple effects.
          ripples.update(dt, !builtRef.current?.prefersReducedMotion);
          // Fly line comets.
          flyLines.update(dt, !builtRef.current?.prefersReducedMotion);

          // OrbitControls damping.
          bundle.controls?.update();
          bundle.renderer.render(scene, bundle.camera);

          rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);

        // ── Resize observer ─────────────────────────────────────────────────
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = entry.contentRect.width;
            const h = entry.contentRect.height;
            if (w > 0 && h > 0) bundle.resize(w, h);
          }
        });
        ro.observe(host);

        setLoading(false);
        // ponytail: MLK — flip `ready` so the scenario-change effect runs
        // once with the current scenario + projSubId from state. This is the
        // single source of truth for the initial morph plan application.
        setReady(true);

        // ── Pointer events (raycaster) ──────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const dunMeshes = extrusions.map((e) => e.mesh);
        let lastHoveredIdx: number | null = null;

        function pickDun(clientX: number, clientY: number): number | null {
          if (!host) return null;
          const rect = host.getBoundingClientRect();
          pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, bundle.camera);
          const hits = raycaster.intersectObjects(dunMeshes, false);
          if (hits.length === 0) return null;
          const mesh = hits[0].object as import("three").Mesh;
          const idx = dunMeshes.indexOf(mesh);
          return idx >= 0 ? idx : null;
        }

        function onPointerMove(e: PointerEvent) {
          // Skip when the pointer is from a touch interaction (avoid hover
          // tooltips on mobile — drawer takes over per the 2D map pattern).
          if (e.pointerType === "touch") return;
          const idx = pickDun(e.clientX, e.clientY);
          if (idx === null) {
            if (lastHoveredIdx !== null) {
              lastHoveredIdx = null;
              setTooltip(null);
              host.style.cursor = "";
            }
            return;
          }
          if (idx !== lastHoveredIdx) {
            lastHoveredIdx = idx;
            const ex = extrusions[idx];
            const intel = data.intelligenceByCode.get(
              `${ex.spec.parliamentCode}|${ex.spec.dunCode}`
            );
            setTooltip({
              x: e.clientX - (host.getBoundingClientRect().left),
              y: e.clientY - (host.getBoundingClientRect().top),
              parliamentCode: ex.spec.parliamentCode,
              dunCode: ex.spec.dunCode,
              dunName: ex.spec.dunName,
              winner: ex.winner,
              totalVoters: intel?.metrics.total_voters ?? ex.spec.totalVoters,
              renamed: ex.spec.renamed,
              dunName2018: ex.spec.dunName2018,
            });
            host.style.cursor = "pointer";
          } else {
            // Same DUN, just update position.
            setTooltip((prev) =>
              prev
                ? {
                    ...prev,
                    x: e.clientX - (host.getBoundingClientRect().left),
                    y: e.clientY - (host.getBoundingClientRect().top),
                  }
                : prev
            );
          }
        }

        function onPointerLeave() {
          if (lastHoveredIdx !== null) {
            lastHoveredIdx = null;
            setTooltip(null);
            host.style.cursor = "";
          }
        }

        function onClick(e: MouseEvent) {
          const idx = pickDun(e.clientX, e.clientY);
          if (idx === null) return;
          const ex = extrusions[idx];
          setSelectedDun({
            parliament: ex.spec.parliamentCode,
            dun: ex.spec.dunCode,
            name: ex.spec.dunName,
          });
        }

        // ponytail: MLK — precompute label→extrusion index by centroid match.
        // Each DUN has a unique centroid in our 28-polygon dataset, so this is
        // a stable O(N) one-time lookup (vs O(N²) per frame). The label sprites
        // keep their initial X/Z (centroid) — only the Y position changes as
        // the underlying extrusion morphs.
        const labelExtrusionIdx = dunLabels.map((label) => {
          const baseX = label.spec.position[0];
          const baseZ = label.spec.position[2];
          return extrusions.findIndex(
            (e) => e.spec.centroid[0] === baseX && e.spec.centroid[1] === baseZ
          );
        });

        // ponytail: MLK — inner helper so the RAF loop and morph effects can
        // reposition labels after a height change. Defined as a closure over
        // the local `dunLabels` + `extrusions` so we don't need to reach into
        // builtRef.current each frame.
        function updateLabelPositions() {
          let maxH = 0;
          for (const e of extrusions) if (e.currentHeight > maxH) maxH = e.currentHeight;
          for (let i = 0; i < dunLabels.length; i++) {
            const label = dunLabels[i];
            const exIdx = labelExtrusionIdx[i];
            const ex = exIdx >= 0 ? extrusions[exIdx] : undefined;
            const h = ex?.currentHeight ?? maxH;
            label.sprite.position.set(label.spec.position[0], h + 4, label.spec.position[2]);
          }
          for (const label of parlimenLabels) {
            label.sprite.position.set(label.spec.position[0], maxH + 8, label.spec.position[2]);
          }
        }

        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerleave", onPointerLeave);
        host.addEventListener("click", onClick);

        // Cleanup
        return () => {
          cancelled = true;
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          ro.disconnect();
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerleave", onPointerLeave);
          host.removeEventListener("click", onClick);
          // Dispose geometries + materials.
          terrain.geometry.dispose();
          (terrain.material as import("three").Material).dispose();
          for (const ex of extrusions) {
            ex.mesh.geometry.dispose();
            (ex.mesh.material as import("three").Material).dispose();
          }
          for (const p of parlimenOutlines) {
            for (const line of p.lines) {
              line.geometry.dispose();
              (line.material as import("three").Material).dispose();
            }
          }
          if (scatter) {
            scatter.mesh.geometry.dispose();
            (scatter.mesh.material as import("three").Material).dispose();
          }
          // HUD ring group (torus + ticks + accent arc) — dispose children.
          const THREE = bundle.THREE;
          hudRing.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              (child.material as import("three").Material).dispose();
            } else if (child instanceof THREE.Line) {
              child.geometry.dispose();
              (child.material as import("three").Material).dispose();
            }
          });
          // Chase light segments.
          chaseLight.group.traverse((child) => {
            if (child instanceof THREE.Line) {
              child.geometry.dispose();
              (child.material as import("three").Material).dispose();
            }
          });
          // Ripple rings.
          ripples.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              (child.material as import("three").Material).dispose();
            }
          });
          // Fly lines (comets + arc lines).
          flyLines.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              (child.material as import("three").Material).dispose();
            } else if (child instanceof THREE.Line) {
              child.geometry.dispose();
              (child.material as import("three").Material).dispose();
            }
          });
          for (const l of [...dunLabels, ...parlimenLabels]) {
            (l.sprite.material as import("three").SpriteMaterial).dispose();
          }
          clearLabelTextureCache();
          bundle.dispose();
          builtRef.current = null;
        };
      } catch (err) {
        if (cancelled) return;
        console.error("[map-3d] init failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }

    const cleanupPromise = init();
    return () => {
      cancelled = true;
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, []);

  // ── Scenario change → recompute morph plan + update targets ───────────────
  // ponytail: MLK — `ready` is in deps so this effect runs once on mount
  // (after the scene is built) AND on every subsequent scenario change. The
  // mount-effect's initial applyMorphPlan is the first paint; this effect is
  // idempotent for the same scenario.
  React.useEffect(() => {
    const data = dataRef.current;
    const built = builtRef.current;
    if (!data || !built || !ready) return;
    const plan = computeScenarioMorphPlan(
      timelineScenario,
      projSubId,
      data.elections,
      data.intelligenceByCode,
      data.dunFC
    );
    applyMorphPlan(plan);
    // ponytail: MLK — we don't snap the extrusions here even when
    // prefersReducedMotion is true. The RAF loop already short-circuits with
    // lerpFactor=1 in that case, so the snap happens on the next frame. This
    // avoids mutating builtRef.current.extrusions from inside a React effect
    // (react-hooks/immutability rule).
  }, [timelineScenario, projSubId, ready, applyMorphPlan]);

  // ── Sync local scenario with the store on first paint (no-op if already) ──
  const onScenarioChange = React.useCallback(
    (s: ScenarioId) => setTimelineScenario(s),
    [setTimelineScenario]
  );
  const onProjSubChange = React.useCallback((s: ProjSubScenarioId) => setProjSubId(s), []);

  // ── Render ────────────────────────────────────────────────────────────────
  const scenarioLabel = timelineScenario === "PROJ_2026"
    ? `PROJ 2026 · ${projSubId.replace("_", " ").toLowerCase()}`
    : timelineScenario;

  return (
    <Card className={cn(
      "overflow-hidden border-slate-800 bg-slate-950/60",
      isFullscreen && "fixed inset-0 z-[2000] rounded-none border-0",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <OrbitIcon className="h-4 w-4" aria-hidden style={{ color: MLK_ACCENT }} />
          3D Map · 28 DUN Extrusions
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wide border-slate-600 text-slate-300"
          >
            Scenario: <span className="ml-1 font-semibold text-slate-100">{scenarioLabel}</span>
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
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
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* 3D canvas host — fixed height, dark scene background */}
        <div
          ref={containerRef}
          className={cn(
            "relative w-full bg-slate-900 border-b border-slate-800",
            isFullscreen ? "h-[calc(100vh-3.5rem)]" : "h-[600px] md:h-[700px]"
          )}
          role="application"
          aria-label="Interactive 3D map of Melaka showing 28 DUN extrusions colored by election winner. Use mouse to rotate."
        >
          <div
            ref={canvasHostRef}
            className="absolute inset-0"
            aria-label="3D map canvas — 28 DUN extrusions, raycaster-enabled"
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              <p className="text-sm">Loading 3D map…</p>
              <p className="text-xs text-slate-500">Fetching 8 data sources + building 28 DUN extrusions</p>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/80 p-6 text-center text-red-200"
              role="alert"
            >
              <p className="text-sm font-semibold">3D map failed to load</p>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Hover tooltip (HTML overlay, not a Three.js sprite) */}
          {tooltip && (
            <div
              role="tooltip"
              aria-live="polite"
              className="pointer-events-none absolute z-10 max-w-[260px] rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur-sm"
              style={{
                left: Math.min(tooltip.x + 14, 600),
                top: Math.max(tooltip.y - 60, 8),
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: winnerHex(tooltip.winner) }}
                  aria-hidden
                />
                <span className="font-semibold">
                  N{tooltip.dunCode} · {tooltip.dunName}
                </span>
              </div>
              <div className="mt-1 text-slate-400">
                P{tooltip.parliamentCode} · {tooltip.totalVoters.toLocaleString()} voters
              </div>
              <div className="text-slate-300">
                Winner: <span className="font-semibold" style={{ color: winnerHex(tooltip.winner) }}>{tooltip.winner}</span>
              </div>
              {tooltip.renamed && tooltip.dunName2018 && (
                <div className="mt-1 text-amber-400">
                  {redelineationShortLabel(tooltip.dunName)} (pre-2023)
                </div>
              )}
            </div>
          )}

          {/* Top-left caption (always visible) */}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md bg-slate-900/70 px-2.5 py-1.5 text-[11px] text-slate-300 backdrop-blur-sm">
            <MousePointer2 className="h-3 w-3" aria-hidden />
            <span>Hover · click to open drawer · drag to rotate</span>
          </div>
        </div>

        {/* Text alternative below the canvas (WCAG 2.1 AA — visible caption) */}
        <p className="px-4 pt-3 text-xs text-slate-400">
          28 DUN extrusions colored by {scenarioLabel} winner. Click a DUN to open the drawer.
          {timelineScenario === "PROJ_2026" && (
            <>
              {" "}
              <span className="text-amber-400">
                Per-DUN PROJ_2026 winners are derived from PRN15 vote_share (scenario visualization, not a forecast).
              </span>
            </>
          )}
        </p>

        {/* Timeline controls */}
        <TimelineControls
          scenario={timelineScenario}
          projSubId={projSubId}
          onScenarioChange={onScenarioChange}
          onProjSubChange={onProjSubChange}
          caption={caption}
          seatSummary={seatSummary}
          className="border-t-0"
        />
      </CardContent>
    </Card>
  );
}

export default Map3D;
