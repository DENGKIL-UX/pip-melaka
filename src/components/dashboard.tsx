"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, LayoutDashboard, Users, Activity, Search, Download, Menu } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useS2DStore } from "@/stores/s2d-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { findTab } from "@/lib/dashboard-nav";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { TOTAL_VOTERS_P134, TOTAL_DUN } from "@/lib/melaka-constants";
import { buildBrief, type BriefSnapshot } from "@/lib/export-brief";
import { OverviewTab } from "@/components/tabs/overview-tab";
import { ElectionsTab } from "@/components/tabs/elections-tab";
import { DemographicsTab } from "@/components/tabs/demographics-tab";
import { AnalysisTab } from "@/components/tabs/analysis-tab";
import { RiskSocioeconomicTab } from "@/components/tabs/risk-socioeconomic-tab";
import { CompareTab } from "@/components/tabs/compare-tab";
import { GovernanceTab } from "@/components/tabs/governance-tab";
import { AssistantPanel } from "@/components/shared/assistant-panel";
import { SelectedDunDrawer } from "@/components/shared/selected-dun-drawer";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle, useI18n, fmtNum } from "@/lib/i18n";
import { useS2DAlerts } from "@/hooks/use-s2d-alerts";
import { CommandPalette } from "@/components/shared/command-palette";
import { ShortcutCheatSheet } from "@/components/shared/shortcut-cheat-sheet";
import { BriefPreviewDialog } from "@/components/shared/brief-preview-dialog";

/**
 * §11.5: i18n-aware loading fallback for lazy-loaded tab chunks.
 * Renders a centered spinner + translated "Loading X…" message.
 */
function TabLoading({ messageKey, fallback }: { messageKey: string; fallback: string }) {
  const { t } = useI18n();
  return (
    <div className="h-[450px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-mlk border-t-transparent" aria-hidden="true" />
      <span className="text-sm">{t(messageKey, fallback)}</span>
    </div>
  );
}

/**
 * Retry wrapper for next/dynamic — retries the chunk load up to 5 times with
 * a 2s delay between attempts. This handles transient ChunkLoadError when the
 * Turbopack dev server briefly OOMs during on-demand chunk compilation.
 */
function withRetry<T>(importFn: () => Promise<T>, retries = 5): Promise<T> {
  return importFn().catch((err) => {
    if (retries > 0) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(withRetry(importFn, retries - 1)), 2000);
      });
    }
    throw err;
  });
}

