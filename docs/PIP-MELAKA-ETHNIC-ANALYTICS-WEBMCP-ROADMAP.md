# PIP Melaka — Ethnic Electoral Analytics + WebMCP Roadmap & To-Do List

**Branch:** `arena/019fe0bb-pip-melaka`
**Date:** 2026-08-08
**Status:** Final implementation plan (Cloudflare-Free compatible prototype path)
**Owner role:** Senior Software Engineer / Electoral-Analytics Lead
**Deployment target for v0 (this PR):** **Cloudflare Free tier** — staged prototype on the existing `pip-melaka.ritz-analytics.workers.dev` deployment. A paid Workers plan ($5/mo) is a Phase-9 upgrade trigger, not a prerequisite.
**Targets:**
- Production stack already in repo: **Next.js 16 + OpenNext/Cloudflare Workers**, **Leaflet 1.9** (not MapLibre yet), **Cloudflare D1/R2-ready**, `@opennextjs/cloudflare` deploy pipeline, existing `/api/electiondata` proxy and `/api/demographics` intelligence route, 6 parliament × 28 DUN Melaka coverage with `p134..p139` JSONL intelligence under `public/data/`.

> **Free-tier verdict (researched 2026-08-08):** The roadmap is viable on Cloudflare Free as a staged prototype **if** heavy processing (3M-row parsing, H3 aggregation, MVT generation, multi-election joins) stays offline, and the Free Worker serves only pre-aggregated, indexed lookups. ElectionData.MY's API requires a Bearer API key; public data licensing and API usage policy are separate matters. Use nightly pulls, caching, versioned snapshots, provenance metadata, and polite-use behaviour because no published hard public rate limit must not be treated as unlimited automated polling.

---

## 0. Design Principles (read before coding)

1. **Ethnicity is an area-level analytical variable, never an individual prediction.**
   All UI labels, tooltips, tool results, and API responses MUST use the framing:
   “Estimated ethnic composition”, “Area-level association”, “Based on aggregate / survey data”, “Not an individual voter prediction”.
2. **Ecological fallacy guard-rails are a product requirement**, not a footnote.
   Every ethnic metric ships with a methodology link and a confidence indicator.
3. **Privacy by default.** Individual voter records (the ~3M-row set) NEVER leave the engine stage. The public surface returns aggregate, threshold-suppressed cells only. No exact GPS in tiles or MCP responses.
4. **Separate sources, separate labels.** Distinguish:
   - Official election results (SPR / ElectionData.MY)
   - Candidate demographics
   - DOSM / census derived composition
   - Survey-based ethnic-voting estimates (e.g. ILHAM, Merdeka Center, ISEAS)
   - PIP-modelled estimates (name-ethnicity classifier + geo-aggregation)
5. **Analytics service layer first.** The same service functions power REST, server actions, MCP/WebMCP, and tests. Controllers never talk to raw data directly.
6. **WebMCP is an optional AI interface on top**, not the foundation. Build the dashboard and the safe analytics API first; enable WebMCP last.
7. **All aggregate cells enforce a minimum threshold** (`MIN_CELL_N = 50` voters by default). Cells below threshold return `null` and are marked “suppressed”.
8. **Work within the existing stack.** The repo currently uses Leaflet. Phase 4 introduces MapLibre as a *parallel* package (`maplibre-gl`) so existing 2D Tab is not broken mid-rollout.

---

## 1. Phasing Overview

| Phase | Name | Goal | Exit criteria | Rough effort |
|---|---|---|---|---|
| 0 | Discovery & data audit | Inventory what exists, sign off on ethnic methodology | Data audit doc merged, thresholds agreed | 2–3 days |
| 1A | Free-tier architecture & local pipeline | Offline build that emits aggregates + tiles; no in-request ETL | Local CLI runs end-to-end on Melaka GE15+PRN15; outputs fit in D1+R2 budgets per `docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md` §10 | 3–4 days |
| 1 | Data model & ingestion | D1 aggregate tables + ElectionData.MY nightly snapshot cron (API-key, polite-use cached pulls) | All Melaka GE15+PRN15 loaded, joins clean; writes <1K/day; D1 storage <50 MB | 1 week |
| 2 | Privacy & aggregation pipeline | Thresholding, MVT tile pre-generation, R2 storage | K-anonymity review passed; vector tiles on R2; no in-request tile gen | 4–5 days |
| 3 | Analytics service layer | Pure TS service functions (no HTTP); ≤2 D1 prepares/call | 100% unit coverage; P95 CPU <5 ms on warm Worker | 1 week |
| 4 | MapLibre dashboard layers (v0 = 3 layers) | Composition choropleth (single segment), winner choropleth, turnout; scatterplot; time slider for GE15↔PRN15 | Layers render; Leaflet tab untouched; CPU/request budget met | 1 week |
| 5 | REST / server-action API | `/api/constituency`, `/api/compare`, `/api/tiles`, etc. | Contract tests green; P95 <300 ms; quota telemetry reporting | 3 days |
| 6 | Remote MCP endpoint (`/mcp`) | 5 read-only wave-1 tools behind Cloudflare Access; audit log; rate limits; quota guard | MCP tools answer canonical question; no >2 D1 calls/tool | 1 week |
| 7 | WebMCP bridge + frontend agent hooks | Optional developer-preview behind feature flag + Access | Agent answers canonical question end-to-end on Chromium; flag-off path verified | 3–4 days |
| 8 | Testing, hardening & docs | Privacy review, load tests on Free, runbook, UAT | Free-quota soak test passes 24h with margin; production sign-off | 1 week |

> **Free-tier rule in effect across all phases:** heavy processing (3M-row parsing, H3 aggregation, MVT generation, multi-election joins) happens offline — see companion `docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md`. The Worker only serves pre-aggregated indexed lookups.

---

## Phase 0 — Discovery & Data Audit

### 0.1 Repository & data audit
- [ ] Document current data assets:
  - [ ] `public/data/boundaries/mlk-{adm1,adm2,dun,parlimen}-geo.json` — confirm schemas, CRS, unique IDs.
  - [ ] `public/data/elections/melaka-elections.json`, `candidate-histories.json`, `coalition-trends.json`, `query-tables.json` — enumerate fields, election IDs present (PRN15, GE14, GE15).
  - [ ] `public/data/p134..p139/*-intelligence.jsonl` — profile fields, verify each has PAR/DUN/DM/LOCALITY records, note which already contain demographic/ethnic fields.
  - [ ] `public/data/socioeconomic/melaka-dosm.json` — inspect available DOSM fields (income, education, urban/rural).
  - [ ] `src/lib/dun-summary.ts`, `query-tables-data.ts`, `pip-engine-adapter.ts`, `fallback-data.ts` — map read paths, identify where data is currently denormalised for the UI.
- [ ] Cross-reference `engine/pip-voter-*-{cleanser,profiler,transformer,pipeline}*` to understand what the Python engine already classifies (name→ethnicity, locality → geo, turnout fields).
- [ ] Produce `docs/DATA-AUDIT-ETHNIC-2026-08.md` with: every ethnic-related field, its source (SPR/ElectionData.MY/DOSM/PIP-model/survey), confidence, and whether it is individual vs. aggregate.

### 0.2 Source catalogue & licensing
- [ ] Open an account/key for ElectionData.MY (if not already held) and document:
  - [ ] API rate limits, licence, attribution requirements.
  - [ ] Available election UIDs (GE13, GE14, GE15, PRN Melaka 2021).
  - [ ] Which endpoints provide candidate demographics vs. seat-level results.
