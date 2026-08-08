# PIP-MLK · UI/UX Audit & Award-Winning Dashboard Redesign Spec

**Status:** Research + first implementation pass
**Date:** 2026-08-08
**Scope:** Public-facing political-intelligence dashboard for Melaka state — 6 parliaments (P134–P139), 28 DUN (N01–N28), 3 districts, 3 elections.
**Objective:** Bring the dashboard's information architecture, visual design, and interaction quality to an **award-winning, top-tier** standard (comparable to industry-leading data/analytics products), grounded in proven design research.

---

## 1. Executive Summary

PIP-MLK is already a *feature-complete, technically ambitious* dashboard (20 sections, real DOSM GeoJSON, Leaflet + Three.js maps, an AI S2D intelligence loop, i18n, dark mode, keyboard nav, WCAG-aware tokens). It is a strong "functional" product. The gap to **award-winning** is not missing features — it is **design maturity**: tighter information hierarchy, a calmer visual system, more considered navigation, and consistent micro-interaction quality.

The single highest-impact opportunity is **information architecture**: today the user faces a wall of 20 flat tabs. Reorganising into a **grouped, collapsible sidebar** with progressive disclosure immediately makes the platform feel designed rather than engineered.

This document (a) summarises the research baseline, (b) audits the current product against award-calibre criteria, and (c) specifies a prioritized redesign with the changes implemented in this pass flagged.

---

## 2. Research Baseline — What Award-Winning Dashboards Do

Synthesised from current best-practice sources (2025–2026) on dashboard design, data-viz UX, and enterprise SaaS analytics:

1. **Answer one primary question.** The first viewport should answer "is everything okay?" at a glance — KPIs first, context after. *(DesignRush, 5of10, Medium 2025/2026)*
2. **F-pattern hierarchy.** Top-left = critical KPI; top row = 3–5 primary metrics; middle = trend/time-series; bottom = detail tables. *(5of10)*
3. **Right chart, right question.** Line = time trend, bar = comparison, donut = part-to-whole (3–5 categories only), table = granular. Avoid decorative-but-confusing visuals. *(Medium 2025, 20 Principles)*
4. **Progressive disclosure.** Show summary first, drill-down on demand. NN/g cites up to **55% reduction in cognitive load**. *(DesignRush, 5of10)*
5. **Visual hierarchy over decoration.** Size, weight, colour, and spacing direct attention; secondary detail is subdued or hidden. *(Multiple)*
6. **Consistency.** One semantic colour language, uniform spacing grid, standardised labels/terminology, one chart type per data pattern. *(thedan.design)*
7. **Calm real-time data.** Smooth transitions, "last refreshed" timestamps, steady highlight (no frantic blinking), manual refresh. *(20 Principles #4)*
8. **Accessibility as standard, not bonus.** Keyboard nav, ARIA, colourblind-safe palettes, ≥4.5:1 contrast, text ≥14px, tabular numerals, data tables alongside charts. *(5of10)*
9. **Micro-interactions with instant feedback.** Hover tooltips, click-to-filter, drill-down, optimistic UI, <100ms interaction response. *(Medium 2025)*
10. **Less is more / functional aesthetics.** Limit primary metrics (~7), avoid widget overload, keep grids aligned. *(DesignRush, 20 Principles #10, #16)*

**Current 2025–2026 visual trends** the design should nod to: soft glass surfaces (`backdrop-filter`), gradient-accent "brand glow" on neutral dark/light bases, generous rounded corners with restrained elevation, clean tabular numerals, and one strong accent colour used sparingly.

---

## 3. Audit Scorecard (Current State)

| Dimension | Score | Notes |
|-----------|:-----:|-------|
| Information architecture / navigation | 6/10 | 20 flat tabs in a wrapping top bar = cognitive load + poor scanability. **Biggest opportunity.** |
| Visual hierarchy | 6/10 | Good micro-polish (glows, glass, lift) but many competing accents; "everything glows" dilutes emphasis. |
| Data visualisation clarity | 7/10 | Real maps + rings + sparklines; some KPIs lack comparison context. |
| Consistency (colour, spacing, terms) | 8/10 | MLK amber system + party palette is coherent and well-documented. |
| Accessibility | 8/10 | Skip-link, ARIA, AA-contrast text tokens, reduced-motion guard, keyboard nav. Strong. |
| Micro-interactions | 7/10 | Framer-motion transitions, hover lifts, animated counters — good, occasionally busy. |
| Real-time "calm" | 7/10 | Freshness indicator + live S2D badge; could add last-refreshed clarity and refresh control. |
| Performance | 7/10 | Lazy-loaded heavy maps (Leaflet/Three) with retry — good architecture. |

**Overall: 7/10 functional — 6.5/10 "feels designed."** Target after redesign: **9/10.**

---

## 4. Findings & Fixes (Prioritised)

### P0 — Information architecture (highest impact)
- **Problem:** 20 flat tabs in one wrapping top nav. Users must scan 20 labels to find anything; no visual grouping on desktop; hidden by a `<select>` on mobile.
- **Fix (implemented this pass):** a **grouped, collapsible sidebar** with sections (Overview / Maps / Elections / Intelligence / Operations / Governance). Desktop = persistent rail; mobile = bottom sheet / slide-in drawer. Preserves the existing store + tab machinery so no data logic changes.
- Collapse sections the user isn't using (progressive disclosure). Current tab always visible + highlighted.

### P0 — Calm & hierarchy
- **Problem:** overlapping glow/glass/gradient treatments compete for attention; KPI cards sit flat next to "pro" cards.
- **Fix (this pass):** unify surfaces — **cards** use a single elevation + a faint brand-tint on the *primary* KPI only; **gradient + glow reserved** for the header/hero and the single call-to-action accent. Reduces "everything-glow" noise.

### P1 — KPI comparison context
- Every primary KPI gets context: previous-value delta, target/benchmark, or trend direction — so numbers are *actionable*, not just informative.

### P1 — Data-viz discipline
- Standardise: sparkline for trend, ring for coverage, stacked bar for composition, choropleth for geography. Keep ≤3–4 series per chart. Add data-table fallbacks beside complex charts.

### P1 — Real-time calm
- Add an explicit "Last refreshed HH:MM" + manual refresh affordance near the freshness indicator; avoid layout shift on live updates.

### P2 — Feedback & onboarding
- Surface the existing command palette (⌘K) and keyboard shortcuts more prominently on first load; add a lightweight "first run" pointer.

---

## 5. Design System Spec

### 5.1 Colour
- **Base:** neutral (light oklch `1 0 0` / dark `0.145 0 0`).
- **Brand accent — MLK amber-gold:** light `#A55A1F` (AA on white), dark `#E89B45` (AA on dark). Use *sparingly* for primary emphasis, focus rings, and the primary CTA.
- **Semantic:** success `#10B981`, warning `#F59E0B`, danger `#EF4444`, info `#3B82F6` — reserved strictly for their meaning.
- **Coalitions:** PH / BN / PN reserved for party/electoral data only (never for generic accents).

### 5.2 Type scale (denser data)
- Caption `10px/12`, small `12px/14`, base `14px/20` (min for reading), label `14px/18`, H1 `24px/28`, H2 `18px/22`, H3 `15px/20`.
- All numerals use `font-variant-numeric: tabular-nums` for stable alignment.
- Uppercase micro-labels for section headers (consistent tracking).

### 5.3 Spacing / radius / elevation
- 4pt grid: `4 / 8 / 12 / 16 / 24 / 32`.
- Radius: `12px` cards, `8px` controls, `9999px` pills.
- Elevation: one card shadow + one hover lift; only overlay surfaces (command palette, dialogs, toasts) use glass + heavier blur.

### 5.4 Motion
- ~200–280ms ease-out entrances; `prefers-reduced-motion` fully respected (already present).
- Stagger list/card entrance ≤150ms; never delay critical info.

---

## 6. Implementation Plan (this pass + roadmap)

**Delivered this pass:**
- [x] Grouped, collapsible **sidebar navigation** replacing the 20-tab top bar (desktop rail + mobile drawer) — `src/components/dashboard/sidebar-nav.tsx`.
- [x] **Unified card surface** system + brand-accent hierarchy in `globals.css` (calmer elevation, reserved glow).
- [x] **Overview tab** polish: KPI comparison context, refined hero/banner, cleaner DUN composition panel.
- [x] This **audit & spec** document.

**Roadmap (next rounds):**
1. Standardise chart components (Sparkline/Ring/Donut/StackedBar) under one `src/components/charts/` library.
2. Add per-KPI deltas + a shared "context" strip.
3. First-run onboarding overlay + ⌘K spotlight.
4. Full visual pass on each of the 19 tab sections to match the new surface language.
5. Performance budget: initial LCP < 2s, interaction < 100ms; audit with Lighthouse.

---

## 7. Acceptance Criteria (what "award-winning" means here)

- [ ] Primary insights graspable in **<5 seconds** on the Overview.
- [ ] No more than **7 primary metrics** on the first viewport.
- [ ] Every primary metric has **comparison context**.
- [ ] Navigation: any section reachable in **≤2 clicks/key-presses**, grouped & labelled.
- [ ] Consistent semantic colour; no colour alone conveys meaning (text/icons accompany).
- [ ] All interactive elements keyboard-accessible; AA contrast; tabular numerals.
- [ ] `prefers-reduced-motion` disables all non-essential motion.
- [ ] Calm live data: last-refreshed timestamp + manual refresh, no layout shift.
