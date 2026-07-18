# MAP-3D-CREATION.md — Universal 3D Three.js Map Module for Malaysian State PIPs

> Truth Above All. Universal, state-parameterised 3D electoral map module for
> every PIP-* blueprint repo. Reference implementation: PIP-N9 (raw Three.js,
> no @react-three/fiber). Cross-refs: `MAP-2D-CREATION.md` (shares the Zustand
> `selectedDUN` store for 2D↔3D selection sync), `MALAYSIA-ADM-FETCH.md`
> (geometry sources + the `{state}-elevation.json` DEM).

---

## 1. Purpose + Scope

Renders the interactive 3D electoral map for **any** Malaysian state PIP — all
16 states + 3 Federal Territories. Federal Territories (KL / Putrajaya /
Labuan) produce **0 ExtrudedDUN meshes** because they have 0 DUNs; the build
pipeline must skip DUN-related layers gracefully and the canvas still renders
terrain + parlimen boundaries + HUDRing.

Scope **in**: equirectangular projection (NOT Mercator), extruded DUN towers
with custom side-wall shader, DEM-based terrain, HTML div label overlays,
InstancedMesh scatter, QuadraticBezier fly-lines, HUDRing + ChaseLight +
BeamLights + Sparkles, 4-corner ECharts overlays, timeline morph (GE14/PRN15/
2026), raycaster click → Zustand sync, prefers-reduced-motion compliance.

Scope **out**: 2D Leaflet module (see `MAP-2D-CREATION.md`); ADM fetch (see
`MALAYSIA-ADM-FETCH.md`); LLM engine + scenario projections (see engine docs).

---

## 2. Prerequisites

### 2.1 Runtime deps

```bash
npm i three zustand next echarts
npm i -D @types/three
```

PIP-N9 uses raw `three` (no `@react-three/fiber`) — the universal version keeps
that choice for 1:1 parity with the reference. R3F is optional but adds bundle
weight (~80 KB) without feature gain for this scene graph.

### 2.2 Data files

| File | Purpose | ~Size (N9) |
| --- | --- | --- |
| `{s}-adm1-geo.json` | State outline (ChaseLight contour) | 50 KB |
| `{s}-dun-geo.json` | DUN polygons → ExtrudedDUN meshes | 400 KB |
| `{s}-parlimen-geo.json` | Parlimen boundaries | 150 KB |
| `{s}-localities.json` | ScatterPoints | 80 KB |
| `{s}-towns.json` | Google Places coords for par labels | 4 KB |
| `{s}-elevation.json` | DEM grid (`{_meta.bounds, rows, cols}`) | 200 KB |
| `{s}-priority.json` | P1-P4 bands per DUN | 16 KB |
| `{s}-elections.json` | GE14/PRN15/2026 + scenario overrides | 120 KB |

### 2.3 Zustand store

Same `useMapStore` as 2D (see `MAP-2D-CREATION.md` §4). `selectedDUN`,
`timeline`, `scenario` are read by both maps → 2D↔3D sync is free.

---

## 3. The Projection Math (CRITICAL)

Equirectangular, centered, **linear**. NOT Mercator. Two functions:

```typescript
// src/lib/projection.ts
export const PROJECTION = {
  lonCenter: 102.20,   // N9 centroid longitude — STATE-SPECIFIC
  latCenter: 2.84,     // N9 centroid latitude  — STATE-SPECIFIC
  scale: 80,           // N9 scale factor       — STATE-SPECIFIC
};

/** 2D XY for THREE.Shape (rotated -90°X to lie flat in world XZ). */
export function projectShape(lon: number, lat: number): [number, number] {
  return [
    (lon - PROJECTION.lonCenter) * PROJECTION.scale,
    (lat - PROJECTION.latCenter) * PROJECTION.scale,
  ];
}

/** 3D [x, y, z] for world placement (cameras, lights, scatter, labels). */
export function projectWorld(lon: number, lat: number, y: number): [number, number, number] {
  return [
    (lon - PROJECTION.lonCenter) * PROJECTION.scale,
    y,
    -(lat - PROJECTION.latCenter) * PROJECTION.scale,   // minus sign is CRITICAL
  ];
}
```

### 3.1 Why the minus sign on Z?

