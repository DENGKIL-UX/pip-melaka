# ETHNIC-ANALYTICS-P0-TELEMETRY — main agent work record

## Task
- Convert the latest observability refinement into a small runtime instrumentation contract before analytics, REST, MCP, MapLibre, or WebMCP implementation.
- Add a shared request telemetry envelope and D1 wrapper that can be reused by all future Ethnic Analytics v0 runtime surfaces.
- Update the planning docs/prompts so future agents implement runtime-budget and query-plan checks from day one.

## Approach
- Kept the contract framework-agnostic and Worker-compatible: no Next.js imports, no Prisma imports, no Node-only runtime dependencies.
- Added `RuntimeTelemetry` fields requested by the refinement: requestId, route, tool, authenticated, cacheStatus, queryCount, rowsRead, rowsWritten, cpuMs, durationMs, responseBytes, status, and dataVersion.
- Implemented `runD1(statement, telemetry)` around D1 `.all()` calls. It reads Cloudflare D1 metadata keys `rows_read` and `rows_written` when present and falls back to zero when metadata is missing so successful local/mock requests are not broken by telemetry. `rowsRead` is documented as D1 rows scanned/read during SQL execution, including index reads, not the number of rows returned.
- Kept `cpuMs` and `durationMs` separate. `cpuMs` is supplied when the runtime can provide Worker CPU; `durationMs` is finalized from wall-clock elapsed time and includes D1/R2/network waits.
- Added warning-threshold helper for v0 budgets rather than hard-failing every overage during early fixture/schema work.
- Added controlled D1 failure wrapping via `RuntimeTelemetryD1Error`; failed statements increment attempted query count, set failure status, preserve request ID/route/tool, and do not expose SQL or sensitive parameters in the public error message.
- Updated roadmap/free-tier docs and agent prompts to require runtime telemetry, D1 metadata fallback tests, `EXPLAIN QUERY PLAN` checks, and WebMCP preview flag checks.

## Files created
1. `src/lib/analytics/runtime-telemetry.ts` — shared runtime telemetry contract, D1 `.all()` wrapper, controlled D1 error type, response-byte estimator, finalizer, and v0 warning-threshold helper.
2. `tests/runtime-telemetry.test.mjs` — Node built-in tests for envelope defaults, D1 `rows_read`/`rows_written` collection, missing metadata fallback, multi-statement accumulation, controlled D1 failure handling/no SQL leakage, CPU-vs-duration distinction, and budget warning generation.
3. `agent-ctx/ETHNIC-ANALYTICS-P0-TELEMETRY-main.md` — this hand-off record.

## Files modified
1. `package.json` — added `test:runtime-telemetry` script for the Node built-in telemetry tests.
2. `docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md` — added runtime telemetry contract section, D1 wrapper expectations, CPU/duration distinction, query-plan fixtures/index expectations, REST/MCP telemetry assertions, and WebMCP deployment checks.
2. `docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md` — added runtime-contract-first ordering and clarified that D1 rows read/written must come from D1 metadata, not estimates.
3. `agent-ctx/ETHNIC-ANALYTICS-BUILD-PROMPT.md` — updated recommended order and verification expectations to put the runtime telemetry contract first.
4. `agent-ctx/ETHNIC-ANALYTICS-KICKER.md` — updated phase-agent ground rules and verification gates for RuntimeTelemetry, D1 metadata fallback, and query-plan tests.

## Verification
- `node --test tests/runtime-telemetry.test.mjs` → 7 tests passed ✅
- `npm run test:runtime-telemetry` → 7 tests passed ✅
- Runtime refinement assertions via `grep` → passed ✅
- `git diff --check` → passed ✅
- `bash scripts/verify-no-pdpa-files.sh` → passed ✅
- `bun run lint` → not run; `bun` is not installed in this sandbox.
- `npm run lint` → not run successfully; dependencies are not installed and `eslint` is unavailable.

## Notes for next agent
- Start actual data work with Phase 0/1A after this telemetry contract.
- When D1 schema lands, all analytics service queries should use `runD1` and tests should assert D1 metadata (`rows_read`, `rows_written`) plus `EXPLAIN QUERY PLAN` index usage.
- `RUNTIME_TELEMETRY_WARNING_THRESHOLDS` are warnings for early development: queryCount ≤2, rowsRead ≤100 scanned/read rows, responseBytes ≤8 KB, CPU <8 ms, duration <500 ms. Convert canonical acceptance checks to hard assertions once fixtures and indexes stabilize.
- Add `resultRows` later if response cardinality needs to be tracked separately from D1 scan/read cost.
- Future REST/MCP route handlers should finalize `durationMs` at the route boundary and supply `cpuMs` only when Cloudflare exposes or approximates Worker CPU separately.
- WebMCP remains disabled by default with `WEBMCP_ENABLED=false`; bridge injection must not be treated as proof that `/mcp` auth/tools are safe.
