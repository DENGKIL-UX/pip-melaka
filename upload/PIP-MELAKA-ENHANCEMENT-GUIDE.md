# 🏛️ PIP-MLK — Enterprise SaaS Premium UI/UX Enhancement Guide

> **Project**: PIP Melaka Political Intelligence Platform  
> **Repository**: [github.com/DENGKIL-UX/pip-melaka](https://github.com/DENGKIL-UX/pip-melaka)  
> **Live Site**: [pip-melaka.ritz-analytics.workers.dev](https://pip-melaka.ritz-analytics.workers.dev/)  
> **Stack**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Framer Motion + Three.js + Leaflet  
> **Date**: 2026-07-21

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Landing Page Enhancement](#3-landing-page-enhancement)
4. [Dashboard & Navigation Enhancement](#4-dashboard--navigation-enhancement)
5. [2D Map Tab Enhancement](#5-2d-map-tab-enhancement)
6. [3D Map Tab Enhancement](#6-3d-map-tab-enhancement)
7. [All Module Tab Enhancements](#7-all-module-tab-enhancements)
8. [Global Design System Upgrade](#8-global-design-system-upgrade)
9. [Motion & Animation System](#9-motion--animation-system)
10. [Performance Optimization](#10-performance-optimization)
11. [Recommended Additional Enhancements](#11-recommended-additional-enhancements)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Executive Summary

### 1.1 Current State

PIP-MLK already has a solid foundation with:
- ✅ MLK amber-gold (#C77B2C) design system with dark mode support
- ✅ Glassmorphism effects, gradient borders, hover lifts
- ✅ 19 dashboard tabs covering full political intelligence spectrum
- ✅ 2D Leaflet map with SVG rendering + 3D Three.js extruded map
- ✅ AI Assistant (Cloudflare Workers AI / Llama 3.1 8B)
- ✅ S2D-360 Intelligence Engine (56 pages, 8 sections)
- ✅ Command palette, theme toggle, keyboard shortcuts

### 1.2 Enhancement Goal

Transform from "great open-source dashboard" to **"enterprise SaaS product that competes with Palantir / Tableau / Power BI"** for the political intelligence vertical.

### 1.3 The 7 Pillars of SaaS Premium UI

| # | Pillar | Current | Target |
|---|--------|---------|--------|
| 1 | **Visual Hierarchy** | Functional | Polished, data-dense, information-architected |
| 2 | **Micro-interactions** | Basic hover lifts | Apple/Stripe-grade transitions |
| 3 | **Data Visualization** | Recharts + Leaflet | Cinematic data storytelling |
| 4 | **Layout Density** | Spacious | Information-dense but scannable |
| 5 | **Loading States** | Skeleton shimmer | Skeleton + progress + optimistic |
| 6 | **Responsiveness** | Desktop-first | Adaptive, tablet-friendly |
| 7 | **Accessibility** | Basic focus rings | WCAG 2.1 AA+ |

---

## 2. Current Architecture Overview

### 2.1 File Map

```
src/
├── app/
│   ├── globals.css          ← Theme tokens, utility classes
│   ├── layout.tsx           ← Root layout (Geist fonts, ThemeProvider)
│   ├── page.tsx             ← Landing ↔ Dashboard toggle
│   └── api/                 ← API routes
├── components/
│   ├── landing-page.tsx     ← Bento hero + parliament/DUN cards
│   ├── dashboard.tsx        ← 19-tab navigation shell
│   ├── shared/              ← Reusable components
│   │   ├── animated-counter.tsx
│   │   ├── assistant-panel.tsx
│   │   ├── command-palette.tsx
│   │   ├── info-tooltip.tsx
│   │   ├── party-logo.tsx
│   │   ├── selected-dun-drawer.tsx
│   │   ├── shortcut-cheat-sheet.tsx
│   │   ├── theme-toggle.tsx
│   │   └── ...
│   ├── tabs/                ← 19 tab components
│   │   ├── map-2d-tab.tsx
│   │   ├── map-3d-tab.tsx
│   │   ├── overview-tab.tsx
│   │   ├── elections-tab.tsx
│   │   ├── demographics-tab.tsx
│   │   ├── analysis-tab.tsx
│   │   ├── risk-socioeconomic-tab.tsx
│   │   ├── compare-tab.tsx
│   │   ├── s2d-console-tab.tsx
│   │   ├── s2d-360-tab.tsx
│   │   ├── scraper-tab.tsx
│   │   ├── public-communication-tab.tsx
│   │   ├── incident-casebook-tab.tsx
│   │   ├── scenario-tab.tsx
│   │   ├── predictive-tab.tsx
│   │   ├── insight-reports-tab.tsx
│   │   ├── alerts-tab.tsx
│   │   ├── dual-layer-tab.tsx
│   │   └── governance-tab.tsx
│   └── ui/                  ← shadcn/ui primitives
├── lib/                     ← Constants, stores, utilities
├── stores/                  ← Zustand stores
└── hooks/                   ← Custom hooks
```

### 2.2 Current Theme Tokens

- **Primary Accent**: `#C77B2C` (MLK amber-gold)
- **Primary Dark**: `#9A5D1F` (MLK amber-dark)
- **Ring**: `#C77B2C` / `#E89B45` (dark mode)
- **BN**: `#0B3D91` (dark blue)
- **PH**: `#E22926` (red)
- **PN**: `#019C2D` (green)
- **OTH**: `#6B7280` (gray)

---

## 3. Landing Page Enhancement

### 3.1 Current State

The landing page has a bento-grid hero with:
- "Truth Above All" headline
- 6 summary tiles (GeoJSON, Voters, S2D Loop, Provenance)
- Marginal Seats Watchlist (6 seats)
- Parliament/DUN cards with verification status

### 3.2 Enterprise Enhancements

#### 3.2.1 Hero Section — Cinematic Header

**What to add:**
- Full-viewport hero with animated particle/grid background
- Floating GeoJSON map silhouette in background (SVG animation)
- Gradient text headline with dynamic typewriter effect
- Three CTA paths: "Enter Dashboard" (primary), "Watch Demo" (secondary with play icon), "Download Report" (tertiary)
- Live status bar: "Last updated: 1h 38m ago • Source: DOSM kawasanku 2026 • ✅ All systems operational"

**Code structure:**
```tsx
// src/components/landing/hero-section.tsx
function HeroSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grid-mlk">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-mlk/5 via-transparent to-background" />
      <AnimatedMapSilhouette className="absolute inset-0 opacity-[0.03]" />
      
      {/* Floating particles */}
      <ParticleField count={40} color="#C77B2C" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Badge variant="outline" className="glass mb-6 text-xs tracking-widest">
          POLITICAL INTELLIGENCE PLATFORM v1.0
        </Badge>
        <motion.h1 className="text-6xl md:text-8xl font-bold tracking-tight">
          <span className="shimmer-text">Truth Above All.</span>
        </motion.h1>
        <motion.p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          A public-facing political intelligence dashboard for Melaka state — 
          6 parliaments, 28 DUN, 3 elections. Real DOSM kawasanku GeoJSON boundaries.
        </motion.p>
        
        {/* CTA Buttons */}
        <motion.div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Button size="lg" className="bg-mlk hover:bg-mlk/90 text-white px-8 gap-2" onClick={onEnter}>
            Enter Dashboard <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" className="glass gap-2">
            <PlayCircle className="w-4 h-4" /> Watch Demo
          </Button>
        </motion.div>
        
        {/* Live status bar */}
        <div className="mt-16 glass rounded-full px-6 py-3 inline-flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="pulse-dot" /> Systems Operational
          </span>
          <span className="w-px h-4 bg-border" />
          <Clock className="w-3 h-3" /> Updated 1h 38m ago
          <span className="w-px h-4 bg-border" />
          <Database className="w-3 h-3" /> DOSM kawasanku 2026
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <ChevronDown className="w-6 h-6 text-mlk animate-bounce" />
      </motion.div>
    </section>
  );
}
```

#### 3.2.2 Key Metrics Strip — Real-Time Dashboard

Replace the current bento tiles with a horizontal metrics strip that animates on scroll:

```tsx
// src/components/landing/metrics-strip.tsx
function MetricsStrip() {
  const metrics = [
    { icon: MapPin, label: 'Parliaments', value: 6, suffix: '' },
    { icon: Building2, label: 'DUN Seats', value: 28, suffix: '' },
    { icon: Vote, label: 'Elections', value: 3, suffix: '' },
    { icon: Users, label: 'Verified Voters', value: 71415, suffix: '+', format: true },
    { icon: Layers3, label: 'GeoJSON Layers', value: 34, suffix: '' },
    { icon: Activity, label: 'S2D Phases', value: 9, suffix: '' },
    { icon: ShieldCheck, label: 'Gates Closed', value: 8, suffix: '/9' },
  ];

  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 text-center card-glow"
            >
              <m.icon className="w-5 h-5 text-mlk mx-auto mb-2" />
              <div className="text-2xl font-bold tabular">
                <AnimatedCounter from={0} to={m.value} />
                {m.suffix}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### 3.2.3 Marginal Seats Watchlist — Enhanced

Current watchlist has basic cards. Enhanced version:

```tsx
// Features to add to existing MarginalSeatsWatchlist:
// 1. Heatmap coloring — seats sorted by margin with color gradient
// 2. Animated vote-share bars that fill on scroll
// 3. "Flip Probability" indicator using Monte Carlo simulation visualization
// 4. Trending arrow — shows if margin is widening or narrowing
// 5. Click to open SelectedDunDrawer for deep dive
// 6. Filter: All / BN-held / PH-held / PN-held marginal seats
// 7. "Risk Score" badge (Critical / High / Medium / Low)
```

#### 3.2.4 Data Trust Section — Enterprise Transparency

Add a "Trust & Provenance" section between metrics and parliament cards:

```tsx
// src/components/landing/trust-section.tsx
function TrustSection() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="text-gradient-mlk">Enterprise Data Governance</span>
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1: PDPA Compliance */}
          <TrustCard
            icon={ShieldCheck}
            title="PDPA Akta 709 Compliant"
            description="Zero individual voter data shipped. All analytics are aggregate-level only."
            badge="Certified"
          />
          {/* Card 2: Data Provenance */}
          <TrustCard
            icon={Database}
            title="3-Source Verification"
            description="DOSM kawasanku GeoJSON + SPR voter rolls + ElectionData.MY API — cross-referenced."
            badge="Verified"
          />
          {/* Card 3: Open Source */}
          <TrustCard
            icon={Globe2}
            title="Fully Auditable"
            description="Complete build-time engine with open-source pipeline. Every transformation logged."
            badge="Public"
          />
        </div>
      </div>
    </section>
  );
}
```

#### 3.2.5 Footer — Enterprise SaaS Footer

Replace the current minimal footer with:

```tsx
// src/components/landing/site-footer.tsx
function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="PIP-MLK" className="w-8 h-8" />
              <span className="font-bold text-lg">PIP<span className="text-mlk">-MLK</span></span>
            </div>
            <p className="text-sm text-muted-foreground">
              Political Intelligence Platform for Melaka State.
            </p>
          </div>
          
          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-mlk transition-colors">Dashboard</a></li>
              <li><a href="#" className="hover:text-mlk transition-colors">API</a></li>
              <li><a href="#" className="hover:text-mlk transition-colors">Documentation</a></li>
            </ul>
          </div>
          
          {/* Data sources */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Data Sources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://www.data.gov.my" className="hover:text-mlk transition-colors">DOSM kawasanku</a></li>
              <li><a href="https://electiondata.my" className="hover:text-mlk transition-colors">ElectionData.MY</a></li>
              <li><a href="https://www.spr.gov.my" className="hover:text-mlk transition-colors">SPR</a></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-mlk transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-mlk transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-mlk transition-colors">Data Governance</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          <p>PIP-MLK v1.0.0 — Built with Next.js + Cloudflare Workers. Data sourced from DOSM kawasanku (2026 redelineation).</p>
        </div>
      </div>
    </footer>
  );
}
```

---

## 4. Dashboard & Navigation Enhancement

### 4.1 Current State

Dashboard has a horizontal tab bar at the top with 19 tabs. It uses a flat navigation model.

### 4.2 Enterprise Navigation — Vertical Sidebar

**What to change:** Replace the top tab bar with a collapsible vertical sidebar (like Retool / Supabase / Vercel).

```tsx
// src/components/dashboard/dashboard-shell.tsx
// New layout wrapper
function DashboardShell({ onExit, children }: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { activeTab, setActiveTab } = useDashboardStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex-shrink-0 border-r border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo area */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border/40">
          <img src="/logo.svg" alt="" className="w-8 h-8 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="font-bold text-sm">PIP<span className="text-mlk">-MLK</span></span>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto">
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-mlk">
          <SidebarGroup label="Maps" collapsed={sidebarCollapsed}>
            <SidebarItem icon={MapIcon} label="2D Map" tab="map-2d" />
            <SidebarItem icon={Box} label="3D Map" tab="map-3d" />
          </SidebarGroup>
          <SidebarGroup label="Analysis" collapsed={sidebarCollapsed}>
            <SidebarItem icon={LayoutDashboard} label="Overview" tab="overview" />
            <SidebarItem icon={Vote} label="Elections" tab="elections" />
            <SidebarItem icon={Users} label="Demographics" tab="demographics" />
            <SidebarItem icon={TrendingUp} label="DPT Analysis" tab="analysis" />
            <SidebarItem icon={ShieldAlert} label="Risk + Socio" tab="risk" />
            <SidebarItem icon={ArrowLeftRight} label="Compare" tab="compare" />
          </SidebarGroup>
          <SidebarGroup label="Intelligence" collapsed={sidebarCollapsed}>
            <SidebarItem icon={Activity} label="S2D Console" tab="s2d" />
            <SidebarItem icon={Brain} label="S2D 360" tab="s2d-360" />
            <SidebarItem icon={Radar} label="Scraper" tab="scraper" />
            <SidebarItem icon={MessageSquare} label="Public Comm" tab="public-comm" />
          </SidebarGroup>
          <SidebarGroup label="Planning" collapsed={sidebarCollapsed}>
            <SidebarItem icon={AlertTriangle} label="Incidents" tab="incidents" />
            <SidebarItem icon={Layers3} label="Scenarios" tab="scenarios" />
            <SidebarItem icon={Sparkle} label="Predictive" tab="predictive" />
          </SidebarGroup>
          <SidebarGroup label="Governance" collapsed={sidebarCollapsed}>
            <SidebarItem icon={FileText} label="Insights" tab="insights" />
            <SidebarItem icon={Bell} label="Alerts" tab="alerts" />
            <SidebarItem icon={ShieldCheck} label="Governance" tab="governance" />
          </SidebarGroup>
        </nav>
        
        {/* Bottom actions */}
        <div className="p-2 border-t border-border/40 space-y-1">
          <SidebarItem icon={ArrowLeft} label="Exit" onClick={onExit} />
          <ThemeToggle />
        </div>
      </aside>
      
      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-4 px-6 border-b border-border/40 bg-card/30 backdrop-blur-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            {/* Active tab icon + name */}
            <ActiveTabIcon />
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <AssistantToggle />
            <CommandPalette />
          </div>
        </header>
        
        {/* Tab content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
```

### 4.3 Tab Transition System

Add tab transition animations using Framer Motion's `AnimatePresence`:

```tsx
// In dashboard.tsx, wrap tab content:
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2, ease: 'easeInOut' }}
    className="tab-slide-in"
  >
    {/* Tab content */}
  </motion.div>
</AnimatePresence>
```

### 4.4 Quick-Action Toolbar

Add a floating quick-action toolbar above the content area for each tab:

```tsx
// src/components/dashboard/quick-actions.tsx
function QuickActions({ tab }: { tab: DashboardTab }) {
  const actions = QUICK_ACTIONS[tab] || [];
  
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {actions.map(action => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="glass text-xs gap-1.5"
          onClick={action.handler}
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </Button>
      ))}
      
      {/* Export dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="glass text-xs gap-1.5 ml-auto">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Export as CSV</DropdownMenuItem>
          <DropdownMenuItem>Export as PDF</DropdownMenuItem>
          <DropdownMenuItem>Export as PNG</DropdownMenuItem>
          <DropdownMenuItem>Share Link</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

---

## 5. 2D Map Tab Enhancement

### 5.1 Current State

- Leaflet map with SVG rendering (switched from Canvas)
- PRN15 choropleth coloring with tooltip
- DUN/parlimen polygon hover (amber border highlight)
- Scenario selector (PRN15 / GE14 / GE15)
- Leaflet.markercluster for heat points

### 5.2 Enterprise Map Features

#### 5.2.1 Layer Control Panel

Add a premium layer control (like Mapbox/Google Maps style picker):

```tsx
// src/components/tabs/map-2d-layer-control.tsx
function MapLayerControl() {
  const [baseMap, setBaseMap] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [overlays, setOverlays] = useState({
    dunBoundaries: true,
    parlBoundaries: true,
    heatmap: false,
    markers: false,
    labels: true,
  });

  return (
    <div className="glass rounded-xl p-4 shadow-lg min-w-[200px]">
      <h4 className="text-xs font-semibold uppercase tracking-wider mb-3">Base Map</h4>
      <div className="space-y-1 mb-4">
        {(['streets', 'satellite', 'dark'] as const).map(m => (
          <button
            key={m}
            onClick={() => setBaseMap(m)}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded-md text-xs transition-all",
              baseMap === m ? "bg-mlk/10 text-mlk font-medium" : "hover:bg-muted/60"
            )}
          >
            {m === 'streets' ? '🗺️ Streets' : m === 'satellite' ? '🛰️ Satellite' : '🌙 Dark'}
          </button>
        ))}
      </div>
      
      <h4 className="text-xs font-semibold uppercase tracking-wider mb-3">Overlays</h4>
      <div className="space-y-2">
        {Object.entries(overlays).map(([key, val]) => (
          <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={val}
              onCheckedChange={(v) => setOverlays(prev => ({ ...prev, [key]: !!v }))}
            />
            {key === 'dunBoundaries' ? 'DUN Boundaries' :
             key === 'parlBoundaries' ? 'Parliament Boundaries' :
             key === 'heatmap' ? 'Voter Heatmap' :
             key === 'markers' ? 'POI Markers' : 'Labels'}
          </label>
        ))}
      </div>
    </div>
  );
}
```

#### 5.2.2 Enhanced Tooltip

Current tooltip is basic HTML. Upgrade to a rich interactive tooltip:

```tsx
// The mlk-map-tooltip class should render:
function EnhancedMapTooltip({ dun }: { dun: DunData }) {
  return (
    <div className="min-w-[220px]">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px]">{dun.code}</Badge>
        <span className="font-semibold text-sm">{dun.name}</span>
      </div>
      
      {/* Winner info */}
      <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-muted/50">
        <PartyLogo party={dun.winner.party} size={20} />
        <div>
          <div className="text-xs font-medium">{dun.winner.candidate}</div>
          <div className="text-[10px] text-muted-foreground">
            {dun.winner.party} · {dun.winner.votesPct.toFixed(1)}%
          </div>
        </div>
      </div>
      
      {/* Vote share bar */}
      <div className="space-y-1 mb-2">
        {dun.voteShares.map(vs => (
          <div key={vs.party} className="flex items-center gap-2 text-[10px]">
            <span className="w-6 font-medium">{vs.coalition}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${vs.pct}%`, backgroundColor: PARTY_COLORS[vs.coalition] }}
              />
            </div>
            <span className="w-10 text-right tabular">{vs.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      
      {/* Margin indicator */}
      <div className="flex items-center gap-1 text-[10px]">
        <span className={cn(
          "font-medium",
          dun.marginPct < 5 ? "text-red-500" : dun.marginPct < 15 ? "text-amber-500" : "text-green-500"
        )}>
          Margin: {dun.marginPct.toFixed(1)}pp
        </span>
        {dun.isMarginal && <Badge variant="destructive" className="text-[8px] px-1">Marginal</Badge>}
      </div>
    </div>
  );
}
```

#### 5.2.3 Map Legend

```tsx
// src/components/tabs/map-2d-legend.tsx
function MapLegend({ scenario }: { scenario: string }) {
  const coalitions = [
    { label: 'BN', color: PARTY_COLORS.BN },
    { label: 'PH', color: PARTY_COLORS.PH },
    { label: 'PN', color: PARTY_COLORS.PN },
    { label: 'No Data', color: '#6B7280', pattern: true },
  ];

  return (
    <div className="glass rounded-lg p-3 text-xs shadow-lg">
      <h4 className="font-semibold mb-2">{scenario} — Winner</h4>
      <div className="space-y-1">
        {coalitions.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded",
                c.pattern ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#6B7280_2px,#6B7280_4px)]" : ""
              )}
              style={c.pattern ? {} : { backgroundColor: c.color }}
            />
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 5.2.4 Map Statistics Dashboard

Overlay a stats panel on the map showing key figures:

```tsx
// Floating panel at top of 2D map
function MapStatsOverlay() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="glass rounded-full px-6 py-2 flex items-center gap-6 text-xs shadow-lg">
        <span>🏛️ 6 Parliaments</span>
        <span className="w-px h-4 bg-border/40" />
        <span>📍 28 DUN</span>
        <span className="w-px h-4 bg-border/40" />
        <span>👥 71,415 Voters (P134)</span>
        <span className="w-px h-4 bg-border/40" />
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-mlk" />
          {scenario}
        </span>
      </div>
    </div>
  );
}
```

#### 5.2.5 Search & Geocode

Add search input at top-right of map to search DUN/parliament by name:

```tsx
// src/components/tabs/map-search.tsx
function MapSearch({ onSelect }: { onSelect: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => 
    ALL_DUNS.filter(d => 
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.code.toLowerCase().includes(query.toLowerCase())
    ),
    [query]
  );

  return (
    <Command shouldFilter={false} className="rounded-lg border shadow-lg w-[280px]">
      <CommandInput
        placeholder="Search DUN or Parliament..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {results.slice(0, 8).map(dun => (
          <CommandItem key={dun.code} onSelect={() => onSelect(dun.code)}>
            <MapPin className="w-4 h-4 mr-2 text-mlk" />
            <span className="font-medium">{dun.code}</span>
            <span className="ml-2 text-muted-foreground">{dun.name}</span>
            <Badge variant="outline" className="ml-auto text-[10px]">{dun.district}</Badge>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
```

---

## 6. 3D Map Tab Enhancement

### 6.1 Current State

- Three.js 3D extrusion of DUN/parliament boundaries
- Camera at fixed radius 70
- Basic color-coded extruded polygons
- Layer toggle (DUN / Parliament)

### 6.2 Enterprise 3D Map Features

#### 6.2.1 Orbital Camera Controls

```tsx
// Enhanced Three.js orbit controls with presets:
function CameraPresets({ camera, controls }: { camera: THREE.Camera; controls: OrbitControls }) {
  const presets = [
    { label: 'Top-Down', position: [0, 70, 0.1] },
    { label: 'Isometric', position: [40, 40, 40] },
    { label: 'Street View', position: [0, 5, 60] },
    { label: 'Overview', position: [0, 50, 50] },
  ];

  return (
    <div className="glass rounded-lg p-2 flex gap-1">
      {presets.map(p => (
        <button
          key={p.label}
          className="px-3 py-1 text-xs rounded-md hover:bg-mlk/10 transition-colors"
          onClick={() => {
            gsap.to(camera.position, {
              x: p.position[0], y: p.position[1], z: p.position[2],
              duration: 1, ease: 'power2.inOut',
              onUpdate: () => controls.update()
            });
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

#### 6.2.2 Extrusion Height by Data Value

Instead of uniform extrusion height, vary height by demographic metric:

```tsx
// In map-3d-tab.tsx, the extrusion heights:
const heightScale = (value: number, max: number) => {
  // Scale voter count or population to extrusion height
  const MIN_HEIGHT = 0.5;
  const MAX_HEIGHT = 15;
  return MIN_HEIGHT + (value / max) * (MAX_HEIGHT - MIN_HEIGHT);
};

// Each DUN polygon gets height based on:
// - Total voters (selected metric)
// - Senior dependency ratio
// - Voter density per km²
// - Swing margin

// Color-coded by selected metric with animated transitions
```

#### 6.2.3 3D Data Tooltips

Rich HTML tooltips that follow the mouse in 3D space:

```tsx
// Using CSS2DRenderer for tooltips
function TooltipOverlay({ dun, screenPos }: { dun: DunData; screenPos: { x: number; y: number } }) {
  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: screenPos.x + 12, top: screenPos.y - 12 }}
    >
      <div className="glass rounded-xl p-3 shadow-2xl min-w-[180px]">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{dun.code}</Badge>
          <span className="font-semibold text-sm">{dun.name}</span>
        </div>
        
        {/* Data row for current metric */}
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voters</span>
            <span className="tabular font-medium">{dun.voters.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Senior %</span>
            <span className="tabular font-medium">{dun.seniorPct.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin</span>
            <span className={cn("tabular font-medium", dun.marginPct < 5 ? "text-red-400" : "")}>
              {dun.marginPct.toFixed(1)}pp
            </span>
          </div>
        </div>
        
        {/* Mini sparkline */}
        <div className="mt-2 h-6">
          <Sparkline data={dun.trend} color="#C77B2C" />
        </div>
      </div>
    </div>
  );
}
```

#### 6.2.4 Time Animation Slider

Animate through election years with smooth transitions:

```tsx
function TimeSlider({ onYearChange }: { onYearChange: (year: string) => void }) {
  const years = ['GE14 (2018)', 'PRN15 (2021)', 'GE15 (2022)', 'Projected PRN16'];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => {
        if (prev >= years.length - 1) { setPlaying(false); return prev; }
        onYearChange(years[prev + 1]);
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [playing, onYearChange, years.length]);

  return (
    <div className="glass rounded-xl p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider">Timeline Animation</h4>
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>
      
      <Slider
        value={[currentIdx]}
        onValueChange={([v]) => { setCurrentIdx(v); onYearChange(years[v]); }}
        max={years.length - 1}
        step={1}
      />
      
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {years.map((y, i) => (
          <span key={y} className={cn(i === currentIdx ? "text-mlk font-medium" : "")}>
            {y.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
```

#### 6.2.5 3D Effects

- **Bloom post-processing**: Subtle glow on selected/hovered DUN
- **Atmospheric fog**: Distance-based fog for depth perception
- **Ground plane**: Reflective/translucent ground with grid lines
- **Labels**: SDF text labels floating above each DUN
- **Terrain**: Subtle terrain elevation beneath the map (if available)

---

## 7. All Module Tab Enhancements

### 7.1 Overview Tab

**Current**: Honesty banner, 5 KPI cards, elections summary, DPT churn, 6 parliament cards.

**Enhancements:**
1. **Grid/List toggle** for parliament cards
2. **Expanded KPI cards** with mini sparklines (30-day trend)
3. **"At a Glance"** row: 3 key numbers in large font with trend arrows
4. **Quick action shortcuts**: "View Marginal Seats", "View All DUN", "Run Analysis"
5. **Widget-based layout** — user can reorder widgets (drag-and-drop via @dnd-kit)

### 7.2 Elections Tab

**Current**: 3 sub-tabs (GE14/PRN15/GE15), seat counts, bar chart, results table.

**Enhancements:**
1. **Sankey diagram** showing seat flow between elections (GE14 → PRN15 → GE15)
2. **Swingometer** — interactive visualization showing vote swing percentage
3. **Coalition comparison grid** — side-by-side comparison of all 3 elections
4. **Download election data** as CSV
5. **Annotate mode** — allow adding notes to specific election results

### 7.3 Demographics Tab

**Current**: Gender split chart, senior dep chart, per-DUN demographics table.

**Enhancements:**
1. **Age pyramid** — population pyramid visualization for each DUN
2. **Heatmap grid** — demographic intensity across all 28 DUN
3. **Radar chart** — multi-dimensional comparison (age, gender, ethnicity, income)
4. **Education/occupation** breakdown (if data available)
5. **Demographic projection** — 5-year forward projection using cohort component method

### 7.4 Analysis (DPT) Tab

**Current**: DPT trend line chart, KPI row, per-parliament breakdown.

**Enhancements:**
1. **Forecast extension** — extend trend line with 95% confidence interval shading
2. **Break-even analysis** — what-if slider for voter turnout scenarios
3. **Heat calendar** — DPT changes visualized as a calendar heatmap
4. **Anomaly detection** — highlight unusual DPT spikes/drops
5. **Export analysis report** as PDF

### 7.5 Risk + Socioeconomic Tab

**Current**: Risk KPI summary, charts, per-DUN risk signals table, DOSM economic panel.

**Enhancements:**
1. **Risk matrix** — 5×5 probability×impact matrix for each DUN
2. **Geospatial risk overlay** — risk scores shown on 2D/3D map
3. **Composite risk index** — weighted score combining all risk factors
4. **Economic vulnerability index** — percentile ranking
5. **What-if simulator** — adjust economic variables and see impact on voter behavior

### 7.6 Compare Tab

**Current**: Two-select dropdowns, side-by-side stats, share buttons.

**Enhancements:**
1. **Add third comparison slot** (Compare up to 3 parliaments/DUNs)
2. **Difference indicators** — highlight cells where values differ significantly
3. **Radar overlay** — superimpose radar charts for direct visual comparison
4. **Auto-highlight** — best/worst values in each metric
5. **Save comparison** — persist to localStorage for later reference

### 7.7 S2D Console Tab

**Current**: S2D action console with signal lifecycle, 5 analytical levels.

**Enhancements:**
1. **Real-time signal feed** — WebSocket connection for live signals
2. **Kanban board view** — drag signals between lifecycle stages
3. **Signal timeline** — Gantt-chart style signal history
4. **Signal clustering** — auto-group related signals
5. **Executive dashboard** — summary of all active signals with severity heatmap

### 7.8 S2D 360 Tab

**Current**: Iframe embed of 56-page S2D engine.

**Enhancements:**
1. **Deep link navigation** — pass tab params to iframe for direct section access
2. **Responsive iframe** — better scaling on different viewport sizes
3. **Loading progress** — show actual load progress instead of spinning
4. **Cross-module communication** — selected DUN from map passes context to S2D 360
5. **Quick action buttons** — floating toolbar for common S2D actions

### 7.9 Scraper Tab

**Current**: 5 platform cards, collection runs, signal feed.

**Enhancements:**
1. **Scheduled scraping** — cron-based auto-collection
2. **Keyword management UI** — add/remove/edit Melaka keywords
3. **Sentiment trend chart** — daily sentiment over time
4. **Source credibility scoring** — rank platforms by signal quality
5. **Export scraped data** — JSON/CSV download with filtering

### 7.10 Public Communication Tab

**Enhancements:**
1. **Message composer** — rich text editor for drafting communications
2. **Template library** — reusable message templates
3. **Audience segmentation** — filter by DUN, demographic, risk profile
4. **Delivery tracking** — monitor message delivery and engagement
5. **A/B testing** — test different message variants

### 7.11 Incidents Tab

**Enhancements:**
1. **Incident timeline** — chronological incident view with Gantt overlay
2. **Severity matrix** — categorize by type/severity/location
3. **Response playbook** — predefined response templates
4. **Incident heatmap** — geographic incident distribution
5. **Post-mortem report** — auto-generated after incident resolution

### 7.12 Scenarios Tab

**Enhancements:**
1. **Scenario comparison** — run and compare multiple scenarios side-by-side
2. **Parameter sliders** — interactive what-if controls
3. **Monte Carlo simulation** — probabilistic outcome forecasting
4. **Scenario save/load** — persist scenario configurations
5. **Export scenario report** — PDF summary

### 7.13 Predictive Tab

**Enhancements:**
1. **Prediction dashboard** — overview of all active predictions with confidence scores
2. **Model performance** — historical accuracy tracking
3. **Feature importance** — what factors drive predictions
4. **Ensemble view** — multiple model predictions compared
5. **Prediction calibration** — reliability diagram

### 7.14 Insights Tab

**Enhancements:**
1. **NLP-powered insight generation** — auto-summarize data changes
2. **Insight feed** — chronological insight stream with filtering
3. **Shareable insight cards** — generate shareable images
4. **Insight clustering** — group related insights
5. **Weekly digest** — automated weekly summary report

### 7.15 Alerts Tab

**Enhancements:**
1. **Alert rules engine** — configurable threshold-based alerting
2. **Alert channels** — email/SMS/Webhook/In-app notifications
3. **Alert history** — searchable alert archive
4. **Alert routing** — assign alerts to team members
5. **Alert analytics** — mean time to acknowledge/resolve

### 7.16 Dual-Layer Tab

**Enhancements:**
1. **Split-view comparison** — side-by-side maps with different layers
2. **Layer blending** — opacity slider between two layers
3. **Correlation analysis** — statistical correlation between layers
4. **Difference map** — highlight areas of significant change
5. **Animation** — flicker between two layers to spot changes

### 7.17 Governance Tab

**Current**: 9-gate provenance panel, honest gaps register, PDPA compliance.

**Enhancements:**
1. **Data lineage graph** — visual DAG showing data flow from source to display
2. **Compliance dashboard** — PDPA/GDPR compliance status at a glance
3. **Audit trail** — chronological log of all data transformations
4. **Policy editor** — configure data governance policies
5. **Certification badges** — display compliance certifications

---

## 8. Global Design System Upgrade

### 8.1 Typography Enhancement

```css
/* Add to globals.css */

/* Font scale */
:root {
  --font-scale-xs: 0.75rem;   /* 12px */
  --font-scale-sm: 0.875rem;  /* 14px */
  --font-scale-base: 1rem;    /* 16px */
  --font-scale-lg: 1.125rem;  /* 18px */
  --font-scale-xl: 1.25rem;   /* 20px */
  --font-scale-2xl: 1.5rem;   /* 24px */
  --font-scale-3xl: 1.875rem; /* 30px */
  --font-scale-4xl: 2.25rem;  /* 36px */
  --font-scale-5xl: 3rem;     /* 48px */
  --font-scale-6xl: 3.75rem;  /* 60px */
}

/* Premium heading treatment */
h1, h2, h3 {
  letter-spacing: -0.02em;
}

/* Data-dense tables */
.data-table {
  font-size: 0.8125rem; /* 13px — shadcn default but slightly smaller for density */
  line-height: 1.4;
}
```

### 8.2 Color System Enhancement

```css
/* Add to tailwind.config.ts theme.extend.colors */

mlk: {
  50: '#FEF7EE',
  100: '#FDEBD4',
  200: '#FBD4A8',
  300: '#F8B773',
  400: '#F4923E',
  500: '#E97C1A',
  600: '#C77B2C',  /* Primary */
  700: '#A55A1F',
  800: '#844816',
  900: '#6C3B12',
  950: '#3B1D08',
},

/* Semantic colors */
success: '#10B981',
warning: '#F59E0B',
danger: '#EF4444',
info: '#3B82F6',

/* Surface colors for glass effects */
glass: 'rgba(255, 255, 255, 0.55)',
'glass-border': 'rgba(199, 123, 44, 0.18)',
'glass-dark': 'rgba(20, 20, 22, 0.55)',
'glass-border-dark': 'rgba(232, 155, 69, 0.22)',
```

### 8.3 Component System — shadcn/ui Customization

Create a component theme file:

```tsx
// src/lib/component-theme.ts
export const componentTheme = {
  // Card variants
  card: {
    default: 'bg-card border border-border/40 rounded-xl shadow-sm',
    glass: 'glass rounded-xl',
    premium: 'card-mlk-pro rounded-xl bg-card',
    interactive: 'card-mlk-pro rounded-xl bg-card cursor-pointer',
  },
  
  // Button variants
  button: {
    primary: 'bg-mlk text-white hover:bg-mlk/90 shadow-sm hover:shadow-md',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-muted/60 hover:text-foreground',
    outline: 'border border-border/60 hover:bg-muted/40 hover:border-mlk/30',
    mlk: 'bg-gradient-to-r from-mlk to-mlk-amber-dark text-white shadow-sm',
  },
  
  // Badge variants
  badge: {
    default: 'bg-mlk/10 text-mlk border-mlk/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
};
```

### 8.4 Responsive Breakpoints

```tsx
// src/hooks/use-responsive.ts
export function useResponsive() {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    isWide: width >= 1536,
    sidebarCollapsible: width < 1280,
  };
}

// Use in dashboard-shell:
// - Mobile: Bottom tab bar instead of sidebar
// - Tablet: Collapsed sidebar + top breadcrumb
// - Desktop: Full sidebar
// - Wide: Full sidebar + extra panel
```

### 8.5 Empty States & Error Boundaries

Create enterprise-grade empty/error states:

```tsx
// src/components/shared/empty-state.tsx
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-mlk/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-mlk" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{description}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
```

---

## 9. Motion & Animation System

### 9.1 Framer Motion Configuration

```tsx
// src/lib/motion-variants.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Page transition
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
```

### 9.2 Micro-interaction Library

```tsx
// src/hooks/use-hover-3d.ts — 3D tilt effect on hover
export function useHover3D(ref: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      
      el.style.transform = `
        perspective(1000px) 
        rotateY(${x * 10}deg) 
        rotateX(${-y * 10}deg)
      `;
    };
    
    const handleMouseLeave = () => {
      el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
      el.style.transition = 'transform 0.5s ease';
    };
    
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref]);
}
```

### 9.3 Loading Sequences

```tsx
// src/components/shared/loading-sequence.tsx
// Progressive loading — show skeleton then fade in real content
function LoadingSequence({ children, isLoading }: { children: React.ReactNode; isLoading: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div key="skeleton" {...fadeIn} className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </motion.div>
      ) : (
        <motion.div key="content" {...fadeInUp}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 10. Performance Optimization

### 10.1 Bundle Splitting

Already using `next/dynamic` with `ssr: false` for Leaflet/Three.js. Enhancements:

```tsx
// Group related tabs for preloading
const MAP_TABS = ['map-2d', 'map-3d', 'dual-layer'];
const ANALYSIS_TABS = ['overview', 'elections', 'demographics', 'analysis', 'risk', 'compare'];

// Preload adjacent tabs
useEffect(() => {
  const currentIdx = TABS.findIndex(t => t.id === activeTab);
  // Preload next and previous tab
  if (currentIdx > 0) preloadTab(TABS[currentIdx - 1].id);
  if (currentIdx < TABS.length - 1) preloadTab(TABS[currentIdx + 1].id);
}, [activeTab]);
```

### 10.2 Data Fetching Optimization

```tsx
// Use React Query for all data fetching with:
// - Stale-while-revalidate caching
// - Background refetch on window focus
// - Optimistic updates for user actions
// - Pagination for large datasets

// src/hooks/use-parliament-data.ts
export function useParliamentData(code: string) {
  return useQuery({
    queryKey: ['parliament', code],
    queryFn: () => fetch(`/api/parliament/${code}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes cache
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
```

### 10.3 Virtual Scrolling

For large tables (DPT analysis, demographics):

```tsx
// Install @tanstack/react-virtual
// Use for the 28 DUN tables and signal feeds
```

### 10.4 Map Performance

```tsx
// For 2D Map:
// - Use tile caching (Leaflet tileLayer option)
// - Simplify GeoJSON at lower zoom levels
// - Canvas renderer for heatmap (already SVG for interactivity)

// For 3D Map:
// - LOD (Level of Detail) — simplify geometry at distance
// - InstancedMesh for repeated geometry
// - Frustum culling
// - Limit FPS to 30 when not interacting
```

---

## 11. Recommended Additional Enhancements

### 11.1 Authentication & Multi-tenant

```tsx
// src/lib/auth/ — NextAuth.js v4 setup
// Providers: Email magic link, Google OAuth, GitHub OAuth
// Roles: admin, analyst, viewer
// Tenant: state-level (Melaka), future expansion to other states
```

### 11.2 Real-time Collaboration

```tsx
// WebSocket for:
// - Live signal feed (S2D Console)
// - Multi-user annotations
// - Collaborative scenario building
// - Real-time alert notifications
```

### 11.3 API Gateway

```tsx
// src/app/api/ — RESTful API for:
// - Programmatic access to all data
// - Webhook subscriptions for alerts
// - Rate limiting & API keys
// - Swagger/OpenAPI documentation
```

### 11.4 Mobile App (PWA)

```tsx
// next.config.ts: PWA configuration
// - Service worker for offline access
// - Push notifications
// - Home screen install
// - Responsive mobile layout
```

### 11.5 i18n / Multi-language

```tsx
// next-intl already installed
// Add: English (default), Bahasa Malaysia, Mandarin, Tamil
// Political terms glossary in all 4 languages
```

### 11.6 Data Export Center

```tsx
// Centralized export hub:
// - PDF report generation (customizable templates)
// - CSV/Excel bulk data export
// - PNG/SVG chart export
// - Scheduled email reports
// - Embeddable iframe/widgets
```

### 11.7 Audit Trail & Logging

```tsx
// src/lib/audit-log.ts
// - Every user action logged
// - Data access audit
// - Export audit
// - Config change audit
// - Admin review panel
```

### 11.8 Onboarding Tour

```tsx
// src/components/shared/onboarding-tour.tsx
// Step-by-step guided tour for new users:
// 1. Welcome to PIP-MLK
// 2. Exploring the map
// 3. Understanding the data
// 4. Using S2D Intelligence
// 5. Exporting reports
```

### 11.9 Dark Mode Refinement

```css
/* Current dark mode is good but enhance: */
/* - More nuanced shadow depths */
/* - Slightly warmer dark tones (not pure black) */
/* - Reduced contrast for readability */
/* - Smooth theme transition (300ms) */
```

### 11.10 Testing Infrastructure

```tsx
// - Vitest for unit tests
// - Playwright for E2E tests
// - Storybook for component development
// - Lighthouse CI for performance budgets
// - GitHub Actions for CI/CD
```

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Refactor landing page with cinematic hero
- [ ] Implement vertical sidebar navigation
- [ ] Add tab transition animations
- [ ] Create component theme system
- [ ] Add skeleton loading states

### Phase 2: Maps (Week 3-4)
- [ ] Enhance 2D map with layer controls
- [ ] Add rich interactive tooltips
- [ ] Implement 3D map orbital controls
- [ ] Add time animation slider to 3D map
- [ ] Implement map search/geocode

### Phase 3: Tabs (Week 5-6)
- [ ] Enhance all 19 tabs with enterprise features
- [ ] Add quick-action toolbars
- [ ] Implement drag-and-drop widgets
- [ ] Add export/download functionality
- [ ] Implement virtual scrolling for tables

### Phase 4: Intelligence (Week 7-8)
- [ ] Real-time S2D signal feed via WebSocket
- [ ] AI-powered insight generation
- [ ] Predictive model dashboard
- [ ] Scenario simulation engine
- [ ] Alert rules configuration

### Phase 5: Enterprise (Week 9-10)
- [ ] Authentication & authorization
- [ ] Multi-tenant architecture
- [ ] API gateway & documentation
- [ ] Audit trail system
- [ ] PWA / mobile support

### Phase 6: Polish (Week 11-12)
- [ ] Onboarding tour
- [ ] i18n / multi-language
- [ ] Performance optimization
- [ ] Testing infrastructure
- [ ] Documentation & deployment guide

---

## Appendix A: Key Code Snippets

### A.1 Enhanced `globals.css` Additions

```css
/* Add to existing globals.css */

/* === R10: Enterprise SaaS Premium Additions === */

/* Card stack effect — multiple cards with z-index stacking */
.card-stack {
  position: relative;
}
.card-stack > * + * {
  margin-top: -4px;
}
.card-stack > *:not(:first-child) {
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
}

/* Data badge — compact, informative */
.data-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.4;
  background: rgba(199, 123, 44, 0.08);
  color: #C77B2C;
  border: 1px solid rgba(199, 123, 44, 0.15);
}

/* KPI card — data-dense metric display */
.kpi-card {
  padding: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s ease;
}
.kpi-card:hover {
  border-color: rgba(199, 123, 44, 0.3);
  box-shadow: 0 4px 20px rgba(199, 123, 44, 0.08);
}

/* Divider with label */
.divider-label {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.divider-label::before,
.divider-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* Metric comparison — side by side with delta */
.metric-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}

/* Animated value */
.animated-value {
  font-variant-numeric: tabular-nums;
  transition: all 0.3s ease;
}
```

### A.2 Enhanced `tailwind.config.ts`

```typescript
// Add to tailwind.config.ts theme.extend

fontFamily: {
  display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'monospace'],
},

animation: {
  'spin-slow': 'spin 3s linear infinite',
  'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'bounce-gentle': 'bounce 2s infinite',
  'shimmer': 'shimmer-sweep 3s linear infinite',
  'slide-up': 'slide-up 0.3s ease-out',
  'slide-down': 'slide-down 0.3s ease-out',
  'scale-in': 'scale-in 0.2s ease-out',
  'fade-in': 'fade-in 0.3s ease-out',
  'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
},

keyframes: {
  'slide-down': {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  'scale-in': {
    '0%': { transform: 'scale(0.95)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
},

backgroundImage: {
  'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  'grid-pattern': 'radial-gradient(circle, rgba(199, 123, 44, 0.08) 1px, transparent 1px)',
},
```

### A.3 Premium Card Wrapper

```tsx
// src/components/shared/premium-card.tsx
interface PremiumCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

function PremiumCard({ children, variant = 'default', hover = true, onClick, className }: PremiumCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl transition-all duration-200',
        variant === 'default' && 'bg-card border border-border/40 shadow-sm',
        variant === 'glass' && 'glass',
        variant === 'gradient' && 'bg-gradient-to-br from-card to-mlk/5 border border-mlk/10',
        hover && 'cursor-pointer hover:shadow-lg hover:border-mlk/20',
        onClick && 'cursor-pointer',
        'card-glow',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
```

### A.4 Data Table Enhancement

```tsx
// src/components/shared/data-table.tsx
// Enhanced table with:
// - Sortable columns
// - Filterable rows
// - Pagination
// - Row selection
// - Export
// - Column visibility toggle
// - Density toggle (compact/comfortable)

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  pagination?: boolean;
  pageSize?: number;
  density?: 'compact' | 'comfortable';
  onRowClick?: (row: TData) => void;
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKey = 'name',
  pagination = true,
  pageSize = 10,
  density = 'comfortable',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  // Implementation using @tanstack/react-table
  // with shadcn/ui styling
}
```

---

## Appendix B: Design Inspiration References

| Product | Takeaway for PIP-MLK |
|---------|----------------------|
| **Palantir Gotham** | Data density, geospatial integration, intelligence workflow |
| **Tableau** | Chart interactivity, visual analytics, dashboard composition |
| **Vercel** | Clean typography, micro-interactions, loading states |
| **Stripe** | Polished form design, status badges, data tables |
| **Linear** | Keyboard shortcuts, command palette, dark mode |
| **Retool** | Enterprise sidebar, component library, role-based UI |
| **Datadog** | Time-series visualization, alert management, KPI strips |
| **Figma** | Collapsible panels, design tokens, real-time collaboration |

---

## Appendix C: Package Additions

```json
{
  "dependencies": {
    "@tanstack/react-virtual": "^3.x",
    "d3-scale": "^4.x",
    "d3-shape": "^3.x",
    "gsap": "^3.x",
    "pdf-lib": "^1.x",
    "html2canvas": "^1.x",
    "re-resizable": "^6.x"
  },
  "devDependencies": {
    "vitest": "^3.x",
    "@playwright/test": "^1.x",
    "@storybook/react": "^8.x",
    "chromatic": "^11.x",
    "lighthouse": "^12.x"
  }
}
```

---

> **End of Document** — This guide provides a comprehensive roadmap for elevating PIP-MLK from a functional dashboard to an enterprise-grade SaaS political intelligence platform. Each section includes specific, implementable code patterns and architectural decisions.
