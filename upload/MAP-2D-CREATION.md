# MAP-2D-CREATION.md — Universal 2D Leaflet Map Module for Malaysian State PIPs

> Truth Above All. Universal, state-parameterised 2D electoral map module for
> every PIP-* blueprint repo. Reference implementation: PIP-N9. Cross-refs:
> `MAP-3D-CREATION.md` (shares the Zustand `selectedDUN` store for 2D↔3D sync),
> `MALAYSIA-ADM-FETCH.md` (geometry sources + filter rules for the GeoJSON inputs).

---

## 1. Purpose + Scope

Renders the interactive 2D electoral map for **any** Malaysian state PIP — all
16 states + 3 Federal Territories. The 14-layer model, choropleth engine,
search box, slide-in drawer, and focus trap are identical across states. Only
`STATE_CONFIG` varies (map center, zoom, party-color overrides, BN-won toggle,
layer overrides). Federal Territories produce 0 DUN features — the DUN-related
layers gracefully skip and `SelectedDUNDrawer` never opens.

Scope **in**: Leaflet 1.9 + leaflet.heat + leaflet.markercluster (lazy UMD);
14 layers across 4 groups (boundary / electoral / data / quality); choropleth
by party / priority band / GPS quality; slide-in drawer with focus trap +
LLM/DOSM/election sub-panels; top-left search; sticky labels; mobile UX.
Scope **out**: 3D extrusion (see `MAP-3D-CREATION.md`); ADM fetch (see
`MALAYSIA-ADM-FETCH.md`); voter-roll ingest (DPT).

---

## 2. Prerequisites

### 2.1 Data files (`src/data/{pip_code_lower}-{kind}-geo.json`)

| File | Purpose | ~Size (N9) |
| --- | --- | --- |
| `{s}-adm0-geo.json` | Country outline | 30 KB |
| `{s}-adm1-geo.json` | State boundary | 50 KB |
| `{s}-adm2-geo.json` | Districts (daerah) | 200 KB |
| `{s}-adm3-geo.json` | Mukim/locality polygons | 500 KB |
| `{s}-dun-geo.json` | DUN electoral boundaries | 400 KB |
| `{s}-parlimen-geo.json` | Parliament boundaries | 150 KB |
| `{s}-localities.json` | Locality points (voter roll) | 80 KB |
| `{s}-towns.json` | Google Places coords for labels | 4 KB |
| `{s}-elections.json` | GE14/PRN15/2026 results per DUN | 120 KB |
| `{s}-priority.json` | P1-P4 priority bands per DUN | 16 KB |
| `{s}-dosm.json` | DOSM socioeconomic per DUN | 60 KB |

See `MALAYSIA-ADM-FETCH.md` §13 for the build-time ingest pipeline that
produces these. Never bundle the raw nationwide geojson.

### 2.2 Runtime deps

```bash
npm i leaflet leaflet.heat leaflet.markercluster zustand next
npm i -D @types/leaflet @types/leaflet.heat @types/leaflet.markercluster
```

`next/dynamic` is required for the double lazy-load wrap (§5).

### 2.3 Zustand store

A single `useMapStore` (see §4) is shared between the 2D map, the 3D map, and
the dashboard tabs. Carries `selectedDUN`, `layers2d`, `timeline`, `scenario`.

---

## 3. The 14-Layer Definition File

### 3.1 `LayerDef` interface

```typescript
export interface LayerDef {
  id: string;                          // stable Zustand key + DOM data-layer
  label: string;                       // human-readable fallback
  labelKey: string;                    // i18n key: layers.2d.<id>
  defaultOn: boolean;                  // ON at first paint?
  color: string;                       // hex for legend chip + default style
  source: string | null;               // GeoJSON filename or null (derived)
  group: "boundary" | "electoral" | "data" | "quality";
}
```

### 3.2 The 14 layers (8 ON, 6 OFF)

