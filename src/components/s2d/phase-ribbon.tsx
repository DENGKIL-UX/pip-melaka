"use client";

// ponytail: MLK — S2D Phase Ribbon. Top-of-dashboard ribbon with 10 buttons
// for the 10 dashboard tabs + Alt+1-9 / Alt+0 keyboard shortcuts. Each button
// calls `useDashboardStore.setActiveTab(...)`. The active tab button gets an
// MLK amber border (#C77B2C). Each button has `aria-keyshortcuts="Alt+1"` etc.
//
// Implements WORKLOAD.md Phase 7 §7.10 (port the N9 phase ribbon + Alt+1-9/0
// keyboard shortcuts).
//
// WCAG 2.1 AA: 3px #C77B2C focus-visible ring, 44×44px touch targets, every
// button has aria-label + aria-keyshortcuts, prefers-reduced-motion honoured
// via `motion-reduce:` Tailwind utilities on the active-tab transition.

import * as React from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Coins,
  Home,
  Layers,
  Map,
  PieChart,
  ShieldCheck,
  Users,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDashboardStore,
  type DashboardTab,
} from "@/stores/dashboard-store";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

interface RibbonButton {
  /** Tab id passed to setActiveTab. */
  tab: DashboardTab;
  /** Visible label. */
  label: string;
  /** Position label (1-9, 0). */
  position: string;
  /** Keyboard shortcut for aria-keyshortcuts. */
  shortcut: string;
  /** Optional leading icon. */
  icon: React.ComponentType<{ className?: string }>;
}

const RIBBON: RibbonButton[] = [
  { tab: "overview", label: "Overview", position: "1", shortcut: "Alt+1", icon: Home },
  { tab: "map-2d", label: "2D Map", position: "2", shortcut: "Alt+2", icon: Map },
  { tab: "map-3d", label: "3D Map", position: "3", shortcut: "Alt+3", icon: Layers },
  { tab: "brain", label: "Brain", position: "4", shortcut: "Alt+4", icon: Brain },
  { tab: "risk", label: "Risk", position: "5", shortcut: "Alt+5", icon: ShieldCheck },
  { tab: "elections", label: "Elections", position: "6", shortcut: "Alt+6", icon: PieChart },
  { tab: "analysis", label: "Analysis", position: "7", shortcut: "Alt+7", icon: BarChart3 },
  { tab: "s2d", label: "S2D", position: "8", shortcut: "Alt+8", icon: Activity },
  { tab: "demographics", label: "Demographics", position: "9", shortcut: "Alt+9", icon: Users },
  { tab: "compare", label: "Compare", position: "0", shortcut: "Alt+0", icon: ArrowLeftRight },
  { tab: "governance", label: "Governance", position: "-", shortcut: "Alt+-", icon: Coins },
];

export interface PhaseRibbonProps {
  className?: string;
}

export function PhaseRibbon({ className }: PhaseRibbonProps) {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  // Keyboard handler — Alt+1..9 + Alt+0 + Alt+-.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      // Ignore if user is holding Ctrl/Meta too (avoid hijacking OS shortcuts).
      if (e.ctrlKey || e.metaKey) return;
      const k = e.key;
      let tab: DashboardTab | null = null;
      if (k >= "1" && k <= "9") {
        const idx = parseInt(k, 10) - 1;
        if (idx >= 0 && idx < RIBBON.length) {
          tab = RIBBON[idx]!.tab;
        }
      } else if (k === "0") {
        tab = RIBBON[9]!.tab; // Compare
      } else if (k === "-") {
        tab = RIBBON[10]!.tab; // Governance
      }
      if (tab) {
        e.preventDefault();
        setActiveTab(tab);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveTab]);

  return (
    <nav
      role="navigation"
      aria-label="Dashboard phase ribbon — Alt+1 through Alt+9, Alt+0, and Alt+- jump to each tab"
      className={cn(
        "flex w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-card p-1 dark:border-slate-800",
        className
      )}
    >
      {RIBBON.map((b) => {
        const Icon = b.icon;
        const isActive = activeTab === b.tab;
        return (
          <button
            key={b.tab}
            type="button"
            onClick={() => setActiveTab(b.tab)}
            aria-keyshortcuts={b.shortcut}
            aria-label={`${b.label} tab${isActive ? " — active" : ""}. Keyboard shortcut: ${b.shortcut}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none",
              FOCUS_RING,
              isActive
                ? "border-2 border-[#C77B2C] bg-[#C77B2C]/10 text-[#C77B2C]"
                : "border border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <span
              className="flex h-4 w-4 items-center justify-center font-mono text-[9px] text-muted-foreground"
              aria-hidden
            >
              {b.position}
            </span>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{b.label}</span>
            <span className="sr-only">{b.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default PhaseRibbon;