- [ ] Catalogue DOSM (Department of Statistics Malaysia) open datasets for Melaka:
  - [ ] Population by ethnic group at ADM2 (district) and DUN (if published).
  - [ ] Urban/rural classification.
  - [ ] Household income, education (controls for multivariate analysis).
- [ ] Catalogue survey / academic estimates for ethnic voting in GE14/GE15 (ISEAS, Merdeka Center, ILHAM Centre, SMU Ink, Asia Maior) — store as `data/reference/ethnic-voting-surveys.json` with citation, sample, year.

### 0.3 Methodology sign-off
- [ ] Write `docs/METHODOLOGY-ETHNIC.md` covering:
  - [ ] **Classification method** — e.g. name-ethnicity classifier (self-reported if available; otherwise documented PIP multinomial model with precision/recall by segment).
  - [ ] **Segments:** Malay, Chinese, Indian, Orang Asli, Bumiputera Sabah, Bumiputera Sarawak, Other (with explicit handling that Melaka has negligible Sabah/Sarawak Bumiputera shares but the schema must support them).
  - [ ] **Voters vs. residents:** denominator is *registered voters* (SPR), not *census residents*. All output states this.
  - [ ] **Minimum cell threshold** policy (default `MIN_CELL_N = 50` for any disaggregated ethnic count).
  - [ ] **Confidence levels** per record: `high` (official SPR/DOSM), `medium` (ElectionData.MY joined with SPR), `low` (PIP modelled / survey).
  - [ ] **Ecological fallacy disclaimer** boilerplate (used by UI, MCP results, CSV exports).
- [ ] Agree on **segments enum** in code: `type EthnicSegment = "malay" | "chinese" | "indian" | "orang_asli" | "other_bumiputera" | "other"` (no “Bumi/non-Bumi” catch-all for analytical outputs).
- [ ] Define **geography levels**: `STATE → PARLIAMENT → DUN → DM (polling district / daerah mengundi) → LOCALITY (saluran) → H3CELL`. Every demographic record is bound to one `geography_id + geography_type + election_id`.

### 0.4 Risk/privacy review
- [ ] Confirm repo does NOT currently commit raw voter XLSX/CSV in `raw-voters/`, `download/`, `upload/` — add to `.gitignore` if needed.
- [ ] Run `npm run verify:no-pdpa-files` and add CI enforcement for: NRIC numbers, names + GPS pairs, unsuppressed saluran-level ethnic counts.
- [ ] Document a data-handling runbook (`docs/DATA-HANDLING-PDPA.md`): who can run the Python engine, where raw files live, retention, deletion policy.

### Testing (Phase 0)
- [ ] Add unit tests for the field inventory (`tests/data-audit.test.ts`) that fail if a new ethnic field appears without a `source`/`confidence` tag.
- [ ] Add a CI check that `raw-voters/` and `engine-archive/data/transform/*/locality-intelligence.jsonl` are never packaged to the Workers build.

---

## Phase 1A — Free-Tier Local Build Pipeline (do this BEFORE any remote code)

Goal: build the data entirely **offline** on a developer laptop and prove the outputs fit inside Free quotas before a single Worker request is written. This is the architectural correction required by Free.

- [ ] Install local tooling: `duckdb` (or `polars`), `h3-js`, `better-sqlite3`, `tippecanoe` (optional, for MVTs); Python deps already in `engine/`.
- [ ] Create `scripts/` commands:
  - `scripts/build-aggregates.mjs` — runs the PIP engine end-to-end locally → emits `artifacts/aggregates/{geography,election}_demographics.csv`, `artifacts/aggregates/results.csv`, `artifacts/manifest.json`.
  - `scripts/build-tiles.mjs` — reads `public/data/boundaries/*.json` + aggregates → emits MVT tree under `artifacts/tiles/`.
  - `scripts/init-d1.mjs` — creates the D1 database locally (`pip_melaka_analytics`) via `wrangler d1 create` (once), applies SQL migrations.
  - `scripts/load-d1.mjs` — bulk-inserts CSVs into the local D1, then runs `wrangler d1 execute --remote` to sync to the preview/prod DB (single batch script, not per-row).
  - `scripts/sync-r2.mjs` — uploads `artifacts/tiles/` and `artifacts/snapshots/` to R2, writes `tiles-manifest.json`.
- [ ] Verify the Free-budget math locally:
  - D1 DB file < 50 MB (target, vs 500 MB cap).
  - Tile tree < 50 MB (target, vs 10 GB R2 free).
  - A single-area profile query < 1 ms CPU local → ≤ 5 ms on Worker.
  - A comparison query (10 areas) < 2 ms CPU local → ≤ 10 ms on Worker.
- [ ] Add a `npm run pipeline:local` that runs all of the above against fixtures first, then real Melaka data.

### Testing (Phase 1A)
- [ ] Offline fixture test: run the pipeline on a deterministic fixture of 2 elections × 6 parliamentary areas × 28 DUN areas × 4 demographic segments. The fixture must use a fixed seed or fully explicit records and include known turnout values, known winning margins, known suppressed cells, and known source/version metadata. Assert CSVs are produced, tile tree is valid (decode one tile per layer with `@mapbox/vt2geojson`), manifest has SHA-256, and the canonical query returns the expected ranked DUN list.
- [ ] Bundle-size check: ensure the OpenNext Worker bundle stays under the 3 MB gzip cap (the analytics service code should add < 80 KB gzipped).
- [ ] Free-budget test: a `wrangler dev` run of 1,000 simulated requests must consume < 200 rows-scanned/read per request (so 100K requests/day uses < 20M scanned/read rows; wait — D1 free is 5M/day, so retune to ≤ 50 scanned/read rows/request, which means only index lookups; add an assertion in tests).

---

## Phase 1 — Data Model & Ingestion

### 1.1 Replace placeholder Prisma schema
Status check on the current codebase (2026-08-08):
- `src/app/api/health/route.ts` and `src/app/api/health/ready/route.ts` **already** no longer import Prisma — they build-time-import static JSON and report `checks.data`. TASK-1 from ROUND-8 is partially done.
- `src/lib/db.ts` still exists as a lazy Prisma proxy but is **not imported anywhere** in `src/`, `scripts/`, or `tests/` (verified via repo-wide grep). It is dead code.
- `package.json` still lists `@prisma/client` and `prisma`.
- Prisma's query engine cannot run on Cloudflare Workers in any case, so it must not be on the Worker request path.

Action for this PR:
- [ ] **Do not delete Prisma from `package.json` yet.** It does not appear in the Worker bundle (no import path reaches it) and Prisma is still useful for LOCAL-ONLY ingestion scripts that load D1 from a developer machine. Removing it is a clean-up item AFTER D1 migration lands and local ingestion scripts use raw D1/better-sqlite3.
- [ ] Add a comment to `src/lib/db.ts` marking it `@deprecated — do not import on the Worker path; retained only for local dev scripts. Will be removed once D1 ingestion uses raw SQL/Wrangler.`
- [ ] Add a lint rule or comment in `docs/DATABASE-MIGRATIONS.md`: **No new imports of `@/lib/db` in `src/app/api/**` or `src/lib/**` that end up in the Worker bundle.**

Move to D1 for aggregates. Use **raw SQL migrations** under `prisma/migrations/*.sql` (applied via `wrangler d1 execute pip_melaka_analytics --file=...`), because Prisma does not support D1 as a production target and Workers cannot run the Prisma engine. Keep the Prisma schema file as a local-dev/type reference only.