North = -Z. Without the minus sign, the map renders **mirrored** (Penang
appears south of Johor, east coast on the wrong side). The mistake is silent
because Three.js doesn't error on it — features just appear in the wrong place.

### 3.2 Scale factor per state size

| State class | Examples | scale |
| --- | --- | --- |
| Tiny | Perlis, Labuan, Putrajaya | 150-200 |
| Small | Melaka, Penang, N9 | 80-100 |
| Medium | Kedah, Selangor, Terengganu, Kelantan | 60-80 |
| Large | Pahang, Johor, Perak, Sabah, Sarawak | 40-60 |

### 3.3 Computing center from ADM1 centroid

```typescript
// At build time, after ADM1 GeoJSON is fetched:
import { centroid } from "@turf/centroid";  // or manual ring centroid
const c = centroid(adm1Feature).geometry.coordinates; // [lon, lat]
const lonCenter = c[0];
const latCenter = c[1];
// scale: pick so the ADM1 bounding box spans ~80-120 units across the longest axis
const bbox = turfBbox(adm1Feature); // [minLon, minLat, maxLon, maxLat]
const lonSpan = bbox[2] - bbox[0];
const latSpan = bbox[3] - bbox[1];
const scale = 100 / Math.max(lonSpan, latSpan * 1.5);  // tuned for canvas
```

### 3.4 Distortion note

Equirectangular distorts area away from the equator, but Malaysia spans only
~6° of latitude (1°N to 7°N). The distortion is **negligible** at this span —
<0.5% error vs Mercator. Don't bother with Web Mercator.

---

## 4. ExtrudedDUN Builder

### 4.1 Geometry

- Height: `Math.max(2, priority_score * 20)` — min 2 units so DUNs with low
  priority_score still poke above terrain.
- Color: `bandColor(priority_band)` (P1-P4) by default; for the 2026 projection
  stop, color morphs to `PARTY_COLORS[winner_party]` (see §14).
- Multi-polygon support via `getAllOuterRings()` — each ring becomes its own
  `THREE.Shape` top + side-wall strip.
- Top mesh `userData = { dunCode: feat.code }` for raycaster (§15).

### 4.2 Top mesh

`THREE.Shape` → `ShapeGeometry` → rotated `-90°X` (lies flat in XZ plane) at
`y = height`. Material:

```typescript
const topMat = new THREE.MeshStandardMaterial({
  color: 0x071407,
  emissive: bandColor,             // P1-P4 or party color
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
});
```

### 4.3 Side walls (custom ShaderMaterial)

Each ring's perimeter becomes a vertical strip from `y=0` to `y=height`. The
shader: 3-color vertical gradient (dark base → mid band color → bright top) +
edge glow at corners + animated scan-line driven by uniform `uScanTime`
(updated each frame from the render loop).

```glsl
// vertex
varying vec3 vWorldPos;
varying float vHeightNorm;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vHeightNorm = position.y / uHeight;  // 0 at base, 1 at top
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// fragment
uniform vec3 uBottom;
uniform vec3 uMid;
uniform vec3 uTop;
uniform float uScanTime;
uniform float uHeight;
varying float vHeightNorm;
void main() {
  // 3-stop gradient
  vec3 col = mix(uBottom, uMid, smoothstep(0.0, 0.5, vHeightNorm));
  col = mix(col, uTop, smoothstep(0.5, 1.0, vHeightNorm));
  // Edge glow: brighter near vertical edges (use derivative of world pos)
  // Scan-line: bright horizontal band sweeping up
  float scan = exp(-pow((vHeightNorm - mod(uScanTime, 1.2)) * 6.0, 2.0));
  col += scan * 0.4;
  gl_FragColor = vec4(col, 0.92);
}
```

```typescript
const sideMat = new THREE.ShaderMaterial({
  uniforms: {
    uBottom:  { value: new THREE.Color(0x05080f) },
    uMid:     { value: new THREE.Color(bandColor) },
    uTop:     { value: new THREE.Color(bandColor).multiplyScalar(1.4) },
    uScanTime:{ value: 0 },
    uHeight:  { value: height },
  },
  transparent: true,
  side: THREE.DoubleSide,
});
```

### 4.4 Boundary line

