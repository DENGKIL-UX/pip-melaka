# Ethnic Analytics + WebMCP v0 — full build prompt

You are a senior software engineer joining the PIP Melaka repository to build the Melaka-only Ethnic Electoral Analytics + WebMCP v0. You are expected to be strong in Cloudflare Workers/OpenNext, Next.js, TypeScript, MapLibre, privacy-preserving analytics, D1/R2, and MCP/WebMCP.

Your job is to implement the roadmap in phase-sized PRs, preserving the current app while adding a conservative Free-tier prototype for aggregate electoral/demographic analytics.

---

## Read first, in this exact order

1. `docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md` — authoritative roadmap and phase checklist.
2. `docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md` — authoritative budget/architecture constraints.
3. `docs/WORK-ORDER-ROUND-8.md` — current work-order context and existing app constraints.
4. `MAP_2D_AUDIT_REPORT.md` — current map implementation and known Leaflet/2D risks.
5. `agent-ctx/AI-ASSISTANT-01-main.md` — example of the expected hand-off record style.
6. Run a repo structure scan before editing: `find . -maxdepth 3 -type f | sort | sed -n '1,240p'`, plus targeted reads of any files you plan to modify.

If two documents conflict, apply the conflict-resolution rules near the end of this prompt.

---

## Non-negotiable rules

1. **Free budget law:** v0 must fit Cloudflare Free. Hot Worker paths target about 2–4 ms CPU, hard-stop at 10 ms, at most two indexed D1 statements per analytics request/tool, compact JSON responses, and quota telemetry. The two-statement target is not sufficient by itself: runtime tests must record query count, rows read, CPU duration, response bytes, and cache status.
2. **Offline ETL only:** no 3M-row parsing, H3 aggregation, MVT generation, large JSONL parsing, ecological-inference modelling, or multi-election joins inside a request. Build aggregates and tiles offline on a laptop/CI, then ship compact artifacts to D1/R2/static assets.
3. **Privacy/PDPA by default:** never expose raw voters, NRIC, names, exact voter coordinates, saluran-level identities, or small cells. Use aggregate outputs only, threshold suppression, and differencing-attack checks.
4. **Separate-source labels:** clearly distinguish official election results, ElectionData.MY-sourced API records, DOSM/census composition, survey estimates, and PIP-modelled estimates. Never imply individual ethnicity prediction.
5. **Analytics service layer first:** pure TypeScript analytics functions must sit below REST, server actions, dashboard, MCP, and WebMCP. Controllers and tools call the service layer; they do not read raw data directly.
6. **Leaflet untouched:** the existing Leaflet map/tab must keep working. Introduce MapLibre as a parallel feature/tab/layer path; do not break or rewrite the existing Leaflet implementation mid-rollout.
7. **Existing conventions:** follow current repository structure, naming, shadcn/ui patterns, Tailwind conventions, testing style, and agent hand-off record style.
8. **No Prisma on Worker path:** Prisma may remain for local-only/dev scripts until the roadmap removes it, but Worker request paths must not import `src/lib/db.ts`, Prisma Client, or Prisma engines.
9. **WebMCP preview only:** WebMCP is optional, experimental, feature-flagged, access-gated, and built after the REST/MCP/dashboard paths work without it.
10. **Phase-sized PRs:** one roadmap phase or sub-phase per PR. Prefer small, reviewable changes with deterministic fixtures and hand-off notes.
11. **No raw voters:** do not commit raw voter XLSX/CSV/JSONL dumps or generated large artifacts. Keep raw data offline or in external storage according to repo conventions.
12. **No TS/ESLint regressions:** every PR must run and document lint/type/test status. If pre-existing failures exist, prove that your files did not add new failures.

---

## Corrections and caveats to keep in mind

