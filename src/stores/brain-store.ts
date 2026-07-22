"use client";

// ponytail: MLK — Digital Brain store. Per-module Zustand store, safe-merged
// to prevent prototype pollution on hydration (PIP-N9 pattern, AGENT.md §4.1).
// Holds the active lens mode + the currently-selected graph node id (the side
// panel reads this). NO sentiment weighting (DG_NO_LIVE_SENTIMENT — the graph
// is structural only). The 4 timeline scenarios live in `useDashboardStore`
// (shared with 3D map + elections module) so this store stays lean.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BrainLensMode =
  | "constituency"
  | "coalition"
  | "demographics"
  | "timeline";

interface BrainState {
  /** Active lens mode (4 — see WORKLOAD.md Phase 4 §4.1). */
  lensMode: BrainLensMode;
  setLensMode: (m: BrainLensMode) => void;

  /**
   * Selected graph node id. Encodes the node kind + key:
   *   `dun:134|01`         — DUN node
   *   `parl:134`           — parliament node
   *   `district:041`       — district node
   *   `coalition:BN`       — coalition node
   * `null` when nothing is selected (panel shows a placeholder).
   */
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  /** Currently-hovered node id (for tooltip highlighting). */
  hoverNodeId: string | null;
  setHoverNodeId: (id: string | null) => void;

  /**
   * Latest d3-force simulation alpha (0 → 1). Surfaced in the UI as a small
   * "stabilising…" indicator. The graph component writes it; the UI reads it.
   */
  forceAlpha: number;
  setForceAlpha: (a: number) => void;
}

// ponytail: MLK — safe-merge to prevent prototype pollution on hydration
// (every field validated before acceptance; bad values fall back to defaults).
function safeMerge(stored: unknown, current: BrainState): BrainState {
  if (!stored || typeof stored !== "object") return current;
  const s = stored as Partial<BrainState>;
  const validLens: BrainLensMode[] = [
    "constituency",
    "coalition",
    "demographics",
    "timeline",
  ];
  return {
    ...current,
    lensMode:
      typeof s.lensMode === "string" && validLens.includes(s.lensMode as BrainLensMode)
        ? (s.lensMode as BrainLensMode)
        : current.lensMode,
    selectedNodeId:
      typeof s.selectedNodeId === "string" ? s.selectedNodeId : null,
    hoverNodeId: typeof s.hoverNodeId === "string" ? s.hoverNodeId : null,
    forceAlpha:
      typeof s.forceAlpha === "number" && isFinite(s.forceAlpha)
        ? s.forceAlpha
        : current.forceAlpha,
  };
}

export const useBrainStore = create<BrainState>()(
  persist(
    (set) => ({
      lensMode: "constituency",
      setLensMode: (m) => set({ lensMode: m }),
      selectedNodeId: null,
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      hoverNodeId: null,
      setHoverNodeId: (id) => set({ hoverNodeId: id }),
      forceAlpha: 1,
      setForceAlpha: (a) => set({ forceAlpha: a }),
    }),
    {
      name: "pip-mlk-brain",
      storage: createJSONStorage(() => localStorage),
      merge: (stored, current) => safeMerge(stored, current as BrainState),
    }
  )
);