| # | id | label | group | defaultOn | color | source |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | adm0 | Malaysia | boundary | ON | #475569 | adm0-geo.json |
| 2 | boundary | State outline | boundary | ON | #0ea5e9 | adm1-geo.json |
| 3 | adm1 | ADM1 (state) | boundary | OFF | #38bdf8 | adm1-geo.json |
| 4 | adm2 | ADM2 (district) | boundary | OFF | #7dd3fc | adm2-geo.json |
| 5 | adm3 | ADM3 (mukim) | boundary | OFF | #bae6fd | adm3-geo.json |
| 6 | par | Parlimen | electoral | ON | #f59e0b | parlimen-geo.json |
| 7 | dun | DUN | electoral | ON | #38bdf8 | dun-geo.json |
| 8 | dm | Polling district (DM) | electoral | OFF | #94a3b8 | dm-geo.json |
| 9 | priority | Priority P1-P4 | data | ON | #ef4444 | priority.json |
| 10 | electionHistory | Election history | electoral | OFF | #e4002b | elections.json |
| 11 | datagap | Data gap markers | data | OFF | #f59e0b | datagap.json |
| 12 | locality | Locality points | data | OFF | #38bdf8 | localities.json |
| 13 | heatmap | Voter density heat | data | OFF | #f97316 | localities.json |
| 14 | gpsquality | GPS data quality | quality | ON | #10b981 | gpsquality.json |

### 3.3 Color constants

```typescript
export const PRIORITY_FILL = {
  P1: "#EF4444", P2: "#F97316", P3: "#F59E0B", P4: "#10B981",
};
export const GPS_QUALITY_COLOR = {
  Ready: "#10B981", Gap: "#F59E0B", default: "#94A3B8",
};
export const ELECTION_PARTY_COLORS = {
  PH: "#E4002B", BN: "#1E3A8A", PN: "#0E7C2A", IND: "#808080",
  WARISAN: "#F58220", PSM: "#FF6600", UPON: "#E4002B", MUDA: "#000000",
};
```

### 3.4 STATE_CONFIG parameterisation note

The layer count is fixed at 14 across all states — do **not** add/remove per
state. State-specific overrides go in `STATE_CONFIG.layers2d` (override
defaults) and `STATE_CONFIG.partyColors` (merge onto `ELECTION_PARTY_COLORS`,
useful for Sabah GRS / Sarawak GPS). For Federal Territories, the `dun`,
`dm`, `priority`, `gpsquality` layers produce 0 features but remain in the
panel (greyed-out, disabled checkbox). See §13.

---

## 4. Zustand Store Setup

```typescript
// src/lib/map-store.ts
export const DEFAULT_LAYERS_2D: Record<string, boolean> = {
  adm0: true, boundary: true, adm1: false, adm2: false, adm3: false,
  par: true, dun: true, dm: false,
  priority: true, electionHistory: false, datagap: false,
  locality: false, heatmap: false, gpsquality: true,
};

interface MapState {
  selectedDUN: string | null;
  layers2d: Record<string, boolean>;
  timeline: "GE14_2018" | "PRN15_2023" | "PROJ_2026";
  scenario: "status_quo" | "pn_surge" | "bn_surge" | "ph_surge" | "aging_society";
  setSelectedDUN: (code: string | null) => void;
  toggleLayer2d: (id: string) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      selectedDUN: null,
      layers2d: { ...DEFAULT_LAYERS_2D },
      timeline: "PRN15_2023",
      scenario: "status_quo",
      setSelectedDUN: (code) => set({ selectedDUN: code }),
      toggleLayer2d: (id) =>
        set((s) => ({ layers2d: { ...s.layers2d, [id]: !s.layers2d[id] } })),
    }),
    {
      name: `pip-${STATE_CONFIG.pipCode.toLowerCase()}-state`,
      // Safe-merge: whitelist keys + reject __proto__/constructor pollution.
      // Also defeats schema drift across versions (layer-id renames).
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const p = persisted as Partial<MapState>;
        const safeLayers: Record<string, boolean> = { ...DEFAULT_LAYERS_2D };
        if (p.layers2d && typeof p.layers2d === "object") {
          for (const k of Object.keys(DEFAULT_LAYERS_2D)) {
            const v = (p.layers2d as Record<string, unknown>)[k];
            if (typeof v === "boolean") safeLayers[k] = v;
          }
        }
        return {
          ...current,
          ...(typeof p.selectedDUN === "string" ? { selectedDUN: p.selectedDUN } : {}),
          layers2d: safeLayers,
          ...(p.timeline ? { timeline: p.timeline } : {}),
          ...(p.scenario ? { scenario: p.scenario } : {}),
        };
      },
    },
  ),
);
```

Why safe-merge? Zustand `persist` deserialises arbitrary localStorage. Without
the whitelist, a tampered `__proto__` key could pollute `Object.prototype`, and
a stale persisted schema (after a layer-id rename) could shadow new defaults.

