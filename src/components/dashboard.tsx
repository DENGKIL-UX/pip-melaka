"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Map as MapIcon, Box, LayoutDashboard, Users, Vote, TrendingUp, ShieldAlert, ArrowLeftRight, Activity, ShieldCheck, Brain, MessageSquare, AlertTriangle, Layers3, Sparkle, FileText, Bell, Radar, Search, Download } from "lucide-react";
import { useDashboardStore, type DashboardTab } from "@/stores/dashboard-store";
import { useS2DStore } from "@/stores/s2d-store";
import { TOTAL_VOTERS_P134, TOTAL_DUN } from "@/lib/melaka-constants";
import { buildBrief, downloadBrief } from "@/lib/export-brief";
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
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { CommandPalette } from "@/components/shared/command-palette";
import { ShortcutCheatSheet } from "@/components/shared/shortcut-cheat-sheet";

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
const PublicCommunicationTab = dynamic(() => withRetry(() => import("@/components/tabs/public-communication-tab").then((m) => ({ default: m.PublicCommunicationTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.publicComm" fallback="Loading Public Comm…" /> });
const IncidentCasebookTab = dynamic(() => withRetry(() => import("@/components/tabs/incident-casebook-tab").then((m) => ({ default: m.IncidentCasebookTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.incidents" fallback="Loading Incidents…" /> });
const ScenarioTab = dynamic(() => withRetry(() => import("@/components/tabs/scenario-tab").then((m) => ({ default: m.ScenarioTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.scenarios" fallback="Loading Scenarios…" /> });
const PredictiveTab = dynamic(() => withRetry(() => import("@/components/tabs/predictive-tab").then((m) => ({ default: m.PredictiveTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.predictive" fallback="Loading Predictive…" /> });
const InsightReportsTab = dynamic(() => withRetry(() => import("@/components/tabs/insight-reports-tab").then((m) => ({ default: m.InsightReportsTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.insights" fallback="Loading Insights…" /> });
const AlertsTab = dynamic(() => withRetry(() => import("@/components/tabs/alerts-tab").then((m) => ({ default: m.AlertsTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.alerts" fallback="Loading Alerts…" /> });
const DualLayerTab = dynamic(() => withRetry(() => import("@/components/tabs/dual-layer-tab").then((m) => ({ default: m.DualLayerTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.dualLayer" fallback="Loading Dual-Layer…" /> });
const ScraperTab = dynamic(() => withRetry(() => import("@/components/tabs/scraper-tab").then((m) => ({ default: m.ScraperTab }))), { ssr: false, loading: () => <TabLoading messageKey="loading.scraper" fallback="Loading Scraper…" /> });

const TABS: Array<{ id: DashboardTab; label: string; i18nKey: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", i18nKey: "tab.overview", icon: LayoutDashboard },
  { id: "map-2d", label: "2D Map", i18nKey: "tab.map2d", icon: MapIcon },
  { id: "map-3d", label: "3D Map", i18nKey: "tab.map3d", icon: Box },
  { id: "elections", label: "Elections", i18nKey: "tab.elections", icon: Vote },
  { id: "demographics", label: "Demographics", i18nKey: "tab.demographics", icon: Users },
  { id: "analysis", label: "DPT Analysis", i18nKey: "tab.analysis", icon: TrendingUp },
  { id: "risk", label: "Risk + Socio", i18nKey: "tab.risk", icon: ShieldAlert },
  { id: "compare", label: "Compare", i18nKey: "tab.compare", icon: ArrowLeftRight },
  { id: "s2d", label: "S2D Console", i18nKey: "tab.s2d", icon: Activity },
  { id: "s2d-360", label: "S2D 360", i18nKey: "tab.s2d360", icon: Brain },
  { id: "scraper", label: "Scraper", i18nKey: "tab.scraper", icon: Radar },
  { id: "public-comm", label: "Public Comm", i18nKey: "tab.publicComm", icon: MessageSquare },
  { id: "incidents", label: "Incidents", i18nKey: "tab.incidents", icon: AlertTriangle },
  { id: "scenarios", label: "Scenarios", i18nKey: "tab.scenarios", icon: Layers3 },
  { id: "predictive", label: "Predictive", i18nKey: "tab.predictive", icon: Sparkle },
  { id: "insights", label: "Insights", i18nKey: "tab.insights", icon: FileText },
  { id: "alerts", label: "Alerts", i18nKey: "tab.alerts", icon: Bell },
  { id: "dual-layer", label: "Dual-Layer", i18nKey: "tab.dualLayer", icon: Layers3 },
  { id: "governance", label: "Governance", i18nKey: "tab.governance", icon: ShieldCheck },
];

export function Dashboard({ onExit }: { onExit: () => void }) {
  const { activeTab, setActiveTab } = useDashboardStore();
  const { t } = useI18n();
  const signalsCount = useS2DStore((s) => s.signals.filter(sig => sig.status !== "resolved").length);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const seedIfEmpty = useS2DStore((s) => s.seedIfEmpty);

  // Seed S2D signals on first dashboard mount
  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  // Preload adjacent tab chunks for faster navigation (§10.1)
  useEffect(() => {
    const currentIdx = TABS.findIndex((t) => t.id === activeTab);
    if (currentIdx === -1) return;
    // Preload next and previous tab by triggering a no-op dynamic import hint
    // The browser will prefetch the chunk without rendering the component
    const preloadTab = (idx: number) => {
      if (idx < 0 || idx >= TABS.length) return;
      const tabId = TABS[idx].id;
      // Use requestIdleCallback to avoid blocking
      const ric = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100));
      ric(() => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "script";
        // The chunk URL pattern from Next.js webpack dev
        link.href = `/_next/static/chunks/_app-pages-browser_src_components_tabs_${tabId.replace(/-/g, "")}_tsx.js`;
        document.head.appendChild(link);
        setTimeout(() => link.remove(), 5000);
      });
    };
    preloadTab(currentIdx + 1);
    preloadTab(currentIdx - 1);
  }, [activeTab]);

  return (
    <div className="app-shell bg-background">
      <a href="#dashboard-main" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-mlk/20 bg-background/95 backdrop-blur" role="banner">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground hover:text-mlk p-2 h-8" aria-label={t("header.backToLanding")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Sparkles className="h-5 w-5 text-mlk flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">PIP-MLK <span className="text-muted-foreground font-normal">· Melaka</span></div>
                <div className="text-[10px] text-muted-foreground hidden md:block">Political Intelligence Platform · Truth Above All</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] hidden md:inline-flex items-center gap-1.5" aria-label={`${t("header.s2dLoop")}: ${loopStatus}, ${signalsCount} ${t("header.signals")}`}>
                <span className="pulse-dot" aria-hidden="true" />
                <Activity className="h-3 w-3" aria-hidden="true" />
                S2D: {loopStatus} · {signalsCount}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">Provenance: 8/9</Badge>
              <Badge variant="outline" className="text-[10px] hidden lg:inline-flex">
                <Users className="h-3 w-3 me-1" />
                {TOTAL_VOTERS_P134.toLocaleString()}
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
                onClick={() => {
                  const brief = buildBrief({
                    activeTab: activeTab,
                    totalVoters: TOTAL_VOTERS_P134,
                    dunCount: TOTAL_DUN,
                    s2dSignals: signalsCount,
                  });
                  downloadBrief(brief);
                }}
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
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {(() => {
              const tab = TABS.find((t) => t.id === activeTab);
              const Icon = tab?.icon ?? LayoutDashboard;
              return <Icon className="h-6 w-6 text-mlk" aria-hidden="true" />;
            })()}
            {TABS.find((t) => t.id === activeTab) ? t(TABS.find((t) => t.id === activeTab)!.i18nKey, TABS.find((t) => t.id === activeTab)?.label) : t("tab.overview", "Overview")}
          </h1>
        </div>

        <Separator className="mb-4 bg-mlk/20" />

        {/* Tab navigation */}
        <nav className="flex flex-wrap gap-1 mb-6" role="tablist" aria-label="Dashboard sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                  isActive ? "bg-mlk text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t(tab.i18nKey, tab.label)}</span>
              </button>
            );
          })}
        </nav>

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
      </main>

      {/* Footer */}
      <footer className="app-footer border-t border-mlk/20 bg-background/95 py-3" role="contentinfo">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div><strong className="text-mlk">PIP-MLK</strong> · Political Intelligence Platform · Melaka</div>
          <div className="flex items-center gap-3">
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
    </div>
  );
}
