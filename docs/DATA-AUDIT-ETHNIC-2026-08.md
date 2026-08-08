# PIP Melaka — Ethnic Data Audit (Phase 0)

**Date:** 2026-08-08  
**Status:** Completed (Phase 0 exit criteria met)

## 1. Current Data Assets Inventory

### Boundaries
- `public/data/boundaries/mlk-parlimen-geo.json`, `mlk-dun-geo.json`, `mlk-adm2-geo.json`
  - CRS: EPSG:4326 (WGS84)
  - Unique IDs: `code` (P134–P139, N.01–N.28)
  - Parent linkage: `parent_code`

### Election Results
- `public/data/elections/melaka-elections.json`
- `candidate-histories.json`, `coalition-trends.json`
- Fields present: `winner`, `margin`, `vote_share`, `turnout`, `election_id` (GE14, PRN15, GE15)

### Engine Intelligence (P134 verified)
- `public/data/p134/*-intelligence.jsonl`
  - Contains: `registered_voters`, `gender_balance`, `senior_dependency`, `profile_completeness`
  - **No ethnic_segment fields yet** (gap identified)

### Socioeconomic (DOSM)
- `public/data/socioeconomic/melaka-dosm.json`
  - Fields: `median_income`, `poverty_rate`, `gini`, `unemployment`, `urban_rural`

### Existing Code Paths
- `src/lib/dun-summary.ts`, `fallback-data.ts`, `dashboard.tsx` — read paths mapped
- No raw voter XLSX committed (verified via `npm run verify:no-pdpa-files`)

## 2. Ethnic-Related Fields (Current State)

| Field | Source | Type | Confidence | Notes |
|-------|--------|------|------------|-------|
| `gender_balance` | Engine (P134) | Aggregate | High | Per-DUN |
| `senior_dependency` | Engine | Aggregate | High | Per-DUN |
| `ethnicity` (in some intelligence files) | Engine | BANGSA → OTHER | Medium | Pseudonymised, not disaggregated |
| No `malay_share`, `chinese_share`, etc. | — | — | — | Gap |

**Gap summary:** No production ethnic segment shares (Malay/Chinese/Indian/Other) at DUN/PAR level yet.

## 3. Source Catalogue & Licensing

- **ElectionData.MY** — Requires `ELECTIONDATA_API_TOKEN`. CC0 for published results. Rate limits: polite use (nightly pulls recommended).
- **DOSM** — Open data (Census 2020 + HIES 2022). District-level ethnic composition available.
- **SPR** — Official voter rolls (Gate 9 still open — PDPA agreement pending).

## 4. Methodology Sign-off (Ready for Phase 0.3)

- Segments enum defined: `malay | chinese | indian | orang_asli | other_bumiputera | other`
- `MIN_CELL_N = 50` (enforced in `src/lib/privacy.ts`)
- All outputs labelled **“Estimated ethnic composition — area-level only. Not an individual voter prediction.”**
- Ecological fallacy disclaimer boilerplate ready.

## 5. Risk / Privacy Review

- ✅ No raw IC / voter names in public artifacts
- ✅ `verify:no-pdpa-files` passes
- Data-handling runbook location: `docs/DATA-HANDLING-PDPA.md` (to be created in next phase)

**Phase 0 complete.** Ready to proceed to Phase 1A (offline pipeline) or Phase 3 (service layer).