---

## 5. LeafletMap Component

### 5.1 Double lazy-load wrap

`View2D` lazy-imports `Map2DTab`, which lazy-imports `LeafletMap`. Double wrap
keeps the initial dashboard JS bundle free of Leaflet (~150 KB minified).

```typescript
// view-2d.tsx
const Map2DTab = dynamic(() => import("./map-2d-tab"), {
  ssr: false, loading: () => <Loading />,
});
// map-2d-tab.tsx
const LeafletMap = dynamic(() => import("../maps-2d/leaflet-map"), {
  ssr: false, loading: () => <Loading />,
});
```

`ssr: false` is mandatory: Leaflet pokes `window` at import time.

### 5.2 Map init + UMD plugin hack

```typescript
const L_ = (await import("leaflet")).default;
// CRITICAL: UMD plugins (leaflet.heat, leaflet.markercluster) attach to window.L.
// Without this line, L.HeatLayer / L.MarkerClusterGroup are undefined.
(window as unknown as { L: typeof L_ }).L = L_;
await import("leaflet.heat");
await import("leaflet.markercluster");

const map = L_.map(container, {
  center: STATE_CONFIG.mapCenter,         // [2.725, 102.0] for N9
  zoom: STATE_CONFIG.defaultZoom,         // 9
  zoomControl: false,                     // moved to bottomright below
  preferCanvas: true,                     // 1000+ markers → canvas, not DOM
});
L_.control.zoom({ position: "bottomright" }).addTo(map);
L_.control.scale({ position: "bottomleft", metric: true, imperial: false }).addTo(map);
```

### 5.3 Three tile providers (cycled)

```typescript
const TILES = [
  { name: "light",     url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 19 },
  { name: "dark",      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 19 },
  { name: "satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri", maxZoom: 19 },
];
```

Cycled by a tile-toggle button (bottomright, above zoom control). Selection
persists in the same Zustand store under `tileProvider`.

### 5.4 14-layer stacking order (bottom → top)

```
adm0 → adm1 → adm2 → adm3 → par → dun → dm → priority
   → electionHistory → datagap → locality → heatmap → gpsquality → boundary
```

The `boundary` layer is painted last so the state outline stays visible even
when choropleths fill the DUN polygons. Each layer is gated by `layers2d[id]`.

---

## 6. Choropleth Coloring

### 6.1 Color function with BN-won override (configurable)

```typescript
function choroplethColor(
  feat: GeoJSON.Feature,
  ctx: { priorityLayerOn: boolean; bnWonOverride: boolean },
): string {
  const p = feat.properties ?? {};
  const winnerParty: string | undefined = p.winner_party;
  const priorityBand: string | undefined = p.priority_band;

  // 1. BN-won override (PIP-N9 quirk: hardcoded for N9 politics).
  //    Universal version: configurable via STATE_CONFIG.bnWonOverride.
  //    Set false for Sabah (GRS/WARISAN dominate) and Sarawak (GPS).
  if (ctx.bnWonOverride && winnerParty === "BN") return "#1E3A8A";

  // 2. Priority layer takes precedence when ON.
  if (ctx.priorityLayerOn && priorityBand && PRIORITY_FILL[priorityBand]) {
    return PRIORITY_FILL[priorityBand];
  }

  // 3. Default: color by winning party.
  if (winnerParty && ELECTION_PARTY_COLORS[winnerParty]) {
    return ELECTION_PARTY_COLORS[winnerParty];
  }
  return "#94A3B8"; // slate-400 = no data
}
```

PIP-N9 hardcoded the BN override. The universal version moves it behind
`STATE_CONFIG.bnWonOverride` so states where BN isn't major can disable it.

### 6.2 Popup card builder

Each DUN feature carries a popup with: winner badge (colored chip + party
acronym), candidate name, votes won, vote share %, runner-up (party + votes),
optional third-place, majority (votes + %), turnout %, total votes, election
date, evidence tier (Field/Proxy + confidence %), seat-change indicator
(🔄 CHANGED / 🔒 RETAINED vs previous election).

