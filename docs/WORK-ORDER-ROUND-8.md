# PIP-MLK — Actionable Work Order (for follow-up agent, one task = one PR)

**Source:** Arena Agent Mode, round QA-BUGFIX-ROUND-7 (commit `1df41c2` on `arena/019fb848-pip-melaka`).
**Purpose:** A prioritized backlog the next agent can execute **task-by-task, each as its own PR**. Every task is self-contained: problem → approach → exact files → code → verification → PR scope.
**Base branch to branch from:** `main` (or `arena/019fb848-pip-melaka` if continuing this session).
**Current health:** `tsc` 0 errors · `eslint` 0 errors (2 pre-existing warnings) · 13/13 API routes 200 · health probes 503 (graceful).

> **Read first:** `worklog.md` entry `QA-BUGFIX-ROUND-7` and `docs/REPORT-QA-BUGFIX-ROUND-7.md` for context.
> **Conventions:** MLK amber-gold theme (`#C77B2C`), all new visible strings via `t(key, fallback)` in `src/lib/i18n.tsx` (EN + BM), "use client" for components, files kept small, real data from `public/data/*`.

---

## Priority tiers

| Tier | Theme | Tasks |
|---|---|---|
| **P1 — Correctness** | Make health pass; close the QA gap | TASK-1, TASK-2 |
| **P2 — Hygiene** | Remove dupes, wire dormant security, prune dead code | TASK-3, TASK-4, TASK-5 |
| **P3 — Features** | Last untouched roadmap items | TASK-6, TASK-7 |
| **P4 — i18n polish** | Locale correctness | TASK-8, TASK-9 |

Recommended execution order: **TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6 → TASK-7 → TASK-8 → TASK-9**.

---

# P1 — Correctness

## TASK-1 — Resolve the Prisma / health-check question
**Priority:** P1 · **Effort:** S (½ day) · **Risk:** low (lazy-proxy already isolates it)

### Problem
`/api/health` reports `database: fail` → `status: unhealthy` (HTTP 503) because the Prisma query-engine binary can't initialize (no `DATABASE_URL`, engine not generated). The **entire app reads static JSON** from `public/data/` — `@prisma/client` is consumed **only** by `src/app/api/health/route.ts` and `src/app/api/health/ready/route.ts`. Also, the Node Prisma engine **cannot run on Cloudflare Workers** (the deploy target), so this will *always* fail in production.

### Recommended approach: **remove Prisma, replace the DB check with a static-data integrity check**
This makes `/api/health` return `healthy` (200) in every environment and deletes a dependency that can't work on the deploy target.

### Files
- `src/lib/db.ts` — **delete**.
- `src/app/api/health/route.ts` — replace `checkDatabase()`; drop `import { db }`.
- `src/app/api/health/ready/route.ts` — replace `checkDatabase()`; drop `import { db }`.
- `package.json` — remove `"@prisma/client"` and `"prisma"`.
- (Optional) delete `prisma/` if no migrations are needed elsewhere.

### Code — new `checkDataIntegrity()` (replaces `checkDatabase()` in both health routes)
```ts
import { promises as fs } from "node:fs";
import path from "node:path";

// Static-data integrity check — replaces the Prisma DB check.
// The app's source of truth is the engine-built JSON/JSONL under public/data/,
// so "is the system healthy" == "are the canonical data files present + non-empty".
async function checkDataIntegrity(): Promise<CheckResult> {
  const started = Date.now();
  const required = [
    "p134/dashboard-overview.json",
    "p134/dun-intelligence.jsonl",
    "elections/melaka-elections.json",
    "socioeconomic/melaka-dosm.json",
  ];
  const dataDir = path.join(process.cwd(), "public", "data");
  const missing: string[] = [];
  for (const rel of required) {
    try {
      const stat = await fs.stat(path.join(dataDir, rel));
      if (stat.size === 0) missing.push(rel);
    } catch {
      missing.push(rel);
    }
  }
  return {
    status: missing.length === 0 ? "pass" : "fail",
    latencyMs: Date.now() - started,
    detail: missing.length === 0
      ? "All canonical data files present."
      : `Missing/empty: ${missing.join(", ")}`,
  };
}
```
- Rename the `checks.database` field to `checks.data` (or keep `database` keyed to this for backward-compat with any dashboards scraping it).
- Update `aggregateStatus()`: critical check is now `checks.data` (was `database`).

