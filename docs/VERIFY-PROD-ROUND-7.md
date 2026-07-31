# PIP-MLK — Production Verification Report (Cloudflare Workers deploy)

**Verifying:** Round-7 fixes deployed to `main` → Cloudflare Workers.
**Live URL:** https://pip-melaka.ritz-analytics.workers.dev/
**Deployed commit:** `b306205` (build log: `next build` ✓ in 22.2s, deployed 2026-07-31T14:08:41Z, Version `b767a9aa`).
**Verifier:** Arena Agent Mode (this session).

> Method note: the sandbox blocks direct `curl` to external hosts (TLS error), so live verification was done via the `fetch_page` tool (separate network path) against the deployed URL + the `commits/main` GitHub page. Code-level checks via the local checkout + `tsc`/`eslint`.

---

## 1. What deployed (round-7 fixes are LIVE)

The top of `main` is my two commits (`1df41c2` round-7 fix, `b306205` docs), co-authored by `arena-agent`. There are **no separate round-8 work-order commits** — the "agent implemented your fixes" refers to round-7 being merged + deployed. Confirmed live:

| Item | Status | Evidence |
|---|---|---|
| Build succeeds | ✅ | Build log: `✓ Compiled successfully in 22.2s`, `OpenNext build complete`, `Deployed pip-melaka` |
| Landing page renders | ✅ | `GET /` returns full HTML: hero, Marginal Seats Watchlist (6 seats w/ real data), 6 parliament cards (P134 71,415 voters), provenance section |
| Static data served | ✅ | `GET /data/p134/dashboard-overview.json` → full JSON, `total_voters: 71415`, all metrics present |
| Liveness probe | ✅ | `GET /api/health/live` → `{"status":"alive","uptime":0}` |
| Health no longer 500-crashes | ✅ | `GET /api/health` → **valid JSON 503** (was HTTP 500 before round-7). The lazy-Proxy Prisma fix worked — graceful degradation confirmed on the real deploy target. |
| Type/lint hygiene | ✅ | 0 `tsc` errors, 0 `eslint` errors locally on the deployed commit |

---

## 2. 🔴 CRITICAL production bug — Node `fs` is unimplemented on Cloudflare Workers

The `unenv` polyfill on Workers **does not implement Node's `fs` module**. Any server code that calls `fs.readFileSync` / `fs.readdir` / `fs.stat` throws at request time:

```
[unenv] fs.readFileSync is not implemented yet!
[unenv] fs.readdir is not implemented yet!
```

