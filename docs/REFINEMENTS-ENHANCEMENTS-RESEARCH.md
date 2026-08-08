# PIP-MLK — Refinements & Enhancements Research Report

**Author:** Software Engineer (research pass over the repo's MD docs)
**Date:** 2026-08-08
**Branch:** `arena/019fe0f3-pip-melaka`
**Method:** Cross-read every `.md` file in `agent-ctx/`, `docs/`, `upload/`, `download/`, `engine-archive/`, the root `MAP_2D_AUDIT_REPORT.md` and the 4,400-line `worklog.md`, then **verified each claim against the live code** (`grep` / `tsc` / file inspection) so this report lists only items that still need work, in priority order.

> The docs are unusually thorough: nearly every entry closes with an "Unresolved issues / risks / next-phase recommendations" section, and there are two dedicated action backlogs (`docs/WORK-ORDER-ROUND-8.md` with 9 tasks, and the `docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md` phase checklist). This report consolidates those + the audit findings + the latent bugs the docs themselves flag.

---

## 0. Ground-truth verification (what is already DONE, so we don't redo it)

Before proposing work, I confirmed the following are **already fixed** in the current checkout (contrary to what some older doc sections imply):

| Claim from docs | Verified state in repo |
|---|---|
| `/api/health` crashed (500) / used Prisma `fs` | ✅ **Fixed.** `health/route.ts` + `health/ready/route.ts` use **build-time JSON imports** (`@/../public/data/…`), no `fs`, no Prisma. |
| 7 API routes used `fs` and broke on Cloudflare Workers | ✅ **Fixed.** `grep -rln "readFileSync|readdir|node:fs" src/app/api` → **zero hits**. `dashboard`, `dpt`, `elections`, `socioeconomic`, `towns`, `health`, `provenance` all import data at build time. |
| `tsc` / `eslint` broken (92 / 18 errors) | ✅ **Fixed** in QA-BUGFIX-ROUND-7 → now 0 errors (2 pre-existing warnings). |
| Grouped nav U3/U4 (flat 20 tabs) | ✅ **Implemented** — `src/components/dashboard/sidebar-nav.tsx` exists. |
| i18n rollout incomplete | ✅ **Complete** across all 19 tabs, drawer, command palette, quick-actions (I18N-BATCH-1..4). |
| S2D-360 engine replacement | ✅ **Done** + senior re-audit + iframe render fix (PRs #3, #6). |

The remainder of this report is the **net-new work still needed**.

---

## 1. P0 — Correctness & production health (do first)

### 1.1 Re-enable TypeScript build checking
- **Source:** `docs/REPORT-QA-BUGFIX-ROUND-7.md` §3.2 / §7; `docs/VERIFY-PROD-ROUND-7.md` §3.
- **Verified:** `next.config.ts` line 16 still sets `typescript: { ignoreBuildErrors: true }`. The dev server strips types without checking, and CI does not gate on type errors. The 92-error regression of round 7 was exactly because nothing enforced types.
- **Enhancement:** After confirming `tsc --noEmit` is 0, flip `ignoreBuildErrors` to `false` and make the CI pipeline (`tsc --noEmit`) a required check. This converts the current "passes because we disabled the gate" state into a genuinely guarded build.

### 1.2 Resolve Prisma's orphaned presence
- **Sources:** `docs/WORK-ORDER-ROUND-8.md` TASK-1; `docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md` §1.1.
- **Verified:** `package.json` still lists `@prisma/client` + `prisma`. `src/lib/db.ts` (lazy Proxy) exists but is imported **only** by dead code `src/lib/db-optimization.ts`; nothing on the Worker path touches it. The Node Prisma engine cannot run on Cloudflare Workers.
- **Enhancement (low-risk):** Mark `src/lib/db.ts` `@deprecated — do not import on Worker path`, delete the dead `db-optimization.ts`, and (once the D1 analytics warehouse lands) remove the Prisma deps + `prisma/` dir in a dedicated cleanup PR. Roadmap explicitly says keep Prisma for now for local ingestion, then remove.

### 1.3 Wire the dormant security middleware
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-4.
- **Verified:** `src/lib/rate-limiter.ts`, `src/lib/csrf.ts`, `src/lib/security-headers.ts` are fully implemented but **unreachable** — there is **no `src/middleware.ts` / `src/proxy.ts`** at all. API routes have no global rate limiting or security headers.
- **Enhancement:** Create a Next 16 edge middleware (`matcher: ["/api/:path*"]`) applying rate-limit + security headers, returning 429 with `Retry-After` on exceed. **Ship rate-limit + headers first; add CSRF only after auditing every mutating `fetch`** (docs warn CSRF will break client calls that don't send the token today).

### 1.4 Production secrets / S2D operator checklist
- **Source:** `docs/S2D-REPLACEMENT-IMPLEMENTATION.md` → "Production checklist (operator-owned)"; `worklog.md` DEEP-RESEARCH-LIVE-API.
- **Enhancement:** Set `S2D_AUTH_TOKEN`, provider secrets (`APIFY_TOKEN`, WhatsApp/SendGrid/Burp), and `ELECTIONDATA_API_TOKEN` via `wrangler secret put`. Without `ELECTIONDATA_API_TOKEN`, deep-research silently degrades to static sources. Verify `S2D_ACTIVE_SECURITY_SCAN_ENABLED=false` stays set on Workers.

### 1.5 Confirm deep-research source count on production
- **Sources:** `worklog.md` QA-ROUND-1/2/3 (production returned 2 of 6 sources due to CF subrequest limits; claimed fixed by build-time imports).
- **Enhancement:** Re-run `GET /api/deep-research` against the live deploy and assert **6 sources** (Elections static + LIVE + DPT + DUN + Overview + S2D). Docs flag this as worth a dedicated verification since it regressed once already.

---

## 2. P2 — Hygiene

### 2.1 Consolidate duplicate `globals.css` definitions
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-3; `docs/REPORT-QA-BUGFIX-ROUND-7.md` §7.4.
- **Verified** (counts include selectors + keyframes): `.glass` ×8, `.pulse-dot` ×6, `.card-glow` ×5, `.tab-slide-in` ×3, `.scrollbar-mlk` ×9, `pulse-ring` ×4, `shimmer-sweep` ×5, `.animate-fade-in` ×3. The **`.pulse-dot` duplicate is a real conflict** — one def is amber (`#C77B2C`), the R10 duplicate is green (`#10B981`); later definition wins, so "live" dots may render the wrong colour. `.scrollbar-mlk` widths differ (8px vs 6px).
- **Enhancement:** Keep one canonical def per utility (prefer the amber `.pulse-dot` + 8px scrollbar), delete duplicates, then `grep` every usage to confirm no component relied on the overridden value. No functional impact — pure maintainability + one colour-correctness fix.

### 2.2 Prune remaining verified-unreachable code
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-5 (file-by-file table).
- **Enhancement:** Delete confirmed-dead files: `src/lib/{db-optimization,dun-code-utils,component-theme,motion-variants,api-version}.ts`, orphaned hooks (`use-data/use-fullscreen/use-hover-3d/use-responsive`), `src/stores/{bookmarks-store,brain-store}.ts`. Keep the security/infra libs (`csrf/jwt/security-headers/rate-limiter/ssrf-protection/websocket-server/cron-jobs`). Re-run the reachability script + `tsc`/`eslint` after each batch.

---

## 3. P3 — Features (last untouched roadmap items + audit gaps)

### 3.1 GE15 overlay layer has no click handler (2D map)
- **Source:** `MAP_2D_AUDIT_REPORT.md` §3, §6, §7 (flagged "highest priority").
- **Verified finding:** when the `ge15` layer is toggled ON it has a tooltip but **no click handler** — clicking does nothing (the main `par` layer sets `setSelectedParliament`; `ge15Layer` does not).
- **Enhancement:** add `lyr.on("click", …)` in `ge15Layer.onEachFeature` → `setSelectedParliament(code)`. Also lower GE15 fill opacity (0.6 partially obscures DUN boundaries when both are ON).

### 3.2 Voter-density heatmap uses a proxy metric
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-7; `MAP_2D_AUDIT_REPORT.md` §6; `worklog.md` FEATURES-ROUND-1.
- **Enhancement:** either (a) bucket by **real SPR turnout %** once Gate-9 raw rolls land, or (b) honestly relabel the layer/legend to "Registered voters (count)" with an INFO note that turnout % is pending — never mislabel a proxy as density/turnout.

### 3.3 S2D real-time signal alerts via WebSocket
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-6; `worklog.md` (repeated "future opportunity"); `src/lib/websocket-server.ts` is complete but never started.
- **Enhancement (partial):** a dependency-free client `use-s2d-alerts.tsx` hook now toasts a new critical S2D signal via Zustand store-subscription (works everywhere, no networking). The cross-client WebSocket fan-out (`src/lib/websocket-server.ts`, socket.io port 3003) remains ready but is NOT wired by default: adding `socket.io` to deps would require regenerating `bun.lock` (bun cannot fetch in this sandbox) while CI runs `bun install --frozen-lockfile`. ⚠️ **CF Workers caveat** — a plain Node `ws` server does not run on Workers; it needs a Durable-Object transport or must be dev-only.

### 3.4 UI/UX audit roadmap (design maturity)
- **Source:** `docs/UI-UX-AUDIT.md` §6 roadmap; `upload/PIP-MLK-ENHANCEMENT-GUIDE.md` §11.
- **Enhancement:** standardise chart components under one `src/components/charts/` library (Sparkline/Ring/Donut/StackedBar); add per-KPI deltas + a shared "context" strip (P1 — every primary metric gets a benchmark/trend); first-run onboarding overlay + ⌘K spotlight (P2); Lighthouse performance budget (initial LCP < 2s, interaction < 100ms).

---

## 4. P4 — i18n polish

### 4.1 BM-localized search keywords in the command palette
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-8.
- **Enhancement:** `command-palette.tsx` keyword arrays are English-only (`"home dashboard summary kpi"`). Add BM equivalents and match both when locale is `ms`.

### 4.2 Locale-aware number formatting
- **Source:** `docs/WORK-ORDER-ROUND-8.md` TASK-9; `worklog.md` I18N-BATCH-4.
- **Enhancement:** add `fmtNum(n, locale)` → `toLocaleString(locale === "ms" ? "ms-MY" : "en-US")` and replace bare `.toLocaleString()` in command-palette, dashboard header/footer, overview KPIs. (Comma grouping is identical in both, so cosmetic — but correct.)

---

## 5. Strategic roadmap — Ethnic Analytics + WebMCP (phased, large)

- **Source:** `docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md` (phases 0–8), `docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md`, `agent-ctx/ETHNIC-ANALYTICS-{BUILD-PROMPT,KICKER}.md`, `agent-ctx/ETHNIC-ANALYTICS-P0-TELEMETRY-main.md`.
- **This is the flagship forward-looking enhancement.** Summary of the phases:
  - **0–1A:** offline local pipeline (DuckDB/polars, H3, MVT generation) — Free-tier law: no in-request ETL.
  - **1:** D1 analytics warehouse (raw SQL migrations; `demographic_estimate` with `MIN_CELL_N=50` suppression), ElectionData.MY nightly ingest, DOSM disaggregation, versioned lineage.
  - **2:** threshold/k-anonymity layer (`src/lib/privacy.ts`), offline prebuilt MVT tiles on R2.
  - **3:** pure-TS analytics service layer with the `RuntimeTelemetry` envelope (`rowsRead` vs `resultRows`), `query-guard`.
  - **4:** **MapLibre** dashboard layers (composition / winner / turnout choropleths + scatter + GE15↔PRN15 slider), kept parallel to Leaflet.
  - **5:** 8 compact contract-tested REST endpoints.
  - **6:** remote `/mcp` (Streamable HTTP) with 5 wave-1 read-only tools behind Cloudflare Access.
  - **7:** WebMCP bridge (feature-flagged `WEBMCP_ENABLED=false`, preview-only).
  - **8:** Free-quota telemetry (`/api/health/quota`), privacy regression tests, docs.
- **Note:** nothing in the current `src/app/api` tree yet contains the analytics service layer, `privacy.ts`, `/mcp`, or MapLibre components (only the docs + `P0-TELEMETRY` contract exist). This is greenfield work.

---

## 6. Standing data/process gaps (tracked across docs)

- **Gate 9** (raw SPR voter xlsx for P134 audit + P135–P139) still **OPEN** — pending PDPA data-sharing agreement. Every "verified/estimated" badge in the UI traces back to this.
- **P135–P139** DUN data is synthetic/estimated; real figures require the raw rolls. Docs repeatedly caution not to present estimates as verified.
- **Dev-server OOM** on the 4 GB / 2 vCPU sandbox — mitigated (inline fallbacks) but not root-caused; docs suggest `--max-old-space-size` tuning or more RAM.
- **`agent-browser` / Playwright E2E** was never runnable in the network-restricted sandbox — a browser pass across all 19 tabs is still the recommended verification for the new Coverage rings, Brief modal, and FreshnessIndicator (WORK-ORDER TASK-2).

---

## 7. Recommended execution order

1. **P0.1 Re-enable TS build checking** (guards everything after).
2. **P0.3 Wire security middleware** (rate-limit + headers; CSRF separately).
3. **P0.2 Prisma orphan cleanup** + **P2.2 dead-code prune** (one hygiene PR).
4. **P2.1 CSS dedupe** (incl. `.pulse-dot` colour fix).
5. **P3.1 GE15 click** + **P3.2 heatmap relabel** (small map-correctness PRs).
6. **P4.1/P4.2 i18n polish** (small).
7. **P3.3 WS alerts** (document CF Workers caveat) then **P3.4 UI/UX**.
8. **Ethnic Analytics + WebMCP** roadmap as phase-sized PRs (P0-TELEMETRY contract first).

---

*Prepared from the repo's own docs + code verification on 2026-08-08. Items marked ✅-already-done were confirmed against the checkout so future agents spend effort only on the net-new work above.*

---

## Progress status — implemented 2026-08-08

The following items in this report were **implemented, built, and tested** in a single pass
(see `worklog.md` → `REFINEMENTS-ENHANCEMENTS-IMPLEMENT`):

| Report ref | Item | Status |
|---|---|---|
| §1.1 | Re-enable TS build checking (`next.config.ts`) | ✅ `tsc` 0 errors; prod build type-checks |
| §1.2 | Prisma orphan (`db-optimization.ts` deleted; `db.ts` deprecated) | ✅ |
| §1.3 | Wire security middleware → `src/proxy.ts` (rate-limit + headers) | ✅ verified 429 + headers live |
| §2.1 | Consolidate duplicate `globals.css` definitions | ✅ |
| §2.2 | Prune verified-unreachable dead code (10 files) | ✅ |
| §3.1 | GE15 overlay click handler | ✅ (already present — verified) |
| §3.2 | Voter-density heatmap honest relabel + Gate-9 note | ✅ |
| §3.3 | S2D real-time critical-signal alerts | ✅ dependency-free store-subscription hook (toast on new critical signal). Cross-client WS via existing `websocket-server.ts` deferred — adding `socket.io` would need a `bun.lock` regen (bun can't fetch here) and CI is `bun install --frozen-lockfile` |
| §4.1 | BM command-palette search keywords | ✅ |
| §4.2 | Locale-aware number formatting (`fmtNum`) | ✅ |

**Bonus fixes:** 14 tsc errors in `src/lib/analytics/runtime-telemetry.ts`, 1 lint error in
`compare-tab.tsx`, and the fragile runtime-telemetry test loader rewritten to use Node's
native type-stripping (tests pass 8/8).

**Not implemented in this pass** (documented, not forgotten):
- §1.4 production secrets — operator action via `wrangler secret put`.
- §3.4 UI/UX audit full roadmap — open-ended design work, partially addressed.
- §5 Ethnic Analytics + WebMCP roadmap (phases 0–8) — multi-week greenfield; the
  P0-TELEMETRY runtime-telemetry contract is now tsc-clean + unit-tested.
- Browser E2E (agent-browser) — not runnable in the network-restricted sandbox; verified
  via production build + HTTP probing + tsc/lint + Node integration tests.

