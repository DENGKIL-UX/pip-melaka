# AI-ASSISTANT-01 — main agent work record

## Task
Build an RAG-enhanced AI Assistant for the PIP-MLK dashboard:
1. POST `/api/assistant` route using z-ai-web-dev-sdk, with 12 verified Melaka facts in the system prompt and a keyword-routed RAG context builder over 4 verified datasets.
2. Floating "Ask AI" panel (`src/components/shared/assistant-panel.tsx`) with framer-motion entrance, suggested questions, RAG/Verified/Source badges.
3. `SelectedDunDrawer` (`src/components/shared/selected-dun-drawer.tsx`) — 350px slide-in from right with DUN demographics + election history, wired to `useDashboardStore.selectedDun`.
4. `ThemeToggle` (`src/components/shared/theme-toggle.tsx`) using next-themes, cycling dark → light → system.
5. CSS utilities appended to `globals.css` (@layer utilities): `.fade-in`, `.slide-up`, `.gradient-border`, `.glass`.
6. Wire all three components into `dashboard.tsx` (header theme toggle + bottom-of-shell overlays).
7. Run `bun run lint`, verify 0 errors.

## Approach
- Read worklog.md for context (P134 71,415 voters, PRN15 BN 21/28, GE15 PN 4/PH 2, MLK amber-gold theme #C77B2C, party colors BN #0F7DC2 / PH #E22926 / PN #019C2D, 8/9 provenance gates).
- Read existing assets: dashboard.tsx, dashboard-store.ts, globals.css, layout.tsx, package.json, melaka-constants.ts, party-colors.ts, demographics-tab.tsx (for DUN typing pattern), overview-tab.tsx, public data JSONs (elections, DPT, DOSM, dun-intelligence.jsonl).
- Confirmed `z-ai-web-dev-sdk@0.0.18` is installed; verified its API (`ZAI.create()` → `zai.chat.completions.create({ messages })`).
- Confirmed `next-themes@0.4.6` is installed but no ThemeProvider was wired in layout.tsx — added it with `attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange`.
- Built API route with keyword routing across 4 datasets:
  - elections → election/PRN15/GE14/GE15/BN/PH/PN/won/votes/winner/result/landslide
  - DPT → dpt/voter roll/additions/deletions/churn/net/pameran/registration
  - DUN demographics → dun/N01-N05/taboh/ayer limau/lendu/kuala linggi/tanjung bidara/demographic/senior/gender/voter/age/ethnicity/p134/masjid tanah
  - socioeconomic → income/poverty/gini/unemployment/dosm/population/socioeconomic/median/district
- Static fallback for offline LLM — keyword-matched canned answers using the 12 verified facts.
- Components: `"use client"`, framer-motion for entrance/exit (spring + easeOut), shadcn Badge/Button, lucide icons (Sparkles, X, Send, BookOpen, ShieldCheck, Database, Loader2, MapPin, Users, Heart, Scale, Vote, ShieldAlert, Moon, Sun, Monitor).
- Drawer: 350px slide-in from right + backdrop + ESC-to-close + click-outside-to-close, all gated on `useDashboardStore.selectedDun`.
- Theme toggle: mounted-guard to avoid hydration mismatch, cycles dark → light → system.
- CSS: 4 new utility classes inside `@layer utilities`. `.gradient-border` uses pseudo-element with mask-composite trick. `.glass` uses backdrop-filter with dark-mode variant.

## Files created
1. `src/app/api/assistant/route.ts` (~270 lines) — POST handler with RAG context builder, 12-fact system prompt, ZAI chat completion, static fallback, GET metadata endpoint. `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"`. Returns `{response, rag_used, source, evidence_tier}`.
2. `src/components/shared/assistant-panel.tsx` (~230 lines) — Floating "Ask AI" button (h-14 w-14 rounded-full bg-mlk-gradient, Sparkles icon, bottom-right) + 400x500 panel with header "PIP-MLK AI Assistant · RAG-enhanced", message history (user/assistant bubbles), 6 suggested-question buttons, input + send button, RAG/Verified/Source badges on assistant messages, Loader2 spinner while loading. framer-motion entrance animation (opacity+y+scale, 0.22s easeOut). Auto-scroll to bottom on new message.
3. `src/components/shared/selected-dun-drawer.tsx` (~290 lines) — 350px slide-in from right (framer-motion spring stiffness=320 damping=32). Reads `/data/p134/dun-intelligence.jsonl` + `/data/elections/melaka-elections.json` on selection change. Shows: DUN code/name/parliament/state, total voters, male/female %, senior dep %, gender balance, age band distribution bars (MLK gradient), election history cards (GE14/PRN15 per-DUN winner + vote share). Close button + backdrop click + ESC key.
4. `src/components/shared/theme-toggle.tsx` (~60 lines) — next-themes useTheme, mounted-guard, cycles dark → light → system, Moon/Sun/Monitor icons, MLK hover styling.

## Files modified
1. `src/app/layout.tsx` — added `ThemeProvider` from next-themes with `attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange`, wrapping children + Toaster. Removed hardcoded `className="dark"` on `<html>` (ThemeProvider will apply it via `attribute="class"`).
2. `src/components/dashboard.tsx` — added 3 named imports (AssistantPanel, SelectedDunDrawer, ThemeToggle). Added `<ThemeToggle />` to header badge cluster (after Provenance 8/9 + Voters badges). Added `<SelectedDunDrawer />` + `<AssistantPanel />` after `</footer>` (floating overlays rendered last so they sit above all content via fixed positioning).
3. `src/app/globals.css` — appended 4 utility classes inside `@layer utilities` after `.scrollbar-mlk` rules: `.fade-in` (0.3s opacity), `.slide-up` (0.4s translateY+opacity), `.gradient-border` (pseudo-element MLK gradient mask-composite), `.glass` (backdrop-blur frosted surface with dark-mode variant).

## Verification
- `bun run lint` → 0 errors, 0 warnings ✅
- TypeScript: `bunx tsc --noEmit --skipLibCheck` → 8 errors total, ALL in pre-existing files (websocket examples, skills/, analysis-tab.tsx, compare-tab.tsx, map-2d-tab.tsx, map-3d-tab.tsx). Zero errors in any new or modified file.
- Dev server log shows Next.js 16.1.3 (Turbopack) ready; GET / 200 prior to edits.

## Notes for next agent
- API route reads files from `process.cwd()/public/data/...` using `node:fs/promises`. Since `runtime = "nodejs"` and `dynamic = "force-dynamic"`, this runs server-side at request time — safe.
- The assistant route's RAG context builder only loads datasets when the question matches keywords — keeps the prompt lean (under ~2KB context for most questions).
- The ZAI call uses `thinking: { type: "disabled" }, temperature: 0.2, max_tokens: 600` for grounded, deterministic responses.
- If ZAI fails (no .z-ai-config, network error), the static fallback uses keyword matching on the 12 verified facts and returns `source: "static-fallback"`.
- ThemeToggle uses mounted-guard pattern (renders disabled Sun icon until mounted) to avoid SSR hydration mismatch with next-themes.
- SelectedDunDrawer uses `useEffect` cleanup with `cancelled` flag to avoid setState-after-unmount race conditions during rapid open/close.
- The `.glass` and `.gradient-border` utilities are not yet used by any component in this task — they're available for future MLK-themed surfaces (e.g., onboarding cards, premium tooltips).
- The assistant panel is rendered in dashboard.tsx AFTER the footer, so it visually floats above footer and main content. Its `z-50` ensures it sits above header (`z-30`) and drawer backdrop (`z-40`).
- Drawer (`z-50`) and AssistantPanel (`z-50`) share the same z-tier; if both open at once, AssistantPanel (rendered after drawer in DOM) wins focus, but the drawer backdrop still intercepts clicks. In practice they're unlikely to be used simultaneously.