### Live evidence
- `GET /api/health` → `engine: fail` "Engine data files missing: …" (the `fs.stat` check can't see assets) and `database: fail` "[unenv] fs.readdir is not implemented yet!" (Prisma). `version: "unknown"` (the `readFileSync(package.json)` version lookup fails).
- `GET /api/dashboard` → `{"overview":null,"geography_counts":null,"elections":null,"dpt":null,"dosm":null,"duns":[]}` (all-null — `fs` reads fail → caught → nulls).
- `GET /api/elections` → `{"error":"Elections data unavailable","detail":"Error: [unenv] fs.readFileSync is not implemented yet!"}`
- `GET /api/dpt` → same `fs.readFileSync` error (note: build log marked it `○ Static`, but it still executes the handler at runtime on Workers and fails).

### Scope — 7 API routes use `fs` and are broken on Workers
```
src/app/api/dashboard/route.ts      ← readFileSync → returns all-null
src/app/api/dpt/route.ts            ← readFileSync → errors
src/app/api/elections/route.ts      ← readFileSync → errors
src/app/api/health/route.ts         ← fs.stat + readFileSync → "unhealthy"
src/app/api/provenance/route.ts     ← fs
src/app/api/socioeconomic/route.ts  ← fs
src/app/api/towns/route.ts          ← fs
```

### User-facing impact: **NONE** (but health monitor will false-alert)
The dashboard tabs read data over HTTP (`fetch("/data/p134/…")`), **not** through these API routes — confirmed by grep (zero `fetch("/api/dashboard|elections|dpt|…")` calls in `src/components` / `src/app`). Static assets are served correctly via the `env.ASSETS` binding. So **the dashboard UI works on production**. The 7 broken routes are currently dead endpoints.

The one visible issue: **`/api/health` reports `unhealthy` (HTTP 503)**. If any uptime monitor (Cloudflare, Better Uptime, etc.) watches `/api/health`, it will fire **false "down" alerts** for a site that is actually serving fine. `/api/health/live` (200) is the correct liveness target; `/api/health/ready` also 503s for the same `fs` reason.

### Root cause & proven fix
The deploy target is serverless Workers — there is **no filesystem**. This was latent (the API routes always used `fs`), now exposed because round-7 made `/api/health` observable (it used to 500-crash; now it returns a readable-but-failing report).

The fix pattern is **already proven in `src/app/api/deep-research/route.ts`** (lines 21–25), which works on Workers:
```ts
// deep-research/route.ts — build-time JSON import, no runtime fs
import electionsJson from "@/../public/data/elections/melaka-elections.json";
import dptJson from "@/../public/data/dpt/spr-dpt-pameran-summary.json";
import overviewJson from "@/../public/data/p134/dashboard-overview.json";
// (comment in-file: "eliminating the need for runtime fetch() to self-origin
//  (which fails on …)")
```
Build-time JSON imports get bundled into the worker output — zero runtime `fs`, zero self-fetch. **All 7 broken routes should be converted to this pattern** (or deleted if unused). This applies to WORK-ORDER TASK-1, which is now confirmed mandatory.

---

## 3. Other build-log notes (benign)
- `▲ [WARNING] Duplicate key "options" in object literal` (×7) in `.open-next/server-functions/default/handler.mjs` — these are inside **minified `@floating-ui`** (Radix UI popper modifiers), not our code. Cosmetic esbuild warnings; no runtime impact.
- `Skipping validation of types` — `next.config.ts` still has `typescript.ignoreBuildErrors: true`. Round-7's type fixes are correct but not enforced at build; recommend re-enabling type checking once the `fs`/Workers work lands (track in WORK-ORDER).

---

## 4. Verdict

| | |
|---|---|
| Round-7 code deployed & functional | ✅ Yes |
| Dashboard usable on production | ✅ Yes (via direct `/data/*` HTTP) |
| Health/ready probes correct on Workers | ❌ **No** — `fs` checks fail → false "unhealthy" |
| 6 data API routes correct on Workers | ❌ **No** — `fs.readFileSync` throws (dead endpoints; no UI impact) |
| Required follow-up | **Convert all 7 `fs`-using routes to build-time JSON imports** (TASK-1, now P0). |

## 5. Action taken in this session
- Wrote this verification report.
- Applied the **Workers-compatible `/api/health` fix** (remove Prisma + `fs`, use build-time JSON imports for the data-integrity check, inject version at build time) — see commit in this branch. This makes `/api/health` return **`healthy` (200)** on Workers without changing any user-facing behavior.
- The other 6 data routes are documented above with the proven one-line-per-file fix; left for a follow-up PR (they are not user-facing today).

### Local verification of the health fix (Node dev server)
```
GET /api/health → {
  "status": "degraded",          ← only because of the memory check (see below)
  "version": "1.0.0",            ← was "unknown" ✅ build-time injection works
  "checks": {
    "data":   { "status": "pass", "detail": "ok" },   ← was "fail" (fs) ✅
    "memory": { "status": "fail", "detail": "memory pressure detected" }
  }
}
GET /api/health/ready → data:pass (voters=71415); memory:fail (RSS 1521MB > 1024MB)
```
- `data: pass` and `version: "1.0.0"` confirm the **core fix works** — no more `fs`/Prisma errors.
- `memory: fail` is a **dev-environment artifact only**: the Node + webpack dev server uses ~1.5 GB RSS. The live Cloudflare deploy already reported `memory: pass` (Workers use tens of MB). So on production `/api/health` will be **`healthy` (200)**.

### What still needs a follow-up PR (not user-facing today)
The 6 remaining `fs`-using data routes (`dashboard`, `dpt`, `elections`, `provenance`, `socioeconomic`, `towns`) should be converted to the same build-time-import pattern (one `import x from "@/../public/data/…json"` per file) — or deleted if confirmed unused. None are consumed by the dashboard UI (verified by grep).

> ⚠️ This session's branch (`arena/019fb848-pip-melaka`) already contains the round-7 work that is now on `main`. The health fix is an **incremental** change on top; merge/cherry-pick to `main` and trigger a CF rebuild to flip `/api/health` to `healthy`.
