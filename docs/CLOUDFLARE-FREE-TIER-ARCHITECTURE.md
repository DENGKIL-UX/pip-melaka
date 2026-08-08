# Cloudflare Free-Tier Architecture Addendum

**Companion to:** `PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md`
**Date:** 2026-08-08
**Scope:** Constrains the v0 (prototype) build to fit Cloudflare Free + ElectionData.MY API-key, polite-use access.

---

## 1. Free-tier budget we must stay inside

### Cloudflare Free (2026-08, verified against [developers.cloudflare.com/workers/platform/limits](https://developers.cloudflare.com/workers/platform/limits/) and [developers.cloudflare.com/d1/platform/limits](https://developers.cloudflare.com/d1/platform/limits/))

| Product | Free allowance | Binding constraint for PIP Melaka v0 |
|---|---|---|
| Workers | 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 subrequests/invocation, 3 MB gzipped worker | A single request cannot do heavy parsing/joins. Keep hot path ≤ 5 ms CPU. |
| D1 | 5 GB total/account, **500 MB per database**, 5M rows read/day, 100K rows written/day, 50 queries/invocation | **One DB only**, small indexed aggregate tables; bulk writes done via local `wrangler d1 execute`, not in-request. |
| R2 | 10 GB storage, 1M Class A ops/month, 10M Class B ops/month, zero egress | Static tiles, raw snapshots, MVTs, large parquet. |
| KV | 1 GB storage, 100K reads/day, 1K writes/day | Do NOT use for bulk ingestion. Good for feature flags, version manifest. |
| Cron Triggers | 5/account | One for nightly ElectionData.MY refresh, one for R2 cache warm, three left. |
| Pages / Static Assets | 20,000 files per Worker version, 25 MiB per file | Bundled GeoJSON/tiles must respect this; otherwise host on R2. |

### ElectionData.MY API (verified 2026-08 against [electiondata.my/openapi](https://electiondata.my/openapi/) and [electiondata.my/openapi/authentication](https://electiondata.my/openapi/authentication/))

- **Auth:** Requires a Bearer API key from the API Console. Never expose the key to browser code; keep it server-side in the existing proxy/cron path.
- **Licensing vs API usage:** Public data licensing and API usage policy are separate. Verify and document the exact licence/attribution requirements in Phase 0 provenance records.
- **Rate limits:** No hard public rate limit is documented here, but that must not be interpreted as unlimited automated polling. Stay polite: nightly pull, cache aggressively, snapshot/version results, avoid aggressive crawling, and use conditional GETs where supported.
- **Provenance:** Retain source URL, retrieval timestamp, API-key identity/account label, dataset version/hash, and raw snapshot pointer for every import.

This reduces third-party API cost risk while preserving good-citizen behaviour. We cache responses (both edge-cache headers on `/api/electiondata` and R2 snapshots) and route all API-key calls through trusted server-side code.

---

## 2. Hard "do NOT do this on Free" list

The following run hot paths over the 10 ms CPU budget, the 50 subrequest cap, the 128 MB memory cap, or both. They **must** run offline (developer laptop, CI, or — once budget allows — a paid Worker with higher CPU):

