# Ethnic Analytics + WebMCP — phase kicker

Use this short kicker when spawning an agent for one roadmap phase or sub-phase.

You are a senior software engineer working on the PIP Melaka Ethnic Electoral Analytics + WebMCP v0. Implement only the phase/sub-phase supplied with this kickoff. Keep the PR small, testable, and Free-tier safe.

---

## Read first

1. The supplied roadmap phase section from `docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md`.
2. `docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md`.
3. Relevant existing context:
   - `docs/WORK-ORDER-ROUND-8.md`
   - `MAP_2D_AUDIT_REPORT.md` if touching maps
   - `agent-ctx/AI-ASSISTANT-01-main.md` for hand-off record style
4. Scan the repo paths you will touch before editing.

---

## Ground rules

- Free-tier law: Worker hot paths do only small validated parameter parsing, one or two indexed D1 queries or small cached artifact reads, and compact JSON serialization. Runtime tests must record query count, D1 rows scanned/read (`rowsRead`, kept separate from rows returned), result rows returned (`resultRows`), rows written, Worker CPU, total duration, response bytes, and cache status via the shared `RuntimeTelemetry` envelope. Prefer `.all()` with an explicit `LIMIT` (it returns both rows and metadata); do not route `.first()` through `runD1` since its return shape lacks metadata, and when `batch()` is added aggregate per-statement `rows_read`/`rows_written`/`resultRows` for quota accounting.
- ETL, H3, MVT generation, large joins, JSONL parsing, and modelling run offline only.
- No raw voters, names, NRIC, exact voter coordinates, or small-cell leakage.
- `MIN_CELL_N=50` is only a starting point; also handle differencing attacks when filters combine.
- Label sources separately: SPR/ElectionData.MY, DOSM, surveys, PIP-modelled estimates. Never imply individual ethnicity prediction.
- ElectionData.MY requires a Bearer API key. Do not expose it to browser code. Use nightly pulls, caching, versioned snapshots, polite-use behaviour, and provenance metadata.
- D1 Free is 500 MB per database and 5 GB total account storage; do not write docs/code comments that imply a single Free D1 DB is 5 GB.
- Keep Prisma off Worker request paths.
- Preserve existing Leaflet map behaviour; MapLibre is parallel.
- WebMCP is preview-only, feature-flagged with `WEBMCP_ENABLED=false` by default, Access-gated, and optional after REST/MCP/dashboard work. Enable only on preview/development hostnames first.
- No arbitrary SQL from REST/MCP. Use allowlisted service functions and Zod validation.

---

## Deliverables for the phase

- Code/scripts for the supplied phase only.
- Deterministic fixtures or mocks where needed.
- Unit/contract/privacy/browser tests appropriate to the phase.
- Documentation updates when assumptions, source labels, privacy rules, deployment/auth, or quota behaviour change.
- A hand-off record at `agent-ctx/ETHNIC-ANALYTICS-P{n}-main.md` using the style of `agent-ctx/AI-ASSISTANT-01-main.md`.

The hand-off record must include:

```md
## Task
## Approach
## Files created
## Files modified
## Verification
## Notes for next agent
```

---

## Required verification gates before committing

Run the broad gates unless the phase is docs-only; for docs-only phases, run at least lint or a targeted no-broken-reference/content check and explain why code gates are unchanged.

- `bun run lint`
- `bun run typecheck` or targeted `tsc --noEmit` if full typecheck has known pre-existing failures
- Relevant tests for the phase (unit, contract, privacy, schema-lint, MCP, runtime-budget, D1 metadata fallback, query-plan, or browser smoke)
- Dev-server smoke when touching UI/map/API routing:
  - server binds to `0.0.0.0`
  - browser-facing code uses relative URLs, not localhost
  - key route(s) return expected status
  - map/dashboard still renders if applicable

Document every command and result in the hand-off record. If a command fails due to pre-existing issues, identify the pre-existing files and prove your changes did not add new failures.

---

## Success question for every phase

Ask whether the phase moves the system closer to this end-to-end v0 acceptance test:

> “Show Melaka DUN constituencies with the highest GE15 turnout, compare area-level ethnic-composition estimates and winning margins, and update the map to the selected metric.”

The final v0 must cite dataset version, return no individual records, keep results under 8 KB, enforce max rows plus query-count/rows-scanned/read (distinct from `resultRows` returned)/CPU/cache budgets, update the map deterministically, reject unauthenticated MCP, audit tool usage, and reproduce the same answer through local analytics, REST, MCP, MapLibre, and WebMCP when enabled.