> **Free-tier sizing constraint:** D1 Free gives **5 GB total account storage** (500 MB per database cap), **5M rows read/day**, **100K rows written/day**, **50 queries/invocation**. D1 therefore holds **indexed aggregate tables and metadata only** — never the 3M-row raw voter list. Large immutable artifacts (raw snapshots, MVT tiles, H3 parquet, GeoJSON) live in **R2** (10 GB free, zero egress) or in `public/` static assets bundled at build time.
- [ ] Define Prisma models for the analytics warehouse (D1 provider once worker-runtime Prisma story is chosen; for now use raw D1 SQL migrations under `prisma/migrations/0001_analytics_warehouse.sql` since Workers can bind D1 directly):

**Core tables**
- [ ] `election` — `id` (e.g. `GE15`, `PRN15_MELAKA`), `type` (parliament/state), `date`, `state`, `source`, `data_version`.
- [ ] `coalition` / `party` — normalised parties + coalitions (`PH`, `BN`, `PN`, `GPS`, `GRS`, `MUDA`, `PAS`, etc.), colours, logos.
- [ ] `geography` — `id`, `type` (STATE/PARLIAMENT/DUN/DM/LOCALITY), `code` (e.g. `P134`, `N.01`), `name`, `parent_id`, `adm2_district`, `urbanness` (rural/semi-urban/urban from DOSM), `area_km2`, `centroid_lat`, `centroid_lon`.
- [ ] `geography_boundary` — GeoJSON/MVT reference per geography + resolution, stored as R2 key.
- [ ] `election_result` — per (geography, election, party): votes, vote_share, spoilt votes (at geography level), turnout (registered, turnout_count, turnout_pct).
- [ ] `candidate` — per (geography, election): name, party, coalition, gender, *candidate* ethnicity (if publicly declared/sourced — NEVER impute from voter rolls), result (won/lost/deposit_lost).
- [ ] `demographic_estimate` — **the main ethnic table**:
  - `geography_id`, `geography_type`, `election_id`
  - `ethnic_segment`
  - `registered_voters`, `classified_voters`
  - `segment_share NUMERIC(5,4)`
  - `turnout_pct NUMERIC(5,4)` (nullable)
  - `source` (spr|dosm|electiondata|pip-model|survey)
  - `methodology`, `confidence_level`
  - `data_version`, `updated_at`
  - constraints: shares sum to ~1.0 ± 0.01 per geography, no individual rows, `classified_voters >= MIN_CELL_N` or record suppressed.
- [ ] `h3_demographic` — for hex grid:
  - `h3_cell CHAR(15)`, `resolution TINYINT`
  - `segment EthnicSegment`
  - `voter_count INT`, `segment_share NUMERIC(5,4)`
  - `election_id`, `minimum_cell_threshold INT`
  - `data_version`, `confidence_level`
  - unique constraint on `(h3_cell, segment, election_id)`.
- [ ] `mcp_tool_audit` — `id`, `tool_name`, `args_hash`, `caller_session`, `ts`, `latency_ms`, `rows_returned`, `blocked_reason` nullable.
- Indexes: all FKs, composite on `(geography_type, election_id)`, `(h3_cell, election_id)`, `(election_id, ethnic_segment)`.
- [ ] Add migrations for D1 and document them in `docs/DATABASE-MIGRATIONS.md`.

