# PIP-MLK — Engineering Review, QA & Improvement Report

**Round:** QA-BUGFIX-ROUND-7
**Agent:** Arena Agent Mode
**Branch:** `arena/019fb848-pip-melaka` (commit `1df41c2`, pushed)
**Date:** 2026-07-31
**Repo:** `DENGKIL-UX/pip-melaka` (working path `/home/user/pip-melaka`)

---

## 1. Executive summary

This round was a **review → troubleshoot → QA → fix → enhance** pass on the
PIP-MLK political-intelligence dashboard (Next.js 16 / React 19 / Tailwind v4,
19 tabs, EN/BM i18n, 2D Leaflet + 3D Three.js maps, RAG AI assistant, Cloudflare
deploy target).

The headline finding: **prior worklog rounds reported "0 lint errors", but the
real state was 92 TypeScript errors and 18 lint errors**, hidden because
`next.config.ts` sets `typescript.ignoreBuildErrors: true` and the webpack dev
server strips types without checking them. Worse, the **`/api/health` and
`/api/health/ready` endpoints were hard-crashing with HTTP 500**.

I fixed the critical crash, restored full type/lint health, removed 77 dead
files, and added two new features plus a styling pass. Final verification:

| Metric | Before | After |
|---|---|---|
| `tsc --noEmit` errors | **92** | **0** |
| `eslint` errors / warnings | **18 / 3** | **0 / 2** (warnings pre-existing) |
| `/api/health` | **500 (crash)** | **503 (valid JSON)** |
| `src/` files | 248 | 173 |
| Reachable `src/` files | 95 | 114 |
| Diff vs branch point | — | 96 files, +940 / −15,872 |

---

## 2. Scope, methodology & environment

**Task brief:** review the codebase, troubleshoot potential issues, perform QA
(via `agent-browser`), then independently choose between bug-fixing and new
requirements, while mandatorily improving styling and adding features.

### Environment constraint (important)
This sandbox restricts outbound network to the **npm registry only**. Browser
CDNs (Chrome-for-Testing, Playwright Chromium), apt, and Google Fonts are all
blocked (`TLS handshake EOF` / connection refused). `bun` was also unavailable,
so I installed dependencies with `npm`. Consequently:

- `agent-browser` / a real browser **could not be launched** (no Chrome binary
  downloadable). Browser-based click-through QA was therefore not possible here.
- I substituted rigorous **HTTP-level QA** (every API route + page + static data
  file), `tsc --noEmit`, `eslint`, a clean on-demand dev-server compile, and a
  full **import-graph reachability analysis**. A browser pass is recommended on
  a network-enabled host (see §7).

> Note on paths: the task references `/home/z/my-project/` (the canonical
> production path). The actual repo in this session is `/home/user/pip-melaka`;
> all work was done there and the worklog updated at `worklog.md`.