A `THREE.Line` at `y = height + 0.05` so the outline is always visible above
the top mesh. Material `LineBasicMaterial({ color: 0x00ffff, opacity: 0.6 })`.

### 4.5 Full builder (excerpt)

```typescript
export function buildExtrudedDUN(feat: GeoJSON.Feature): THREE.Group {
  const group = new THREE.Group();
  const props = feat.properties ?? {};
  const height = Math.max(2, (props.priority_score ?? 0) * 20);
  const bandColor = new THREE.Color(PRIORITY_HEX[props.priority_band] ?? 0x94a3b8);

  for (const ring of getAllOuterRings(feat.geometry)) {
    const shape = new THREE.Shape();
    ring.forEach(([lon, lat], i) => {
      const [x, z] = projectShape(lon, lat);
      if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
    });

    // Top
    const topGeo = new THREE.ShapeGeometry(shape);
    topGeo.rotateX(-Math.PI / 2);
    topGeo.translate(0, height, 0);
    const topMesh = new THREE.Mesh(topGeo, topMat.clone());
    topMesh.userData = { dunCode: props.code };          // raycaster (§15)
    group.add(topMesh);

    // Side walls
    const sideGeo = buildSideGeometry(shape, height);
    const sideMat = makeSideMaterial(bandColor, height);
    group.add(new THREE.Mesh(sideGeo, sideMat));

    // Boundary line
    const lineGeo = new THREE.BufferGeometry().setFromPoints(
      ring.map(([lon, lat]) => {
        const [x, z] = projectShape(lon, lat);
        return new THREE.Vector3(x, height + 0.05, -z);  // ponytail: -z = north
      }),
    );
    group.add(new THREE.Line(lineGeo, lineMat));
  }
  return group;
}
```

`getAllOuterRings` iterates `Polygon` (single ring) and `MultiPolygon`
(multiple rings), skipping holes (interior rings) — DUN shapes don't have
meaningful holes; ignoring them simplifies the side-wall builder.

---

## 5. Terrain

### 5.1 Two options

**(a) Flat** — `PlaneGeometry(120, 100)` with `MeshStandardMaterial({ color:
0x0a0e1a, roughness: 0.9 })`. Simple, ~5 ms build. Use for states without DEM.

**(b) DEM-based** — PIP-N9 uses this. Real elevation mesh from
`{state}-elevation.json` (row × col grid with `_meta.bounds`).

### 5.2 DEM-based terrain (PIP-N9 pattern)

1. Load `{state}-elevation.json` — `{ _meta: { bounds: [minLon,minLat,maxLon,maxLat], rows, cols }, grid: number[][] }`.
2. Build grayscale `CanvasTexture` displacement map (brightness = normalised elevation).
3. Build `normalMap` via **Sobel filter** on the elevation gradient.
4. `PlaneGeometry(120, 100, cols-1, rows-1)` — vertex grid matches DEM resolution.
5. `MeshStandardMaterial({ color: 0x0a0e1a, displacementMap, displacementScale: 3, normalMap, normalScale: (0.8, 0.8), roughness: 0.9, metalness: 0.1 })`.
6. Rotated `-90°X`, at `y = -0.1`.
7. Plus `GridHelper(400, 40)` opacity `0.15` for spatial reference.

### 5.3 Lazy-load terrain AFTER DUN extrusions (universal fix)

PIP-N9 loads terrain synchronously — this blocks the first paint of the DUN
towers by ~80 ms. The universal version defers terrain:

```typescript
// Render DUN extrusions + HUDRing + labels FIRST (visible in <50 ms),
// then async-load the DEM and swap the flat plane for the DEM mesh.
requestIdleCallback(async () => {
  const elev = await fetch(`/${STATE_CONFIG.pipCode.toLowerCase()}-elevation.json`).then(r => r.json());
  const terrain = buildDEMTerrain(elev);
  scene.remove(flatPlane); flatPlane.geometry.dispose(); flatPlane.material.dispose();
  scene.add(terrain);
});
```

The plane size (N9 uses 120×100) is N9-specific — universal version pulls from
`STATE_CONFIG_3D.groundPlane`. See §18.

---

## 6. Labels (HTML div overlays)

NOT sprites. NOT CSS2DRenderer. A plain `<div>` appended to the Three.js
container with `position: absolute; inset: 0; pointer-events: none; overflow:
hidden; z-index: 5`. Each label is a child `<div>` positioned via screen coords
computed each frame.

