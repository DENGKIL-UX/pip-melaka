# MALAYSIA-ADM-FETCH.md — Universal ADM Geometry Fetch + Filter Rules

> Truth Above All. The canonical geometry sources and filter rules for any
> Malaysian state PIP — covers ADM0-3 administrative hierarchy + DUN + parlimen
> electoral boundaries for all 16 states + 3 Federal Territories. Cross-refs:
> `MAP-2D-CREATION.md` §2.1 (consumes the per-state JSONs produced here),
> `MAP-3D-CREATION.md` §2.2 (consumes `{state}-elevation.json` DEM + same JSONs).

---

## 1. Purpose

A PIP-* repo needs per-state GeoJSON for 6 layers: country outline (ADM0),
state (ADM1), district (ADM2), mukim (ADM3), DUN, and parlimen. This document
specifies the **2 canonical sources**, the **filter rules** that slice the
nationwide files down to one state, the **16-state + 3-territory code table**,
and the **build-time ingest pipeline** that produces the per-state JSONs in
`src/data/`.

The reference implementation is PIP-N9. The fetch + filter logic is identical
across states — only the `STATE_CONFIG` row in §6 changes.

Scope **in**: source URLs, filter rules, code table, ingest script, bundle
strategy, provenance panel. Scope **out**: choropleth coloring (see
`MAP-2D-CREATION.md` §6), 3D extrusion (see `MAP-3D-CREATION.md` §4).

---

## 2. The 2 Canonical Sources

| Source | Coverage | License | Use for |
| --- | --- | --- | --- |
| **geoBoundaries** (wmgeolab) | ADM0-3 administrative hierarchy | CC BY 4.0 (attribution required) | Country / state / district / mukim polygons |
| **DOSM kawasanku** (open) | DUN + parlimen electoral boundaries | Open government data | DUN / parlimen polygons |

geoBoundaries provides the **administrative** hierarchy (geography). DOSM
kawasanku provides the **electoral** boundaries (which DUN/parlimen a voter is
in). They overlap geographically but serve different purposes — both are needed.

---

## 3. geoBoundaries URLs

```
https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM0.zip
https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM1.zip
https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM2.zip
https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM3.zip
```

### 3.1 `/raw/main/` vs `?raw=true`

Both work. `/raw/main/` is preferred because:
- It returns the raw file with correct `Content-Type: application/zip` header.
- `?raw=true` is a query-param fallback that GitHub may redirect through
  `githubusercontent.com` (adds a redirect hop).
- `/raw/main/` is the canonical form documented in GitHub's raw-content API.

### 3.2 Zip contents

Each zip contains a single `geoBoundaries-MYS_ADM{n}.geojson` — a
`FeatureCollection`. ADM0 = 1 feature (country). ADM1 = 16 features (13 states
+ 3 Federal Territories). ADM2 = ~190 features (districts). ADM3 = ~1,400
features (mukims).

### 3.3 License

CC BY 4.0 — attribution required. The Governance → Sources panel (§15) must
display: "geoBoundaries (CC BY 4.0), World Bank / wmgeolab" with a link to
`https://www.geoboundaries.org/`.

---

## 4. DOSM kawasanku URLs

```
https://github.com/dosm-malaysia/kawasanku-front/raw/main/geojson/dun.json
https://github.com/dosm-malaysia/kawasanku-front/raw/main/geojson/parlimen.json
```

Open government data published by the Department of Statistics Malaysia (DOSM).
~587 DUN + 222 parlimen features nationwide. The kawasanku project is the
canonical machine-readable source for Malaysian electoral boundaries (vs SPR's
PDFs which require OCR / vectorisation).

---

## 5. Filter Rules (CRITICAL)

### 5.1 geoBoundaries ADM0