- [ ] Parse the full 3M-row voter dataset inside a request.
- [ ] Build H3 aggregates in-request.
- [ ] Generate MVT tiles in-request.
- [ ] Join 4 elections × 28 DUN × N segments on the Worker.
- [ ] Run ecological-inference (King's) / MCMC models in-request.
- [ ] Load large JSONL/GeoJSON from `public/` at request time (use build-time imports only, as the current `/api/health` correctly does).
- [ ] Bulk `INSERT` rows into D1 one row at a time from a Worker.
- [ ] Pull fresh data from ElectionData.MY on every user request (cache via stale-while-revalidate + nightly snapshot).

---

## 3. Approved v0 architecture (Free-tier shape)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER LAPTOP / CI                        │
│  (offline — does not consume Worker/D1 quotas)                      │
│                                                                     │
│   raw-voters/*.xlsx  ──► Python/JS PIP engine                       │
│                          │                                          │
│                          ▼                                          │
│   polls, ethnic shares,                                         │
│   H3 res 7/8/9, MVTs                                                │
│                          │                                          │
│                          ▼                                          │
│   wrangler d1 execute ──┴──► D1 pip_melaka_analytics (≤500 MB)      │
│   wrangler r2 put      ──┴──► R2 pip-melaka-artifacts (≤10 GB)      │
│                             (raw snapshots, *.mvt, large GeoJSON)   │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (deploy-only, no in-request ETL)
┌─────────────────────────────────────────────────────────────────────┐
│                   CF WORKER (OpenNext / Next.js)                    │
│                                                                     │
│   MapLibre (static JS) ◄── public/ (UI bundle, small GeoJSON)       │
│         │                                                           │
│         ▼                                                           │
│   /api/* routes ──► analytics service layer (pure TS)               │
│                       │                                             │
│                       ├── D1 binding (prepared statements, indexed) │
│                       │     ≤ 2 queries per tool call,              │
│                       │     ≤ 20 rows returned                      │
│                       └── R2 binding (GET only) for tiles/snapshots │
│                                                                     │
│   /mcp endpoint ──► same analytics service layer                    │
│                       (read-only, Zod-schema, 5 tools in wave 1)    │
│                                                                     │
│   WebMCP bridge (edge-injected) ──► /mcp                            │
└─────────────────────────────────────────────────────────────────────┘
```

Every request path is designed to:
1. Return in **≤ 10 ms CPU** (validation → one or two indexed D1 prepares → JSON serialise).
2. Use **≤ 5 subrequests** (≤ 2 D1, ≤ 1 R2 GET, ≤ 1 cache KV GET, ≤ 1 outbound fetch only during SWR refresh of ElectionData.MY).
3. Never hold more than ~2 MB in memory (no large JSON loads).
4. Emit a shared `RuntimeTelemetry` envelope for public analytics calls: request ID, route/tool, authenticated state, cache status, query count, D1 rows scanned/read and rows written from query metadata (`rows_read`, `rows_written`), Worker CPU when available, total duration, response bytes, status, and data version. `rowsRead` means rows scanned/read during SQL execution, including index reads, not rows returned. The ≤2 prepared-statement target is not enough by itself; tests must verify rows-scanned/read and `EXPLAIN QUERY PLAN` so one bad query cannot scan large tables.

---

## 4. v0 dataset scope (Free-safe first release)

To guarantee we stay inside 500 MB D1 + 10 GB R2, the v0 prototype is scoped to:

| Dimension | v0 (Free) | Full roadmap |
|---|---|---|
| Geography | Melaka only (6 PAR, 28 DUN, ~150 DM) | + states later |
| Elections | **GE15 + PRN15** only (add GE14 once model stable) | GE13–present + all state elections |
| Segments | Malay / Chinese / Indian / Other (4 segments) | + Orang Asli, Sabah/Sarawak Bumi splits |
| Aggregation levels | PAR, DUN (DM only for internal calculations, not exposed) | + DM, H3, LOCALITY |
| H3 | **Deferred** (res 7/8 for all Melaka fits in R2 but adds ~500k rows — push to v0.1 after v0 metrics are green) | res 7–9 |
| MVT tiles | Pre-baked at build time for PAR/DUN boundaries + results choropleth only | Full H3 + demographic tiles |
| MCP tools | 5 read-only wave-1 tools only | wave 2 later |
| WebMCP | Developer preview, access-controlled | Browser-agent public beta |
| Dashboard | MapLibre tab shows 3 layers: composition choropleth (1 segment at a time), winner choropleth, turnout — plus scatterplot | all 7 layers |

---

## 5. Build & deploy ordering (Free-optimised)

Exact sequence to never hit quota:

0. **Runtime contract first:**
   1. Use `src/lib/analytics/runtime-telemetry.ts` for one request envelope per analytics/REST/MCP/map-data call.
   2. Route all D1 `.all()` calls through `runD1(statement, telemetry)` so query count and D1 rows scanned/read and rows written come from actual D1 metadata, not estimates. Track response cardinality separately later as `resultRows` if needed.
   3. Keep CPU (`cpuMs`) and wall-clock duration (`durationMs`) separate for diagnostics: CPU indicates JavaScript work; duration includes D1/R2/network waits.
   4. Add tests for missing D1 metadata, cache hit/miss, invalid inputs, repeated/concurrent requests, unauthenticated MCP, and expired Access sessions.

1. **Local-only (no Cloudflare cost):**
   1. Run PIP engine → produce `aggregates/` CSV+JSONL (DUN/PAR-level ethnic shares + turnout + results).
   2. Generate static MVTs for boundaries + 3 choropleth layers into `public/tiles/` or `artifacts/tiles/`.
   3. Apply D1 migrations locally with `wrangler d1 execute pip_melaka_analytics --local --file=...` during development.
2. **One-shot remote provisioning (once per environment — stays under 100K writes because it's batched):**
   1. `wrangler d1 execute pip_melaka_analytics --remote --file=migrations/0001_analytics_warehouse.sql`
   2. Bulk import aggregates via `wrangler d1 import` (single transaction — uses file upload, not per-row writes).
   3. `wrangler r2 bucket sync artifacts/tiles/ r2://pip-melaka-artifacts/tiles/`
3. **Nightly refresh cron (1 cron trigger, runs once/day):**
   1. Pull ElectionData.MY deltas → write versioned snapshot to R2.
   2. Upsert only changed rows into D1 (target: <1000 writes/day).
   3. Bump `data_version` in KV manifest (1 write).
4. **Hot path (Worker requests):**
   - Pure reads. No writes outside cron. ≤ 2 prepared D1 statements per call.
   - `/mcp` inherits the same shape.

---

## 6. Quota & health telemetry (must ship in v0)

The current `/api/health` already reports data + memory. Add these Free-specific metrics:

- [ ] `cf_d1_rows_read_total` (counter, from response header `X-D1-Rows-Read` or D1 binding result meta).
- [ ] `cf_d1_rows_written_total` (counter).
- [ ] `cf_worker_cpu_ms` histogram (from `request.cf?.cpuTime` where available, or approximated).
- [ ] `cf_r2_class_a_ops_total`, `cf_r2_class_b_ops_total`.
- [ ] `electiondata_refresh_last_status`, `electiondata_refresh_last_ts`.
- [ ] `mcp_tool_calls_total{tool,status}` and `mcp_tool_blocked_total` (prompt-injection / over-cap).
- [ ] Daily `QuotaUsage` row in D1 (or KV) tracking % of free allowance used; `/api/health` returns it.
- [ ] Set alerts (via existing `src/lib/alerting.ts`) when any quota hits 80% of daily allowance:
  - Worker requests > 80K/day
  - D1 rows read > 4M/day
  - D1 rows written > 80K/day
  - R2 storage > 8 GB

When a quota is exceeded, the Worker should serve a friendly "prototype data refreshes at 00:00 UTC" message rather than throwing Cloudflare's Error 1027.

---

## 7. Prisma handling (final decision)

Audit result (2026-08-08):
- ✅ `/api/health` and `/api/health/ready` already build-time-import JSON; they do NOT import Prisma.
- ✅ `src/lib/db.ts` exists but is NOT imported anywhere in `src/`, `scripts/`, `tests/` (dead code).
- ⚠️ `package.json` still lists `@prisma/client` and `prisma` as dependencies.
- ⚠️ Prisma query engine cannot run on Cloudflare Workers, and Prisma does not support D1 as a runtime target.

Decision for v0 (revised from earlier roadmap):
- [ ] **Do NOT remove Prisma yet.** Keep the packages available for **local-only** scripts (e.g. an `ingest/` folder using a local SQLite scratch DB for intermediate joins). They are devDependencies-effective even though declared under `dependencies`; since nothing imports them on the Worker path, tree-shaking drops them out of the OpenNext bundle (verify with `npx wrangler typegen` + bundle inspection).
- [ ] Mark `src/lib/db.ts` `@deprecated — local-dev only` and add a lint/test that fails if it is ever imported from `src/app/api/**` or `src/lib/**` (rethrow in CI).
- [ ] After v0 ships and D1 ingestion scripts are using raw `better-sqlite3` / `wrangler d1 execute`, fully remove Prisma in a dedicated cleanup PR (tracked in the roadmap §Out-of-scope → moved to Phase-9 cleanup).

This matches the user's guidance ("I would not remove Prisma immediately… confirm whether it is imported") rather than deleting it outright.

---

## 8. WebMCP on Free

Cloudflare's WebMCP developer preview itself does not charge extra; it's an edge-injected bridge to an existing same-origin `/mcp`. On Free:

- [ ] WebMCP is gated behind Cloudflare Access (Service Auth + analyst emails only). Anonymous traffic does not hit `/mcp`.
- [ ] Wave 1 is exactly 5 tools (see roadmap §6.2). Each tool performs ≤ 2 indexed D1 prepares and returns ≤ ~5 KB JSON.
- [ ] Tool calls count as normal Worker requests — budget ~500 tool calls/day leaves 99,500 requests for UI traffic under the 100K free cap.
- [ ] Response streaming / SSE not used (avoids long-lived CPU usage). Use Streamable HTTP (request/response) per latest MCP spec.
- [ ] WebMCP is controlled by `WEBMCP_ENABLED=false` by default and is enabled only on preview/development hostnames first.
- [ ] If the bridge requires a paid add-on or Cloudflare Agent Readiness becomes a paid feature post-preview, WebMCP remains feature-flagged off — the REST dashboard continues to work.

---

## 9. When do we have to upgrade to paid Workers ($5/mo)?

Trigger conditions (any one = upgrade):

1. Worker requests sustained > 80K/day for 7 days.
2. A request path needs > 10 ms CPU (e.g. we add client-side H3 aggregation, real-time similarity search, or ecological-inference).
3. We need more than 5 Cron Triggers.
4. Any D1 database approaches the 500 MB Free per-database cap, or total D1 account storage approaches 5 GB.
5. We need more than 10 D1 databases.
6. WebMCP is opened to public beta traffic.

Until any of these fire, v0 stays on Free. Paid Workers ($5/mo) removes the 100K/day and 10ms CPU limits and is the only cost needed; R2/D1 overages above free remain under a few dollars/month for Melaka-scale data.

---

## 10. Quick budget math for v0 (sanity check)

| Resource | v0 projected | Free cap | Headroom |
|---|---|---|---|
| Worker reqs/day | ~15K (5K page loads × 3 API calls each) | 100K | 85% |
| CPU per hot request | ~2–4 ms (indexed D1 only) | 10 ms | 60% |
| D1 rows read/day | ~300K | 5M | 94% |
| D1 rows written/day | ~500 (nightly upsert) | 100K | 99.5% |
| D1 storage | ~15 MB (Melaka PAR/DUN aggregates) | 500 MB per database (5 GB total account storage) | ~97% per-DB headroom |
| R2 storage | ~200 MB (tiles + snapshots) | 10 GB | 98% |
| R2 class A ops/month | ~5K | 1M | 99.5% |
| Cron triggers | 1 | 5 | 80% |

v0 is comfortably under every limit.