- **D1 limits:** Cloudflare Free D1 has 5 GB total account storage, but each individual Free D1 database is capped at **500 MB per database**. v0 targets roughly 15 MB, so both are safe, but docs and code comments must not imply a single database can use 5 GB on Free.
- **Workers limits:** Free Workers provide 100,000 requests/day and a 10 ms CPU limit. The v0 target of roughly 15,000 requests/day and 2–4 ms CPU/request is intentional headroom.
- **ElectionData.MY wording:** the API requires a Bearer API key. Public-data licensing and API usage policy are separate. “No published hard rate limit” must not be treated as unlimited automated polling. Use nightly pulls, caching, versioned snapshots, polite-use behaviour, and provenance metadata: source URL, retrieval timestamp, API-key identity/account label, dataset version/hash, and snapshot pointer. The proxy must never expose the API key to browser code.
- **WebMCP:** treat Cloudflare WebMCP as developer preview. The human dashboard, REST endpoints, and authenticated MCP endpoint must be fully useful without WebMCP. Keep `WEBMCP_ENABLED=false` by default and enable only on preview/development hostnames first.
- **Authentication:** Cloudflare Access must be tested for browser dashboard users, MCP clients, WebMCP bridge requests, preview vs production hostnames, expired sessions, CORS/same-origin behaviour, OPTIONS/preflight requests, and cookie forwarding. Protecting the page is not enough; API/tool routes must be protected too.
- **Privacy threshold:** `MIN_CELL_N=50` is a starting control, not the whole privacy model. Also test differencing attacks, especially when multiple demographic dimensions or filters are combined.

---

## Explicit v0 scope

Build only the Free-tier prototype scope unless the roadmap explicitly says otherwise:

- **Geography:** Melaka only — 6 parliamentary seats (P134–P139) and 28 DUN.
- **Elections:** GE15 and PRN15 Melaka first.
- **Segments:** four aggregate demographic segments for v0 display/analysis: Malay, Chinese, Indian, Other. Keep schemas extensible for future segments, but do not expose over-granular cells that undermine privacy.
- **MapLibre:** three v0 layers plus supporting scatterplot:
  1. estimated ethnic-composition choropleth, one segment at a time;
  2. winner/margin choropleth;
  3. turnout choropleth;
  4. scatterplot comparing composition estimates with winning margin/turnout.
- **REST endpoints:** eight compact, contract-tested endpoints as defined in the roadmap Phase 5, all backed by the analytics service layer and budget guards.
- **MCP tools:** five read-only wave-1 tools, authenticated, audited, rate-limited, no arbitrary SQL.
- **WebMCP:** Access-gated, feature-flagged, optional enhancement only after REST/MCP/dashboard paths are green.

---

## Recommended build order

The roadmap’s phase numbers remain authoritative for hand-off files, but implement the riskiest contracts early to reduce rework:

1. **Runtime telemetry contract:** implement/use the shared `RuntimeTelemetry` envelope in `src/lib/analytics/runtime-telemetry.ts` first so every analytics/REST/MCP/map-data request records requestId, route/tool, auth state, cache status, query count, D1 rows scanned/read and rows written, Worker CPU, total duration, response bytes, status, and data version.
2. **Phase 0:** data dictionary, source provenance, demographic methodology, privacy rules.
3. **Phase 1A:** local aggregate builder with deterministic fixtures and Free-budget proof.
4. **Phase 3:** analytics service functions before building MCP/dashboard controllers.
5. **Phase 5:** REST endpoints and contract tests.
6. **Phase 6:** authenticated MCP endpoint.
7. **Phase 4:** MapLibre tab using the same service contracts.
8. **Phase 7:** WebMCP bridge behind feature flag.
9. **Phase 8:** quota, privacy, browser, and load testing.

If you choose a different order, document why in the hand-off record.

---

## Phase-by-phase checklist

### Phase 0 — discovery, provenance, methodology, privacy

Code/scripts:
- Do not build production request paths yet.
- Add lightweight validators or schema-lint scripts only if they support the audit.

Docs:
- Produce `docs/DATA-AUDIT-ETHNIC-2026-08.md` cataloguing every ethnic/demographic field, source, confidence, individual-vs-aggregate status, and whether it can be exposed.
- Produce or update `docs/METHODOLOGY-ETHNIC.md` with ecological-fallacy disclaimers, denominator rules, segment definitions, `MIN_CELL_N`, differencing-attack policy, confidence labels, and product wording.
- Document ElectionData.MY provenance, authentication, polite-use assumptions, attribution requirements, endpoint availability, and dataset-version strategy.

