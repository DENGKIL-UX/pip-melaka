"use client";

/**
 * QuickActions — floating quick-action toolbar for each dashboard tab.
 *
 * Shows per-tab action buttons + an Export dropdown.
 * Sits above the tab content area.
 */
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw, Maximize2, Settings } from "lucide-react";
import type { DashboardTab } from "@/stores/dashboard-store";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  handler?: () => void;
}

const TAB_ACTIONS: Partial<Record<DashboardTab, QuickAction[]>> = {
  "map-2d": [
    { icon: Filter, label: "Layers" },
    { icon: RefreshCw, label: "Reset" },
    { icon: Maximize2, label: "Fullscreen" },
  ],
  "map-3d": [
    { icon: RefreshCw, label: "Reset Camera" },
    { icon: Maximize2, label: "Fullscreen" },
  ],
  elections: [
    { icon: Download, label: "Export CSV" },
    { icon: Filter, label: "Filter" },
  ],
  overview: [
    { icon: RefreshCw, label: "Refresh" },
    { icon: Download, label: "Export" },
  ],
  demographics: [
    { icon: Download, label: "Export" },
    { icon: Settings, label: "Configure" },
  ],
  analysis: [
    { icon: Download, label: "Export Report" },
    { icon: Filter, label: "Filter" },
  ],
};

export function QuickActions({ tab }: { tab: DashboardTab }) {
  const actions = TAB_ACTIONS[tab] || [];

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="glass text-xs gap-1.5 h-8"
            onClick={action.handler}
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </Button>
        );
      })}

      {/* Export dropdown (always visible) */}
      <Button
        variant="outline"
        size="sm"
        className="glass text-xs gap-1.5 h-8 ml-auto"
        onClick={() => {
          const exportBtn = document.querySelector('[aria-label="Export"]') as HTMLButtonElement;
          exportBtn?.click();
        }}
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </Button>
    </div>
  );
}