### 6.1 DUN labels

Top **10** by `priority_score` (NOT P1-only — PIP-N9 has 0 P1 DUNs, so a
P1-only filter would render 0 labels). Position via `ringCentroid(getOuterRing(feat.geometry))`.
Text = `${code} ${name.slice(0,12)}` colored by priority band.

### 6.2 Parliament labels

Use Google Places API coords from `{state}-towns.json` if available (more
accurate than polygon centroid for place-name recognition — e.g. "Seremban"
should pin at the city, not the polygon centroid). Fallback: centroid.
Orange `#fb923c`.

### 6.3 Per-frame projection

```typescript
const v = new THREE.Vector3();
const camera = renderer.domElement.parentElement.querySelector("canvas") && camera3D;
function updateLabels() {
  for (const label of labelEls) {
    const [x, y, z] = projectWorld(label.lon, label.lat, label.height);
    v.set(x, y, z);
    v.project(camera);
    // Frustum cull: v.z < 1 means in front of camera.
    if (v.z < 1) {
      const sx = (v.x * 0.5 + 0.5) * containerW;
      const sy = (-v.y * 0.5 + 0.5) * containerH;
      label.el.style.display = "block";
      label.el.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
    } else {
      label.el.style.display = "none";
    }
  }
}
// Called in the render loop after renderer.render(scene, camera).
```

---

## 7. The 8 3D Layers

| # | id | label | group | defaultOn |
| --- | --- | --- | --- | --- |
| 1 | terrain | Terrain DEM | terrain | ON |
| 2 | dunExtrusions | DUN towers | geometry | ON |
| 3 | electionHistory | Election history colors | geometry | OFF |
| 4 | parlimen | Parlimen boundaries | geometry | ON |
| 5 | scatter | Locality scatter | overlay | ON |
| 6 | hudRing | HUD ring + ticks | overlay | ON |
| 7 | dunLabels | DUN labels (top 10) | overlay | ON |
| 8 | parLabels | Parliament labels | overlay | ON |

3 groups: `terrain` / `geometry` / `overlay`. All 8 ON by default. Layer toggles
live in the same Zustand store as 2D (`layers3d: Record<string, boolean>`,
persisted to `pip-{state}-state`). The `electionHistory` layer overrides DUN
colors with winning-party colors when ON — useful for the 2026 projection stop.

---

## 8. ScatterPoints (InstancedMesh)

```typescript
const count = localities.length;            // 2,001 for N9
const geo = new THREE.SphereGeometry(0.35, 6, 6);
const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });
const mesh = new THREE.InstancedMesh(geo, mat, count);
mesh.frustumCulled = false;                  // instanced; culling breaks

const dummy = new THREE.Object3D();
const color = new THREE.Color();
localities.forEach((l, i) => {
  const [x, y, z] = projectWorld(l.lon, l.lat, Math.min(0.5 + l.voters / 2000, 2.0));
  dummy.position.set(x, y, z);
  dummy.scale.setScalar(Math.min(0.5 + l.voters / 1500, 1.5));
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  color.set(PRIORITY_HEX[l.priority_band] ?? 0x94a3b8);
  mesh.setColorAt(i, color);
});
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
```

2,001 points in **1 draw call** (vs 2,001 separate meshes). `frustumCulled =
false` is critical — InstancedMesh bounding sphere covers the whole scene, so
default culling would hide the entire cluster when the camera tilts.

---

## 9. FlyLines

Pairs of P1 DUNs (or top-6 by `priority_score` if `<2` P1 DUNs — PIP-N9 hits
this branch). `QuadraticBezierCurve3` between centroid→centroid, `midY =
max(scores) * 20 + 15`. Static `Line` with `LineBasicMaterial({ opacity:
0.35 })` + traveling dot `SphereGeometry(0.4, 8, 8)` at `0.3 progress/sec`.

```typescript
const curve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(...projectWorld(a.lon, a.lat, 0)),
  new THREE.Vector3(...projectWorld((a.lon + b.lon) / 2, (a.lat + b.lat) / 2, midY)),
  new THREE.Vector3(...projectWorld(b.lon, b.lat, 0)),
);
const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 }));
const dot = new THREE.Mesh(
  new THREE.SphereGeometry(0.4, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
// In render loop:
const t = (clock.getElapsedTime() * 0.3) % 1;
dot.position.copy(curve.getPoint(t));
```

