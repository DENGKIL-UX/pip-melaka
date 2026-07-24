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
  const [swingFactor, setSwingFactor] = useState(8); // PN→BN swing
  const [youthBoost, setYouthBoost] = useState(5);
  const [seniorBoost, setSeniorBoost] = useState(3);
  const [undecided, setUndecided] = useState(12);
  const [dapToMca, setDapToMca] = useState(0); // DAP→MCA swing (PH→BN)
  const [dapToMic, setDapToMic] = useState(0); // DAP→MIC swing (PH→BN)

  // Live baseline from ElectionData.MY API (fetched on mount)
  const [liveBaseline, setLiveBaseline] = useState<{
    bn: number; ph: number; pn: number;
    bnVotePct: number; phVotePct: number; pnVotePct: number;
    source: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/predict")
      .then((r) => r.json())
      .then((d) => {
        if (d.baseline) {
          setLiveBaseline(d.baseline);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Per-DUN projection model (realistic, ElectionData.MY-grounded) ───────
  //
  // PRN15 baseline per-DUN winners (from ElectionData.MY):
  //   BN: 21 seats (UMNO 18, MCA 2, MIC 1)
  //   PH:  5 seats (DAP 4, AMANAH 1)
  //   PN:  2 seats (BERSATU 2)
  //
  // Component-party constraints (from ElectionData.MY candidate data):
  //   - DAP contested 4 DUNs (won all 4): N16 Ayer Keroh, N19 Kesidang,
  //     N20 Kota Laksamana, N22 Bandar Hilir — all urban Chinese-majority
  //   - MCA contested 2 DUNs (won both): N08 Machap Jaya, N14 Kelebang
  //     — also urban/semi-urban Chinese-majority
  //   - MIC contested 1 DUN (won): N07 Gadek — Indian-majority
  //   - BERSATU (PN) won 2: N11 Sungai Udang, N24 Bemban
  //
  // Swing constraints:
  //   - DAP→MCA: only affects DAP-won DUNs (max 4 seats). Represents DAP
  //     voters switching to MCA in urban Chinese-majority seats where MCA
  //     also fields candidates.
  //   - DAP→MIC: only affects DUNs with significant Indian voters where
  //     MIC fields candidates (max ~2 seats). MIC only contests in a few
  //     Indian-majority DUNs, so this swing is capped.
  //   - PN→BN: only affects PN-won DUNs (max 2 seats: N11, N24).
  //
  // DAP-won DUNs (max DAP→MCA/MIC impact):
  const DAP_DUNS = 4; // N16, N19, N20, N22
  // MIC-contested DUNs (max DAP→MIC impact — MIC only fields candidates
  // in Indian-majority areas, not all 28 DUNs):
  const MIC_CONTESTED = 2; // N07 Gadek + potentially 1 more
  // PN-won DUNs (max PN→BN swing impact):
  const PN_DUNS = 2; // N11, N24

  const projection = useMemo(() => {
    // Base = live API data if available, otherwise PRN15 static results
    let bn = liveBaseline?.bn ?? DUN_COALITION_COUNTS.BN;
    let ph = liveBaseline?.ph ?? DUN_COALITION_COUNTS.PH;
    let pn = liveBaseline?.pn ?? DUN_COALITION_COUNTS.PN;

    // ── 1. PN→BN swing: each 5% = 1 seat, capped at PN_DUNS (2) ──────────
    // Only affects DUNs where PN won (N11 Sungai Udang, N24 Bemban).
    // A 10% swing = 2 seats (all PN seats flip to BN).
    const seatsFromSwing = Math.min(Math.round(swingFactor / 5), PN_DUNS);
    pn -= seatsFromSwing;
    bn += seatsFromSwing;

    // ── 2. DAP→MCA swing: each 5% = 1 seat, capped at DAP_DUNS (4) ───────
    // Only affects DAP-won DUNs (N16, N19, N20, N22). MCA fields candidates
    // in these urban Chinese-majority seats, so DAP voters can switch to MCA.
    const seatsDapMca = Math.min(Math.round(dapToMca / 5), DAP_DUNS);
    ph -= seatsDapMca;
    bn += seatsDapMca;

    // ── 3. DAP→MIC swing: each 10% = 1 seat, capped at MIC_CONTESTED (2) ─
    // MIC only contests in Indian-majority DUNs (N07 Gadek + 1 more).
    // A 20% swing = 2 seats max. MIC does NOT field candidates in all 28 DUNs,
    // so this swing is tightly capped.
    const seatsDapMic = Math.min(Math.round(dapToMic / 10), MIC_CONTESTED);
    ph -= seatsDapMic;
    bn += seatsDapMic;

    // ── 4. Youth boost: favours PH (each 5% = 1 seat from largest non-PH) ─
    const seatsFromYouth = Math.round(youthBoost / 5);
    for (let i = 0; i < seatsFromYouth; i++) {
      if (bn >= ph && bn > 0) { bn--; ph++; }
      else if (pn >= ph && pn > 0) { pn--; ph++; }
    }

    // ── 5. Senior boost: favours BN (each 4% = 1 seat) ────────────────────
    const seatsFromSenior = Math.round(seniorBoost / 4);
    for (let i = 0; i < seatsFromSenior; i++) {
      if (ph >= pn && ph > 0) { ph--; bn++; }
      else if (pn > 0) { pn--; bn++; }
    }

    // ── 6. Turnout: <60% favours BN (incumbent), >85% favours PH ──────────
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

    // ── 7. Floor: parties can't go below 0 seats ──────────────────────────
    bn = Math.max(0, Math.min(28, bn));
    ph = Math.max(0, Math.min(28, ph));
    pn = Math.max(0, Math.min(28, pn));

    // ── 8. Undecided: creates asymmetric ±uncertainty ─────────────────────
    // For parties at 0 seats, uncertainty is only upward (can't go negative).
    const uncertaintySeats = Math.round(undecided / 5);
    const bnUncertainty = bn === 0 ? uncertaintySeats : uncertaintySeats;
    const phUncertainty = ph === 0 ? uncertaintySeats : uncertaintySeats;
    const pnUncertainty = pn === 0 ? uncertaintySeats : uncertaintySeats;

    return { bn, ph, pn, uncertaintySeats, bnUncertainty, phUncertainty, pnUncertainty };
  }, [turnout, swingFactor, youthBoost, seniorBoost, undecided, dapToMca, dapToMic, liveBaseline]);

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
              { label: "Swing factor (PN→BN)", value: swingFactor, set: setSwingFactor, min: 0, max: 30, step: 1, unit: "%", color: "#0B3D91" },
              { label: "DAP → MCA swing", value: dapToMca, set: setDapToMca, min: 0, max: 20, step: 1, unit: "%", color: "#E22926" },
              { label: "DAP → MIC swing", value: dapToMic, set: setDapToMic, min: 0, max: 20, step: 1, unit: "%", color: "#a855f7" },
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
                {projection.uncertaintySeats > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {" "}<span className="text-emerald-500">+{projection.bnUncertainty}</span>/<span className="text-red-500">-{projection.uncertaintySeats}</span>
                  </span>
                )}
              </div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected PH</div>
              <div className="text-lg font-bold" style={{ color: "#E22926" }}>
                {projection.ph}
                {projection.uncertaintySeats > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {" "}<span className="text-emerald-500">+{projection.phUncertainty}</span>/<span className="text-red-500">-{projection.uncertaintySeats}</span>
                  </span>
                )}
              </div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
            <div className="rounded-md border border-mlk/20 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Projected PN</div>
              <div className="text-lg font-bold" style={{ color: "#019C2D" }}>
                {projection.pn}
                {projection.uncertaintySeats > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {" "}<span className="text-emerald-500">+{projection.pnUncertainty}</span>/<span className="text-red-500">-{projection.uncertaintySeats}</span>
                  </span>
                )}
              </div>
              <div className="text-[9px] text-muted-foreground">seats</div>
            </div>
          </div>
          {/* Visual seat distribution — stacked bar chart */}
          <div className="mt-4">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1.5">Seat Distribution (28 total)</div>
            <div className="flex h-6 rounded-md overflow-hidden border border-border/40">
              <div
                className="flex items-center justify-center text-[9px] font-bold text-white transition-all duration-300"
                style={{ width: `${(projection.bn / 28) * 100}%`, backgroundColor: "#0B3D91" }}
                title={`BN: ${projection.bn} seats`}
              >
                {projection.bn > 0 && projection.bn}
              </div>
              <div
                className="flex items-center justify-center text-[9px] font-bold text-white transition-all duration-300"
                style={{ width: `${(projection.ph / 28) * 100}%`, backgroundColor: "#E22926" }}
                title={`PH: ${projection.ph} seats`}
              >
                {projection.ph > 0 && projection.ph}
              </div>
              <div
                className="flex items-center justify-center text-[9px] font-bold text-white transition-all duration-300"
                style={{ width: `${(projection.pn / 28) * 100}%`, backgroundColor: "#019C2D" }}
                title={`PN: ${projection.pn} seats`}
              >
                {projection.pn > 0 && projection.pn}
              </div>
            </div>
            {/* Baseline comparison bar */}
            <div className="flex h-3 rounded-sm overflow-hidden border border-border/20 mt-1 opacity-60">
              <div style={{ width: `${(DUN_COALITION_COUNTS.BN / 28) * 100}%`, backgroundColor: "#0B3D91" }} />
              <div style={{ width: `${(DUN_COALITION_COUNTS.PH / 28) * 100}%`, backgroundColor: "#E22926" }} />
              <div style={{ width: `${(DUN_COALITION_COUNTS.PN / 28) * 100}%`, backgroundColor: "#019C2D" }} />
            </div>
            <div className="text-[8px] text-muted-foreground mt-0.5 text-center">↑ Projected · ↓ Baseline (PRN15)</div>
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
          {/* Reset button */}
          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground hover:text-mlk h-7"
              onClick={() => {
                setTurnout(75);
                setSwingFactor(8);
                setYouthBoost(5);
                setSeniorBoost(3);
                setUndecided(12);
                setDapToMca(0);
                setDapToMic(0);
              }}
            >
              <RefreshCw className="h-3 w-3 me-1" /> Reset to defaults
            </Button>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            <strong className="text-mlk">Realistic per-DUN model</strong> (grounded in ElectionData.MY candidate data):
            PN→BN swing capped at 2 seats (only N11+N24 are PN-won).
            DAP→MCA capped at 4 seats (only N16/N19/N20/N22 are DAP-won — MCA contests these urban Chinese seats).
            DAP→MIC capped at 2 seats (MIC only contests Indian-majority DUNs like N07 Gadek, not all 28).
            Uncertainty is asymmetric: parties at 0 seats can only go up.
            {liveBaseline ? ` Baseline from ${liveBaseline.source}.` : " Baseline: PRN15 static data."}
            Not a political prediction.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
