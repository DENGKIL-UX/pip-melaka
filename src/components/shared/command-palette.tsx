"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRight, LayoutDashboard, Map as MapIcon, Box, Vote, Users, TrendingUp, ShieldAlert, ArrowLeftRight, Activity, Brain, Radar, MessageSquare, AlertTriangle, Layers3, Sparkle, FileText, Bell, ShieldCheck } from "lucide-react";
import { useDashboardStore, type DashboardTab } from "@/stores/dashboard-store";

const COMMANDS: Array<{ id: DashboardTab; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; keywords: string }> = [
  { id: "overview", label: "Overview", hint: "Alt+1", icon: LayoutDashboard, keywords: "home dashboard summary kpi" },
  { id: "map-2d", label: "2D Map", hint: "Alt+2", icon: MapIcon, keywords: "map leaflet choropleth dun grid" },
  { id: "map-3d", label: "3D Map", hint: "Alt+3", icon: Box, keywords: "3d three.js extrusion timeline morph" },
  { id: "elections", label: "Elections", hint: "Alt+4", icon: Vote, keywords: "ge14 prn15 ge15 election result bn ph pn" },
  { id: "demographics", label: "Demographics", hint: "Alt+5", icon: Users, keywords: "voter age gender ethnicity engine" },
  { id: "analysis", label: "DPT Analysis", hint: "Alt+6", icon: TrendingUp, keywords: "dpt churn additions deletions trend" },
  { id: "risk", label: "Risk + Socioeconomic", hint: "Alt+7", icon: ShieldAlert, keywords: "risk senior dependency gini poverty dosm" },
  { id: "compare", label: "Compare", hint: "Alt+8", icon: ArrowLeftRight, keywords: "compare vs parliament side by side" },
  { id: "s2d", label: "S2D Console", hint: "Alt+9", icon: Activity, keywords: "s2d sensing deciding acting signal" },
  { id: "s2d-360", label: "S2D 360", hint: "Alt+0", icon: Brain, keywords: "360 command centre signal monitoring sentiment narrative" },
  { id: "scraper", label: "Scraper", hint: "", icon: Radar, keywords: "apify scraper tiktok facebook instagram threads collection" },
  { id: "public-comm", label: "Public Comm", hint: "", icon: MessageSquare, keywords: "public communication response case evidence recommendation" },
  { id: "incidents", label: "Incidents", hint: "", icon: AlertTriangle, keywords: "incident casebook checklist severity" },
  { id: "scenarios", label: "Scenarios", hint: "", icon: Layers3, keywords: "scenario sync sharing persist localStorage" },
  { id: "predictive", label: "Predictive", hint: "", icon: Sparkle, keywords: "predictive forecast 72h escalation risk scoring" },
  { id: "insights", label: "Insights", hint: "", icon: FileText, keywords: "daily intelligence brief executive judgement outlook" },
  { id: "alerts", label: "Alerts", hint: "", icon: Bell, keywords: "operational alert critical warning system health" },
  { id: "dual-layer", label: "Dual-Layer", hint: "", icon: Layers3, keywords: "dual layer population signal fusion locality" },
  { id: "governance", label: "Governance", hint: "Alt+-", icon: ShieldCheck, keywords: "provenance gate pdpa gap audit pipeline" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { setActiveTab } = useDashboardStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter((c) =>
      c.label.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q) || c.id.includes(q)
    );
  }, [query]);

  const select = (tab: DashboardTab) => {
    setActiveTab(tab);
    setOpen(false);
    setQuery("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" role="dialog" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(""); }} />
      <div className="relative w-full max-w-lg rounded-xl border border-mlk/30 bg-card shadow-2xl overflow-hidden fade-in-up">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tabs, features, keywords..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
            aria-label="Search commands"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-mlk p-2">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No results for "{query}"</div>
          ) : (
            <>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">Navigation ({filtered.length})</div>
              {filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => select(cmd.id)}
                  className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-mlk/10 transition-colors group text-start"
                >
                  <cmd.icon className="h-4 w-4 text-mlk flex-shrink-0" />
                  <span className="flex-1 font-medium">{cmd.label}</span>
                  {cmd.hint && <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">{cmd.hint}</kbd>}
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </>
          )}
        </div>
        <div className="p-2 border-t border-border text-center">
          <span className="text-[10px] text-muted-foreground">
            <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted">↑↓</kbd> navigate ·{" "}
            <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted">↵</kbd> select ·{" "}
            <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