### Acceptance
- `curl localhost:3000/api/health` → **200** `{status:"healthy", checks:{data:"pass", engine:"pass", memory:"pass"}}`.
- `curl localhost:3000/api/health/ready` → **200**.
- `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors.

### Alternative (if a real DB is genuinely wanted)
Provision SQLite: add `.env` with `DATABASE_URL="file:./prisma/dev.db"`, run `npx prisma generate && npx prisma db push` on a network-enabled host, seed minimal rows. Leave the lazy-proxy in `db.ts`. ⚠️ This still won't work on CF Workers — not recommended for this deploy target.

### PR scope
`fix(health): replace Prisma DB check with static-data integrity check` — delete `lib/db.ts`, edit 2 routes, edit `package.json`. Self-contained, no UI impact.

---

## TASK-2 — Browser-based QA pass + fix findings
**Priority:** P1 · **Effort:** M (1 day) · **Risk:** low

### Problem
Round 7 QA was HTTP-level only — browser CDNs were network-blocked in that sandbox. Visual rendering of the 19 tabs (and the **new** Coverage rings, Brief modal, FreshnessIndicator) is unverified by a real browser.

### Approach (on a network-enabled host)
```bash
npm i -g agent-browser && agent-browser install --with-deps
npm run dev          # in another terminal
agent-browser open http://localhost:3000/
agent-browser snapshot -i                 # find the "Enter" CTA
agent-browser click @eN                   # enter dashboard
# For each of the 19 tabs: click the tab, wait --load networkidle,
# screenshot, snapshot -i, assert no [role="alert"] / error text.
```
Tab list is in `src/components/dashboard.tsx` (`TABS` array): overview, map-2d, map-3d, elections, demographics, analysis (DPT), risk, compare, s2d, s2d-360, scraper, public-comm, incidents, scenarios, predictive, insights, alerts, dual-layer, governance.

### Specifically verify
1. **Overview → Data Quality & Coverage** card: three SVG rings render with correct % (17.9 / 99.93 / 97.53) and animate on mount.
2. **Header Export button** opens the Brief preview modal; Copy/Print/Download all work; Print opens a styled window.
3. **Footer** shows "Updated Xm/Xh ago".
4. Console has **zero** errors/warnings on each tab (except known Google-Fonts 404 on offline builds).
5. EN ⇄ BM toggle flips all new strings (`brief.*`, `overview.dataQuality*`).

### Acceptance
- A `docs/qa-browser-round-8.md` log: per-tab screenshot paths + pass/fail + any bugs filed as new TASKs.
- Any visual bug found → fixed in the same PR or filed as a follow-up TASK.

### PR scope
`test(qa): browser pass across 19 tabs + fixes` — QA log + any small fixes. Keep fixes minimal; spin big changes into their own PRs.

---

# P2 — Hygiene

## TASK-3 — Consolidate duplicate `globals.css` definitions
**Priority:** P2 · **Effort:** S · **Risk:** low (visual diff carefully)

### Problem
`src/app/globals.css` defines several utilities **twice** — the second (R10) block silently overrides the first. Confirmed duplicate line numbers:

| Utility / keyframe | First def | Duplicate (R10) | Conflict |
|---|---|---|---|
| `.glass` | 220 | 563 | identical values |
| `.card-glow` | 243 | 543 | R10 re-adds `::before` glow |
| `.pulse-dot` | 346 (amber `#C77B2C`) | 586 (green `#10B981`) | **color conflict** |
| `@keyframes pulse-ring` | 362 | 602 | differ |
| `.tab-slide-in` + `@keyframes tab-slide` | 337 / 340 | 617 / 620 | durations differ |
| `.scrollbar-mlk` (+ `::-webkit-scrollbar`) | 285–296 | 626–648 | widths differ (8px vs 6px) |
| `@keyframes shimmer-sweep` | 182 | 674 | directions differ |
| `.animate-fade-in` + keyframe | 267 | 707 | duplicate |

### Approach
Keep **one canonical definition** per utility. Recommendation:
- `.pulse-dot` → keep the **amber** MLK version (line ~346). The R12 `.live-dot-mlk` already covers the "green live" case. Delete the green duplicate (586–615) and its `@keyframes pulse-ring` (602).
- `.scrollbar-mlk` → keep the **8px** version (285–296) for better touch targets; delete the 6px duplicate (626–648).
- All others: delete the R10 duplicate, keep the first (earlier) definition.
- After deletion, search the codebase for every class to confirm none relied on the *second* definition's specific value (e.g. `grep -rn "pulse-dot\|tab-slide-in\|scrollbar-mlk" src`).

