"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// S2D Signal types per S2D Architecture_v2.txt §2
export type SignalSeverity = "critical" | "warning" | "info";
export type SignalStatus = "new" | "acknowledged" | "acting" | "resolved";
export type SignalSource = "engine-demographics" | "dpt-churn" | "elections" | "dosm-socioeconomic" | "public-communication";
export type AnalyticalLevel = "descriptive" | "diagnostic" | "predictive" | "prescriptive";

export interface S2DSignal {
  id: string;
  timestamp: string;
  source: SignalSource;
  severity: SignalSeverity;
  level: AnalyticalLevel;
  title: string;
  description: string;
  parliament?: string;
  dun?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  status: SignalStatus;
  action?: string;
  recommendation?: string;
}

interface S2DState {
  signals: S2DSignal[];
  loopStatus: "sensing" | "deciding" | "acting";
  lastActionAt: string | null;
  addSignal: (s: Omit<S2DSignal, "id" | "timestamp" | "status">) => void;
  updateSignalStatus: (id: string, status: SignalStatus, action?: string) => void;
  setLoopStatus: (s: "sensing" | "deciding" | "acting") => void;
  clearResolved: () => void;
  seedIfEmpty: () => void;
}

function genId() {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useS2DStore = create<S2DState>()(
  persist(
    (set, get) => ({
      signals: [],
      loopStatus: "sensing",
      lastActionAt: null,

      addSignal: (s) =>
        set((state) => ({
          signals: [
            { ...s, id: genId(), timestamp: new Date().toISOString(), status: "new" as SignalStatus },
            ...state.signals,
          ].slice(0, 50),
          loopStatus: "deciding",
        })),

      updateSignalStatus: (id, status, action) =>
        set((state) => ({
          signals: state.signals.map((s) =>
            s.id === id ? { ...s, status, action: action ?? s.action } : s
          ),
          loopStatus: status === "resolved" ? "sensing" : "acting",
          lastActionAt: status === "acting" || status === "resolved" ? new Date().toISOString() : state.lastActionAt,
        })),

      setLoopStatus: (s) => set({ loopStatus: s }),

      clearResolved: () =>
        set((state) => ({
          signals: state.signals.filter((s) => s.status !== "resolved"),
        })),

      seedIfEmpty: () => {
        const state = get();
        if (state.signals.length > 0) return;

        // Seed with real P134 engine signals (from the archive's pre-generated data)
        const seeded: S2DSignal[] = [
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "engine-demographics",
            severity: "critical",
            level: "descriptive",
            title: "Senior dependency 30.6% in N05 Taboh Naning",
            description: "30.6% of voters are 56+ (threshold: 30%). Aging-population risk. P134 engine data: 11,265 voters.",
            parliament: "134",
            dun: "05",
            metric: "senior_dependency_percent",
            value: 30.6,
            threshold: 30,
            status: "new",
            recommendation: "Targeted senior outreach program · Healthcare accessibility review",
          },
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "engine-demographics",
            severity: "warning",
            level: "descriptive",
            title: "Senior dependency 27.7% in N03 Ayer Limau",
            description: "27.7% of voters are 56+ (warning: 25%). Approaching critical threshold. P134 engine data: 15,309 voters.",
            parliament: "134",
            dun: "03",
            metric: "senior_dependency_percent",
            value: 27.7,
            threshold: 25,
            status: "new",
            recommendation: "Monitor trend · Schedule community engagement",
          },
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "engine-demographics",
            severity: "warning",
            level: "diagnostic",
            title: "Gender imbalance 95.8 in N05 Taboh Naning",
            description: "Gender balance score 95.8 (lowest in P134). Indicates male-female voter ratio skew.",
            parliament: "134",
            dun: "05",
            metric: "gender_balance_score",
            value: 95.8,
            threshold: 90,
            status: "new",
            recommendation: "Investigate demographic shift · Gender-targeted registration drive",
          },
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "dpt-churn",
            severity: "warning",
            level: "descriptive",
            title: "DPT net +5,240 across Melaka (5 months)",
            description: "5-month voter-roll additions exceed threshold. P134 net +840, P137 net +1,100 (highest).",
            parliament: "137",
            metric: "dpt_net",
            value: 5240,
            threshold: 500,
            status: "new",
            recommendation: "Voter registration verification drive · New voter engagement campaign",
          },
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "elections",
            severity: "info",
            level: "diagnostic",
            title: "GE15 parliament split: PN 4 / PH 2 / BN 0",
            description: "Melaka parliament split for first time. PN won P134, P135, P136, P139. PH held P137, P138.",
            metric: "ge15_split",
            status: "acknowledged",
            recommendation: "Coalition strategy review · Constituency sentiment polling",
          },
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "dosm-socioeconomic",
            severity: "info",
            level: "descriptive",
            title: "Jasin district: highest poverty rate (0.8%) + Gini (0.405)",
            description: "Jasin has the highest poverty rate and income inequality in Melaka. Median income RM4,750 (lowest).",
            metric: "poverty_rate",
            value: 0.8,
            threshold: 0.5,
            status: "new",
            recommendation: "Economic development focus · Targeted assistance programs",
          },
          {
            id: genId(),
            timestamp: new Date().toISOString(),
            source: "engine-demographics",
            severity: "info",
            level: "predictive",
            title: "P134 voter profile: 71,415 verified · 99.93% completeness",
            description: "P134 Masjid Tanah has the most complete engine data. Profile completeness 99.93%, confidence 0.999997.",
            parliament: "134",
            metric: "profile_completeness",
            value: 99.93,
            threshold: 95,
            status: "acknowledged",
            recommendation: "Use P134 as reference constituency for cross-state calibration",
          },
        ];
        set({ signals: seeded, loopStatus: "deciding" });
      },
    }),
    { name: "pip-mlk-s2d" }
  )
);
