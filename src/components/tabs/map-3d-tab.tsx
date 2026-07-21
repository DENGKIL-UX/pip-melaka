"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, Play, Pause, RotateCcw, MousePointer2, Layers, ZoomIn } from "lucide-react";
import { PARTY_COLORS, MLK_ACCENT } from "@/lib/party-colors";
import { MLK_CENTER, PARLIAMENTS } from "@/lib/melaka-constants";
import { DUN_SUMMARY, getDunByCode, type DunSummary } from "@/lib/dun-summary";
import { type PartyCode } from "@/lib/party-metadata";
import { PartyLogo } from "@/components/shared/party-logo";
import { Slider } from "@/components/ui/slider";
import { useDashboardStore } from "@/stores/dashboard-store";

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

// ─── Constants ──────────────────────────────────────────────────────────────

const SCENARIOS = ["GE14", "PRN15", "GE15"] as const;
type Scenario = (typeof SCENARIOS)[number];

const SCENARIO_LABELS: Record<Scenario, string> = {
  GE14: "GE14 · 2018",
  PRN15: "PRN15 · 2021",
  GE15: "GE15 · 2022",
};

// Equirectangular projection centered on Melaka
const PROJECTION = {
  lonCenter: MLK_CENTER[1],
  latCenter: MLK_CENTER[0],
  scale: 300,
};

function projectXY(lon: number, lat: number): [number, number] {
  return [
    (lon - PROJECTION.lonCenter) * PROJECTION.scale,
    (lat - PROJECTION.latCenter) * PROJECTION.scale,
  ];
}

function projectWorld(lon: number, lat: number, y: number): [number, number, number] {
  return [
    (lon - PROJECTION.lonCenter) * PROJECTION.scale,
    y,
    -(lat - PROJECTION.latCenter) * PROJECTION.scale,
  ];
}

/** Extract all polygon rings from a GeoJSON geometry (handles MultiPolygon). */
function getAllRings(geometry: { type: string; coordinates: unknown }): number[][][][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates as number[][][]];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates as number[][][][];
  }
  return [];
}

/** Get the largest polygon's outer ring (for centroid + label placement). */
function getMainRing(geometry: { type: string; coordinates: unknown }): number[][] {
  const rings = getAllRings(geometry);
  if (rings.length === 0) return [];
  let largest = rings[0][0];
  for (const ring of rings) {
    if (ring[0].length > largest.length) largest = ring[0];
  }
  return largest;
}

/** Get centroid of a coordinate ring (for label placement). */
function getCentroid(coords: number[][]): [number, number] {
  let lon = 0, lat = 0;
  for (const c of coords) { lon += c[0]; lat += c[1]; }
  return [lon / coords.length, lat / coords.length];
}

/** Coalition color or fallback grey. */
function coalitionColor(coalition: string | null | undefined): string {
  if (!coalition) return "#94A3B8";
  return PARTY_COLORS[coalition as keyof typeof PARTY_COLORS] ?? "#6B7280";
}

