"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DashboardTab =
  | "overview" | "map-2d" | "map-3d" | "elections" | "demographics" | "analysis" | "risk" | "compare" | "s2d" | "s2d-360" | "scraper" | "public-comm" | "incidents" | "scenarios" | "predictive" | "insights" | "alerts" | "dual-layer" | "governance";

interface DashboardState {
  landed: boolean;
  activeTab: DashboardTab;
  selectedParliament: string | null;
  selectedDun: { parliament: string; dun: string; name: string } | null;
  setLanded: (v: boolean) => void;
  setActiveTab: (t: DashboardTab) => void;
  setSelectedParliament: (p: string | null) => void;
  setSelectedDun: (d: { parliament: string; dun: string; name: string } | null) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      landed: false,
      activeTab: "overview",
      selectedParliament: null,
      selectedDun: null,
      setLanded: (v) => set({ landed: v }),
      setActiveTab: (t) => set({ activeTab: t }),
      setSelectedParliament: (p) => set({ selectedParliament: p }),
      setSelectedDun: (d) => set({ selectedDun: d }),
    }),
    {
      name: "pip-mlk-dashboard",
      partialize: (s) => ({ landed: s.landed, activeTab: s.activeTab }),
    }
  )
);