### QA tooling used
- `npx tsc --noEmit` — full type check (the dev server doesn't type-check).
- `npm run lint` (eslint-config-next, React 19 hooks rules).
- `curl` probing of all 19 API routes + `/api/health/*` + 5 static data files.
- A Python import-graph analyzer (static `from` **and** dynamic `import()`)
  to classify every `src` file as reachable vs dead from the app entry points
  (`page.tsx`, `layout.tsx`, `instrumentation.ts`, all `api/**/route.ts`).

---

## 3. QA findings (what was actually wrong)

### 3.1 Critical — health probes crashed with 500
`/api/health` and `/api/health/ready` returned HTTP 500 with
`@prisma/client did not initialize yet`. Root cause: those routes import `db`
from `@/lib/db`, which executed `new PrismaClient(...)` at **module-import
time**. When the Prisma query-engine binary is unavailable (it is in this
sandbox — `prisma generate` is network-blocked), the constructor throws
synchronously during module evaluation, producing a 500 **before the handler's
own try/catch can run**. A health probe that 500s defeats its own purpose.

### 3.2 Type system broken (92 errors)
`tsc --noEmit` reported **92 errors**. Classified via the reachability graph:
- **73 in dead code** (orphaned modules).
- **19 in live code** — real bugs, including:
  - `elections-tab.tsx`: the results table + swing analysis accessed
    `r.winner_candidate`, but the `parliament_results` type didn't declare it →
    candidate names were silently `undefined` at runtime.
  - `predict/route.ts`, `deep-research/route.ts`: unsafe casts / shape
    mismatches papered over with `as any`.
  - `s2d/intelligence/[...path]/route.ts`: imported `SignalRecord` /
    `BriefInput` that were declared but never exported.
  - `daily-intelligence-brief.ts` / `sentiment-snapshot.ts`: invalid
    `Object.freeze([...]) as const` (TS1355 — `as const` can't apply to a
    function-call result).
  - `predictive-tab.tsx`: recharts `<Line dot={{ fill: (d)=>… }}>` (TS2769).
  - `fallback-data.ts`: data used `party_breakdown` / `per_dun` / `total_dun`
    not present on its interfaces.

### 3.3 Lint: 18 errors (React 19 strict rules)
Mostly the new `react-hooks/set-state-in-effect` rule firing on standard
data-fetch effects and shadcn scaffolding (`use-mobile.ts`, `carousel.tsx`, and
the dead modules).

### 3.4 ~153 of 248 `src` files unreachable
A large "module" architecture under
`src/components/{analysis,brain,compare,demographics,elections,governance,
map-2d,map-3d,risk,s2d,socioeconomic}/` (plus orphaned `shared/` and `lib/`
files) was **superseded by the `src/components/tabs/*` implementations** but
never deleted. These generated the bulk of the type/lint errors and inflated
maintenance/cognitive cost. Confirmed via reachability: **0 external
references** to any of those 11 directories.

### 3.5 API routes otherwise healthy
All 13 application API routes returned 200; all 5 core static data files
returned 200. (Two POST-only routes correctly 405 on GET; `/api/electiondata`
400s without its token — expected.)

---

## 4. Fixes & engineering health

### 4.1 CRITICAL — health probes now degrade gracefully
Rewrote `src/lib/db.ts`: the Prisma client is now a **lazy `Proxy`**. The
`new PrismaClient()` call is deferred to first property access and wrapped in
try/catch, so **importing `db` can never throw**. If the engine is unavailable,
the proxy throws a clear error *on use* — which the health routes' existing
`try/catch` around `db.$queryRaw` catches. Result:

```
/api/health       500  →  503  {status:"unhealthy", checks:{database:"fail", engine:"pass", memory:"fail"}}
/api/health/ready 500  →  503  {status:"not_ready", checks:{database:"fail", memory:"fail"}}
/api/health/live  200  →  200  {status:"alive"}   (unchanged)
```

The `database:fail` is **correct and expected** here (no engine binary in this
sandbox); in production with a real DB it reports `pass`. This is proper
health-check semantics — "process alive, dependency down", never a 500.

### 4.2 Type safety: 92 → 0 errors
Fixed all 19 live-code errors (see §3.2 for the list) and eliminated the 73
dead-code errors by removing the dead code (§4.4).

### 4.3 Lint: 18 → 0 errors
- `use-mobile.ts`: rewrote with **`useSyncExternalStore`** (React-19-idiomatic
  for media-query subscription, SSR-safe, fully satisfies the rule).
- `carousel.tsx` (embla): added the shadcn-convention
  `eslint-disable-next-line react-hooks/set-state-in-effect` for its legitimate
  initial-select subscription.
- The rest cleared automatically once the dead modules were removed.
- Remaining 2 warnings (`react/no-danger` in `layout.tsx` + `chart.tsx`) are
  pre-existing and intentional.

### 4.4 Dead-code removal — 77 files deleted
Deleted the 11 verified-unreachable module directories, 12 orphaned `shared/`
components (incl. the two with type errors: `evidence.tsx`, `skeletons.tsx`),
`theme-providers.tsx`, and `data/gaps.ts`. `src/` went **248 → 173 files**;
reachable files went **95 → 114** (a higher *fraction* of the surviving code is
live). The standard shadcn `ui/` kit and security-middleware libs were kept
intentionally.

---

## 5. New features

### 5.1 Enhanced Intelligence Brief (Markdown + preview + print)
The header "Export" button previously did an immediate, silent JSON dump.
Extended `src/lib/export-brief.ts` with:
- `briefToMarkdown()` — human-readable Markdown (header table, key metrics,
  GE15 results, provenance, notes);
- `copyBriefMarkdown()` (clipboard, with legacy fallback);
- `downloadBriefMarkdown()` and the existing `downloadBrief()` (JSON);
- `printBrief()` — opens a print-optimized, MLK-branded window (→ browser
  "Save as PDF"), with a tiny safe Markdown→HTML renderer (no new dependency).

New `src/components/shared/brief-preview-dialog.tsx` modal previews the brief
in Markdown with **Copy / Print / Download-.md / Download-.json** actions, wired
into the Export button. Fully client-side, PDPA-safe. `brief.*` i18n keys added
(EN + BM).

### 5.2 Data Quality & Coverage widget (Overview tab)
New reusable `src/components/shared/coverage-ring.tsx` — pure-SVG circular
progress, animated stroke sweep, tier-coloured, accessible (`role="img"` +
aria-label). Added a "Data Quality & Coverage" card to Overview with **three
rings**: DUN coverage (5/28 verified ≈ 17.9%, warn), profile completeness
(99.93%, good), gender balance (97.53, good) — plus three inline stat tiles
(verified voters, senior dependency, evidence tier). `overview.*` i18n keys
(EN + BM).

---

## 6. Styling improvements (mandatory)

All additive (new utility names) to avoid disturbing existing behaviour:

- **`globals.css` R12 section:** `.stat-card-pro` (premium surface: top accent
  bar + inner radial highlight + hover lift), `.eyebrow` (section label),
  `.insight-chip`, `.bg-aurora` (soft hero glow), `.live-dot-mlk` (on-brand
  amber pulse — distinct from the generic green `.pulse-dot`), `.link-mlk`,
  and `@media print` rules.
- **KPI cards** upgraded to `.stat-card-pro` + `tabular-nums` for stable layout.
- **Dashboard header** S2D badge → on-brand `.live-dot-mlk` + MLK-coloured icon.
- **Footer:** new `FreshnessIndicator` ("Updated Xh ago" computed from the
  build-time `NEXT_PUBLIC_BUILD_TIME` env injected by `next.config.ts`).

---

## 7. Risks, unresolved items & next-phase recommendations

1. **Browser QA not run here** — run a full `agent-browser` pass across all 19
   tabs (click-through + screenshots) on a network-enabled host to confirm
   visual rendering of the new Coverage rings, Brief modal, and FreshnessIndicator.
2. **Prisma is effectively dormant** — `@prisma/client` is consumed only by the
   two health probes; the whole app reads static JSON from `public/data/`, and
   the Node Prisma engine isn't available on Cloudflare Workers anyway.
   Recommend either provisioning a real DB + `prisma generate`/`migrate` (so
   `/api/health` returns `healthy`), or dropping Prisma and replacing the DB
   check with a static-data integrity check. The lazy-proxy change makes either
   path safe.
3. **Remaining dead code (no errors)** — ~23 custom files still unreachable
   (security middleware libs `csrf/jwt/security-headers/websocket-server`, the
   `bookmarks-store`/`brain-store`, a few `ui/` primitives). Kept as
   intentional infra/scaffolding; a future pass could wire the middleware into a
   `middleware.ts` or prune the stores.
4. **`globals.css` duplication** — `.glass`, `.pulse-dot`, `.tab-slide-in`,
   `.scrollbar-mlk`, `.card-glow` and several `@keyframes` are defined twice
   (later wins). I used additive new names to stay safe; a consolidation pass
   is worthwhile.
5. **Memory ceiling** — the 4 GB / 2 vCPU / no-swap sandbox is OOM-prone for the
   dev server; rapid multi-file edits produce transient phantom SWC parse errors
   that clear on a fresh `.next` + restart. Not a code defect.

---

## 8. Verification (final)

- `npx tsc --noEmit` → **0 errors**.
- `npm run lint` → **0 errors, 2 warnings** (pre-existing, intentional).
- Clean dev server (`.next` cleared): home compiles in ~1.3s, **HTTP 200**, no
  syntax errors in the log (earlier phantom `<eof>` errors were stale
  incremental-compile artifacts, confirmed cleared by the fresh start).
- HTTP QA: all 13 API routes **200**; `/api/health` + `/api/health/ready`
  **503 with valid JSON** (was 500 crash); 5 core static data files **200**.
- Commit `1df41c2` pushed to `arena/019fb848-pip-melaka`.

### Files touched (summary)
- **New (2):** `src/components/shared/brief-preview-dialog.tsx`,
  `src/components/shared/coverage-ring.tsx`.
- **Modified (15):** `lib/db.ts`, `lib/export-brief.ts`, `lib/fallback-data.ts`,
  `lib/i18n.tsx`, `lib/s2d-engine/{daily-intelligence-brief,sentiment-snapshot}.ts`,
  `app/api/{deep-research,predict}/route.ts`, `hooks/use-mobile.ts`,
  `components/{dashboard,ui/carousel}.tsx`,
  `components/tabs/{elections,overview,predictive}-tab.tsx`, `app/globals.css`,
  `.gitignore`.
- **Deleted (77):** superseded module dirs + orphaned shared/lib files.
- **Worklog** updated (4090 → 4281 lines) with entry **QA-BUGFIX-ROUND-7**.