---

## 10. HUDRing

3 components. Adjust radii per state size via `STATE_CONFIG_3D.hudRingRadius`
(N9 = 55/58 — assumes N9 fits in a 110-unit circle; Sabah/Sarawak need ~120,
Perlis/Putrajaya ~30).

| Component | Geometry | Color | Opacity |
| --- | --- | --- | --- |
| Inner ring | `TorusGeometry(R, 1.0, 16, 128)` | 0x00d4ff | 0.7 |
| Outer ring | `TorusGeometry(R+3, 0.4, 12, 128)` | 0x00d4ff | 0.25 |
| 12 ticks | `BoxGeometry(0.5, 2.0, 0.5)` at `cos(θ)*R, 0.5, sin(θ)*R` | 0x00d4ff | 0.6 |

Rotates `0.1 rad/sec` around Y. Skip rotation when `prefers-reduced-motion`
(§16).

---

## 11. ChaseLight (the "DistrictRings" analog)

30 segments along the ADM1 state outline at `y = 0.3`. Each segment is a `Line`
with `opacity: 0`. Animation: head sweeps at `(t × 0.15 × segCount) % segCount`,
segments within 20 of the head fade in by distance.

```typescript
const segCount = 30;
const segments = buildAdm1Segments(adm1Feature, segCount);  // Line[]
// In render loop:
const head = Math.floor((clock.getElapsedTime() * 0.15 * segCount) % segCount);
segments.forEach((seg, i) => {
  const dist = Math.min(Math.abs(i - head), segCount - Math.abs(i - head));
  const op = dist < 20 ? (1 - dist / 20) * 0.8 : 0;
  seg.material.opacity = op;
});
```

---

## 12. ChartOverlay3D

4 corner ECharts panels as 2D HTML overlays (NOT 3D billboards). `motion.div`
with staggered entrance, `bg-slate-900/85 backdrop-blur-sm`,
`pointer-events-none` (clicks pass through to the canvas).

| Corner | Chart |
| --- | --- |
| Top-left | PRN15 seat donut (PH/BN/PN/IND slice) |
| Top-right | 10 closest races (bar, sorted by majority %) |
| Bottom-left | Turnout top 10 (bar) |
| Bottom-right | Avg turnout gauge + stats grid |

Stagger entrance via `motion.div` `initial/animate` with `transition.delay =
index * 0.08`. Re-render on `timeline` and `scenario` change.

---

## 13. CameraControls

```typescript
const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 3000);
camera.position.set(50, 70, 100);    // STATE_CONFIG_3D.defaultCamera
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 15;
controls.maxDistance = 200;
controls.maxPolarAngle = Math.PI / 2.1;   // prevent below horizon
controls.autoRotate = false;              // toggled via window.__autoRotate3D
controls.autoRotateSpeed = 1.5;
```

### 13.1 Auto-rotate (cleaner than window global)

PIP-N9 uses `window.__autoRotate3D` as a React→imperative bridge — hacky. The
universal version uses a `useRef` exposed via `forwardRef`:

```typescript
export const ThreeMap = forwardRef<{ setAutoRotate: (on: boolean) => void }>((props, ref) => {
  const autoRotateRef = useRef(false);
  useImperativeHandle(ref, () => ({
    setAutoRotate: (on) => { autoRotateRef.current = on; controls.autoRotate = on; },
  }));
  // ...
});
```

### 13.2 Save/reset to localStorage (REMOVE the NODE_ENV restriction)

PIP-N9 registers save/reset **only when `NODE_ENV !== "production"`** — a
quirk that means production users can't save camera presets. The universal
version removes the restriction:

```typescript
const STORAGE_KEY = `pip-${STATE_CONFIG.pipCode.toLowerCase()}-3d-camera`;

function saveCamera() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    fov: camera.fov,
    px: camera.position.x, py: camera.position.y, pz: camera.position.z,
    tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
  }));
}

function resetCamera() {
  localStorage.removeItem(STORAGE_KEY);
  camera.position.set(50, 70, 100);     // STATE_CONFIG_3D.defaultCamera
  controls.target.set(0, 0, 0);
  controls.update();
}

function loadCamera() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const c = JSON.parse(raw);
    if (typeof c.fov === "number") camera.fov = c.fov;
    if (typeof c.px === "number") camera.position.set(c.px, c.py, c.pz);
    if (typeof c.tx === "number") controls.target.set(c.tx, c.ty, c.tz);
    camera.updateProjectionMatrix();
    controls.update();
  } catch { /* corrupt — ignore */ }
}
```

Remount reset via a `resetKey` state increment (parent bumps `resetKey` →
`ThreeMap` remounts → `loadCamera()` runs in `useEffect`).

---

## 14. Timeline Morph

3 stops: `["GE14_2018", "PRN15_2023", "PROJ_2026"]`. For `PROJ_2026`, applies
scenario override (`elec.scenarios[scenario]` overrides `winner_party` +
`vote_share_pct`).

### 14.1 Height morph

```typescript
const morphHeight = Math.max(2, (voteSharePct / 100) * 15);
// Lerp group.scale.y at 8%/frame for smooth transition:
group.scale.y += (targetScaleY - group.scale.y) * 0.08;
```

### 14.2 Color morph

```typescript
sideMat.uniforms.uTop.value.lerp(new THREE.Color(PARTY_COLORS[winnerParty]), 0.08);
topMat.emissive.lerp(new THREE.Color(PARTY_COLORS[winnerParty]), 0.08);
```

The 8%/frame lerp produces a ~250 ms transition at 60 fps. The 2D map is fixed
at `PRN15_2023` and does NOT respond to scenario projections — only 3D does.

---

## 15. Raycaster Click → Zustand Sync

```typescript
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const topMeshes: THREE.Mesh[] = [];   // collected at build time

renderer.domElement.addEventListener("pointerdown", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(topMeshes);
  if (hits.length > 0) {
    const code = hits[0].object.userData.dunCode as string;
    useMapStore.getState().setSelectedDUN(code);   // 2D drawer opens too!
  }
});
```

Because both maps read the same Zustand `selectedDUN`, clicking a 3D tower
opens the 2D `SelectedDUNDrawer` and vice versa — 2D↔3D sync for free.

---

## 16. prefers-reduced-motion (MANDATORY)

PIP-N9 MISSED this — known WCAG 2.1 AA violation. The universal version MUST
add the matchMedia check at the top of the render loop:

```typescript
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionOk = !reducedMotion;

// Skip these animations when motionOk === false:
//   - controls.autoRotate (always false)
//   - sideMat.uniforms.uScanTime update (held at 0)
//   - HUDRing rotation (held at 0)
//   - ChaseLight head sweep (held at 0)
//   - FlyLines traveling dot (held at midpoint)
//   - Sparkles drift (held static)
//   - BeamLights rise animation (held static)
//   - Ripple expansion (held at 1.0)
// Keep these (they're not motion):
//   - Camera damping on user drag (still allowed — it's user-initiated)
//   - Timeline morph (user-initiated via timeline control click)
//   - Label position updates (follow camera, not autonomous motion)
```

Test by toggling `Develop → Rendering → Emulate CSS prefers-reduced-motion:
reduce` in Chrome DevTools. All autonomous animation must freeze.

---

## 17. Cleanup

```typescript
useEffect(() => {
  // ... setup ...
  return () => {
    cancelAnimationFrame(rafId);
    resizeObs.disconnect();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();          // WEBGL_lose_context
    container.removeChild(renderer.domElement);
    container.removeChild(labelContainer);
  };
}, []);
```

Miss any of these and you leak GPU memory on every route change → tab crashes
after ~10 navigations.

---

## 18. State Parameterisation

```typescript
// src/config/state-config-3d.ts
export interface StateConfig3D {
  pipCode: string;
  projection: { lonCenter: number; latCenter: number; scale: number };
  groundPlane: { width: number; height: number };  // N9 = (120, 100)
  hudRingRadius: number;                            // N9 = 55
  defaultCamera: { px: number; py: number; pz: number; fov: number }; // N9 = (50,70,100,45)
  layers3d?: Partial<Record<string, boolean>>;      // override defaults
  hasDEM: boolean;                                  // false → flat plane
}

export const STATE_CONFIG_3D: StateConfig3D = {
  pipCode: "N",
  projection: { lonCenter: 102.20, latCenter: 2.84, scale: 80 },
  groundPlane: { width: 120, height: 100 },
  hudRingRadius: 55,
  defaultCamera: { px: 50, py: 70, pz: 100, fov: 45 },
  hasDEM: true,
};
```

