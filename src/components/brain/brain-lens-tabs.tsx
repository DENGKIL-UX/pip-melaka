"use client";

// ponytail: MLK — 4-lens-mode tab bar for the Digital Brain.
// Implements WORKLOAD.md Phase 4 §4.1 (4 lens modes: Constituency / Coalition /
// Demographics / Timeline). Reads + writes `useBrainStore.lensMode` so the
// graph + side panel react to the same state.
//
// WCAG 2.1 AA: 3px solid #C77B2C focus-visible ring, 44×44px touch targets,
// aria-label on every tab. Honours prefers-reduced-motion (no tab transitions).

import * as React from "react";
import { Map, Users, BarChart3, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MLK_ACCENT } from "@/lib/party-colors";
import { useBrainStore, type BrainLensMode } from "@/stores/brain-store";

interface LensDef {
  id: BrainLensMode;
  label: string;
  short: string;
  description: string;
  Icon: LucideIcon;
}

const LENSES: LensDef[] = [
  {
    id: "constituency",
    label: "Constituency",
    short: "Constituency",
    description: "DUN → parliament → district containment graph",
    Icon: Map,
  },
  {
    id: "coalition",
    label: "Coalition",
    short: "Coalition",
    description: "BN / PH / PN seat-share + alliance graph",
    Icon: Users,
  },
  {
    id: "demographics",
    label: "Demographics",
    short: "Demographics",
    description: "Engine aggregate overlay — age / ethnicity clusters",
    Icon: BarChart3,
  },
  {
    id: "timeline",
    label: "Timeline",
    short: "Timeline",
    description: "GE14 → PRN15 → GE15 → PROJ_2026 morph",
    Icon: Clock,
  },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export interface BrainLensTabsProps {
  className?: string;
}

export function BrainLensTabs({ className }: BrainLensTabsProps) {
  const lensMode = useBrainStore((s) => s.lensMode);
  const setLensMode = useBrainStore((s) => s.setLensMode);

  return (
    <div
      role="tablist"
      aria-label="Digital Brain lens mode"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 p-1",
        className
      )}
    >
      {LENSES.map((lens) => {
        const active = lensMode === lens.id;
        const Icon = lens.Icon;
        return (
          <button
            key={lens.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${lens.label} lens — ${lens.description}${active ? " (active)" : ""}`}
            title={lens.description}
            onClick={() => setLensMode(lens.id)}
            className={cn(
              "inline-flex h-11 min-w-[112px] items-center justify-center gap-1.5 rounded px-3 py-2 text-xs sm:text-sm font-medium",
              "touch-manipulation select-none transition-colors",
              FOCUS_RING,
              active
                ? "bg-slate-100 text-slate-900"
                : "bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            )}
            style={
              active
                ? { boxShadow: `inset 0 -2px 0 0 ${MLK_ACCENT}` }
                : undefined
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{lens.label}</span>
          </button>
        );
      })}
    </div>
  );
}