### Acceptance
- `npm run lint` clean, `npx tsc --noEmit` clean.
- Dev server renders identically; visually diff Overview + a scrollable table (e.g. Elections swing table) before/after.
- File shrinks by ~80–120 lines; no class defined more than once.

### PR scope
`style(css): dedupe globals.css utility definitions` — single file, `src/app/globals.css`.

---

## TASK-4 — Wire the dormant security middleware
**Priority:** P2 · **Effort:** M · **Risk:** medium (security — review carefully)

### Problem
`src/lib/rate-limiter.ts`, `src/lib/csrf.ts`, `src/lib/security-headers.ts` are fully implemented but **unreachable** (no `src/middleware.ts` exists). API routes are therefore unprotected against brute-force/DoS, and CSRF tokens are never issued/validated.

### Approach
Create `src/middleware.ts` that runs on `/api/*`:
1. **Rate-limit** via `rate-limiter.ts` (`rateLimit(...)`) — group: `api`, identifier: IP. Return 429 on limit.
2. **Security headers** via `security-headers.ts` on all responses.
3. (Optional, behind a flag) **CSRF** — issue/validate double-submit token for state-changing methods (POST/PUT/PATCH/DELETE). ⚠️ The app has many client `fetch` calls without a CSRF header today; enabling strict CSRF will break them. **Recommend: ship rate-limit + headers first (this PR); add CSRF in a separate PR after auditing every mutating `fetch`.**

### Skeleton — `src/middleware.ts`
```ts
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
// import { applySecurityHeaders } from "@/lib/security-headers"; // confirm export name

export const config = {
  matcher: ["/api/:path*"],            // run only on API; static + pages unaffected
};

const LIMIT = 120;   // requests
const WINDOW_MS = 60_000; // per minute per IP

export function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip") ?? "unknown";

  const rl = rateLimit(`api:${ip}`, { limit: LIMIT, windowMs: WINDOW_MS });
  if (rl.exceeded) {
    return NextResponse.json(
      { error: "Too Many Requests", retryAfterMs: rl.retryAfterMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? WINDOW_MS) / 1000)) } },
    );
  }

  const res = NextResponse.next();
  // applySecurityHeaders(res);            // CSP/HSTS/XFO etc. (verify export)
  res.headers.set("X-RateLimit-Limit", String(LIMIT));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  return res;
}
```
- Read `src/lib/rate-limiter.ts` for the exact `rateLimit` signature/options (the comment block documents it). Adapt the snippet to the real API.
- Verify `security-headers.ts`'s exported helper name before importing.

### Acceptance
- Hammer `curl -X GET localhost:3000/api/dashboard` in a loop → 121st request returns **429** with `Retry-After`.
- `X-RateLimit-*` headers present on 200s.
- No regression on any tab (all client fetches still succeed within limits).
- `next build` includes the middleware edge bundle.

### PR scope
`feat(security): wire rate-limit + security-headers middleware` — new `src/middleware.ts` + any tiny export fixes in the lib files. **Do NOT enable CSRF here** (separate PR).

---

## TASK-5 — Prune or repurpose remaining dead code
**Priority:** P2 · **Effort:** S · **Risk:** low (verified unreachable)

### Problem
After round 7, ~23 custom files are still unreachable (no type/lint errors — kept as "intentional infra", but several are pure cruft). Reachability script: `/tmp/reach3.py` (re-runnable).

### Files & recommendation
| File | Recommendation |
|---|---|
| `src/lib/db-optimization.ts` | **Delete** (Prisma-era, unused) |
| `src/lib/dun-code-utils.ts` | **Delete** (verify no `@/lib/dun-code-utils` import first) |
| `src/lib/component-theme.ts` | **Delete** |
| `src/lib/motion-variants.ts` | **Delete** |
| `src/lib/api-version.ts` | **Delete** |
| `src/lib/use-data/use-fullscreen/use-hover-3d/use-responsive.ts` (hooks) | **Delete** each (confirm zero refs) |
| `src/stores/bookmarks-store.ts`, `src/stores/brain-store.ts` | **Delete** |
| `src/lib/{retry,fetch-with-timeout,event-emitter,feature-flags,apify-scraper}.ts` | **Keep** — useful utilities; or delete if truly unwanted |
| `src/lib/{csrf,jwt,security-headers,rate-limiter,ssrf-protection,websocket-server,cron-jobs}.ts` | **Keep** — security/infra; wired by TASK-4 / TASK-6 |
| `src/hooks/use-mobile.ts` | **Keep** (used by `ui/sidebar.tsx`) |