No filter — 1 feature (the whole country). Save as `{s}-adm0-geo.json` verbatim
(same file for every state — it's the country outline).

### 5.2 geoBoundaries ADM1

Filter by `shapeName === "<state full name>"` OR `shapeISO === "MY-<NN>"`:

```python
# Python example
target_state = "Negeri Sembilan"  # or shapeISO "MY-05"
adm1_feature = next(
    f for f in adm1_collection["features"]
    if f["properties"]["shapeName"] == target_state
    or f["properties"].get("shapeISO") == "MY-05"
)
```

`shapeName` is more readable; `shapeISO` is more stable across renames. Both
work — pick one and document it.

### 5.3 geoBoundaries ADM2 / ADM3

Filter by **parent ADM1 name** (NOT by state code — ADM2/ADM3 features don't
carry a state code in their properties). The parent field is `adm1_name` or
similar:

```python
# ADM2 filter — keep districts inside the target state
adm2_features = [
    f for f in adm2_collection["features"]
    if f["properties"].get("adm1_name") == target_state
    # Some geoboundaries versions use "ADM1NAME" — inspect the file first.
]
```

Always inspect the actual `properties` keys before filtering — they vary
between geoBoundaries releases.

### 5.4 DOSM kawasanku dun.json / parlimen.json — code_state is a NUMBER

```python
# CORRECT — code_state is a NUMBER, not a string
dun_features = [
    f for f in dun_collection["features"]
    if f["properties"]["code_state"] == 5   # N9 = 5 (number)
]

# WRONG — this returns 0 features (string "05" !== number 5)
# if f["properties"]["code_state"] == "05"  # NO
```

| State | `code_state` (NUMBER) |
| --- | --- |
| N9 | 5 |
| Melaka | 4 |

The DOSM docs say "state code = 05" but the actual JSON uses the **number** 5.
This is the #1 most common mistake — always verify by inspecting the file (§12).

---

## 6. The 16-State + 3-Territory Code Table

| State | PIP code | DOSM code_state | geoBoundaries shapeISO | DUN | PAR | Voters | Map center (lon, lat) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Perlis | R | 9? | MY-09 | 15 | 3 | ~0.2M | 100.2, 6.500 |
| Kedah | A | 2 | MY-02 | 36 | 15 | ~1.0M | 100.5, 6.000 |
| Penang | P | 7 | MY-07 | 40 | 13 | ~1.0M | 100.5, 5.414 |
| Melaka | M | 4 | MY-04 | 28 | 6 | ~495K | 102.5, 2.200 |
| Negeri Sembilan | N | 5 | MY-05 | 36 | 8 | ~889K | 102.0, 2.725 |
| Selangor | T | 10 | MY-10 | 56 | 22 | ~2.5M | 101.5, 3.073 |
| FT Kuala Lumpur | W | 14 | MY-14 | 0 | 11 | ~0.8M | 101.7, 3.139 |
| FT Putrajaya | W | 16 | MY-16 | 0 | 1 | ~0.03M | 101.7, 2.917 |
| FT Labuan | L | 15 | MY-15 | 0 | 1 | ~0.03M | 115.2, 5.300 |
| Perak | K | 8 | MY-08 | 59 | 24 | ~1.5M | 101.0, 4.600 |
| Pahang | C | 6 | MY-06 | 42 | 14 | ~0.7M | 102.5, 3.800 |
| Kelantan | D | 3 | MY-03 | 45 | 14 | ~0.9M | 102.0, 5.300 |
| Terengganu | T | 1? | MY-11? | 32 | 8 | ~931K | 103.0, 5.000 |
| Sabah | S | 12 | MY-12 | 73 | 25 | ~1.1M | 117.0, 5.500 |
| Sarawak | Q | 13 | MY-13 | 82 | 31 | ~1.3M | 113.0, 2.500 |
| Johor | J | 11? | MY-01 | 56 | 26 | ~2.73M | 103.5, 1.965 |

**NOTE**: `code_state` values marked `?` (Perlis=9?, Terengganu=1?, Johor=11?)
need verification against the actual kawasanku file. Some PIP codes collide
(`T` = both Selangor and Terengganu; `W` = both KL and Putrajaya) — the PIP
code is a historical SPR car-plate prefix, not a unique state ID. Always key
off `code_state` (number) or `shapeISO` for unambiguous identity.

---

## 7. STATE_ID_MAP Constant

```typescript
// src/config/state-id-map.ts
export interface StateIdMapEntry {
  pipCode: string;          // "N" for N9, "M" for Melaka, etc.
  kawasankuCodeState: number;  // 5 for N9, 4 for Melaka (NUMBER, not string)
  geoboundariesShapeISO: string;  // "MY-05" for N9
  shapeName: string;        // "Negeri Sembilan" (ADM1 filter key)
  mapCenter: [number, number];    // [lon, lat] for 2D map + projection
  projectionCenter: { lon: number; lat: number; scale: number };  // for 3D
}

export const STATE_ID_MAP: Record<string, StateIdMapEntry> = {
  // ponytail: code_state 9 for Perlis is best-guess — verify via §12 before relying on it.
  perlis:     { pipCode: "R", kawasankuCodeState: 9,  geoboundariesShapeISO: "MY-09", shapeName: "Perlis",            mapCenter: [100.2, 6.500],  projectionCenter: { lon: 100.2, lat: 6.500, scale: 150 } },
  kedah:      { pipCode: "A", kawasankuCodeState: 2,  geoboundariesShapeISO: "MY-02", shapeName: "Kedah",             mapCenter: [100.5, 6.000],  projectionCenter: { lon: 100.5, lat: 6.000, scale: 70  } },
  penang:     { pipCode: "P", kawasankuCodeState: 7,  geoboundariesShapeISO: "MY-07", shapeName: "Pulau Pinang",      mapCenter: [100.5, 5.414],  projectionCenter: { lon: 100.5, lat: 5.414, scale: 80  } },
  melaka:     { pipCode: "M", kawasankuCodeState: 4,  geoboundariesShapeISO: "MY-04", shapeName: "Melaka",            mapCenter: [102.5, 2.200],  projectionCenter: { lon: 102.5, lat: 2.200, scale: 100 } },
  n9:         { pipCode: "N", kawasankuCodeState: 5,  geoboundariesShapeISO: "MY-05", shapeName: "Negeri Sembilan",   mapCenter: [102.0, 2.725],  projectionCenter: { lon: 102.20, lat: 2.84, scale: 80  } },
  selangor:   { pipCode: "T", kawasankuCodeState: 10, geoboundariesShapeISO: "MY-10", shapeName: "Selangor",          mapCenter: [101.5, 3.073],  projectionCenter: { lon: 101.5, lat: 3.073, scale: 70  } },
  kl:         { pipCode: "W", kawasankuCodeState: 14, geoboundariesShapeISO: "MY-14", shapeName: "W.P. Kuala Lumpur", mapCenter: [101.7, 3.139],  projectionCenter: { lon: 101.7, lat: 3.139, scale: 120 } },
  putrajaya:  { pipCode: "W", kawasankuCodeState: 16, geoboundariesShapeISO: "MY-16", shapeName: "W.P. Putrajaya",    mapCenter: [101.7, 2.917],  projectionCenter: { lon: 101.7, lat: 2.917, scale: 200 } },
  labuan:     { pipCode: "L", kawasankuCodeState: 15, geoboundariesShapeISO: "MY-15", shapeName: "W.P. Labuan",       mapCenter: [115.2, 5.300],  projectionCenter: { lon: 115.2, lat: 5.300, scale: 200 } },
  perak:      { pipCode: "K", kawasankuCodeState: 8,  geoboundariesShapeISO: "MY-08", shapeName: "Perak",             mapCenter: [101.0, 4.600],  projectionCenter: { lon: 101.0, lat: 4.600, scale: 60  } },
  pahang:     { pipCode: "C", kawasankuCodeState: 6,  geoboundariesShapeISO: "MY-06", shapeName: "Pahang",            mapCenter: [102.5, 3.800],  projectionCenter: { lon: 102.5, lat: 3.800, scale: 50  } },
  kelantan:   { pipCode: "D", kawasankuCodeState: 3,  geoboundariesShapeISO: "MY-03", shapeName: "Kelantan",          mapCenter: [102.0, 5.300],  projectionCenter: { lon: 102.0, lat: 5.300, scale: 60  } },
  // ponytail: code_state 1 + shapeISO MY-11 for Terengganu — best-guess, verify via §12.
  terengganu: { pipCode: "T", kawasankuCodeState: 1,  geoboundariesShapeISO: "MY-11", shapeName: "Terengganu",        mapCenter: [103.0, 5.000],  projectionCenter: { lon: 103.0, lat: 5.000, scale: 70  } },
  sabah:      { pipCode: "S", kawasankuCodeState: 12, geoboundariesShapeISO: "MY-12", shapeName: "Sabah",             mapCenter: [117.0, 5.500],  projectionCenter: { lon: 117.0, lat: 5.500, scale: 50  } },
  sarawak:    { pipCode: "Q", kawasankuCodeState: 13, geoboundariesShapeISO: "MY-13", shapeName: "Sarawak",           mapCenter: [113.0, 2.500],  projectionCenter: { lon: 113.0, lat: 2.500, scale: 40  } },
  // ponytail: code_state 11 for Johor — best-guess, verify via §12.
  johor:      { pipCode: "J", kawasankuCodeState: 11, geoboundariesShapeISO: "MY-01", shapeName: "Johor",             mapCenter: [103.5, 1.965],  projectionCenter: { lon: 103.5, lat: 1.965, scale: 50  } },
};
```

`code_state` values marked `?` in §6 are filled with best-guess values here —
the §12 verification step must confirm each one before relying on it in
production.

---

## 8. The Melaka 3-Identifier Discrepancy

Melaka has **3 different identifiers** depending on the source:

| Source | Identifier | Value |
| --- | --- | --- |
| PIP project code | `pipCode` | `"M"` |
| DOSM kawasanku | `code_state` (number) | `4` |
| geoBoundaries | `shapeISO` | `"MY-04"` |

Maintain the `STATE_ID_MAP` (§7) as the single source of truth. **Never**
hardcode any of the three values in business logic — always look up via the
state key.

### 8.1 PIP-VOTER-INTELLIGENCE engine uses a 4th identifier

The PIP-VOTER-INTELLIGENCE engine (separate from this map module) uses
`state_code: "12"` for Melaka — a 4th identifier unrelated to the 3 above.
The adapter layer between the engine and the map must normalise: engine's
`state_code: "12"` → `STATE_ID_MAP.melaka.kawasankuCodeState` (4) for any
kawasanku lookup. Document this normalisation in the adapter file with a
comment referencing `STATE_ID_MAP`.

---

## 9. Federal Territories Quirk

KL / Putrajaya / Labuan have **0 DUNs** — they're territories, not states.
The DUN layer produces 0 features. The `SelectedDUNDrawer` (see
`MAP-2D-CREATION.md` §8) never opens. The build pipeline must gracefully skip
DUN JSON files (don't write a 0-feature `{s}-dun-geo.json` — just skip it).

The parlimen layer **does** have features (KL = 11, Putrajaya = 1, Labuan = 1)
so `{s}-parlimen-geo.json` is always written. The 2D/3D map modules check for
`{s}-dun-geo.json` existence before registering the DUN layer.

```typescript
const hasDUN = await import(`../data/${pipCode.toLowerCase()}-dun-geo.json`)
  .then(() => true).catch(() => false);
if (hasDUN) registerDUNLayer();
```

---

## 10. Cross-State Bleed (ROMPIN Pattern)

The N9 source voter xlsx contains **24,844 ROMPIN (Pahang) voter rows** —
geographic bleed across state borders. Filter at ingest:

```python
def filter_voter_row(row, target_state):
    if row.get("state") != target_state:
        return None  # drop cross-state bleed
    return row

# Track the bleed for governance review:
bleed_count = sum(1 for r in raw_rows if r.get("state") != target_state)
if bleed_count > 0:
    log.warn(f"DG_SCOPE_CROSS_STATE_REVIEW: dropped {bleed_count} cross-state rows (target={target_state})")
```

Track as `DG_SCOPE_CROSS_STATE_REVIEW` in the data-gap log. Any new state PIP
should expect similar bleed (especially small states bordering large ones —
Perlis/Kedah, Melaka/N9, Putrajaya/Selangor). The ROMPIN→N9 bleed is the
canonical example; expect ~1-5% of rows in any state's source xlsx to be
out-of-state.

---

## 11. Sabah/Sarawak Mukim Structure

ADM3 in Peninsular Malaysia uses "mukim" as the locality label. Sabah/Sarawak
may use **"kampung"** (village) or **"daerah kecil"** (sub-district) instead.
Don't assume `properties.Name` starts with "Mukim".

Always inspect the actual ADM3 properties before naming the layer:

```bash
jq '.features[0:5] | map(.properties.Name)' sabah-adm3-geo.json
# Sabah sample: ["Kampung Air", "Kampung Bukit", "Daerah Kecil Semporna", ...]
```

For Sabah/Sarawak PIPs, rename the layer label from "ADM3 (mukim)" to "ADM3
(locality)" or "ADM3 (kampung)" in `layers-2d.ts` (see
`MAP-2D-CREATION.md` §3.4 STATE_CONFIG override).

---

## 12. Verification Step (MANDATORY)

Before filtering, **always inspect the actual file** to confirm the
`code_state` value + field name. Common mistakes:

1. Filtering by string `"05"` instead of number `5`.
2. Using the wrong field name (`code_state` vs `state_code` vs `state_id`).
3. Assuming `shapeName` matches the PIP code (it doesn't — it's the full name).

```bash
# Verify kawasanku dun.json for the target state:
curl -s https://github.com/dosm-malaysia/kawasanku-front/raw/main/geojson/dun.json \
  | jq '.features[0].properties'

# Sample output (N9):
# {
#   "code_state": 5,           # NUMBER, not string
#   "code_parlimen": "P.126",
#   "code_dun": "N.01",
#   "code_state_dun": "5_N.01",
#   ...
# }

# Verify geoBoundaries ADM1 shapeISO:
curl -sL https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM1.zip \
  -o /tmp/adm1.zip && unzip -p /tmp/adm1.zip geoBoundaries-MYS_ADM1.geojson \
  | jq '.features[] | {shapeName, shapeISO}'
```

If `code_state` is `5` (number), filter with `=== 5`. If it's `"5"` (string),
filter with `=== "5"`. The kawasanku file uses **number** — but always verify
because DOSM may change the schema in a future release.

---

## 13. Build-Time Ingest Pipeline

The pattern: download → unzip → filter → save as `{state}-{kind}-geo.json` in
`src/data/`. Never bundle the raw nationwide geojson (3.1 MB raw for N9 alone;
Sabah/Sarawak nationwide ADM3 would be ~10 MB).

### 13.1 Bash + Node script (`scripts/fetch-adm.sh`)

```bash
#!/usr/bin/env bash
# scripts/fetch-adm.sh — parameterized by STATE_CONFIG
set -euo pipefail

STATE_KEY="${1:-n9}"   # e.g. "n9", "melaka", "sabah"
PIP_CODE=$(node -e "console.log(require('../src/config/state-id-map').STATE_ID_MAP['${STATE_KEY}'].pipCode)")
CODE_STATE=$(node -e "console.log(require('../src/config/state-id-map').STATE_ID_MAP['${STATE_KEY}'].kawasankuCodeState)")
SHAPE_NAME=$(node -e "console.log(require('../src/config/state-id-map').STATE_ID_MAP['${STATE_KEY}'].shapeName)")
TMP=$(mktemp -d)

# 1. Download geoBoundaries ADM0-3
for n in 0 1 2 3; do
  curl -sL "https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM${n}.zip" -o "${TMP}/adm${n}.zip"
  unzip -o "${TMP}/adm${n}.zip" -d "${TMP}/adm${n}"
done

# 2. Download kawasanku dun + parlimen
curl -sL "https://github.com/dosm-malaysia/kawasanku-front/raw/main/geojson/dun.json" -o "${TMP}/dun.json"
curl -sL "https://github.com/dosm-malaysia/kawasanku-front/raw/main/geojson/parlimen.json" -o "${TMP}/parlimen.json"

# 3. Filter + save
node scripts/filter-adm.js \
  --state-key "${STATE_KEY}" \
  --pip-code "${PIP_CODE}" \
  --code-state "${CODE_STATE}" \
  --shape-name "${SHAPE_NAME}" \
  --tmp "${TMP}" \
  --out src/data

echo "✓ Wrote 6 files to src/data/${PIP_CODE,,}-*-geo.json"
```

### 13.2 Node filter script (`scripts/filter-adm.js`)

```javascript
// scripts/filter-adm.js (excerpt)
const fs = require("fs");
const path = require("path");

function loadCollection(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function filterADM1(collection, shapeName) {
  const features = collection.features.filter(
    (f) => f.properties.shapeName === shapeName,
  );
  return { ...collection, features };
}

function filterADM2or3(collection, shapeName) {
  // ADM2/ADM3 features carry parent ADM1 name in 'adm1_name' (verify via §12)
  const features = collection.features.filter(
    (f) => f.properties.adm1_name === shapeName,
  );
  return { ...collection, features };
}

function filterKawasanku(collection, codeState) {
  // codeState is a NUMBER — never compare to a string
  const features = collection.features.filter(
    (f) => f.properties.code_state === Number(codeState),
  );
  return { ...collection, features };
}

function main(argv) {
  const args = Object.fromEntries(
    argv.slice(2).reduce((acc, cur) => {
      const [k, v] = cur.split("=");
      acc.set(k.replace(/^--/, ""), v);
      return acc;
    }, new Map()),
  );
  const { stateKey, pipCode, codeState, shapeName, tmp, out } = args;
  const lower = pipCode.toLowerCase();

  // ADM0 — no filter (country)
  fs.copyFileSync(`${tmp}/adm0/geoBoundaries-MYS_ADM0.geojson`,
                  path.join(out, `${lower}-adm0-geo.json`));

  // ADM1 — filter by shapeName
  const adm1 = filterADM1(loadCollection(`${tmp}/adm1/geoBoundaries-MYS_ADM1.geojson`), shapeName);
  fs.writeFileSync(path.join(out, `${lower}-adm1-geo.json`), JSON.stringify(adm1));

  // ADM2 + ADM3 — filter by parent ADM1 name
  const adm2 = filterADM2or3(loadCollection(`${tmp}/adm2/geoBoundaries-MYS_ADM2.geojson`), shapeName);
  fs.writeFileSync(path.join(out, `${lower}-adm2-geo.json`), JSON.stringify(adm2));
  const adm3 = filterADM2or3(loadCollection(`${tmp}/adm3/geoBoundaries-MYS_ADM3.geojson`), shapeName);
  fs.writeFileSync(path.join(out, `${lower}-adm3-geo.json`), JSON.stringify(adm3));

  // DUN + parlimen — filter by code_state (NUMBER)
  const dun = filterKawasanku(loadCollection(`${tmp}/dun.json`), codeState);
  if (dun.features.length === 0) {
    console.warn(`⚠ ${stateKey}: 0 DUN features (Federal Territory — skipping DUN file)`);
  } else {
    fs.writeFileSync(path.join(out, `${lower}-dun-geo.json`), JSON.stringify(dun));
  }
  const par = filterKawasanku(loadCollection(`${tmp}/parlimen.json`), codeState);
  fs.writeFileSync(path.join(out, `${lower}-parlimen-geo.json`), JSON.stringify(par));

  console.log(`✓ ${stateKey}: ADM1=${adm1.features.length}, ADM2=${adm2.features.length}, ADM3=${adm3.features.length}, DUN=${dun.features.length}, PAR=${par.features.length}`);
}

main(process.argv);
```

Run for a new state: `bash scripts/fetch-adm.sh melaka`. Outputs 5-6 files in
`src/data/`. Federal Territories output 5 (DUN skipped). Commit the filtered
JSONs to the repo — they're small (see §14).

---

## 14. Bundle Strategy

Filtered per-state GeoJSON sizes (N9 reference):

| File | Size | Notes |
| --- | --- | --- |
| `n-adm0-geo.json` | 30 KB | Same for every state |
| `n-adm1-geo.json` | 50 KB | 1 feature |
| `n-adm2-geo.json` | 200 KB | 7 districts |
| `n-adm3-geo.json` | 500 KB | 155 mukims |
| `n-dun-geo.json` | 400 KB | 36 DUNs |
| `n-parlimen-geo.json` | 150 KB | 8 parlimens |
| **Total** | **~1.3 MB** | Per state |

Sabah/Sarawak will be ~2-3× larger (73/82 DUNs respectively).

### 14.1 Loading strategy

Lazy-load with `next/dynamic` (`ssr: false`) — see `MAP-2D-CREATION.md` §5.1.
The 2D map imports geo JSONs inside the lazy chunk, so they don't bloat the
initial dashboard JS bundle.

### 14.2 Future: PMTiles on R2

For 5+ states in one deployment, total bundle would exceed 6 MB. PMTiles on
Cloudflare R2 would drop bundle by 1.6-2 MB per state. **However**, R2 may
require a payment method on the Free Tier — avoid on Free Tier deployments.
Stick with bundled JSONs for the first 3-5 states; revisit PMTiles when
the deployment list crosses 5 states.

---

## 15. Provenance + Attribution

The Governance → Sources panel **must** list, per geometry file:

| Field | Example |
| --- | --- |
| Source name | geoBoundaries / DOSM kawasanku |
| License | CC BY 4.0 / Open government data |
| Publisher | World Bank / wmgeolab / DOSM |
| Source URL | `https://github.com/wmgeolab/geoBoundaries/raw/main/sourceData/gbOpen/MYS_ADM1.zip` |
| Last fetched | 2026-07-17 (ISO date) |
| Filter rule applied | `shapeName === "Negeri Sembilan"` / `code_state === 5` |
| Feature count | 1 (ADM1) / 36 (DUN) / etc. |
| Attribution text | "Contains geoBoundaries data (CC BY 4.0)" / "Contains DOSM kawasanku data" |

Write a `{s}-provenance.json` alongside each geo JSON with this metadata. The
Governance panel reads it at runtime. Missing provenance = data-gap
`DG_PROVENANCE_MISSING`.

---

## 16. The Full Per-State Fetch Script

See §13 — `scripts/fetch-adm.sh` + `scripts/filter-adm.js` are parameterized by
`STATE_ID_MAP[<state-key>]`. To onboard a new state:

1. Add the row to `STATE_ID_MAP` in `src/config/state-id-map.ts` (§7).
2. Verify `code_state` per §12 (inspect the actual kawasanku file).
3. Run `bash scripts/fetch-adm.sh <state-key>`.
4. Inspect the 5-6 files written to `src/data/` — feature counts should match
   §6 table (DUN/PAR columns). If counts are off, the `code_state` is wrong
   (re-verify §12) or the `shapeName` doesn't match (re-verify ADM1 properties).
5. Commit the JSONs.
6. Update `STATE_CONFIG` in `src/config/state-config.ts` (see
   `MAP-2D-CREATION.md` §13) and `STATE_CONFIG_3D` (see `MAP-3D-CREATION.md`
   §18) with the new state's map center + projection center + scale.

---

## 17. Quirks Summary Table

| # | Quirk | Mitigation |
| --- | --- | --- |
| 1 | `code_state` in kawasanku is a NUMBER (5), not a string ("05") | Always filter with `=== 5`; verify via §12 |
| 2 | Melaka has 3 identifiers: PIP "M", kawasanku 4, geoBoundaries "MY-04" | `STATE_ID_MAP` is single source of truth (§7) |
| 3 | PIP-VOTER-INTELLIGENCE uses 4th identifier `state_code: "12"` for Melaka | Adapter normalises via `STATE_ID_MAP` (§8.1) |
| 4 | Federal Territories (KL/Putrajaya/Labuan) have 0 DUN | Skip DUN file write; map modules check existence (§9) |
| 5 | ROMPIN cross-state bleed (24,844 Pahang voter rows in N9 xlsx) | Filter at ingest; track as `DG_SCOPE_CROSS_STATE_REVIEW` (§10) |
| 6 | Sabah/Sarawak ADM3 uses "kampung" not "mukim" | Inspect `properties.Name`; rename layer label via STATE_CONFIG (§11) |
| 7 | geoBoundaries ADM2/ADM3 filter by parent ADM1 name, not state code | Use `adm1_name` field; verify via §12 (§5.3) |
| 8 | `/raw/main/` vs `?raw=true` — both work, `/raw/main/` preferred | Use `/raw/main/` form in all URLs (§3.1) |
| 9 | Attribution required (geoBoundaries CC BY 4.0) | Governance → Sources panel lists every source + license + URL (§15) |
| 10 | PIP codes collide (T=Selangor+Terengganu, W=KL+Putrajaya) | Always key off `code_state` or `shapeISO`, never `pipCode` |

---

*The shortest path to done is the right path.*
