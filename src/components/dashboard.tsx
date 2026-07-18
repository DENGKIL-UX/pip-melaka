"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Map as MapIcon, Box, LayoutDashboard, Users, Vote, TrendingUp, ShieldAlert, ArrowLeftRight, Activity, ShieldCheck } from "lucide-react";
import { useDashboardStore, type DashboardTab } from "@/stores/dashboard-store";
import { useS2DStore } from "@/stores/s2d-store";
import { TOTAL_VOTERS_P134, TOTAL_DUN } from "@/lib/melaka-constants";
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

// Lazy-load map components (Leaflet + Three.js are heavy)
const Map2DTab = dynamic(() => import("@/components/tabs/map-2d-tab").then((m) => ({ default: m.Map2DTab })), { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center text-muted-foreground">Loading 2D map…</div> });
const Map3DTab = dynamic(() => import("@/components/tabs/map-3d-tab").then((m) => ({ default: m.Map3DTab })), { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center text-muted-foreground">Loading 3D map…</div> });
const S2DConsoleTab = dynamic(() => import("@/components/tabs/s2d-console-tab").then((m) => ({ default: m.S2DConsoleTab })), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center text-muted-foreground">Loading S2D console…</div> });

const TABS: Array<{ id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "map-2d", label: "2D Map", icon: MapIcon },
  { id: "map-3d", label: "3D Map", icon: Box },
  { id: "elections", label: "Elections", icon: Vote },
  { id: "demographics", label: "Demographics", icon: Users },
  { id: "analysis", label: "DPT Analysis", icon: TrendingUp },
  { id: "risk", label: "Risk + Socio", icon: ShieldAlert },
  { id: "compare", label: "Compare", icon: ArrowLeftRight },
  { id: "s2d", label: "S2D Console", icon: Activity },
  { id: "governance", label: "Governance", icon: ShieldCheck },
];

export function Dashboard({ onExit }: { onExit: () => void }) {
  const { activeTab, setActiveTab } = useDashboardStore();
  const signalsCount = useS2DStore((s) => s.signals.filter(sig => sig.status !== "resolved").length);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const seedIfEmpty = useS2DStore((s) => s.seedIfEmpty);

  // Seed S2D signals on first dashboard mount
  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  return (
    <div className="app-shell bg-background">
      <a href="#dashboard-main" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-mlk/20 bg-background/95 backdrop-blur" role="banner">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground hover:text-mlk p-2 h-8" aria-label="Back to landing page">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Sparkles className="h-5 w-5 text-mlk flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">PIP-MLK <span className="text-muted-foreground font-normal">· Melaka</span></div>
                <div className="text-[10px] text-muted-foreground hidden md:block">Political Intelligence Platform · Truth Above All</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] hidden md:inline-flex" aria-label={`S2D loop: ${loopStatus}, ${signalsCount} signals`}>
                <Activity className="h-3 w-3 me-1" aria-hidden="true" />
                S2D: {loopStatus} · {signalsCount}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">Provenance: 8/9</Badge>
              <Badge variant="outline" className="text-[10px] hidden lg:inline-flex">
                <Users className="h-3 w-3 me-1" />
                {TOTAL_VOTERS_P134.toLocaleString()}
              </Badge>
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
            {TABS.find((t) => t.id === activeTab)?.label ?? "Overview"}
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
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        {activeTab === "map-2d" && <Map2DTab />}
        {activeTab === "map-3d" && <Map3DTab />}
        {activeTab === "s2d" && <S2DConsoleTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "elections" && <ElectionsTab />}
        {activeTab === "demographics" && <DemographicsTab />}
        {activeTab === "analysis" && <AnalysisTab />}
        {activeTab === "risk" && <RiskSocioeconomicTab />}
        {activeTab === "compare" && <CompareTab />}
        {activeTab === "governance" && <GovernanceTab />}
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
    </div>
  );
}