```typescript
function buildPopup(feat: GeoJSON.Feature, prev?: ElectionResult): string {
  const p = feat.properties ?? {};
  const winner = p.winner_party ?? "—";
  const color = ELECTION_PARTY_COLORS[winner] ?? "#94A3B8";
  const seatChange = prev
    ? (prev.winner_party === winner ? "🔒 RETAINED" : "🔄 CHANGED") : "";
  return `<div class="pip-popup">
    <div class="pip-popup__header">
      <span class="pip-popup__badge" style="background:${color}">${winner}</span>
      <strong>${p.code_dun ?? ""} ${p.name ?? ""}</strong>
    </div>
    <div class="pip-popup__row"><span>Candidate</span><span>${p.winner_name ?? "—"}</span></div>
    <div class="pip-popup__row"><span>Votes</span><span>${p.winner_votes ?? "—"}</span></div>
    <div class="pip-popup__row"><span>Vote share</span><span>${p.vote_share_pct ?? "—"}%</span></div>
    <div class="pip-popup__row"><span>Runner-up</span><span>${p.runner_up_party ?? "—"} (${p.runner_up_votes ?? "—"})</span></div>
    <div class="pip-popup__row"><span>Majority</span><span>${p.majority ?? "—"} (${p.majority_pct ?? "—"}%)</span></div>
    <div class="pip-popup__row"><span>Turnout</span><span>${p.turnout_pct ?? "—"}%</span></div>
    <div class="pip-popup__row"><span>Total votes</span><span>${p.total_votes ?? "—"}</span></div>
    <div class="pip-popup__row"><span>Date</span><span>${p.election_date ?? "—"}</span></div>
    <div class="pip-popup__row"><span>Evidence</span><span>${p.evidence_tier ?? "—"} (${p.confidence_pct ?? "—"}%)</span></div>
    ${seatChange ? `<div class="pip-popup__row"><span>Seat</span><span>${seatChange}</span></div>` : ""}
  </div>`;
}
```

---

## 7. Layer Control Panel

### 7.1 Grouped toggles

Panel groups the 14 layers into 4 collapsible sections (boundary / electoral /
data / quality) using `LayerDef.group`. Each row is a checkbox bound to
`layers2d[id]` via `toggleLayer2d`. Legend chip uses `LayerDef.color`.

### 7.2 Opacity sliders via custom window event

Opacity slider does **not** poke Leaflet directly. Instead it dispatches a
custom DOM event on `window`. Why a window event instead of Zustand? Opacity
changes are high-frequency (slider drag = 60 events/sec). Pushing them through
Zustand would re-render the entire dashboard tree on every mousemove. The
window event isolates the path to `leaflet-map.tsx` only.

```typescript
// layer-control.tsx — dispatch
function onOpacityChange(layerId: string, opacity: number) {
  window.dispatchEvent(
    new CustomEvent("pip-layer-opacity", { detail: { layerId, opacity } }),
  );
}

// leaflet-map.tsx — listen
useEffect(() => {
  const handler = (e: Event) => {
    const { layerId, opacity } = (e as CustomEvent).detail;
    const layer = layerRefs.current[layerId];
    if (!layer) return;
    if (layer.setOpacity) layer.setOpacity(opacity);              // tileLayer
    else if (layer.setStyle) layer.setStyle({ opacity, fillOpacity: opacity * 0.45 }); // vector
  };
  window.addEventListener("pip-layer-opacity", handler);
  return () => window.removeEventListener("pip-layer-opacity", handler);
}, []);
```

---

## 8. SelectedDUNDrawer

### 8.1 Slide-in panel

Right-side slide-in driven by `selectedDUN` from Zustand. Width: `max-w-[22rem]`
desktop / full-screen mobile. Sub-panels: DUN header, priority bar, voter stats,
geography, LLM insights, DOSM socioeconomic, election history (GE14/PRN15/2026
— clicking jumps to Elections tab).

```typescript
export function SelectedDUNDrawer() {
  const { selectedDUN, setSelectedDUN } = useMapStore();
  const dun = useDUNByCode(selectedDUN);
  const isMobile = isMobileViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedDUN) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    closeBtnRef.current?.focus();
    return () => previouslyFocused.current?.focus?.();
  }, [selectedDUN]);

  // Focus trap + Escape (see §8.2)

  if (!selectedDUN || !dun) return null;
  return (
    <aside ref={panelRef} role="dialog" aria-modal="true"
      aria-label={`DUN ${dun.code} ${dun.name}`}
      className={`fixed top-0 right-0 h-full ${isMobile ? "w-full" : "max-w-[22rem]"} bg-slate-900 shadow-xl z-[1000] overflow-y-auto`}>
      <button ref={closeBtnRef} onClick={() => setSelectedDUN(null)} aria-label="Close">×</button>
      <DUNHeader dun={dun} />
      <PriorityBar band={dun.priority_band} score={dun.priority_score} />
      <VoterStats dun={dun} />
      <Geography dun={dun} />
      <LLMInsightsSubPanel dun={dun} />
      <DOSMSocioeconomicSubPanel dun={dun} />
      <ElectionHistorySubPanel dun={dun} onJump={() => router.push("/elections")} />
    </aside>
  );
}
```