### Approach
For each "Delete" row: `grep -rn "<basename>\|@/lib/<name>" src` → if zero hits (excluding the file itself), `git rm`. Re-run `tsc` + `eslint` after each batch.

### Acceptance
- `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors.
- Reachability script shows fewer unreachable files; no newly-broken imports.

### PR scope
`chore: prune verified-unreachable utilities` — deletions only.

---

# P3 — Features (last untouched roadmap items)

## TASK-6 — S2D signal alerts via WebSocket (real-time)
**Priority:** P3 · **Effort:** L · **Risk:** medium

### Problem
`src/lib/websocket-server.ts` is a complete WS server (`startWsServer`, `wsServer`, `S2DSignalPayload`, `SignalUpdatePayload`) but is **never started**, and the client never subscribes. This is the last "future opportunity" from FEATURES-ROUND-1. Goal: when a new **critical** S2D signal is seeded/added, push it to connected clients → toast notification.

### Approach
1. **Server:** start the WS server once (instrumentation or a lazy start in an API route). Emit `S2DSignalPayload` whenever the S2D store adds a critical signal.
   - Hook into `src/stores/s2d-store.ts` `addSignal`/`seedIfEmpty` → after adding, call `wsServer.broadcast({type:"signal:new", payload: signal})` when `signal.severity === "critical"`.
2. **Client:** a `useS2DAlerts()` hook (`src/hooks/use-s2d-alerts.ts`) opens a `WebSocket` to the same origin, listens for `signal:new`, and calls the existing `useToast`/`sonner` to fire a toast with a "Open S2D Console" action (`setActiveTab("s2d")`). Mount it once in `src/components/dashboard.tsx`.
3. **Graceful fallback:** if WS fails to connect (dev without server, or CF Pages has no WS), the hook no-ops silently — the existing pull-based store still works.

### Skeleton — `src/hooks/use-s2d-alerts.ts`
```ts
"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDashboardStore } from "@/stores/dashboard-store";