### 1.2 ElectionData.MY ingestion (API-key, polite-use cached pulls)
Confirmed 2026-08 against the official docs [[electiondata openapi](https://electiondata.my/openapi/), [authentication](https://electiondata.my/openapi/authentication/)]:
- The API requires a Bearer API key; keep it server-side and never expose it to browser code (already the pattern in `src/app/api/electiondata/route.ts`).
- Public data licensing and API usage policy are separate. Verify exact licence/attribution in Phase 0 before claiming CC0/public-domain status in product copy.
- No hard public rate limit is documented here, but this is **not** permission for unlimited automated polling. Be a polite consumer: cache aggressively, use SWR, run nightly pulls only, avoid aggressive crawls, and snapshot/version all retrieved data.
- Provenance metadata must include source URL, retrieval timestamp, API-key identity/account label, dataset version/hash, and snapshot pointer.

Implementation:
- [ ] Keep the existing `/api/electiondata` proxy as an on-demand fallback; **do not call it on every page load**.
- [ ] Add `src/lib/electiondata-ingest.ts` and a nightly Cron Trigger (1 of 5 Free cron slots) that:
  - Pulls GE15 + PRN15 Melaka seat results, candidate lists, party metadata.
  - Writes **versioned snapshots** to R2 (`snapshots/electiondata/{yyyy-mm-dd}/{uid}.json`).
  - Upserts only changed rows into D1 (target: <1000 writes/night, well under 100K/day Free cap).
  - Bumps a `data_version` manifest in KV (1 write).
- [ ] Build a local CLI `scripts/ingest-electiondata.mjs` for backfill (`--dry-run`, `--full-refresh`); uses the free API key from `.dev.vars`.
- [ ] Extend the allowlist in `/api/electiondata/route.ts` conservatively — each new endpoint is a PR with a justification.
- [ ] Attribution footer reads "Data by SPR / ElectionData.MY / DOSM / PIP-derived estimates." Confirm exact licensing and attribution language during Phase 0; do not conflate public data licensing with API usage policy.

### 1.3 DOSM / census ingestion
- [ ] Script `scripts/ingest-dosm.mjs` to load Melaka district-level ethnic composition + urban/rural + income into D1 as `demographic_estimate` rows with `source='dosm'` and `geography_type='ADM2'`.
- [ ] Build a DUN-level allocation model (documented in `docs/METHODOLOGY-ETHNIC.md`) that *disaggregates* ADM2 DOSM to DUN using voter-list weighting (marked `confidence='low'`, `methodology='dosm_dun_weighted'`).

### 1.4 PIP engine aggregate output (offline-only, no Worker ETL)
> **Free-tier rule:** The PIP engine runs on a developer laptop / CI, not inside the Worker. Worker requests never parse the 3M-row dataset.
- [ ] Extend the existing Python/JS pipeline (`engine/pip-voter-intelligence-transformer-v1.0.js` / the Python cleanser) to emit aggregate CSVs/JSONL at **DUN and PAR level only for v0**:
  - Output per `(geography_type, geography_id, ethnic_segment)`: `registered_voters`, `classified_voters`, `segment_share`, `turnout_pct`.
  - Apply `MIN_CELL_N` suppression inside the engine (never write suppressed rows).
  - Write a manifest with `data_version` (git SHA + date), row counts, and SHA-256 checksum.
- [ ] Add a bulk loader (`scripts/load-pip-aggregates.mjs`) executed **locally or in CI** that imports into `demographic_estimate` using **batched `wrangler d1 execute` SQL** (single-script batch INSERT, not per-row Worker writes). DM rows are rolled up to DUN/PAR at load time before being sent to D1.
- [ ] **H3 is deferred to v0.1.** When reintroduced, generate H3 counts offline with `h3-js`, roll up to res 8/9 with threshold suppression, and ship as PMTiles or pre-joined GeoJSON on **R2** (not D1 rows — avoids 500K+ row write burst on the Free plan).
- [ ] **MVT tiles are generated offline** (see Phase 2) and uploaded to R2 via `wrangler r2 object put`; the Worker serves them via `R2.get()` only.
- [ ] Snapshots of the raw engine outputs are kept in R2 (`pip-melaka-artifacts/snapshots/engine/{date}/`) so the public R2 bucket never stores per-voter data.

### 1.5 Versioning & lineage
- [ ] Every row in aggregate tables carries `data_version` and `source`.
- [ ] Expose a `/api/provenance` endpoint (already a stub? verify `src/app/api/provenance/`) that returns version + refresh time + source list.

### Testing (Phase 1)
- [ ] Ingestion unit tests:
  - [ ] ElectionData.MY mock payload → correct upsert into `election_result`.
  - [ ] DOSM fixture → DUN disaggregation sanity (shares sum to ~1.0).
  - [ ] Threshold suppression: cell with 3 voters in a segment must NOT produce an `h3_demographic` row.
- [ ] Referential integrity tests: every `election_result.geography_id` exists in `geography`.
- [ ] Integration test that runs the whole ingest pipeline against a fixture set of one parliament and asserts final DUN demographic shares match a golden JSON.
- [ ] Negative test: PII columns (name, nric, exact lat/lon of voters) must NOT exist in any D1/R2 public table — add a schema-lint test.

---

## Phase 2 — Privacy & Aggregation Pipeline

### 2.1 Thresholding & k-anonymity
- [ ] Centralise the rule in `src/lib/privacy.ts`:
  - `MIN_CELL_N = 50` (constant, overridable via env for internal builds).
  - `suppressIfBelow(records)` returns nulls for cells < threshold.
  - `roundShare(n)` rounds segment_share to 4 decimals; never returns 0 when real count is 1–49.
- [ ] Apply at three layers: (a) engine output, (b) D1 load, (c) query-time response. Defence in depth.

### 2.2 Vector tile generation (MVT) — offline-prebuilt, served from R2
- [ ] Choose stack for **offline** tile generation: `@mapbox/tilelive` + `vt-pbf` + `geojson-vt` in a Node CLI script (`scripts/build-tiles.mjs`).
- [ ] Tilesets for v0 (kept small — Melaka only):
  - `boundaries/{z}/{x}/{y}.mvt` — ADM1, ADM2, PAR, DUN (DM deferred).
  - `results/{election}/{metric}/{z}/{x}/{y}.mvt` — winner, margin, turnout for GE15 and PRN15.
  - `ethnic/{election}/{segment}/{z}/{x}/{y}.mvt` — per-segment share for the 4 v0 segments.
- [ ] H3 tiles (`h3-ethnic/{...}`) are deferred to v0.1.
- [ ] Run the CLI at build/deploy time and upload the tree to R2 (`pip-melaka-artifacts/tiles/...`). Target tile tree size: <50 MB for v0 (well within R2's 10 GB free).
- [ ] Serve tiles at `GET /api/tiles/{tree}/{z}/{x}/{y}.mvt` via a thin Worker route that does `env.R2.get(key)` and streams back with `Content-Type: application/vnd.mapbox-vector-tile` + `Cache-Control: public, s-maxage=604800, stale-while-revalidate=86400`. No tile generation in the request path.
- [ ] Tile contents never include names, NRICs, per-voter counts below threshold, or exact coordinates.
- [ ] Add a `tiles-manifest.json` at the R2 prefix root listing tileset names, data_version, and bbox — the frontend fetches it once on load.

### 2.3 GeoJSON endpoint policy
- [ ] Public GeoJSON endpoints return only boundaries (no demographic attributes at LOCALITY level).
- [ ] Demographic attributes are joined client-side from a separate JSON endpoint that is threshold-aware.

### 2.4 Differential-privacy / noise (optional, future)
- [ ] Document as a Phase-9 enhancement: apply small Laplace noise to H3 counts where legal/ethical review supports it; do not implement yet.

### Testing (Phase 2)
- [ ] Property test: for every public response, every ethnic count is null or `>= MIN_CELL_N`.
- [ ] Property test: for every H3 tile, total voters per cell is null or `>= MIN_CELL_N`.
- [ ] Tile integration test: fetch z/x/y for known Melaka tiles, decode MVT, assert no PII field names in proto schema.
- [ ] Load test the tile endpoint with `wrangler dev` + `k6` (or `autocannon`) for ≥200 RPS on cold and warm Workers.

---

## Phase 3 — Analytics Service Layer

Implement pure TypeScript functions in `src/lib/analytics/` (new folder). These contain **no NextRequest/NextResponse** and **no fetch client-side**, so they are trivially testable and usable from REST, server actions, MCP, and future mobile clients.


### 3.0 Runtime telemetry contract (build first)
Every analytics, REST, MCP, and map-data request uses one shared telemetry envelope from `src/lib/analytics/runtime-telemetry.ts`:
```ts
type RuntimeTelemetry = {
  requestId: string;
  route: string;
  tool?: string;
  authenticated: boolean;
  cacheStatus: "hit" | "miss" | "stale" | "bypass";
  queryCount: number;
  rowsRead: number; // D1 rows scanned/read during SQL execution, not result-row count
  rowsWritten: number;
  cpuMs?: number; // Worker CPU actually consumed, when available
  durationMs: number; // total elapsed request time, including D1/R2/network waits
  responseBytes: number;
  status: number;
  dataVersion?: string;
};
```

Implementation notes:
- [ ] Use the shared `runD1(statement, telemetry)` helper for D1 `.all()` calls. It increments `queryCount`, `rowsRead`, and `rowsWritten` from D1 result metadata (`rows_read`, `rows_written`) and tolerates missing metadata in local mocks. Treat `rowsRead` as D1 rows scanned/read during SQL execution, including index reads, **not** result-row count.
- [ ] Keep `cpuMs` and `durationMs` distinct: Cloudflare Worker CPU excludes database/network wait time; total duration includes it.
- [ ] Warning thresholds for v0: `queryCount <= 2`, `rowsRead <= 100` scanned/read rows, `responseBytes <= 8 KB`, CPU P95 `< 8 ms`, duration P95 `< 500 ms`, error rate `< 1%`. Treat these as warnings while fixtures and indexes stabilize; fail canonical acceptance tests once budgets are agreed. Add a separate `resultRows` field later if response cardinality needs to be tracked independently from query cost.
- [ ] Test runtime telemetry with empty filters, invalid area codes, unknown elections, maximum allowed comparisons, suppressed demographic cells, cache hit/miss, unauthenticated MCP, expired Access session, repeated identical requests, and concurrent requests.
- [ ] Do not treat WebMCP bridge injection as a security signal. `/mcp` authentication, authorization, audit logging, and safe tool responses must pass independently.

### 3.1 Service modules
Design constraint for Free: every public service function performs **≤ 2 prepared D1 statements** and returns **≤ 20 rows / ≤ 8 KB JSON**. No in-memory joins over thousands of rows; joins are pre-materialised offline. The statement-count target is necessary but not sufficient: runtime tests must also record **query count, rows read, CPU duration, response bytes, and cache status**, because a single poorly indexed query can still scan too many rows.

- [ ] `src/lib/analytics/elections.ts`
  - `listElections(state?: 'Melaka'): ElectionMeta[]`
  - `getAreaProfile(area_type, area_code, election): AreaProfile` (single indexed lookup by `(geography_type, code, election)`).
  - `compareAreas(area_codes[], election, metrics): ComparisonResult` (single `IN (...)` query; ≤10 areas v0).
- [ ] `src/lib/analytics/demographics.ts`
  - `getAreaDemographicEstimate(area_type, area_code, election): DemographicBreakdown` (one D1 prepare, returns 4 segments).
  - `getTurnoutBySegment(area_type, area_code, election): SegmentTurnout[]` (where segment-level turnout is available — v0 only at DUN/PAR).
  - `getH3CellSummary` deferred to v0.1.
- [ ] `src/lib/analytics/results.ts`
  - `getTurnoutTrend(area_code, election_ids): TrendPoint[]` (v0: 2 elections → 2 points).
  - `getMargins(area_type, election): RankedMargins` (one query, ≤28 rows for Melaka DUN).
  - `getEffectiveNumberOfParties` (computed from the pre-aggregated voteshare row).
  - `getVoteSwing` deferred to v0.2.
- [ ] `src/lib/analytics/competition.ts`
  - `getCompetitivenessTier(margin): 'safe'|'fairly-safe'|'marginal'|'ultra-marginal'` (pure function, no DB call).
  - `findSimilarConstituencies` deferred to v0.1 (needs cosine over all 28 DUN — small but do in-memory on preloaded 28-row cache, not per request).
- [ ] `src/lib/analytics/chart-specs.ts`
  - `scatterSpec(xSegment, election, metric): VegaLiteSpec` (builds spec from cached 28-row table for v0).
  - `compositionTernarySpec`, `smallMultiplesSpec` deferred to v0.1.
- [ ] `src/lib/analytics/ethnic-vote.ts` (DEFERRED to v0.2+):
  - Survey/ecological-inference estimates are **not** in v0. The v0 dashboard presents composition + outcome side by side and explicitly says no individual vote prediction. Naming (when added): `getAreaVoteEstimateBySegment()` — never `getVoterEthnicity()`.
- [ ] `src/lib/analytics/runtime-telemetry.ts`
  - Shared request envelope, D1 wrapper, response-byte measurement, budget-warning helper, and tests for missing D1 metadata.
- [ ] `src/lib/analytics/query-guard.ts`
  - Validates every call: allowlisted area codes (Melaka P134–P139, N.01–N.28), allowlisted election IDs (`GE15`, `PRN15_MELAKA` in v0), max returned rows, query budget (≤2 D1 calls), response size cap.
  - Throws `AnalyticsValidationError` that translates to 400/MCP error.

### 3.2 Metadata wrapper
Every response is wrapped with:
```ts
type AnalyticsEnvelope<T> = {
  data: T;
  meta: {
    estimateType: 'official' | 'area-level estimate' | 'survey-derived' | 'modelled';
    sources: string[];
    geography: string;
    dataVersion: string;
    confidence: 'high' | 'medium' | 'low';
    generatedAt: string;
    disclaimer: string; // ecological fallacy warning
  };
};
```

### Testing (Phase 3)
- [ ] 100% unit coverage threshold on `src/lib/analytics/*` (enforced in `eslint`/CI with a coverage script — add `c8` or `vitest`).
- [ ] Table-driven tests for each service function using fixture data in `tests/fixtures/`.
- [ ] Runtime-budget tests wrap the D1 adapter and response serializer to assert: query count, rows scanned/read (from D1 result metadata where available), rows written, CPU duration, total duration, response bytes, and cache status. Fail tests when any canonical v0 lookup exceeds the documented budget. Add specific tests that two statements accumulate query count and D1 metadata counters, and that one failed statement records failure status, preserves `requestId`, returns a controlled error, and does not leak SQL or sensitive parameters.
- [ ] `EXPLAIN QUERY PLAN` tests for all v0 SQL lookups; assert indexed access on geography/election/segment columns and reject table scans. Keep documented SQL fixtures such as `SELECT ... FROM area_profile WHERE election_id = ? AND area_code = ? LIMIT 20` and expected composite indexes such as `idx_area_profile_election_area ON area_profile(election_id, area_code)`.
- [ ] Tests for edge cases:
  - Missing election → `AnalyticsValidationError`.
  - Suppressed cell → returns `null` with suppression reason in meta.
  - Shares never sum to outside `[0.99, 1.01]`.
  - Margin = winner_votes − runner_up_votes always.
- [ ] Fuzz/random-query test: 10,000 random parameter combos call services and must never throw uncaught errors or return PII fields.

---

## Phase 4 — MapLibre Dashboard Layers

Current 2D tab uses Leaflet. Introduce MapLibre **in parallel** as a new tab (e.g. `Ethnic Analytics (Beta)`) so the existing map keeps working.

### 4.1 Dependency setup
- [ ] Add `maplibre-gl`, `@maplibre/maplibre-gl-geocoder`, `h3-js`, `vega` + `vega-lite` + `react-vega` (for small multiples / ternary / scatter).
- [ ] Add `src/components/maplibre/` folder with well-scoped components.

### 4.2 v0 MapLibre layers (Free-tier scoped — 3 main layers + supporting chart)
Ship these three in v0. Everything else (H3, small multiples, ternary) is v0.1+ to keep bundle size and per-request CPU low.
1. **Ethnic composition choropleth** (PAR → DUN, zoom-dependent):
   - Dropdown to select one segment at a time (Malay / Chinese / Indian / Other).
   - Sequential colour ramp per segment (never a multi-segment rainbow).
   - Legend: “Estimated share of classified voters (area-level)”.
2. **Party vote-share / winner choropleth** (GE15 + PRN15):
   - Uses `party-colors.ts` / `party-metadata.ts`.
   - Stroke weight encodes winning margin (competitiveness halo).
3. **Turnout choropleth** (registered-voter turnout %) for GE15 and PRN15.
4. **Scatterplot (composition vs outcome)** linked to the map:
   - x = selected ethnic segment share, y = winning-coalition vote share, dot size = turnout, colour = winning coalition.
   - Brush highlights matching constituencies on the map.
5. **Time slider: GE15 ↔ PRN15** (two-state toggle in v0; GE13/GE14 added in v0.2 once data is loaded).
6. **Rich tooltip** (build-time-safe, no per-click fetch):
   - Counts, shares, turnout, margin, confidence, source/version, disclaimer.

### 4.3 Supporting visuals (v0.1+ — not in initial PR)
- [ ] **H3 hex layer** (deferred — offline-generated PMTiles on R2).
- [ ] **Small multiples** — four mini choropleths side by side.
- [ ] **Ternary chart** (Malay/Chinese/Indian) with colour by winning coalition.
- [ ] **Competitiveness vs ethnic mix** binned chart.
- [ ] **Urban/rural toggle** — once DOSM urbanness is fully joined.
- [ ] **DM-level zoom** (z≥14) after thresholding is re-reviewed at DM granularity.

### 4.4 Frontend state
- [ ] Add a Zustand store `src/stores/ethnic-analytics-store.ts` for:
  - active election, active segment, active metric, zoom/center, selected geography, time-slider index.
- [ ] Ensure the existing `map-2d-tab.tsx` Leaflet store is untouched/isolated.

### 4.5 UX caveats & labels
- [ ] Footer/banner on the new tab with the permanent disclaimer:
  > “Ethnic composition is estimated at the area level using aggregate and modelled data. It describes constituencies, not individual voters. See Methodology.”
- [ ] “Estimated” badge next to any segment-derived metric.
- [ ] Link to `docs/METHODOLOGY-ETHNIC.md` rendered in-app.

### Testing (Phase 4)
- [ ] Component unit tests with React Testing Library:
  - Layer toggles enable/disable the correct MapLibre layer id.
  - Time slider rebinds data sources.
  - Tooltip renders disclaimer and meta wrapper fields.
- [ ] Visual regression tests (Playwright or Storybook + Chromatic, optional): screenshot baselines for GE15/Malay, GE14/Chinese, PRN15/turnout.
- [ ] Accessibility audit: keyboard-only tab navigation through layer controls, ARIA labels, colour-contrast on all choropleth legends (use `colorbrewer`/`CARTOColors` colourblind-friendly ramps).
- [ ] Mobile responsive (down to 375px) — layers panel collapses, tooltips don’t overflow.

---

## Phase 5 — REST / Server-Action API

Build thin Next.js route handlers that call into the analytics service layer and enforce privacy/query guards.

### 5.1 Endpoints (v0 subset — Free-safe)
- [ ] `GET /api/elections` → listElections
- [ ] `GET /api/constituency?type=DUN&code=N.01&election=GE15` → getAreaProfile + demographics + results (single-row response)
- [ ] `GET /api/compare?areas=P134,P135,N.02&election=GE15&metrics=turnout,margin,ethnic_shares` (max 10 areas)
- [ ] `GET /api/demographics?type=DUN&code=N.01&election=GE15` → DemographicBreakdown (4 segments)
- [ ] `GET /api/turnout-trend?code=N.01&elections=GE15,PRN15_MELAKA` (2 points)
- [ ] `GET /api/margins?type=DUN&election=GE15` → all 28 DUN margins (for colouring + scatter; cached at edge)
- [ ] `GET /api/chart-spec?chart=scatter&xSegment=malay&election=GE15&metric=winner_vote_share`
- [ ] `GET /api/tiles/{tree}/{z}/{x}/{y}.mvt` → stream from R2 binding (see §2.2).

Deferred (v0.1+):
- `/api/h3`, `/api/find-similar`, `/api/chart-spec?chart=ternary`, multi-election swing endpoints.

### 5.2 Cross-cutting
- [ ] All endpoints return the `AnalyticsEnvelope` meta wrapper.
- [ ] Share validation with `query-guard.ts`.
- [ ] Apply existing middleware: rate limiting (`src/lib/rate-limiter.ts`), CSRF on mutations (none yet), tracing, request-id, cache headers (`s-maxage=300, stale-while-revalidate=86400` for GETs).
- [ ] Reuse `security-headers.ts` and `cors.ts` conventions.
- [ ] Errors return `{error: {code, message}}` with stable codes.

### Testing (Phase 5)
- [ ] Contract tests for every endpoint using Node’s built-in test runner (match `tests/s2d-hardening.test.mjs` style):
  - Happy path, 404 on unknown code, 400 on invalid election, 403 on disallowed endpoint, 429 on rate-limit.
  - Assert envelope shape and presence of `meta.disclaimer`.
- [ ] End-to-end test with `next dev` + fetch against all endpoints; ensure response time P95 < 300ms on warm Worker.
- [ ] Runtime telemetry contract test: every public endpoint records requestId, route, auth state, cache status, query count, rows scanned/read and rows written, CPU duration, total duration, response bytes, HTTP status, and data version; canonical responses stay under the query/rows-scanned/CPU/8 KB budgets.

---

## Phase 6 — Remote MCP Endpoint (`/mcp`)

### 6.1 MCP transport
- [ ] Choose MCP server transport:
  - Recommended: **Streamable HTTP** (POST `/mcp`) per latest MCP spec, so it runs naturally on a Cloudflare Worker / OpenNext route.
  - SSE is acceptable as fallback but harder on Workers.
- [ ] Implement `src/app/api/mcp/route.ts` that:
  - Initialises the MCP server (use `@modelcontextprotocol/sdk` — add dependency).
  - Registers tools that call the analytics service layer.
  - Enforces session-based auth (see §6.4).

### 6.2 Tool registry — wave 1 (read-only, as recommended in the brief)
Start with the five canonical read-only tools:
- [ ] `list_available_elections()` → `{elections: ElectionMeta[]}`
- [ ] `get_area_profile({area_type, area_code, election})` → constituency profile
- [ ] `compare_areas({area_codes, election, metrics})`
- [ ] `get_turnout_series({area_code, election_ids})`
- [ ] `show_map_metric({metric, geography, election})` → returns a **command object** the frontend can consume (NOT a direct UI mutation).

### 6.3 Tool registry — wave 2
- [ ] `get_demographic_composition({area_type, area_code, election})`
- [ ] `get_vote_swing({area_code, from_election, to_election})`
- [ ] `find_similar_constituencies({area_code, metrics, limit})`
- [ ] `generate_chart_spec({chart, election, areas?})`
- [ ] `get_h3_cell_statistics({cell, election, metrics})`

### 6.4 Security controls
- [ ] **Authentication:** protect `/mcp` with Cloudflare Access (Service Auth for browser-agent sessions; user email-based for human analysts). Do NOT open it to anonymous traffic.
- [ ] **Authorization:** role `analyst` for all read tools; `admin` needed for any future mutation tools.
- [ ] **Schema-hardening:** every tool uses Zod schemas; allowlisted enum for `area_type`, `election`, `metric`.
- [ ] **Area allowlist:** for v1 only Melaka codes (P134–P139, N.01–N.28) — reject other codes.
- [ ] **No arbitrary SQL.** No `query` text parameter.
- [ ] **Row/response cap:** e.g. `compare_areas` max 10 areas, `find_similar_constituencies` max 20 results, H3 responses max 500 cells.
- [ ] **Timeouts:** 10s per tool call.
- [ ] **Rate limits:** 60 calls/min/session (reuse `src/lib/rate-limiter.ts`).
- [ ] **Audit log:** every tool call → `mcp_tool_audit` table + structured logger (`src/lib/logger.ts`). Log args hash, response row count, latency, caller.
- [ ] **No raw personal data**: tool responses must never include names, NRICs, addresses, exact coordinates below threshold. Privacy check middleware.
- [ ] **Prompt-injection / malicious args:** validate all string params against regex (codes are `P\d{3}` / `N\.\d{2}` / h3 index); reject JSON/script strings.

### 6.5 Tool response schema
Every tool response uses the `AnalyticsEnvelope` wrapper. Example:
```json
{
  "data": { "P134": { "Malay_share": 0.47, "Chinese_share": 0.38, "Indian_share": 0.09, "other_share": 0.06, "turnout": 0.812 } },
  "meta": {
    "estimateType": "area-level estimate",
    "sources": ["SPR GE15", "ElectionData.MY", "PIP v2026.08"],
    "geography": "PARLIAMENT",
    "dataVersion": "2026-08-01",
    "confidence": "medium",
    "generatedAt": "2026-08-08T12:00:00Z",
    "disclaimer": "Estimated ethnic composition at constituency level. Not an individual voter prediction."
  }
}
```

### Testing (Phase 6)
- [ ] MCP protocol tests:
  - `initialize`, `tools/list`, `tools/call` for each of wave-1 tools.
  - Invalid JSON-RPC → protocol-level error.
- [ ] Security tests:
  - Unauthenticated request → 401.
  - Request for non-allowlisted area (e.g. `P100`) → tool error with `code: 'AREA_NOT_ALLOWED'`.
  - Request asking for individual voter data prompt-injection string → blocked, audit entry created.
  - 61 calls in one minute → 429.
- [ ] Schema validation: every tool response validates against its TypeScript type at runtime (Zod) in tests.
- [ ] Audit-log test: make N tool calls, assert N rows in `mcp_tool_audit` with expected fields.
- [ ] End-to-end test with the MCP TypeScript client connecting to `wrangler dev` `/mcp` and answering the canonical test question (see §7.5). Assert requestId, tool, authenticated state, query count, rows scanned/read and rows written, CPU duration, total duration, response bytes, cache status, data version, and audit-log fields for the tool call.

---

## Phase 7 — WebMCP Bridge & Frontend Agent Hooks

WebMCP is Cloudflare’s experimental browser-agent bridge. Treat as **developer preview**; gate behind a feature flag.

### 7.1 Cloudflare-side enablement
- [ ] In Cloudflare Dashboard → Agent Readiness → Labs, enable Site MCP Server pack for the `pip-melaka.ritz-analytics.workers.dev` zone.
- [ ] Point the pack to same-origin `/mcp` (see §6).
- [ ] Confirm the bridge injects `/.webmcp/bridge.js` with `data-packs="mcp-server-client" data-mcp-url="/mcp"` on dashboard HTML.
  - If edge injection doesn’t fire reliably, manually add the script tag to `src/app/layout.tsx` only when server-side `WEBMCP_ENABLED=true` for the current preview/development hostname (production default remains `false`).

### 7.2 Frontend bridge
- [ ] Create `src/lib/webmcp-client.ts`:
  - Detects `navigator.modelContext` or the Cloudflare bridge.
  - Exposes a typed wrapper: `listTools()`, `callTool(name, args)`.
  - Emits events on tool call/result for UI sync.
- [ ] Create `src/components/agent-panel/` (default collapsed drawer) that lets a user paste a natural-language question when a compatible agent/browser is present; shows tool-call trace and result.

### 7.3 Map update from agent commands
- [ ] When `show_map_metric` returns a command like `{layer: 'ethnic', segment: 'malay', geography: 'dun', election: 'GE15'}`, the MapLibre wrapper applies it:
  - setLayoutProperty visibility, setFilter on election, flyTo bounds.
- [ ] The agent can highlight geographies returned by `compare_areas` via a `highlight` source.

### 7.4 Feature flag & audience
- [ ] Gate WebMCP behind `WEBMCP_ENABLED=false` by default. Enable only on preview/development hostnames first; production remains off until REST, MCP, Access, and audit tests pass.
- [ ] The Cloudflare bridge can be added without origin-code changes, but the `/mcp` endpoint, analytics tools, authentication, and audit logging still require independent tests.
- [ ] Restrict to logged-in analysts initially (use `next-auth` session, which is already in dependencies).
- [ ] UI shows an “AI Agent (Beta)” badge with link to known-limitations doc.

### 7.5 Canonical end-to-end acceptance question
> “Show Melaka DUN constituencies with the highest GE15 turnout, compare area-level ethnic-composition estimates and winning margins, and update the map.”

The agent should:
1. Call `list_available_elections` to get GE15 id.
2. Call `get_area_profile` or `compare_areas` across N.01–N.28 with metrics `[turnout, margin, ethnic_composition]`.
3. Sort by turnout desc, return top N.
4. Call `show_map_metric({metric:'turnout', geography:'dun', election:'GE15'})`.
5. Update the MapLibre metric deterministically, then render a supporting chart from the same service contract.

Acceptance checks: correct election/geography filters; source and data-version metadata present; no individual-level records; no suppressed-cell leakage; response under documented size limit; query and row-read budgets respected; authenticated MCP succeeds; unauthenticated MCP fails; map update is deterministic; audit logging captures tool, user/session, parameters/hash, duration, rows returned, cache status, and outcome.
6. Render natural-language answer with disclaimer meta visible.

### Testing (Phase 7)
- [ ] Unit tests for `webmcp-client.ts` against a mocked bridge.
- [ ] Integration test in headless Chromium (Playwright) with WebMCP flag enabled; simulate a tool call response and assert the MapLibre layer filter changes.
- [ ] Negative test: with flag off, bridge script is NOT in DOM.
- [ ] Deployment check: `curl -s https://preview.example.com | grep -i webmcp` only succeeds when `WEBMCP_ENABLED=true` on an approved preview/development hostname. Verify `WEBMCP_ENABLED=false → no agent tools`, `WEBMCP_ENABLED=true → bridge present on preview only`, and production disabled until Access and MCP tests pass.
- [ ] Audit-log verification: browser agent calls appear in `mcp_tool_audit` with session id. Do not interpret bridge presence as proof that `/mcp` is authenticated or safe.
- [ ] Manual QA matrix: Chromium (Canary with `navigator.modelContext`), Chrome stable, Firefox, Safari — only Chromium shows the panel; others see a “not supported” notice.

---

## Phase 8 — Testing, Hardening & Documentation

### 8.1 Test pyramid summary
| Layer | Tool | Target |
|---|---|---|
| Unit | Node `--test` (existing) + Vitest for analytics | Service functions, privacy helpers, validators |
| Component | React Testing Library | MapLibre components, tooltips, panel |
| API contract | Node `--test` + `next dev` HTTP | All REST routes, envelope shape, error codes |
| MCP protocol | `@modelcontextprotocol/sdk` client against `wrangler dev` | Tool list + wave 1 tools |
| End-to-end | Playwright | Dashboard → time slider → tooltip; agent panel |
| Privacy regression | Custom script (see §2) | No suppressed cells leak |
| Load | `k6`/`autocannon` against preview | P95 < 300ms on tiles, < 500ms on compare |
| Security | Code review + `npm audit`, plus CSRF/SSRF/rate-limit tests already in `tests/s2d-hardening.test.mjs` | No auth bypass |

- [ ] Add `tests/analytics/`, `tests/mcp/`, `tests/e2e/` directories mirroring this list.
- [ ] Wire them into `package.json` scripts: `test:unit`, `test:api`, `test:mcp`, `test:e2e`, `test:privacy`, `test` (runs all).
- [ ] CI (`.github/workflows/ci.yml`) runs lint + typecheck + test:unit + test:api + test:privacy on every PR; e2e + load on merge to main.

### 8.2 Privacy / ethics review
- [ ] Internal reviewer signs off on `docs/METHODOLOGY-ETHNIC.md`.
- [ ] Pen-test style review: try to reconstruct individual race + location from public responses (should be impossible).
- [ ] Verify that candidate ethnicity is stored/displayed separate from voter ethnicity and labelled as such.
- [ ] All exported CSVs carry the same disclaimer as on-screen.

### 8.3 Performance
- [ ] Vector tiles < 50KB gzipped at z10, < 150KB at z14.
- [ ] D1 queries covered by indexes; add `EXPLAIN QUERY PLAN` checks to migration tests.
- [ ] Pre-generate MVTs for Melaka at deploy time; R2 cache warm-up script.
- [ ] Use `src/lib/cache.ts` (in repo) for in-memory/edge caching of frequent comparison queries.

### 8.4 Observability (including Free-quota telemetry — required before public traffic)
- [ ] Emit metrics via existing `src/lib/metrics.ts` and `src/lib/slo.ts`:
  - `mcp_tool_calls_total{tool,status}`
  - `mcp_tool_latency_ms{tool}` (histogram)
  - `analytics_query_latency_ms{route}`
  - `tile_hit/miss` for R2 tile cache
  - `suppressed_cells_total{layer}` (monitor over-suppression)
- [ ] **Free-tier quota telemetry (MUST ship in v0):**
  - `cf_worker_requests_total` (daily counter; alert at 80K).
  - `cf_d1_rows_read_total`, `cf_d1_rows_written_total` (alert at 4M/day read, 80K/day write).
  - `cf_d1_storage_bytes` (from nightly `wrangler d1 info`; alert at 400 MB per database and 4 GB total account storage).
  - `cf_r2_storage_bytes`, `cf_r2_class_a_ops_total`, `cf_r2_class_b_ops_total` (alert at 8 GB R2).
  - `cf_worker_cpu_ms` histogram (alert if P95 > 8 ms).
  - `analytics_response_bytes{route}` and `analytics_cache_status{route,status}` for every public analytics response.
  - `electiondata_refresh_last_status`, `electiondata_refresh_last_ts`.
- [ ] Expose a `/api/health/quota` endpoint that returns % of each Free allowance used; wire to Slack/discord webhook via existing `src/lib/alerting.ts`.
- [ ] Graceful degradation on quota exhaustion:
  - Worker requests > 95% of daily cap return `503 Service Unavailable` with Retry-After (next UTC midnight) instead of surfacing CF Error 1027.
  - D1 rows-scanned/read near cap → respond from edge cache / static fallback JSON.
- [ ] Add a dashboard panel (or Grafana-style view) for these metrics.

### 8.5 Documentation
- [ ] Update `docs/CLOUDFLARE-DEPLOYMENT.md` with:
  - D1 database id binding, R2 bucket binding, `ELECTIONDATA_API_TOKEN`, Cloudflare Access policies for `/mcp`, WebMCP enablement steps.
- [ ] Add `docs/WEBMCP-SETUP.md` with screenshots of Agent Readiness → Labs config.
- [ ] Add `docs/MCP-TOOLS.md` auto-generated from tool schemas.
- [ ] Add a methodology page *inside the app* (route `/methodology`) linked from every tooltip.
- [ ] In-app i18n (`src/lib/i18n.tsx`) for EN + BM for all new strings — follow existing convention (`t(key, fallback)`).

### 8.6 Rollout
- [ ] **Stage 1 (internal):** Deploy behind Cloudflare Access, analysts only; 2-week bake-in with the canonical Melaka dataset.
- [ ] **Stage 2 (beta):** Enable WebMCP developer preview for analytics-savvy users; collect feedback via existing toast/feedback hooks.
- [ ] **Stage 3 (public):** General availability of the MapLibre tab; WebMCP remains labelled experimental with “powered by AI agent” badge.

---

## Cross-cutting Fine-Tunings & Non-functional Checklist

Apply these throughout all phases:

- [ ] **Use existing repo conventions:** amber-gold MLK theme (`#C77B2C`), `use client` on client components, files under ~300 lines where possible, server components for data-fetching.
- [ ] **Never block the existing Leaflet 2D tab.** It ships with the product today; the new analytics tab is additive until it is a proven replacement.
- [ ] **Share colours with `src/lib/party-colors.ts` and `party-metadata.ts`;** extend for ethnic segments using colorblind-safe palettes (e.g. CARTOColors `Antique`/`Vivid`).
- [ ] **Use existing infra:** `src/lib/circuit-breaker.ts`, `retry.ts`, `fetch-with-timeout.ts`, `cors.ts`, `csrf.ts`, `security-headers.ts`, `rate-limiter.ts`, `logger.ts`, `tracing.ts`, `slo.ts`. Do not reinvent.
- [ ] **Feature flags:** introduce a small helper in `src/lib/feature-flags.ts` for `ethnic_analytics`, `webmcp`, `h3_layer`.
- [ ] **i18n BM translations** for every new user-facing string; review by a Bahasa Malaysia speaker for election terminology.
- [ ] **Accessibility:** all tooltips and chart interactions keyboard-operable, ARIA live region when agent updates the map.
- [ ] **Mobile:** map controls collapse, agent panel is a bottom sheet, no hover-only interactions.
- [ ] **OpenNext/Cloudflare Workers constraints:** no Node native APIs in edge runtime (especially avoid `fs` in request path; fine at build-time).
- [ ] **Prisma handling:** do NOT delete Prisma in v0 (see §1.1). Add the `@deprecated` marker to `src/lib/db.ts` and enforce the no-import rule; full removal is a Phase-9 cleanup once D1 ingestion uses raw SQL. Health routes already run without Prisma.
- [ ] **Attribution footer:** “Data by SPR / ElectionData.MY (CC0) / DOSM / PIP-derived estimates. © PIP Melaka contributors.”
- [ ] **Audit logging retention:** 12 months for MCP tool calls; export to R2 for long-term archive.

---

## Definition of Done — v0 (Free-tier prototype)

v0 is shippable when all of these hold:

1. Phases 0, 1A, 1, 2, 3, 4, 5, 6, 7, 8 tasks marked v0 are checked off; deferred v0.1+ items are listed in the changelog with rationale.
2. Local offline pipeline produces aggregates + tiles; D1 DB < 50 MB; R2 tile tree < 50 MB; all artifacts uploaded via `wrangler`.
3. The v0 MapLibre tab renders composition (single segment) + winner + turnout choropleths and the composition-vs-outcome scatterplot; Leaflet 2D tab is untouched.
4. The 5 wave-1 MCP tools (`list_available_elections`, `get_area_profile`, `compare_areas`, `get_turnout_series`, `show_map_metric`) answer the canonical question end-to-end via a Chromium browser agent behind Cloudflare Access.
5. Privacy regression tests pass on CI for every PR: no cell below `MIN_CELL_N=50` is ever returned by any route or MCP tool; no PII columns appear in any D1/R2 public artifact.
6. All UI surfaces carry the “Estimated composition / Not an individual prediction” disclaimer and link to the in-app `/methodology` page.
7. P95 warm-preview latency: tiles < 300 ms, compare API < 500 ms, MCP tool call < 1 s; P95 Worker CPU < 5 ms (well inside the 10 ms Free cap).
8. Quota telemetry is live: `/api/health/quota` reports daily Worker/D1/R2 usage; alerts fire at 80%; graceful 503 + Retry-After at 95%.
9. `/api/health` returns 200 (already Prisma-free), and `/api/provenance` returns `data_version`, refresh time, source list, and disclaimer.
10. Documentation (methodology, MCP tools, Cloudflare deployment, Free-tier architecture, PDPA runbook) is merged and linked from the app.

## Definition of Done — v1 (post-Free expansion)

v1 unlocks after Free budget is sustainably exceeded (see `CLOUDFLARE-FREE-TIER-ARCHITECTURE.md` §9) and the account is upgraded to paid Workers ($5/mo):

1. Add GE13/GE14 + all Melaka state elections to the time slider.
2. Ship H3 hex layer at res 8/9 (prebuilt PMTiles in R2).
3. Ship small multiples, ternary chart, competitiveness-vs-mix chart, urban/rural toggle.
4. Add wave-2 MCP tools (`get_demographic_composition`, `get_vote_swing`, `find_similar_constituencies`, `generate_chart_spec`, `get_h3_cell_statistics`).
5. Add `getAreaVoteEstimateBySegment()` with survey-benchmarked ecological inference, labelled area-level.
6. Remove Prisma fully once D1 ingest scripts no longer need it.

---

## Out of scope (explicitly deferred)

- In-request ETL / tile generation / H3 aggregation on Free Workers.
- Full 3M-row raw voter dataset in D1 on Free (D1 for metadata/indexes; raw stays offline + R2 snapshots).
- Nationwide (all states) expansion — Melaka-only for v0/v1.
- Differential privacy for H3 cells (post-v1 candidate).
- Individual-level prediction of voter choice (forbidden by principles; enforced by naming and review).
- Anonymous/public WebMCP on Free (Access-gated only until paid tier).
- Mobile native app.
- Writing to individual voter records from the dashboard (engine-only writes, offline).
- Non-Chromium WebMCP support (blocked upstream).
- Full Prisma removal in v0 (postponed to cleanup PR; see §1.1).

---

## References & further reading

- Cloudflare Workers limits (2026): <https://developers.cloudflare.com/workers/platform/limits/>
- Cloudflare D1 limits (2026): <https://developers.cloudflare.com/d1/platform/limits/>
- ElectionData.MY Open API (free, CC0, no premium tier): <https://electiondata.my/openapi/>, <https://electiondata.my/openapi/authentication/>
- ElectionData.MY about / core principles: <https://electiondata.my/about/>
- Cloudflare WebMCP announcement: <https://blog.cloudflare.com/webmcp/>
- WebMCP examples (experimental status): <https://github.com/cloudflare/agents/blob/main/examples/webmcp/README.md>

---

*Prepared by: Senior Engineer, PIP Melaka. Next action: use `agent-ctx/ETHNIC-ANALYTICS-BUILD-PROMPT.md` for a fresh implementation session or `agent-ctx/ETHNIC-ANALYTICS-KICKER.md` for a phase-sized sub-agent, then open phase-sized PRs from the current Arena branch.*