Tests/verification:
- Verify raw voter files are not committed and raw-data paths are ignored or documented.
- Verify source labels and privacy terms exist in docs.

### Phase 1A — Free-tier local build pipeline

Code/scripts:
- Build local-only aggregate fixture/builder scripts that run without Worker CPU.
- Emit compact DUN/PAR aggregate CSV/JSONL and small tile/artifact samples.
- Add deterministic fixtures for GE15 + PRN15 Melaka covering 6 parliamentary areas, 28 DUN areas, and 4 demographic segments with known turnout values, winning margins, suppressed cells, source/version metadata, and canonical expected answers.
- Add budget checks for output size, rows, and expected D1 read/write shape.

Tests/verification:
- Unit tests for deterministic fixtures.
- Free-budget assertions: D1 DB target below 50 MB, R2/static artifacts below target, max rows/read assumptions sane.
- No Worker request path imports ETL code.

### Phase 1 — D1 schema and ingestion

Code/scripts:
- Add raw SQL D1 migrations for aggregate tables and metadata.
- Keep Prisma off Worker paths; mark any retained Prisma helper as local-only/deprecated if required.
- Add ElectionData.MY ingestion as server-side/cron/local scripts with Bearer-token handling, snapshots, provenance, and polite-use caching.
- Upsert only changed aggregate rows.

Tests/verification:
- Migration smoke tests locally.
- Ingest tests using mocked ElectionData.MY payloads.
- Schema-lint that rejects PII columns in public D1/R2 artifacts.
- Query plan checks with indexes and narrow `SELECT` lists.

### Phase 2 — privacy and aggregation pipeline

Code/scripts:
- Implement threshold suppression at engine output, D1 load, and query-time response.
- Add differencing-attack guard logic for combined filters.
- Generate MVT/GeoJSON artifacts offline only.

Tests/verification:
- Suppression tests for cells below `MIN_CELL_N`.
- Differencing tests such as “all voters in cell minus segment A reveals small subgroup”.
- Artifact lint: no raw voters, names, NRIC, exact voter coordinates, or saluran-identifying leakage.

### Phase 3 — analytics service layer

Code/scripts:
- Add pure TS service functions for area demographic estimates, election results, rankings, comparisons, map metrics, provenance, and quota metadata.
- Validate allowlisted geography/election/segment inputs.
- Enforce max rows, max response bytes, and at-most-two D1 statements per call.

Tests/verification:
- Unit tests with mock D1/service adapters.
- Contract tests for result shapes and privacy flags.
- Runtime-budget tests that record query count, rows scanned/read and rows written from D1 metadata, CPU duration, total duration, response bytes, and cache status. Include tests for missing D1 metadata so telemetry cannot break a successful request.
- `EXPLAIN QUERY PLAN` tests proving indexed access for v0 lookups; fail table scans.
- Query-budget tests and response-size tests.

### Phase 4 — MapLibre dashboard layers

Code/scripts:
- Add MapLibre as a parallel tab/path using service contracts or compact REST responses.
- Preserve existing Leaflet map/tab behaviour.
- Implement the three v0 layers and scatterplot with methodology/source labels.

Tests/verification:
- Browser/dev-server smoke: map renders, metric selection updates the map, Leaflet path still loads.
- No browser code calls localhost; use relative URLs.
- Responses stay compact and source/provenance labels display.

### Phase 5 — REST/server-action API

Code/scripts:
- Implement eight compact endpoints from the roadmap against the analytics service layer.
- Add Zod validation, auth/Access expectations where appropriate, cache headers, quota guards, and audit metadata.

Tests/verification:
- Contract tests for all endpoints.
- Negative tests for invalid geography/election/segment and over-limit requests.
- Verify max row count, response size under 8 KB for canonical answers, query count within target, rows-scanned/read budget respected, rows-written recorded, CPU duration distinct from total duration, and cache status recorded.

### Phase 6 — authenticated MCP endpoint

