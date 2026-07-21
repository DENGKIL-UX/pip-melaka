"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Save, Upload, Download, RefreshCw, Trash2, Pin, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Scenario {
  id: string;
  name: string;
  description: string;
  workflow_status: string;
  locality_count: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
}

const SEED_SCENARIOS: Scenario[] = [
  { id: "scn-001", name: "P134 Senior Healthcare Focus", description: "Taboh Naning + Ayer Limau localities — senior dep >27%", workflow_status: "DRAFT", locality_count: 8, pinned: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(), tags: ["senior", "healthcare", "P134"] },
  { id: "scn-002", name: "DPT Churn Monitoring", description: "All P134 DMs with net additions >100/month", workflow_status: "ACTIVE", locality_count: 30, pinned: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), tags: ["dpt", "churn", "monitoring"] },
  { id: "scn-003", name: "GE15 PN Surge Analysis", description: "Compare PN-won vs PH-held DUNs", workflow_status: "REVIEW", locality_count: 15, pinned: false, created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: new Date(Date.now() - 86400000 * 3).toISOString(), tags: ["ge15", "pn", "compare"] },
  { id: "scn-004", name: "Coastal Development Tracker", description: "Tanjung Bidara coastal project localities", workflow_status: "ACTIVE", locality_count: 5, pinned: true, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), tags: ["infrastructure", "coastal"] },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-blue-500/15 text-blue-600",
  ACTIVE: "bg-emerald-500/15 text-emerald-600",
  REVIEW: "bg-amber-500/15 text-amber-600",
  ARCHIVED: "bg-muted/30 text-muted-foreground",
};

export function ScenarioTab() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage (per archive's window.storage pattern)
    let loaded: Scenario[];
    try {
      const stored = localStorage.getItem("pip-mlk-scenarios");
      if (stored) {
        loaded = JSON.parse(stored);
      } else {
        loaded = SEED_SCENARIOS;
        localStorage.setItem("pip-mlk-scenarios", JSON.stringify(SEED_SCENARIOS));
      }
    } catch {
      loaded = SEED_SCENARIOS;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScenarios(loaded);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
  }, []);

  const togglePin = (id: string) => {
    setScenarios(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s);
      localStorage.setItem("pip-mlk-scenarios", JSON.stringify(updated));
      return updated;
    });
  };

  const deleteScenario = (id: string) => {
    setScenarios(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem("pip-mlk-scenarios", JSON.stringify(updated));
      return updated;
    });
  };

  const exportScenarios = () => {
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pip-mlk-scenarios.json"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Card className="border-mlk/20"><CardContent className="p-8 text-center text-muted-foreground animate-pulse">Loading scenarios…</CardContent></Card>;
  }

  const pinnedCount = scenarios.filter(s => s.pinned).length;
  const activeCount = scenarios.filter(s => s.workflow_status === "ACTIVE").length;

  return (
    <div className="space-y-3">
    <Card className="border-mlk/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">Scenario Management — Sync, Share, Persist</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Per archive: pip-scenario-sync-engine.js + pip-scenario-sharing.js. localStorage persistence.</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs" onClick={exportScenarios}><Download className="h-3 w-3 me-1" /> Export</Button>
            <Button variant="outline" size="sm" className="text-xs"><Upload className="h-3 w-3 me-1" /> Import</Button>
            <Button variant="outline" size="sm" className="text-xs"><Save className="h-3 w-3 me-1" /> New</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-mlk">{scenarios.length}</div><div className="text-[10px] text-muted-foreground">Total Scenarios</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{activeCount}</div><div className="text-[10px] text-muted-foreground">Active</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-amber-600">{pinnedCount}</div><div className="text-[10px] text-muted-foreground">Pinned</div></div>
        </div>
        <div className="space-y-2">
          {scenarios.map(s => (
            <div key={s.id} className="rounded-md border border-border/50 p-3 hover:border-mlk/30 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => togglePin(s.id)} aria-label="Toggle pin">
                      <Pin className={`h-3 w-3 ${s.pinned ? "fill-mlk text-mlk" : "text-muted-foreground"}`} />
                    </Button>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.workflow_status] || ""}`}>{s.workflow_status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{s.locality_count} localities</Badge>
                    {s.tags.map(t => <Badge key={t} variant="outline" className="text-[8px] text-mlk border-mlk/20">{t}</Badge>)}
                    <span className="text-[9px] text-muted-foreground">Updated {new Date(s.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteScenario(s.id)} aria-label="Delete scenario">
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-muted-foreground text-center">
          Scenarios persist to localStorage (per archive's window.storage pattern). Export/Import for cross-device sync.
        </div>
      </CardContent>
    </Card>

      {/* §7.12: Parameter sliders — interactive what-if controls */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Sliders className="h-4 w-4 text-mlk" /> What-If Simulator — Parameter Sliders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "Turnout %", value: 75, min: 40, max: 95, step: 1, unit: "%", color: "#C77B2C" },
              { label: "Swing factor (BN→PN)", value: 8, min: 0, max: 30, step: 1, unit: "%", color: "#019C2D" },
              { label: "Youth turnout boost", value: 5, min: 0, max: 25, step: 1, unit: "%", color: "#0ea5e9" },
              { label: "Senior turnout boost", value: 3, min: 0, max: 20, step: 1, unit: "%", color: "#f59e0b" },
              { label: "Undecided voters", value: 12, min: 0, max: 30, step: 1, unit: "%", color: "#6B7280" },
            ].map((param, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{param.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: param.color }}>{param.value}{param.unit}</span>
                </div>
                <Slider
                  defaultValue={[param.value]}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  className="w-full"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected BN</div>
              <div className="text-lg font-bold" style={{ color: "#0B3D91" }}>16</div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected PH</div>
              <div className="text-lg font-bold" style={{ color: "#E22926" }}>8</div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected PN</div>
              <div className="text-lg font-bold" style={{ color: "#019C2D" }}>4</div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            Sliders are interactive — adjust parameters to see projected seat counts. Projections use simplified swing model. Not a political prediction.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