export function useS2DAlerts() {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/api/ws`); // or :3003 per server config
    } catch { return; }
    if (!ws) return;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "signal:new" && msg.payload?.severity === "critical") {
          toast.error(msg.payload.title, {
            description: msg.payload.detail,
            action: { label: "Open S2D", onClick: () => setActiveTab("s2d") },
          });
        }
      } catch { /* ignore malformed */ }
    };
    return () => ws?.close();
  }, [setActiveTab]);
}
```
- Confirm the WS path/port from `websocket-server.ts` (`startWsServer(port = 3003)`) and the route/upgrade handler.
- ⚠️ **CF Workers caveat:** Cloudflare *Durable Objects* support WS, but a plain Node `ws` server does not run on Workers. If the deploy target stays CF Workers, this feature needs a Durable-Object transport or must be dev-only. Document the limitation in the PR.

### Acceptance
- In dev: seeding a critical signal fires a toast on all connected clients.
- Disconnect/reconnect is resilient; no console errors when WS unavailable.
- `tsc` + `eslint` clean.

### PR scope
`feat(s2d): real-time critical-signal alerts over WebSocket` — server hook-in + client hook + dashboard mount. **Large** — consider splitting server vs client into two PRs if review is heavy.

---

## TASK-7 — Real voter-turnout heatmap data (replace proxy)
**Priority:** P3 · **Effort:** M · **Risk:** low (data-dependent)

### Problem
The 2D map's "voter density heatmap" layer (added FEATURES-ROUND-1) colors DUNs by **voter count** (a proxy), not actual turnout. The legend says "Voter Density" but operators expect turnout %.

### Approach
1. Locate actual SPR turnout data. Check `public/data/` and `engine/` for per-DUN turnout; if absent, the engine's DPT/election outputs likely have registered vs cast votes.
2. If turnout exists: change the layer's bucketing in `src/components/tabs/map-2d-tab.tsx` from voter-count thresholds to turnout % thresholds (e.g. <70% / 70–85% / >85%), update the legend labels (i18n keys `map.voterDensity/densityLow/densityHigh` → add `map.turnout*`).
3. If turnout does **not** exist: keep the proxy but **rename** the layer + legend honestly to "Registered voters (count)" and add an INFO note that turnout % is pending Gate 9. Do not mislabel.

### Acceptance
- Layer reflects real turnout %, OR is honestly relabeled.
- Legend i18n updated EN + BM.
- `tsc` + `eslint` clean.

### PR scope
`feat(map): real SPR turnout heatmap (or honest relabel)` — `map-2d-tab.tsx` + i18n keys.

---

# P4 — i18n polish

## TASK-8 — BM-localized search keywords in the command palette
**Priority:** P4 · **Effort:** S · **Risk:** low

### Problem
`src/components/shared/command-palette.tsx` each tab entry has an English-only `keywords` field (e.g. `"home dashboard summary kpi"`). BM-first operators can't search with BM terms.

### Approach
In `tabCommands`, change `keywords: string` → `keywords: string[]` (or add `keywordsMs: string[]`). Populate BM equivalents for each tab (e.g. Overview → `["rumah","papan pemuka","ringkasan"]`; Elections → `["pilihan raya","undian"]`; Demographics → `["demografi","jantina","umur"]`). In the fuzzy-match step, merge `keywords` + `keywordsMs` (only when locale is `ms`, or always — search both). Resolve via `useI18n().locale` and add `locale` to the `useMemo` deps.

### Acceptance
- With locale = BM, typing "demografi" surfaces the Demographics tab.
- EN behaviour unchanged.
- `tsc` + `eslint` clean.

### PR scope
`feat(i18n): BM search keywords in command palette` — `command-palette.tsx` only.

---

## TASK-9 — Locale-aware number formatting
**Priority:** P4 · **Effort:** S · **Risk:** low

### Problem
`p.totalVoters.toLocaleString()` (and similar) uses the runtime default locale → "71,415" always. For BM consistency it should use `ms-MY`.

### Approach
Add a tiny helper in `src/lib/i18n.tsx` (or `src/lib/utils.ts`):
```ts
export function fmtNum(n: number, locale: string): string {
  return n.toLocaleString(locale === "ms" ? "ms-MY" : "en-US");
}
```
Expose `locale` from `useI18n()` and replace bare `.toLocaleString()` calls in the most visible surfaces: `src/components/shared/command-palette.tsx`, `src/components/dashboard.tsx` (header voter badge, footer), `src/components/tabs/overview-tab.tsx` (KPI values). (Both `en-US` and `ms-MY` use comma grouping, so this is cosmetic — but correct.)

### Acceptance
- Numbers format with the active locale.
- `tsc` + `eslint` clean.

### PR scope
`feat(i18n): locale-aware number formatting` — helper + ~4 call-site files.

---

# Appendix

## A. Re-running the reachability analysis
The script `/tmp/reach3.py` (re-create if missing) builds the import graph from `page.tsx`, `layout.tsx`, `instrumentation.ts`, and every `api/**/route.ts`, resolving both static `from "…"` and dynamic `import("…")`. Output: `TOTAL / REACHABLE / UNREACHABLE` + per-dir dead-file lists. Re-run after any deletion to confirm zero newly-broken edges.

## B. Standard verification (run for EVERY PR)
```bash
npx tsc --noEmit          # must be 0 errors
npm run lint              # must be 0 errors (2 pre-existing warnings OK)
npm run dev               # then HTTP-probe:
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/
curl -s localhost:3000/api/health | python3 -m json.tool
```
For visual changes, also do the TASK-2 browser snapshot on the affected tab.

## C. Branch / PR rules (from this environment)
- Work on `arena/019fb848-pip-melaka` (this session's branch) **or** branch fresh from `main` for clean independent PRs.
- Push only to your own branch; open PRs against `main`.
- GitHub auth is pre-configured — use `gh pr create` directly; never request credentials in chat.

## D. Current verified baseline (post round 7)
- `tsc`: 0 · `eslint`: 0 errors / 2 warnings · 13/13 API routes 200 · `/api/health` 503 (graceful, DB-absent) · `src/` 173 files.
- New surfaces added round 7: `src/components/shared/{brief-preview-dialog,coverage-ring}.tsx`, Overview "Data Quality & Coverage" card, header/footer polish, `brief.*` + `overview.dataQuality*` i18n (EN+BM).