Code/scripts:
- Implement five read-only MCP tools using service-layer functions only.
- Add Access/auth checks, audit log entries, rate limits, no arbitrary SQL, no raw rows.
- Record tool, user/session, parameter hash, duration, rows returned, outcome, and blocked reason.

Tests/verification:
- Authenticated canonical MCP call succeeds.
- Unauthenticated MCP request is rejected.
- Audit logs record success/failure.
- Tool responses cite dataset version and obey row/size/query/rows-scanned/read/CPU/cache telemetry limits.

### Phase 7 — WebMCP bridge

Code/scripts:
- Add `WEBMCP_ENABLED=false` by default and Access-gated WebMCP bridge/integration only after Phase 6 works.
- Enable WebMCP only on preview/development hostnames first; production remains off until REST, MCP, Access, and audit tests pass.
- Make flag-off path fully functional with dashboard + REST + MCP.

Tests/verification:
- Flag-off smoke: no WebMCP dependency required.
- Flag-on authenticated preview smoke in Chromium-compatible environment.
- Expired session, preflight, cookie-forwarding, and same-origin behaviours checked.

### Phase 8 — testing, hardening, runbook, UAT

Code/scripts/docs:
- Add quota telemetry, privacy review reports, load/soak scripts, Access runbook, deployment runbook, and user-facing methodology links.
- Confirm graceful fallback/503 behaviour near quota limits.

Tests/verification:
- Lint, typecheck, unit, contract, privacy, browser smoke, and load/soak tests.
- Free-quota soak with margin.
- Verify canonical success signal below end-to-end from local analytics function, REST API, MCP tool, MapLibre display, and WebMCP interaction where the flag is enabled.

---

## Per-PR deliverable template

Create one hand-off record per phase or sub-phase at `agent-ctx/ETHNIC-ANALYTICS-P{n}-main.md` (examples: `P0`, `P1A`, `P3`). Match the existing `agent-ctx/AI-ASSISTANT-01-main.md` style:

```md
# ETHNIC-ANALYTICS-P{n} — main agent work record

## Task
- Scope of this phase/sub-phase.
- Roadmap sections implemented.

## Approach
- Files read and decisions made.
- Architecture/privacy/free-tier constraints applied.

## Files created
1. `path` — purpose.

## Files modified
1. `path` — changes.

## Verification
- `bun run lint` → result.
- `bun run typecheck` or targeted `tsc` → result.
- Relevant unit/contract/privacy/browser smoke tests → result.
- Any pre-existing failures and why this PR did not introduce them.

## Notes for next agent
- Known gaps.
- Follow-up roadmap items.
- Deployment/auth/quota caveats.
```

Every PR description should include the same headings: **Summary / Approach / Files created / Files modified / Verification / Notes for next agent**.

---

## Conflict-resolution rules

1. The roadmap and free-tier architecture docs win over this prompt.
2. If the roadmap conflicts with measured Cloudflare limits or documented security/privacy rules, update docs in a small PR before building on a false assumption.
3. Keep PRs small. If a phase is too large, split into A/B sub-phases with separate hand-off records.
4. If the Worker hot path needs more CPU than Free allows, redesign the offline pipeline first instead of spending Worker CPU.
5. Ask before adding paid features, paid dependencies, non-Free Cloudflare services, or broader geography/election scope.
6. If WebMCP blocks on platform limitations, ship dashboard + REST + MCP first and record WebMCP as deferred.

---

## Canonical success signal

Before adding more geography or more elections, this must work end to end:

> “Show Melaka DUN constituencies with the highest GE15 turnout, compare area-level ethnic-composition estimates and winning margins, and update the map to the selected metric.”

Verify all of the following:

- The answer cites the dataset version.
- No individual records are returned.
- Results are under 8 KB.
- Maximum row count is enforced.
- Query count is within the two-statement target.
- Rows-read budget, CPU duration, response bytes, and cache status are recorded and within budget.
- The map updates deterministically.
- An unauthenticated MCP request is rejected.
- Audit logs record the tool, user, parameters, duration, and outcome.
- The same result is reproducible from the REST API and MCP endpoint.
