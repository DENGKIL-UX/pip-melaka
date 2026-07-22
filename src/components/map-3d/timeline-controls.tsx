"use client";

// ponytail: MLK — Timeline controls for the 3D map (4 scenarios + 2026 dropdown).
// Implements WORKLOAD.md Phase 3 §3.1 + DESIGN.md §3 row 2 (timeline morph).
// Pattern: 4 scenario buttons (GE14 / PRN15 / GE15 / PROJ_2026) + a Select
// dropdown for the 2026 sub-scenario (only visible when PROJ_2026 is active).
// Keyboard accessible (Alt+1-4 shortcuts). Honours `prefers-reduced-motion`:
// the parent uses `reducedMotion` to snap morphs rather than animate.
//
// WCAG 2.1 AA: 3px solid #C77B2C focus-visible ring, 44×44px touch targets,
// aria-pressed on every scenario button, aria-label on the canvas text-alternative.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MLK_ACCENT } from "@/lib/party-colors";
import type {
  ScenarioId,
  ProjSubScenarioId,
  ScenarioMorphPlan,
} from "./extrusions";

export interface TimelineControlsProps {
  scenario: ScenarioId;
  projSubId: ProjSubScenarioId;
  onScenarioChange: (s: ScenarioId) => void;
  onProjSubChange: (s: ProjSubScenarioId) => void;
  /** The caption from the most recently-applied morph plan. */
  caption?: string;
  /** Seat summary from the most recently-applied morph plan. */
  seatSummary?: Record<string, number>;
  /** The available projection sub-scenarios (label + id). */
  projSubOptions?: Array<{ id: ProjSubScenarioId; label: string }>;
  className?: string;
}

const SCENARIO_BUTTONS: Array<{
  id: ScenarioId;
  label: string;
  short: string;
  description: string;
}> = [
  { id: "GE14", label: "GE14 2018", short: "GE14", description: "GE14 — 9 May 2018 (PH state govt)" },
  { id: "PRN15", label: "PRN15 2021", short: "PRN15", description: "PRN15 — 20 Nov 2021 (BN landslide 21/28)" },
  { id: "GE15", label: "GE15 2022", short: "GE15", description: "GE15 — 19 Nov 2022 (parliament-only)" },
  { id: "PROJ_2026", label: "PROJ 2026", short: "PROJ_2026", description: "2026 scenario projection (UNS + Monte Carlo)" },
];

const DEFAULT_PROJ_SUB_OPTIONS: Array<{ id: ProjSubScenarioId; label: string }> = [
  { id: "STATUS_QUO", label: "Status Quo (PRN15 hold)" },
  { id: "PN_SURGE", label: "PN Surge" },
  { id: "BN_SURGE", label: "BN Surge" },
  { id: "PH_SURGE", label: "PH Surge" },
  { id: "UNDI18_YOUTH", label: "Undi18 Youth Wave" },
];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

/** Returns the Tailwind classes for a scenario button (active vs inactive). */
function scenarioButtonClass(active: boolean): string {
  return cn(
    "h-11 min-w-[88px] px-3 py-2 text-xs sm:text-sm font-medium rounded-md border transition-colors",
    "touch-manipulation select-none",
    FOCUS_RING,
    active
      ? "bg-slate-100 text-slate-900 border-slate-100"
      : "bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-600"
  );
}

export function TimelineControls({
  scenario,
  projSubId,
  onScenarioChange,
  onProjSubChange,
  caption,
  seatSummary,
  projSubOptions = DEFAULT_PROJ_SUB_OPTIONS,
  className,
}: TimelineControlsProps) {
  // ponytail: MLK — Alt+1..4 keyboard shortcuts for the 4 scenarios.
  // Accessibility affordance for keyboard-only users (DESIGN.md §3 row 2).
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      // Don't hijack typing in inputs / selects / textareas.
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.key === "1") { e.preventDefault(); onScenarioChange("GE14"); }
      else if (e.key === "2") { e.preventDefault(); onScenarioChange("PRN15"); }
      else if (e.key === "3") { e.preventDefault(); onScenarioChange("GE15"); }
      else if (e.key === "4") { e.preventDefault(); onScenarioChange("PROJ_2026"); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onScenarioChange]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3 bg-slate-950/40 border-t border-slate-800",
        className
      )}
      role="toolbar"
      aria-label="Timeline scenario controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">
          Scenario:
        </span>
        {SCENARIO_BUTTONS.map((b) => {
          const active = scenario === b.id;
          return (
            <Button
              key={b.id}
              type="button"
              variant="ghost"
              aria-pressed={active}
              aria-label={`${b.description}${active ? " (active)" : ""}`}
              title={b.description}
              className={scenarioButtonClass(active)}
              onClick={() => onScenarioChange(b.id)}
            >
              {b.label}
            </Button>
          );
        })}

        {scenario === "PROJ_2026" && (
          <div className="flex items-center gap-2 ml-1">
            <span
              id="proj-sub-label"
              className="text-xs font-medium text-slate-400"
            >
              2026 scenario:
            </span>
            <Select
              value={projSubId}
              onValueChange={(v) => onProjSubChange(v as ProjSubScenarioId)}
            >
              <SelectTrigger
                aria-label="2026 projection sub-scenario"
                aria-describedby="proj-sub-label"
                className={cn(
                  "h-11 w-[200px] sm:w-[240px] text-xs sm:text-sm",
                  "bg-slate-900/70 border-slate-700 text-slate-200",
                  FOCUS_RING
                )}
              >
                <SelectValue placeholder="Pick a scenario" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                {projSubOptions.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={opt.id}
                    className="focus:bg-slate-800 focus:text-slate-100"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {caption && (
          <Badge
            variant="outline"
            className="ml-auto text-[10px] sm:text-xs border-slate-600 text-slate-300 bg-slate-900/60"
            title={caption}
          >
            {caption}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="italic">Click a scenario to morph DUN extrusions.</span>
        {seatSummary && Object.keys(seatSummary).length > 0 && (
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: MLK_ACCENT }} />
            <span>
              Seats:{" "}
              {["BN", "PH", "PN", "OTH", "Others"]
                .filter((k) => seatSummary[k])
                .map((k) => `${k} ${seatSummary[k]}`)
                .join(" · ")}
            </span>
          </span>
        )}
        <span className="hidden sm:inline opacity-60">
          Keyboard: Alt+1 GE14 · Alt+2 PRN15 · Alt+3 GE15 · Alt+4 PROJ_2026
        </span>
      </div>
    </div>
  );
}

/** Type re-export for consumers. */
export type { ScenarioId, ProjSubScenarioId, ScenarioMorphPlan };
