# BUILD-TABS-01 — main agent work record

## Task
Build 7 tab components (overview, elections, demographics, analysis, risk-socioeconomic, compare, governance) for the PIP-MLK Next.js 16 dashboard, replacing placeholder Card. Wire them into `src/components/dashboard.tsx`. Run lint, verify 0 errors.

## Approach
- Read worklog.md for context (P134 engine data, 71,415 voters, 5 DUNs, MLK amber-gold theme, party colors BN/PH/PN, 8/9 gates provenance).
- Read existing assets: dashboard.tsx, dashboard-store.ts, melaka-constants.ts, party-colors.ts, s2d-console-tab.tsx, public data JSONs.
- Built 7 client components in `src/components/tabs/`, each "use client", using fetch() in useEffect, shadcn Card/Badge/Button/Tabs/Table/Select, recharts (BarChart/LineChart/RadialBarChart), MLK theme classes.
- Updated `dashboard.tsx`: removed placeholder Card, replaced with `{activeTab === "..." && <XTab />}` for all 7 new tabs; cleaned up unused `useState`, `Card`, `CardContent` imports. Kept Map2DTab, Map3DTab, S2DConsoleTab as-is.

## Files created
1. `src/components/tabs/overview-tab.tsx` (230 lines) — Honesty banner (Proxy tier, 8/9 gates), 5 KPI cards (voters/parliaments/DUN/DM/localities), elections summary (GE14/PRN15/GE15), DPT churn summary, 6 parliament cards with GE15 winner badges, quick action cards.
2. `src/components/tabs/elections-tab.tsx` (193 lines) — 3 shadcn Tabs (GE14/PRN15/GE15), PRN15 marked HEADLINE (BN 21/28). Per-election: summary banner, bar chart (parliament vote % OR DUN seats stacked BN/PH/PN), results table with party-color winner badges.
3. `src/components/tabs/demographics-tab.tsx` (204 lines) — Reads dun-intelligence.jsonl (5 DUNs). Gender split bar chart (male/female by DUN), senior dep radial chart (color-coded by threshold ≥30% critical / ≥25% warning), per-DUN table (voters, male, female, senior dep, gender bal, age, ethnicity), risk signals section, Proxy evidence tier badge.
4. `src/components/tabs/analysis-tab.tsx` (164 lines) — DPT 5-month trend (LineChart, HEADLINE badge, ReferenceLine at 1000 net), KPI row (additions/deletions/net), per-parliament BarChart, per-parliament breakdown table, churn ratio column.
5. `src/components/tabs/risk-socioeconomic-tab.tsx` (198 lines) — Risk KPI summary (critical/warning/clear), senior dep RadialBarChart, gender balance BarChart, per-DUN risk signals table with severity badges, DOSM panel (state + 3 districts: population, income, poverty, Gini, unemployment).
6. `src/components/tabs/compare-tab.tsx` (193 lines) — Two Select dropdowns (parliament A/B), side-by-side StatRow grid (voters, DUNs, male/female %, senior dep, gender bal, DPT churn, dominant age/ethnicity, GE15 winner), verdict section (voter diff, DPT net diff, senior dep risk), share buttons (Copy URL, Tweet, WhatsApp, CSV).
7. `src/components/tabs/governance-tab.tsx` (127 lines) — Pipeline provenance panel with 9 gates (8 CLOSED + 1 OPEN with Gate 9 explanation re: raw SPR voter xlsx), honest gaps register (7 gaps: G1–G7 with INFO/WARNING severity), PDPA Akta 709 compliance checklist (7 compliant items).

## Files modified
- `src/components/dashboard.tsx` — added 7 named imports, replaced placeholder `{... && <Card>...</Card>}` block with 7 direct tab renders; removed unused imports (`useState`, `Card`, `CardContent`).

## Verification
- `bun run lint` → 0 errors ✅
- All 7 files < 300 lines (max 230) ✅
- Dev server log shows Ready + GET / 200 (Next.js 16.1.3, webpack). No new compile errors after edits.

## Notes for next agent
- All tab content fetches use relative paths `/data/...` (no port — same-origin Next.js static).
- P135–P139 demographics fallback to PARLIAMENTS constants in compare-tab (no raw voter rolls yet — Gate 9 open).
- Recharts is bundled; lazy-load not needed since charts are tab-scoped (loaded on click).
- `fade-in-up` class used in tabs is already defined in globals.css `@layer utilities`.
