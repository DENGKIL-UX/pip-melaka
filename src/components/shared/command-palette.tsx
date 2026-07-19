"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, ArrowRight, LayoutDashboard, Map as MapIcon, Box, Vote, Users, TrendingUp, ShieldAlert, ArrowLeftRight, Activity, Brain, Radar, MessageSquare, AlertTriangle, Layers3, Sparkle, FileText, Bell, ShieldCheck, Building2, ChevronRight } from "lucide-react";
import { useDashboardStore, type DashboardTab } from "@/stores/dashboard-store";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { cn } from "@/lib/utils";

type CommandKind = "tab" | "parliament";

interface CommandItem {
  id: string;
  kind: CommandKind;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  subtitle?: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { setActiveTab, setSelectedParliament, landed, setLanded } = useDashboardStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const tabCommands: Array<{ id: DashboardTab; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; keywords: string }> = [
      { id: "overview", label: "Overview", hint: "Alt+1", icon: LayoutDashboard, keywords: "home dashboard summary kpi" },
      { id: "map-2d", label: "2D Map", hint: "Alt+2", icon: MapIcon, keywords: "map leaflet choropleth dun grid" },
      { id: "map-3d", label: "3D Map", hint: "Alt+3", icon: Box, keywords: "3d three.js extrusion timeline morph" },
      { id: "elections", label: "Elections", hint: "Alt+4", icon: Vote, keywords: "ge14 prn15 ge15 election result bn ph pn swing" },
      { id: "demographics", label: "Demographics", hint: "Alt+5", icon: Users, keywords: "voter age gender ethnicity engine pyramid" },
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

    const tabItems: CommandItem[] = tabCommands.map((c) => ({
      id: `tab-${c.id}`,
      kind: "tab" as const,
      label: c.label,
      hint: c.hint,
      icon: c.icon,
      keywords: c.keywords,
      action: () => {
        if (!landed) setLanded(true);
        setActiveTab(c.id);
        setOpen(false);
        setQuery("");
        setSelectedIdx(0);
      },
    }));

    const parliamentItems: CommandItem[] = PARLIAMENTS.map((p) => ({
      id: `parl-${p.code}`,
      kind: "parliament" as const,
      label: `P${p.code} — ${p.name}`,
      subtitle: `${p.district} · ${p.dunCount} DUN · ${p.totalVoters > 0 ? p.totalVoters.toLocaleString() + " voters" : "pending data"}`,
      icon: Building2,
      keywords: `p${p.code} ${p.name} ${p.district} parliament`,
      action: () => {
        setSelectedParliament(p.code);
        if (!landed) setLanded(true);
        setActiveTab("overview");
        setOpen(false);
        setQuery("");
        setSelectedIdx(0);
      },
    }));

    return [...tabItems, ...parliamentItems];
  }, [landed, setActiveTab, setSelectedParliament, setLanded]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false)
    );
  }, [query, commands]);

  // Reset selection when query changes — defer to rAF to avoid
  // calling setState synchronously within the effect body.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setSelectedIdx(0));
    return () => cancelAnimationFrame(raf);
  }, [query]);

  // Keyboard shortcut to open/close + arrow navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setSelectedIdx(0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((s) => (s + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((s) => (s - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[selectedIdx];
        if (item) item.action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIdx]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      // defer focus to next tick so input is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
    if (selected && typeof selected.scrollIntoView === "function") {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx, open]);

  if (!open) return null;

  // Group filtered results by kind for sectioned display
  const tabs = filtered.filter((c) => c.kind === "tab");
  const parls = filtered.filter((c) => c.kind === "parliament");

  // Compute absolute index within the flat filtered list for a sectioned item
  const absoluteIndex = (item: CommandItem) => filtered.indexOf(item);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery(""); setSelectedIdx(0); }}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-xl border border-mlk/30 bg-card shadow-2xl overflow-hidden fade-in-up">
        {/* Search input */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tabs, parliaments, DUNs, keywords..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={filtered[selectedIdx] ? `cmd-${selectedIdx}` : undefined}
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="max-h-80 overflow-y-auto scrollbar-mlk p-2"
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {tabs.length > 0 && (
                <>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
                    Navigation ({tabs.length})
                  </div>
                  {tabs.map((cmd) => {
                    const idx = absoluteIndex(cmd);
                    const isSelected = idx === selectedIdx;
                    return (
                      <button
                        key={cmd.id}
                        id={`cmd-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onClick={cmd.action}
                        className={cn(
                          "flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm cursor-pointer transition-colors group text-start",
                          isSelected ? "bg-mlk/10" : "hover:bg-muted/50"
                        )}
                      >
                        <cmd.icon className="h-4 w-4 text-mlk flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1 font-medium">{cmd.label}</span>
                        {cmd.hint && (
                          <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                            {cmd.hint}
                          </kbd>
                        )}
                        <ArrowRight
                          className={cn(
                            "h-3 w-3 text-muted-foreground transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </>
              )}
              {parls.length > 0 && (
                <>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1 mt-1">
                    Parliaments ({parls.length})
                  </div>
                  {parls.map((cmd) => {
                    const idx = absoluteIndex(cmd);
                    const isSelected = idx === selectedIdx;
                    return (
                      <button
                        key={cmd.id}
                        id={`cmd-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onClick={cmd.action}
                        className={cn(
                          "flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm cursor-pointer transition-colors group text-start",
                          isSelected ? "bg-mlk/10" : "hover:bg-muted/50"
                        )}
                      >
                        <cmd.icon className="h-4 w-4 text-mlk flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{cmd.label}</div>
                          {cmd.subtitle && (
                            <div className="text-[10px] text-muted-foreground truncate">{cmd.subtitle}</div>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 text-muted-foreground transition-all",
                            isSelected ? "opacity-100 translate-x-0" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
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