### 8.2 Focus trap

```typescript
useEffect(() => {
  const panel = panelRef.current;
  if (!panel) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") { setSelectedDUN(null); return; }
    if (e.key !== "Tab") return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [setSelectedDUN]);
```

### 8.3 Mobile full-screen + popup suppression

On mobile, drawer covers full viewport. Clicking a DUN polygon closes any open
popup (it would be hidden behind the drawer):

```typescript
function onDUNClick(code: string) {
  setSelectedDUN(code);
  if (isMobileViewport()) map.closePopup();
}
```

---

## 9. Search Integration

Top-left search box. 300 ms debounce keeps keystrokes cheap. `/api/duns`
response cached for component lifetime (DUN list is static). Filters by code /
name / district, top 6 results, click → `setSelectedDUN` (opens drawer AND
triggers 3D camera flyTo via shared Zustand store).

```typescript
const cacheRef = useRef<DunSearchEntry[] | null>(null);
const debounceRef = useRef<ReturnType<typeof setTimeout>>();

async function search(q: string) {
  if (!q) { setResults([]); return; }
  if (!cacheRef.current) {
    const res = await fetch("/api/duns");
    cacheRef.current = await res.json();
  }
  const lower = q.toLowerCase();
  setResults(cacheRef.current
    .filter((d) =>
      d.code.toLowerCase().includes(lower) ||
      d.name.toLowerCase().includes(lower) ||
      d.district.toLowerCase().includes(lower))
    .slice(0, 6));
}

function onInput(q: string) {
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => search(q), 300);
}
```

---

## 10. Sticky Labels (Decluttering)

DUN labels are `L.tooltip({ permanent: true, direction: "center" })` but only
after zoom ≥ 11. Below zoom 11 they would overlap into illegible spaghetti.

```typescript
function syncLabels(map: L.Map) {
  const show = map.getZoom() >= 11;
  dunLayer.eachLayer((layer) => show ? layer.openTooltip() : layer.closeTooltip());
}
map.on("zoomend", () => syncLabels(map));
```

Deliberate trade-off: at low zoom, users see shape + color; at high zoom, they
see names. The 3D map (see `MAP-3D-CREATION.md` §6) uses a different strategy
(top-10-by-priority HTML div overlays) because Three.js camera projection makes
label occlusion harder. Threshold of 11 is universal — fits all states.

---

## 11. Heatmap + MarkerCluster

Both plugins are loaded via the lazy `await import()` pattern in §5.2.

```typescript
// leaflet.heat
const heatLayer = L_.heatLayer(
  localities.map((l) => [l.lat, l.lon, l.voters / 1000] as [number, number, number]),
  {
    radius: 25, blur: 18, maxZoom: 14,
    gradient: { 0.2: "#1e40af", 0.4: "#0891b2", 0.6: "#10b981", 0.8: "#f59e0b", 1.0: "#ef4444" },
  },
);

// leaflet.markercluster
const clusterLayer = L_.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 50,           // balance density vs drill-down
  spiderfyOnMaxZoom: true,
  disableClusteringAtZoom: 16,    // individual markers appear when close enough
});
```

---

## 12. Mobile UX

```typescript
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}
```

Mobile behaviours: drawer is full-screen (`w-full` instead of `max-w-[22rem]`);
clicking a choropleth closes any open popup (drawer is the UI); tile-toggle
button hidden (cycle via long-press on zoom control); layer-control panel
collapses into a bottom-sheet; search box stays top-left but expands to
`w-[80vw]`. Breakpoint (767px) matches Tailwind's default `md` boundary and
the Universal Design System's touch-target minimums.

---

## 13. State Parameterisation