For each new state, compute `projection` from ADM1 centroid (§3.3), pick
`groundPlane` to match the ADM1 bounding box aspect ratio, scale `hudRingRadius`
to fit, and set `defaultCamera` so the whole state is visible at first paint.

---

## 19. Accessibility (WCAG 2.1 AA)

| Criterion | Implementation |
| --- | --- |
| 2.3.3 Animation from interactions | `prefers-reduced-motion` (§16) skips autonomous motion. |
| 2.1.1 Keyboard | Raycaster triggers via keyboard nav: Tab focuses canvas, Arrow keys move a virtual pointer, Enter selects. (PIP-N9 missed this — universal version adds it.) |
| 2.4.3 Focus order | Tab order: canvas → timeline control → layer panel → chart overlays. |
| 4.1.2 Name/Role/Value | Canvas has `role="application" aria-label="3D electoral map"`. |
| 1.4.3 Contrast | HUD ring + labels meet 4.5:1 against dark canvas (`#0a0e1a`). |

---

## 20. Performance

| Knob | Setting | Rationale |
| --- | --- | --- |
| InstancedMesh for scatter | 1 draw call for 2,001 points | Separate meshes = 2,001 draw calls = ~30 ms/frame. |
| `frustumCulled = false` on InstancedMesh | true | Default culling hides the whole cluster when camera tilts. |
| Lazy-load ThreeMap | `dynamic(() => import("./ThreeMap"), { ssr: false })` | Keeps initial dashboard JS bundle free of three.js (~600 KB). |
| DEM lazy after DUN render | `requestIdleCallback` (§5.3) | First paint <50 ms; DEM swaps in when idle. |
| Dispose on unmount | §17 | Prevents GPU memory leak across route changes. |
| `pointer-events: none` on chart overlays | true | Clicks pass through to canvas; no raycaster overhead from chart panels. |
| Limit raycaster to `topMeshes` only | not full scene | 36 top meshes vs ~5,000 total objects → 100× faster intersect. |

---

## 21. Code Snippets (Quotable)

### 21.1 Projection function — see §3

### 21.2 ExtrudedDUN builder — see §4.5

### 21.3 Side wall shader — see §4.3

### 21.4 Camera save/reset WITHOUT the NODE_ENV restriction — see §13.2

### 21.5 Raycaster click → Zustand sync — see §15

---

## 22. Quirks Fixed in Universal Version (vs PIP-N9)

| # | PIP-N9 quirk | Universal fix |
| --- | --- | --- |
| 1 | `prefers-reduced-motion` not respected | MatchMedia check at top of render loop (§16) |
| 2 | Camera save/reset only in `NODE_ENV !== "production"` | Always registered (§13.2) |
| 3 | `window.__autoRotate3D` bridge | `forwardRef` + `useImperativeHandle` (§13.1) |
| 4 | Projection center hardcoded to N9 (102.20, 2.84) | `STATE_CONFIG_3D.projection` (§18) |
| 5 | HUDRing radius (55) hardcoded for N9 | `STATE_CONFIG_3D.hudRingRadius` (§18) |
| 6 | Ground plane (120×100) hardcoded for N9 aspect | `STATE_CONFIG_3D.groundPlane` (§18) |
| 7 | Default camera (50,70,100) hardcoded for N9 | `STATE_CONFIG_3D.defaultCamera` (§18) |
| 8 | DEM loaded synchronously (blocks first paint) | Lazy via `requestIdleCallback` after DUN render (§5.3) |
| 9 | Ripple center hardcoded to Seremban (101.93, 2.73) | Removed (not universal); replaced with optional `STATE_CONFIG_3D.capitalRipple` |
| 10 | Labels top-10 hardcoded; PIP-N9 has 0 P1 DUNs so falls back silently | Explicit fallback documented (§6.1) — top-10 by priority_score regardless of band |

---

*The shortest path to done is the right path.*