// Lazy-load map components (Leaflet + Three.js are heavy — ssr: false because
// they reference window during module evaluation). ALL dynamic imports use
// withRetry to handle transient ChunkLoadError (dev server OOM during compilation).
const Map2DTab = dynamic(() => withRetry(() => import("@/components/tabs/map-2d-tab").then((m) => ({ default: m.Map2DTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.map2d" fallback="Loading 2D map…" /> });
const Map3DTab = dynamic(() => withRetry(() => import("@/components/tabs/map-3d-tab").then((m) => ({ default: m.Map3DTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.map3d" fallback="Loading 3D map…" /> });
const S2DConsoleTab = dynamic(() => withRetry(() => import("@/components/tabs/s2d-console-tab").then((m) => ({ default: m.S2DConsoleTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.s2dConsole" fallback="Loading S2D console…" /> });
const S2D360Tab = dynamic(() => withRetry(() => import("@/components/tabs/s2d-360-tab").then((m) => ({ default: m.S2D360Tab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.s2d360" fallback="Loading S2D 360…" /> });
const S2DModernTab = dynamic(() => withRetry(() => import("@/components/tabs/s2d-modern-tab").then((m) => ({ default: m.S2DModernTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.s2d360" fallback="Loading S2D 360 Modern…" /> });
const PublicCommunicationTab = dynamic(() => withRetry(() => import("@/components/tabs/public-communication-tab").then((m) => ({ default: m.PublicCommunicationTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.publicComm" fallback="Loading Public Comm…" /> });
const IncidentCasebookTab = dynamic(() => withRetry(() => import("@/components/tabs/incident-casebook-tab").then((m) => ({ default: m.IncidentCasebookTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.incidents" fallback="Loading Incidents…" /> });
const ScenarioTab = dynamic(() => withRetry(() => import("@/components/tabs/scenario-tab").then((m) => ({ default: m.ScenarioTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.scenarios" fallback="Loading Scenarios…" /> });
const PredictiveTab = dynamic(() => withRetry(() => import("@/components/tabs/predictive-tab").then((m) => ({ default: m.PredictiveTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.predictive" fallback="Loading Predictive…" /> });
const InsightReportsTab = dynamic(() => withRetry(() => import("@/components/tabs/insight-reports-tab").then((m) => ({ default: m.InsightReportsTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.insights" fallback="Loading Insights…" /> });
const AlertsTab = dynamic(() => withRetry(() => import("@/components/tabs/alerts-tab").then((m) => ({ default: m.AlertsTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.alerts" fallback="Loading Alerts…" /> });
const DualLayerTab = dynamic(() => withRetry(() => import("@/components/tabs/dual-layer-tab").then((m) => ({ default: m.DualLayerTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.dualLayer" fallback="Loading Dual-Layer…" /> });
const ScraperTab = dynamic(() => withRetry(() => import("@/components/tabs/scraper-tab").then((m) => ({ default: m.ScraperTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.scraper" fallback="Loading Scraper…" /> });

/**
 * FreshnessIndicator — shows "Updated Xh ago" relative to the build time
 * embedded by next.config.ts (NEXT_PUBLIC_BUILD_TIME). Client-only render
 * (Dashboard only mounts after the page-level `mounted` guard), so no SSR
 * hydration mismatch.
 */
function FreshnessIndicator() {
  const bt = process.env.NEXT_PUBLIC_BUILD_TIME;
  if (!bt) return null;
  const builtAt = new Date(bt).getTime();
  if (Number.isNaN(builtAt)) return null;
  const mins = Math.max(0, Math.floor((Date.now() - builtAt) / 60000));
  let label: string;
  if (mins < 1) label = "just now";
  else if (mins < 60) label = `${mins}m ago`;
  else if (mins < 1440) label = `${Math.floor(mins / 60)}h ago`;
  else label = `${Math.floor(mins / 1440)}d ago`;
  return (
    <span className="inline-flex items-center gap-1" title={new Date(builtAt).toLocaleString()}>
      <span className="live-dot-mlk" aria-hidden="true" />
      Updated {label}
    </span>
  );
}

export function Dashboard({ onExit }: { onExit: () => void }) {
  const { activeTab, setActiveTab } = useDashboardStore();
  const { t, locale } = useI18n();
  const signalsCount = useS2DStore((s) => s.signals.filter(sig => sig.status !== "resolved").length);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const seedIfEmpty = useS2DStore((s) => s.seedIfEmpty);
  const [briefOpen, setBriefOpen] = useState(false);
  const [brief, setBrief] = useState<BriefSnapshot | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // P3.3 — real-time critical-signal alerts (toast when a new critical S2D
  // signal appears). Gracefully no-ops when WebSocket is unavailable.
  useS2DAlerts();

  const openBrief = () => {
    setBrief(buildBrief({
      activeTab: activeTab,
      totalVoters: TOTAL_VOTERS_P134,
      dunCount: TOTAL_DUN,
      s2dSignals: signalsCount,
    }));
    setBriefOpen(true);
  };

  // Seed S2D signals on first dashboard mount
  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  return (
    <div className="app-shell bg-app">
      <a href="#dashboard-main" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-mlk/20 bg-background/95 backdrop-blur" role="banner">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground hover:text-mlk p-2 h-8" aria-label={t("header.backToLanding")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {/* Mobile nav trigger — opens the grouped sidebar as a drawer (UI-UX §4-P0) */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-muted-foreground hover:text-mlk p-2 h-8"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Sparkles className="h-5 w-5 text-mlk flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">PIP-MLK <span className="text-muted-foreground font-normal">· Melaka</span></div>
                <div className="text-[10px] text-muted-foreground hidden md:block">Political Intelligence Platform · Truth Above All</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] hidden md:inline-flex items-center gap-1.5 border-mlk/30" aria-label={`${t("header.s2dLoop")}: ${loopStatus}, ${signalsCount} ${t("header.signals")}`}>
                <span className="live-dot-mlk" aria-hidden="true" />
                <Activity className="h-3 w-3 text-mlk" aria-hidden="true" />
                S2D: {loopStatus} · {signalsCount}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">Provenance: 8/9</Badge>
              <Badge variant="outline" className="text-[10px] hidden lg:inline-flex">
                <Users className="h-3 w-3 me-1" />
                {fmtNum(TOTAL_VOTERS_P134, locale)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs hidden lg:inline-flex"
                onClick={() => {
                  const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: false, bubbles: true });
                  window.dispatchEvent(ev);
                }}
                aria-label={t("header.commandPalette")}
              >
                <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted">⌘K</kbd>
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={openBrief}
                aria-label={t("header.exportBrief")}
                title={t("header.exportBrief")}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Export</span>
              </Button>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="dashboard-main" className="app-main container mx-auto px-4 py-6" role="main">
        <div className="flex gap-6">
          {/* Desktop sidebar rail — grouped, collapsible nav (UI-UX §4-P0) */}
          <aside className="hidden lg:block w-64 shrink-0 self-start" aria-label="Sidebar">
            <div className="sticky top-20 max-h-[calc(100vh-6.5rem)] overflow-y-auto scrollbar-mlk pr-2 -mr-2">
              <div className="sidebar-rail p-3">
                <SidebarNav />
              </div>
            </div>
          </aside>

          {/* Content column */}
          <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {(() => {
              const tab = findTab(activeTab);
              const Icon = tab?.icon ?? LayoutDashboard;
              return <Icon className="h-6 w-6 text-mlk" aria-hidden="true" />;
            })()}
            {findTab(activeTab) ? t(findTab(activeTab)!.i18nKey, findTab(activeTab)!.label) : t("tab.overview", "Overview")}
          </h1>
        </div>

        <Separator className="mb-4 bg-mlk/20" />

        {/* Quick action toolbar */}
        <QuickActions tab={activeTab} />

        {/* Tab content — animated transitions */}
        <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="tab-slide-in"
        >
        {activeTab === "map-2d" && <Map2DTab />}
        {activeTab === "map-3d" && <Map3DTab />}
        {activeTab === "s2d" && <S2DConsoleTab />}
        {activeTab === "s2d-360" && <S2D360Tab />}
        {activeTab === "s2d-modern" && <S2DModernTab />}
        {activeTab === "scraper" && <ScraperTab />}
        {activeTab === "public-comm" && <PublicCommunicationTab />}
        {activeTab === "incidents" && <IncidentCasebookTab />}
        {activeTab === "scenarios" && <ScenarioTab />}
        {activeTab === "predictive" && <PredictiveTab />}
        {activeTab === "insights" && <InsightReportsTab />}
        {activeTab === "alerts" && <AlertsTab />}
        {activeTab === "dual-layer" && <DualLayerTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "elections" && <ElectionsTab />}
        {activeTab === "demographics" && <DemographicsTab />}
        {activeTab === "analysis" && <AnalysisTab />}
        {activeTab === "risk" && <RiskSocioeconomicTab />}
        {activeTab === "compare" && <CompareTab />}
        {activeTab === "governance" && <GovernanceTab />}
        </motion.div>
        </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile navigation drawer — grouped sidebar on small screens (UI-UX §4-P0) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[320px] overflow-y-auto scrollbar-mlk p-0">
          <SheetHeader className="border-b border-mlk/15 px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-mlk" aria-hidden="true" />
              PIP-MLK <span className="text-muted-foreground font-normal">· Melaka</span>
            </SheetTitle>
            <SheetDescription className="text-xs">Political Intelligence Platform</SheetDescription>
          </SheetHeader>
          <div className="p-3">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Footer */}
      <footer className="app-footer border-t border-mlk/20 bg-background/95 py-3" role="contentinfo">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div><strong className="text-mlk">PIP-MLK</strong> · Political Intelligence Platform · Melaka</div>
          <div className="flex items-center gap-3">
            <FreshnessIndicator />
            <span className="hidden md:inline">Build-time engine · PDPA Akta 709 compliant</span>
            <Badge variant="outline" className="text-[9px]">{TOTAL_DUN} DUN · 6 Parliaments</Badge>
          </div>
        </div>
      </footer>

      {/* Floating overlays — render last so they sit above all content */}
      <SelectedDunDrawer />
      <AssistantPanel />
      <CommandPalette />
      <ShortcutCheatSheet />
      <BriefPreviewDialog brief={brief} open={briefOpen} onOpenChange={setBriefOpen} />
    </div>
  );
}