```typescript
// src/config/state-config.ts
export interface StateConfig2D {
  pipCode: string;                       // "N", "M", "J", etc.
  stateName: string;                     // "Negeri Sembilan"
  mapCenter: [number, number];           // [lat, lon]
  defaultZoom: number;                   // 9 for medium states
  layers2d?: Partial<Record<string, boolean>>; // override DEFAULT_LAYERS_2D
  partyColors?: Record<string, string>;  // merge onto ELECTION_PARTY_COLORS
  bnWonOverride: boolean;                // PIP-N9 = true; Sabah = false
}

export const STATE_CONFIG: StateConfig2D = {
  pipCode: "N",
  stateName: "Negeri Sembilan",
  mapCenter: [2.725, 102.0],
  defaultZoom: 9,
  bnWonOverride: true,
};
```

For each new state, only `STATE_CONFIG` changes. The 14-layer file, the
Zustand store, the drawer, the search box, the choropleth engine — all reused
verbatim. See `MALAYSIA-ADM-FETCH.md` §6 for the 16-state + 3-territory
parameter table (map centers, DUN/PAR counts, projection centers).

---

## 14. Accessibility (WCAG 2.1 AA)

| Criterion | Implementation |
| --- | --- |
| 2.1.1 Keyboard | All toggles, sliders, search, drawer close operable via Tab/Enter/Esc. |
| 2.1.2 No keyboard trap | Focus trap in drawer releases on Escape or close button. |
| 2.4.3 Focus order | Drawer: close → header → priority → stats → sub-panels. |
| 2.4.7 Focus visible | All interactive elements have `:focus-visible` ring. |
| 1.4.3 Contrast | All chip colors meet 4.5:1 against `bg-slate-900`. |
| 1.4.11 Non-text contrast | Layer-control chips have 3:1 border against panel background. |
| 2.5.5 Target size | Checkboxes + sliders ≥ 44×44 px touch target. |
| 4.1.2 Name/Role/Value | Drawer has `role="dialog" aria-modal="true" aria-label`. |
| 4.1.3 Status messages | Search "no results" announced via `aria-live="polite"`. |

Screen reader users navigate via the search box + drawer — the map canvas itself
is decorative. Each DUN feature has a hidden `<table>` mirror in an
`aria-hidden` region for SR consumption. No known WCAG violations in the 2D
module (the 3D module has a `prefers-reduced-motion` gap — see
`MAP-3D-CREATION.md` §16).

---

## 15. Performance

| Knob | Setting | Rationale |
| --- | --- | --- |
| `preferCanvas` | `true` | 1000+ DM/locality markers → single canvas, not 1000 DOM nodes. |
| `frustumCulled` (markers) | `false` | MarkerCluster hides far markers anyway; Leaflet canvas cull double-charges. |
| Double lazy-load | `view-2d → map-2d-tab → leaflet-map` | Keeps initial dashboard JS bundle free of Leaflet (~150 KB). |
| `/api/duns` cache | `cacheRef.current` | One fetch per mount; DUN list is static. |
| Opacity via window event | not Zustand | Slider drag = 60 events/sec; isolating path avoids dashboard re-renders. |
| Tile layer | `maxZoom: 19` + CARTO CDN | Avoids OSM tile-server rate limits. |
| Popup | built lazily on `popupopen` | 36 popups × HTML string = avoid upfront cost. |
| Sticky labels | zoom ≥ 11 only | Cuts tooltip count from 36 → 0 at low zoom. |

---

## 16. Quirks Fixed in Universal Version (vs PIP-N9)

| # | PIP-N9 quirk | Universal fix |
| --- | --- | --- |
| 1 | BN-won override hardcoded | `STATE_CONFIG.bnWonOverride` (false for Sabah) |
| 2 | Map center / zoom hardcoded to N9 | `STATE_CONFIG.mapCenter` / `defaultZoom` |
| 3 | State code baked into localStorage key | `pip-${pipCode}-state` |
| 4 | Sticky-label threshold hardcoded at 11 | Kept at 11 (universal) — fits all states |
| 5 | Search debounce 300 ms hardcoded | Kept at 300 ms (universal) |

---

## 17. Code Snippets (Quotable)

### 17.1 LayerDef interface — see §3.1

### 17.2 Choropleth color with BN-won override — see §6.1

### 17.3 Opacity event dispatch + listen — see §7.2

### 17.4 Lazy-load double-wrap — see §5.1

### 17.5 Map init with UMD plugin hack — see §5.2

---

*The shortest path to done is the right path.*