/** Get the DUN winner for a scenario from DUN_SUMMARY (richer than elDoc). */
function getDunWinnerForScenario(dun: DunSummary, scen: Scenario): string | null {
  if (scen === "PRN15") return dun.prn15.coalition;
  if (scen === "GE14") return dun.ge14.coalition;
  // GE15 is federal-only — no DUN winner, show parlimen winner
  const parl = PARLIAMENTS.find((p) => p.code === dun.parliamentCode);
  return parl?.ge15Winner ?? null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Map3DTab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraControlRef = useRef<{ sphericalState: any; updateCamera: () => void } | null>(null);
  const [scenario, setScenario] = useState<Scenario>("PRN15");
  const [playing, setPlaying] = useState(false);
  const [hoveredDun, setHoveredDun] = useState<DunSummary | null>(null);
  const [showParlimen, setShowParlimen] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { setSelectedParliament, setSelectedDun } = useDashboardStore();

  // Refs for values needed inside the Three.js effect
  const scenarioRef = useRef<Scenario>(scenario);
  useEffect(() => { scenarioRef.current = scenario; }, [scenario]);
  const showParlimenRef = useRef(showParlimen);
  useEffect(() => { showParlimenRef.current = showParlimen; }, [showParlimen]);
  const showLabelsRef = useRef(showLabels);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);

  // ─── Initialize Three.js scene (runs once) ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let animationId = 0;

    (async () => {
      try {
        const THREE: any = await import("three");
        if (cancelled || !mountRef.current) return;

        const mount = mountRef.current;
        const width = mount.clientWidth || 800;
        const height = 540;

        // Fetch GeoJSON
        const [dunRes, parRes] = await Promise.all([
          fetch("/data/boundaries/mlk-dun-geo.json"),
          fetch("/data/boundaries/mlk-parlimen-geo.json"),
        ]);
        if (!dunRes.ok || !parRes.ok) throw new Error("Boundary fetch failed");
        const dunData: GeoJSONCollection = await dunRes.json();
        const parData: GeoJSONCollection = await parRes.json();

        // ─── Scene ──────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f1e);
        scene.fog = new THREE.Fog(0x0a0f1e, 80, 200);

        // ─── Camera ─────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(30, 45, 55);

        // ─── Renderer ───────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap deprecated in r185
        mount.innerHTML = "";
        mount.appendChild(renderer.domElement);

        // ─── Custom Camera Controls (spherical orbit) ───────────────────
        // Replaces three/examples/jsm/controls/OrbitControls.js which causes
        // "__name is not defined" on Cloudflare Workers due to esbuild helper
        // not being available in the OpenNext bundle.
        const cameraTarget = new THREE.Vector3(0, 5, 0);
        const sphericalState = {
          radius: 70,
          theta: Math.PI / 4,   // azimuthal angle (horizontal)
          phi: Math.PI / 3.5,   // polar angle (vertical, 0=top, PI/2=horizon)
        };
        const updateCamera = () => {
          const r = sphericalState.radius;
          const t = sphericalState.theta;
          const p = sphericalState.phi;
          camera.position.x = cameraTarget.x + r * Math.sin(p) * Math.sin(t);
          camera.position.y = cameraTarget.y + r * Math.cos(p);
          camera.position.z = cameraTarget.z + r * Math.sin(p) * Math.cos(t);
          camera.lookAt(cameraTarget);
        };
        updateCamera();

        // Expose camera control for preset buttons
        cameraControlRef.current = { sphericalState, updateCamera };

        // Mouse drag = rotate, scroll = zoom
        let isDragging = false;
        let prevX = 0, prevY = 0;
        const onPointerDown = (e: PointerEvent) => {
          isDragging = true;
          prevX = e.clientX;
          prevY = e.clientY;
          renderer.domElement.style.cursor = "grabbing";
        };
        const onPointerUp = () => {
          isDragging = false;
          renderer.domElement.style.cursor = "grab";
        };
        const onPointerMoveDrag = (e: PointerEvent) => {
          if (!isDragging) return;
          const dx = e.clientX - prevX;
          const dy = e.clientY - prevY;
          sphericalState.theta -= dx * 0.008;
          sphericalState.phi = Math.max(0.15, Math.min(Math.PI / 2.05, sphericalState.phi - dy * 0.008));
          prevX = e.clientX;
          prevY = e.clientY;
          updateCamera();
        };
        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          sphericalState.radius = Math.max(25, Math.min(150, sphericalState.radius + e.deltaY * 0.05));
          updateCamera();
        };
        renderer.domElement.style.cursor = "grab";
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointermove", onPointerMoveDrag);
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

        // ─── Lighting ───────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x1a1a2e, 0.5);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(30, 50, 25);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 40;
        dirLight.shadow.camera.bottom = -40;
        scene.add(dirLight);

        // ─── Base plate (dark floor with subtle reflection) ─────────────
        // §6.2.5: Reflective/translucent ground with grid lines
        const floorGeo = new THREE.PlaneGeometry(120, 120);
        const floorMat = new THREE.MeshStandardMaterial({
          color: 0x111827,
          roughness: 0.6,      // Lower roughness for slight reflectivity
          metalness: 0.3,      // Higher metalness for subtle reflection
          transparent: true,
          opacity: 0.85,       // Slightly translucent for depth
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        scene.add(floor);

        // Grid helper — subtle grid for spatial reference
        const grid = new THREE.GridHelper(100, 50, 0x1e293b, 0x131c2e);
        grid.position.y = 0;
        grid.material.transparent = true;
        grid.material.opacity = 0.4;
        scene.add(grid);

        // §6.2.5: Atmospheric fog for depth perception (already have fog, enhance)
        scene.fog = new THREE.Fog(0x0a0f1e, 60, 180);

        // ─── Build DUN extrusions ───────────────────────────────────────
        const dunMeshes: Array<{
          mesh: any;
          edges: any;
          label: any;
          dun: DunSummary;
          baseHeight: number;
        }> = [];

        // Compute height scale: margin of victory determines height
        // Tighter margin = taller (more attention-grabbing)
        // Safe seats (>20pp) = shorter
        const heightForMargin = (marginPct: number): number => {
          // Map 0pp→16, 5pp→12, 15pp→8, 30pp→5, 50pp→3
          if (marginPct < 1) return 18; // Ultra-marginal
          if (marginPct < 5) return 14; // Marginal
          if (marginPct < 15) return 10; // Moderate
          if (marginPct < 30) return 7; // Safe
          return 4; // Fortress
        };

        for (const feat of dunData.features) {
          const code = String(feat.properties?.code_dun ?? "").replace("N.", "");
          const parlCode = String(feat.properties?.code_parlimen ?? "").replace("P.", "");
          const dunName = String(feat.properties?.dun ?? "").replace(/^N\.\d+\s*/, "");
          const dunSum = getDunByCode(code);
          if (!dunSum) continue;

          const rings = getAllRings(feat.geometry);
          if (rings.length === 0) continue;

          // Height based on PRN15 margin
          const baseHeight = heightForMargin(dunSum.prn15.marginPct);

          // Build a merged extrude geometry from all polygon rings
          const shapes: any[] = [];
          for (const ring of rings) {
            const outer = ring[0];
            if (outer.length < 3) continue;
            const shape = new THREE.Shape();
            outer.forEach((c, i) => {
              const [x, y] = projectXY(c[0], c[1]);
              if (i === 0) shape.moveTo(x, y);
              else shape.lineTo(x, y);
            });
            // Add holes (inner rings) if any
            for (let h = 1; h < ring.length; h++) {
              const hole = new THREE.Path();
              ring[h].forEach((c, i) => {
                const [x, y] = projectXY(c[0], c[1]);
                if (i === 0) hole.moveTo(x, y);
                else hole.lineTo(x, y);
              });
              shape.holes.push(hole);
            }
            shapes.push(shape);
          }

          if (shapes.length === 0) continue;

          // Create extrude geometry from the first (largest) shape
          // For multiple shapes, we'd need mergeGeometries, but for simplicity
          // use the largest and add the rest as separate meshes
          const mainShape = shapes[0];
          const geometry = new THREE.ExtrudeGeometry(mainShape, {
            depth: baseHeight,
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.3,
            bevelSegments: 2,
          });
          geometry.rotateX(-Math.PI / 2);

          const winner = getDunWinnerForScenario(dunSum, scenarioRef.current);
          const color = coalitionColor(winner);

          const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.88,
            shininess: 30,
            specular: 0x222222,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { dun: dunSum, type: "dun" };
          scene.add(mesh);

          // Edge outline for crisp boundaries
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry, 30),
            new THREE.LineBasicMaterial({ color: 0x1a1a2e, linewidth: 1, transparent: true, opacity: 0.6 }),
          );
          scene.add(edges);

          // Label sprite
          const mainRing = getMainRing(feat.geometry);
          const [clon, clat] = getCentroid(mainRing);
          const [cx, , cz] = projectWorld(clon, clat, 0);
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 80;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
          ctx.fillRect(0, 0, 256, 80);
          ctx.strokeStyle = MLK_ACCENT;
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, 254, 78);
          ctx.fillStyle = MLK_ACCENT;
          ctx.font = "bold 28px monospace";
          ctx.textAlign = "center";
          ctx.fillText(dunSum.dunCodeLabel, 128, 36);
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "16px sans-serif";
          ctx.fillText(dunName.slice(0, 18), 128, 62);
          const texture = new THREE.CanvasTexture(canvas);
          texture.minFilter = THREE.LinearFilter;
          const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
          label.position.set(cx, baseHeight + 3, cz);
          label.scale.set(6, 2.2, 1);
          label.userData = { type: "label" };
          scene.add(label);

          dunMeshes.push({ mesh, edges, label, dun: dunSum, baseHeight });
        }

        // ─── Parlimen wireframe overlay ─────────────────────────────────
        const parlimenLines: any[] = [];
        for (const feat of parData.features) {
          const rings = getAllRings(feat.geometry);
          for (const ring of rings) {
            const outer = ring[0];
            if (outer.length < 3) continue;
            const points: number[] = [];
            outer.forEach((c) => {
              const [x, y] = projectXY(c[0], c[1]);
              points.push(x, 0.5, -y);
            });
            // Close the loop
            const first = projectXY(outer[0][0], outer[0][1]);
            points.push(first[0], 0.5, -first[1]);

            const lineGeo = new THREE.BufferGeometry();
            lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
            const lineMat = new THREE.LineBasicMaterial({
              color: MLK_ACCENT,
              linewidth: 2,
              transparent: true,
              opacity: 0.8,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.userData = { type: "parlimen" };
            scene.add(line);
            parlimenLines.push(line);
          }
        }

        // Store refs for later updates
        sceneRef.current = { scene, camera, renderer, dunMeshes, parlimenLines, THREE };

        setLoading(false);

        // ─── Raycaster for hover/click ──────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let hoveredMesh: any = null;

        const onPointerMove = (event: MouseEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const intersects = raycaster.intersectObjects(dunMeshes.map((d) => d.mesh));

          // Reset previous hover
          if (hoveredMesh && (!intersects[0] || intersects[0].object !== hoveredMesh)) {
            hoveredMesh.material.emissive?.setHex(0x000000);
            hoveredMesh.material.opacity = 0.88;
            hoveredMesh = null;
            setHoveredDun(null);
          }

          if (intersects.length > 0) {
            const mesh = intersects[0].object;
            if (mesh !== hoveredMesh) {
              hoveredMesh = mesh;
              mesh.material.emissive = new THREE.Color(MLK_ACCENT);
              mesh.material.emissiveIntensity = 0.3;
              mesh.material.opacity = 1.0;
              setHoveredDun(mesh.userData.dun as DunSummary);
            }

            // Update tooltip position
            if (tooltipRef.current) {
              tooltipRef.current.style.left = `${event.clientX - rect.left + 15}px`;
              tooltipRef.current.style.top = `${event.clientY - rect.top + 15}px`;
              tooltipRef.current.style.display = "block";
            }
          } else {
            if (tooltipRef.current) {
              tooltipRef.current.style.display = "none";
            }
          }
        };

        const onPointerLeave = () => {
          if (hoveredMesh) {
            hoveredMesh.material.emissive?.setHex(0x000000);
            hoveredMesh.material.opacity = 0.88;
            hoveredMesh = null;
          }
          setHoveredDun(null);
          if (tooltipRef.current) {
            tooltipRef.current.style.display = "none";
          }
        };

        const onClick = (event: MouseEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const intersects = raycaster.intersectObjects(dunMeshes.map((d) => d.mesh));
          if (intersects.length > 0) {
            const ud = intersects[0].object.userData.dun as DunSummary;
            setSelectedParliament(ud.parliamentCode);
            setSelectedDun({ parliament: ud.parliamentCode, dun: ud.dunCode, name: ud.dunName });
          }
        };

        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);
        renderer.domElement.addEventListener("click", onClick);

        // ─── Resize handler ─────────────────────────────────────────────
        const onResize = () => {
          if (!mountRef.current) return;
          const w = mountRef.current.clientWidth;
          camera.aspect = w / height;
          camera.updateProjectionMatrix();
          renderer.setSize(w, height);
        };
        window.addEventListener("resize", onResize);

        // ─── Animation loop ─────────────────────────────────────────────
        const animate = () => {
          if (cancelled) return;

          // Toggle parlimen line visibility
          parlimenLines.forEach((l) => { l.visible = showParlimenRef.current; });
          // Toggle label visibility
          dunMeshes.forEach((d) => { d.label.visible = showLabelsRef.current; });

          renderer.render(scene, camera);
          animationId = requestAnimationFrame(animate);
        };
        animate();

        // Cleanup
        return () => {
          cancelled = true;
          cancelAnimationFrame(animationId);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          renderer.domElement.removeEventListener("click", onClick);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointermove", onPointerMoveDrag);
          renderer.domElement.removeEventListener("wheel", onWheel);
          window.removeEventListener("resize", onResize);
          renderer.dispose();
          // Dispose geometries + materials
          dunMeshes.forEach(({ mesh, edges, label }) => {
            mesh.geometry.dispose();
            mesh.material.dispose();
            edges.geometry.dispose();
            edges.material.dispose();
            label.material.map?.dispose();
            label.material.dispose();
          });
          parlimenLines.forEach((l) => {
            l.geometry.dispose();
            l.material.dispose();
          });
        };
      } catch (e: any) {
        console.error("[Map3DTab] init error:", e);
        setLoadError(e?.message ?? String(e));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Update colors when scenario changes ────────────────────────────────
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const { dunMeshes, THREE } = ctx;
    for (const { mesh, dun } of dunMeshes) {
      const winner = getDunWinnerForScenario(dun, scenario);
      const color = coalitionColor(winner);
      mesh.material.color.set(color);
      mesh.material.emissive?.setHex(0x000000);
    }
  }, [scenario]);

  // ─── Auto-play timeline ────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setScenario((prev) => {
        const idx = SCENARIOS.indexOf(prev);
        return SCENARIOS[(idx + 1) % SCENARIOS.length];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [playing]);

  // ─── Seat counts ────────────────────────────────────────────────────────
  const seatCounts = useMemo(() => {
    const counts: Record<string, number> = { BN: 0, PH: 0, PN: 0 };
    if (scenario === "PRN15") {
      DUN_SUMMARY.forEach((d) => { counts[d.prn15.coalition]++; });
    } else if (scenario === "GE14") {
      DUN_SUMMARY.forEach((d) => { counts[d.ge14.coalition]++; });
    } else if (scenario === "GE15") {
      PARLIAMENTS.forEach((p) => {
        if (p.ge15Winner && p.ge15Winner in counts) counts[p.ge15Winner]++;
      });
    }
    return counts;
  }, [scenario]);

  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <Card className="border-mlk/20" role="region" aria-label="3D Map module — Three.js with real Melaka GeoJSON">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">3D Map — Three.js ({SCENARIO_LABELS[scenario]})</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real DOSM kawasanku GeoJSON · 28 DUN extruded by margin · Drag to rotate · Hover for results
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 text-xs ${showParlimen ? "text-mlk" : "text-muted-foreground"}`}
              onClick={() => setShowParlimen((v) => !v)}
              aria-label="Toggle parlimen overlay"
            >
              <Layers className="h-3.5 w-3.5 me-1" />
              Parlimen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 text-xs ${showLabels ? "text-mlk" : "text-muted-foreground"}`}
              onClick={() => setShowLabels((v) => !v)}
              aria-label="Toggle labels"
            >
              <MousePointer2 className="h-3.5 w-3.5 me-1" />
              Labels
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { setPlaying(false); setScenario("PRN15"); }}
              aria-label="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline scrubber — enhanced with slider */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            {SCENARIOS.map((s, i) => (
              <button
                key={s}
                onClick={() => { setPlaying(false); setScenario(s); }}
                className={`flex-1 rounded-md p-2 text-center transition-all ${
                  scenario === s ? "bg-mlk text-white shadow-md" : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="text-xs font-semibold">{SCENARIO_LABELS[s]}</div>
              </button>
            ))}
          </div>
          {/* Slider for smooth timeline scrubbing */}
          <div className="flex items-center gap-3 px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Slider
              value={[SCENARIOS.indexOf(scenario)]}
              onValueChange={([v]) => { setPlaying(false); setScenario(SCENARIOS[v]); }}
              max={SCENARIOS.length - 1}
              step={1}
              className="flex-1"
              aria-label="Timeline slider"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground w-32 flex-shrink-0 text-right">
              <span className="font-mono">{SCENARIO_LABELS[scenario]}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mb-3 text-xs flex-wrap">
          <span className="text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" /> Coalition:</span>
          {Object.entries(PARTY_COLORS).map(([code, color]) => (
            <span key={code} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {code}
            </span>
          ))}
          <span className="text-muted-foreground ml-auto flex items-center gap-1">
            <ZoomIn className="h-3 w-3" /> Drag to rotate · Scroll to zoom · Click DUN to select
          </span>
        </div>

        {/* 3D canvas container */}
        <div className="relative rounded-lg border border-slate-700 overflow-hidden" style={{ height: 540 }}>
          <div
            ref={mountRef}
            className="w-full h-full"
            style={{ background: "#0a0f1e" }}
            role="img"
            aria-label="3D visualization of 28 Melaka DUN extrusions"
          />

          {/* Camera presets — top-center */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="glass rounded-lg p-1 flex gap-0.5">
              {[
                { label: "Top", radius: 80, theta: 0, phi: 0.15 },
                { label: "Iso", radius: 70, theta: Math.PI / 4, phi: Math.PI / 3.5 },
                { label: "Side", radius: 65, theta: 0, phi: Math.PI / 2.2 },
                { label: "Close", radius: 35, theta: Math.PI / 4, phi: Math.PI / 3 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const cc = cameraControlRef.current;
                    if (cc) {
                      cc.sphericalState.radius = preset.radius;
                      cc.sphericalState.theta = preset.theta;
                      cc.sphericalState.phi = preset.phi;
                      cc.updateCamera();
                    }
                  }}
                  className="px-3 py-1 text-[10px] rounded-md hover:bg-mlk/20 text-slate-300 hover:text-mlk transition-colors font-medium"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm shadow-md">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-mlk border-t-transparent" />
                <span>Loading 3D map…</span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {loadError && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm z-10 p-4">
              <div className="rounded-lg bg-card border border-red-500/30 p-4 text-sm shadow-lg max-w-md">
                <div className="font-semibold text-red-500 mb-1">3D map failed to load</div>
                <div className="text-xs text-muted-foreground mb-3 font-mono break-all">{loadError}</div>
                <Button size="sm" onClick={handleRetry} className="h-7 text-xs">
                  <RotateCcw className="h-3 w-3 me-1" /> Reload
                </Button>
              </div>
            </div>
          )}

          {/* Floating tooltip */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none z-20 hidden"
            style={{ display: "none" }}
          >
            {hoveredDun && (
              <div className="rounded-lg border border-mlk/40 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur min-w-[220px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-mlk">{hoveredDun.dunCodeLabel}</span>
                  <span className="font-semibold text-white">{hoveredDun.dunName}</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-2">{hoveredDun.parliamentName} · {hoveredDun.district}</div>
                {(() => {
                  const result = scenario === "PRN15" ? hoveredDun.prn15 : scenario === "GE14" ? hoveredDun.ge14 : null;
                  if (!result) {
                    // GE15 — show parlimen winner
                    const parl = PARLIAMENTS.find((p) => p.code === hoveredDun.parliamentCode);
                    return (
                      <div className="text-xs">
                        <div className="text-amber-400 mb-1">⚠ GE15 = federal only — no DUN ballot</div>
                        <div>
                          <span className="text-slate-400">GE15 Parlimen: </span>
                          <span className="font-semibold" style={{ color: coalitionColor(parl?.ge15Winner) }}>
                            {parl?.ge15Winner ?? "—"}
                          </span>
                        </div>
                        <div className="mt-1 pt-1 border-t border-slate-700">
                          <span className="text-slate-400">PRN15 DUN: </span>
                          <span className="font-semibold" style={{ color: coalitionColor(hoveredDun.prn15.coalition) }}>
                            {hoveredDun.prn15.coalition}
                          </span>
                          <span className="text-slate-500"> ({hoveredDun.prn15.party})</span>
                        </div>
                      </div>
                    );
                  }
                  const otherResult = scenario === "PRN15" ? hoveredDun.ge14 : hoveredDun.prn15;
                  const swing = result.coalition !== otherResult.coalition;
                  return (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <PartyLogo party={result.party as PartyCode} size="xs" />
                        <span className="text-slate-400">{scenario}: </span>
                        <span className="font-semibold" style={{ color: coalitionColor(result.coalition) }}>
                          {result.coalition}
                        </span>
                        <span className="text-slate-500"> ({result.party})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 pl-6">{result.candidate}</div>
                      <div className="text-[10px] text-slate-500">
                        {result.votes.toLocaleString()} votes · {result.votesPct.toFixed(1)}% · margin {result.marginPct.toFixed(1)}pp
                      </div>
                      {swing && (
                        <div className="text-[10px] text-mlk font-semibold">
                          ⟳ Swing: {otherResult.coalition} → {result.coalition}
                        </div>
                      )}
                      {hoveredDun.isMarginal && (
                        <div className="text-[10px] text-red-400 font-semibold">⚠ Marginal seat (&lt;5pp)</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Seat summary — bottom-left */}
          <div className="absolute bottom-3 left-3 z-10">
            <div className="rounded-lg border border-mlk/30 bg-slate-950/90 px-3 py-2 shadow-lg backdrop-blur">
              <div className="text-[10px] text-slate-400 uppercase mb-1">{scenario} {scenario === "GE15" ? "parlimen" : "DUN"} seats</div>
              <div className="flex gap-3">
                {Object.entries(seatCounts).map(([party, count]) => (
                  <div key={party} className="text-center">
                    <div className="text-lg font-bold" style={{ color: coalitionColor(party) }}>{count}</div>
                    <div className="text-[9px] text-slate-400">{party}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Height legend — bottom-right */}
          <div className="absolute bottom-3 right-3 z-10">
            <div className="rounded-lg border border-mlk/30 bg-slate-950/90 px-3 py-2 shadow-lg backdrop-blur">
              <div className="text-[10px] text-slate-400 uppercase mb-1">Height = Margin</div>
              <div className="flex items-end gap-1">
                <div className="flex flex-col items-center">
                  <div className="w-3 bg-emerald-500" style={{ height: 8 }} />
                  <div className="text-[8px] text-slate-400 mt-0.5">Safe</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-3 bg-amber-500" style={{ height: 14 }} />
                  <div className="text-[8px] text-slate-400 mt-0.5">Mod.</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-3 bg-orange-500" style={{ height: 18 }} />
                  <div className="text-[8px] text-slate-400 mt-0.5">Marg.</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-3 bg-red-500" style={{ height: 24 }} />
                  <div className="text-[8px] text-slate-400 mt-0.5">Ultra</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
          Three.js r185 · Real DOSM kawasanku GeoJSON (28 DUN + 6 parlimen) · Equirectangular projection ·
          Extruded by margin of victory · Custom orbit controls (drag/zoom) · Raycaster hover + click
        </p>
      </CardContent>
    </Card>
  );
}
