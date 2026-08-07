# 2D Map (Map2DTab) Comprehensive Audit Report
**Date:** 2026-08-07  
**Component:** `src/components/tabs/map-2d-tab.tsx` + supporting data + drawer + store  
**Scope:** All layers, clicks, tooltips, data consistency, drawer details, scenarios (PRN15/GE14/GE15), "all angles"

---

## 1. Layers Inventory & Status

| Layer ID     | Label                  | Group     | Default | Click?          | Tooltip? | Notes |
|--------------|------------------------|-----------|---------|-----------------|----------|-------|
| `adm1`       | State outline          | boundary  | ON      | No              | Yes      | Pure display |
| `adm2`       | Districts (3)          | boundary  | ON      | No              | Yes      | 3 districts (Alor Gajah, Melaka Tengah, Jasin) |
| `par`        | Parlimen (6)           | electoral | ON      | **Yes** → parliament only | Yes (rich GE15/GE14) | Sets store parliament |
| `dun`        | DUN (28)               | electoral | ON      | **Yes** → parliament + dun | Yes (full PRN15/GE14/GE15 + swing) | **Opens drawer correctly** |
| `ge15`       | GE15 parlimen          | data      | OFF     | **NO**          | Yes (GE15 only) | Separate choropleth overlay |
| `choropleth` | Winner choropleth      | style     | ON      | N/A (DUN style) | N/A      | Modifies DUN fill |
| `heatmap`    | Voter density heatmap  | style     | OFF     | N/A             | N/A      | Modifies DUN (PRN15 votes only) |

**All 28 DUN + 6 PAR + boundaries present in GeoJSON.**

---

## 2. Data Consistency Audit (All Angles)

### GeoJSON ↔ DUN_SUMMARY ↔ Elections
- **DUN features:** 28 (N.01 → N.28) ✅
- **PAR features:** 6 (P.134 → P.139) ✅
- Normalized codes in GeoJSON (`N.01` → `01`) match:
  - `DUN_SUMMARY` (28 entries)
  - `melaka-elections.json` PRN15 `dun_results` (28)
  - GE14 `dun_results` (28)
- PAR codes match exactly across all sources.
- ADM1 (1), ADM2 (3) — correct counts.

### Election Scenarios
- **PRN15** (state): Full DUN results for all 28 + summaries in DUN_SUMMARY
- **GE14** (state): Full DUN + PAR results
- **GE15** (federal only): PAR results only. DUN tooltip correctly shows "GE15 = federal only — no DUN ballot" + fallback to PRN15/GE14
- Seat counts computed correctly from DUN_SUMMARY or PARLIAMENTS.ge15Winner

### Drawer (SelectedDunDrawer)
- Triggered **only** by DUN clicks (correct).
- Always shows election analytics (PRN15 + GE14 + GE15 parl) for **all 28 DUNs**.
- Demographics: Only loads for P134 (N01-N05) via `/data/p134/dun-intelligence.jsonl`. Shows graceful "Demographics pending" notice for the other 23 DUNs. ✅
- Swing / marginal / safe badges populated from DUN_SUMMARY.
- All fields (votes, margin, candidate, party logos, vote-share bars) render.

### Stores
- `setSelectedParliament(code)` + `setSelectedDun({parliament, dun, name})` called correctly on DUN click.
- PAR click only sets parliament (drawer intentionally stays closed).

---

## 3. Click Behavior — "Click on the maps for all layers"

**Working perfectly:**
- Every DUN polygon (28): Opens full drawer with correct details + analysis.
- Every PAR polygon (6): Sets parliament in store (can be used by other tabs).

**Gaps:**
- **GE15 layer (when toggled ON):** Has tooltip but **NO click handler**. Clicking it does nothing. Should probably call `setSelectedParliament` like the main `par` layer.
- ADM1 / ADM2: No clicks (by design — boundary layers).
- Style toggles (choropleth/heatmap): Correctly do not remove the DUN layer.

**Recommendation:** Add click handler to `ge15Layer` (see suggested patch below).

---

## 4. Tooltips & Analysis Accuracy

- DUN tooltip (via `buildDunTooltip` + `scenarioRef`):
  - PRN15/GE14: Full candidate + votes + % + margin + mini bar + swing indicator.
  - GE15 scenario: Correct warning + parliament result + PRN15/GE14 fallback.
- PAR tooltip: GE15 + derived GE14.
- Scenario switch (PRN15 ↔ GE14 ↔ GE15) updates:
  - Choropleth colors instantly (useEffect)
  - Tooltips (scenarioRef prevents stale data)
- Heatmap mode: Uses PRN15 voter counts only (density view). Tooltip remains election-focused (acceptable).

---

## 5. Layer Toggling & Visuals

- Visibility toggles use `applyLayerVisibility` + Leaflet `addTo`/`removeLayer`.
- Style toggles (choropleth/heatmap) correctly **only** call `dunLayer.setStyle` (no layer removal bug).
- GE15 layer uses `parData` but separate style — works independently.
- Initial bounds fit to DUN layer.
- Search + fly-to works for both DUN and Parlimen.

---

## 6. Potential Issues / Minor Gaps Found

1. **GE15 layer click missing** (highest priority).
2. **GE15 + DUN both visible**: GE15 fillOpacity 0.6 can partially obscure DUN boundaries when both ON. (Visual only.)
3. **Heatmap always uses PRN15 votes** — even when viewing GE14 scenario.
4. No explicit "select district" action from ADM2 (low priority).
5. No unit tests for map click → drawer flow (only s2d test exists).
6. Extract helpers are defensive (`extractDunCode` etc.) — good.

**No data mismatches, no missing DUNs, no broken scenario logic.**

---

## 7. Quick Fix Patch (GE15 Click Support)

Add inside the `ge15Layer` `onEachFeature`:

```ts
lyr.on("click", () => {
  const code = extractParlCode(feat.properties?.code_parlimen);
  setSelectedParliament(code);
});
```

Also consider lowering GE15 fill opacity or bringing DUN to front when both enabled.

---

## Verdict

**Status: Production-ready with one small gap.**

- All 28 DUN clicks → correct drawers + analysis ✅
- All layers load, toggle, style correctly ✅
- Data perfectly aligned across GeoJSON / DUN_SUMMARY / elections.json ✅
- Scenario switching robust (scenarioRef fix already present)
- Only missing: click handlers on the GE15 overlay layer.

Everything else (boundaries, parlimen, choropleth, heatmap, tooltips, drawer population, search) is complete and correct from all angles.

**Files audited:**
- `src/components/tabs/map-2d-tab.tsx`
- `src/components/shared/selected-dun-drawer.tsx`
- `src/stores/dashboard-store.ts`
- `src/lib/dun-summary.ts`
- `src/lib/melaka-constants.ts`
- `public/data/boundaries/*.json`
- `public/data/elections/melaka-elections.json`
- `public/data/p134/dun-intelligence.jsonl`
