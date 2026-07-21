"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Save, Upload, Download, RefreshCw, Trash2, Pin, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DUN_SUMMARY, DUN_COALITION_COUNTS } from "@/lib/dun-summary";

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

  // What-If Simulator state — reactive slider values
  const [turnout, setTurnout] = useState(75);
  const [swingFactor, setSwingFactor] = useState(8);
  const [youthBoost, setYouthBoost] = useState(5);
  const [seniorBoost, setSeniorBoost] = useState(3);
  const [undecided, setUndecided] = useState(12);

  // Dynamic projection model — recalculates when any slider changes
  const projection = useMemo(() => {
    // Base = PRN15 results (BN:21, PH:5, PN:2)
    let bn = DUN_COALITION_COUNTS.BN;
    let ph = DUN_COALITION_COUNTS.PH;
    let pn = DUN_COALITION_COUNTS.PN;

    // Swing factor: moves seats from BN → PN (each 3% = 1 seat)
    const seatsFromSwing = Math.round(swingFactor / 3);
    const actualSwing = Math.min(seatsFromSwing, bn);
    bn -= actualSwing;
    pn += actualSwing;

    // Youth boost: favours PH (each 5% = 1 seat from largest non-PH)
    const seatsFromYouth = Math.round(youthBoost / 5);
    for (let i = 0; i < seatsFromYouth; i++) {
      if (bn >= ph && bn > 0) { bn--; ph++; }
      else if (pn >= ph && pn > 0) { pn--; ph++; }
    }

    // Senior boost: favours BN (each 4% = 1 seat)
    const seatsFromSenior = Math.round(seniorBoost / 4);
    for (let i = 0; i < seatsFromSenior; i++) {
      if (ph >= pn && ph > 0) { ph--; bn++; }
      else if (pn > 0) { pn--; bn++; }
    }

    // Turnout: <60% favours BN (incumbent), >85% favours PH
    if (turnout < 60) {
      const gain = Math.round((60 - turnout) / 5);
      for (let i = 0; i < gain; i++) {
        if (ph >= pn && ph > 0) { ph--; bn++; }
        else if (pn > 0) { pn--; bn++; }
      }
    }
    if (turnout > 85) {
      const gain = Math.round((turnout - 85) / 5);
      for (let i = 0; i < gain; i++) {
        if (bn > 0) { bn--; ph++; }
      }
    }

    // Undecided: creates ±uncertainty
    const uncertaintySeats = Math.round(undecided / 5);

    // Normalize to 28
    const total = bn + ph + pn;
    if (total !== 28) bn += 28 - total;
    bn = Math.max(0, Math.min(28, bn));
    ph = Math.max(0, Math.min(28, ph));
    pn = Math.max(0, Math.min(28, pn));

    return { bn, ph, pn, uncertaintySeats };
  }, [turnout, swingFactor, youthBoost, seniorBoost, undecided]);

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

      {/* §7.12: What-If Simulator — DYNAMIC projection with reactive sliders */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Sliders className="h-4 w-4 text-mlk" /> What-If Simulator — Parameter Sliders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "Turnout %", value: turnout, set: setTurnout, min: 40, max: 95, step: 1, unit: "%", color: "#C77B2C" },
              { label: "Swing factor (BN→PN)", value: swingFactor, set: setSwingFactor, min: 0, max: 30, step: 1, unit: "%", color: "#019C2D" },
              { label: "Youth turnout boost", value: youthBoost, set: setYouthBoost, min: 0, max: 25, step: 1, unit: "%", color: "#0ea5e9" },
              { label: "Senior turnout boost", value: seniorBoost, set: setSeniorBoost, min: 0, max: 20, step: 1, unit: "%", color: "#f59e0b" },
              { label: "Undecided voters", value: undecided, set: setUndecided, min: 0, max: 30, step: 1, unit: "%", color: "#6B7280" },
            ].map((param, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{param.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: param.color }}>{param.value}{param.unit}</span>
                </div>
                <Slider
                  value={[param.value]}
                  onValueChange={(v) => param.set(v[0])}
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
              <div className="text-lg font-bold" style={{ color: "#0B3D91" }}>
                {projection.bn}
                {projection.uncertaintySeats > 0 && <span className="text-[10px] text-muted-foreground"> ±{projection.uncertaintySeats}</span>}
              </div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected PH</div>
              <div className="text-lg font-bold" style={{ color: "#E22926" }}>
                {projection.ph}
                {projection.uncertaintySeats > 0 && <span className="text-[10px] text-muted-foreground"> ±{projection.uncertaintySeats}</span>}
              </div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected PN</div>
              <div className="text-lg font-bold" style={{ color: "#019C2D" }}>
                {projection.pn}
                {projection.uncertaintySeats > 0 && <span className="text-[10px] text-muted-foreground"> ±{projection.uncertaintySeats}</span>}
              </div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
          </div>
          {/* Change indicator — shows base vs projected */}
          <div className="flex items-center justify-center gap-3 mt-3 text-[10px]">
            <span className="text-muted-foreground">Base (PRN15): BN {DUN_COALITION_COUNTS.BN} / PH {DUN_COALITION_COUNTS.PH} / PN {DUN_COALITION_COUNTS.PN}</span>
            <span className="text-mlk font-semibold">→</span>
            <span className="font-semibold">
              <span style={{ color: "#0B3D91" }}>BN {projection.bn}</span>
              {" / "}
              <span style={{ color: "#E22926" }}>PH {projection.ph}</span>
              {" / "}
              <span style={{ color: "#019C2D" }}>PN {projection.pn}</span>
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            Sliders are interactive — seat counts update in real-time. Model: swing shifts BN→PN, youth favours PH, senior favours BN, low turnout favours BN, high turnout favours PH, undecided creates ±uncertainty. Not a political prediction.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
