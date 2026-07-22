"use client";

// ponytail: MLK — Risk legend. Three swatches (Critical / Warning / OK) with
// descriptions of the threshold bands. Inline companion to RiskGrid (DESIGN.md
// §3 row 5; WCAG 2.1 AA — color is never the sole carrier, text accompanies
// every swatch).

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]";

export interface RiskLegendProps {
  className?: string;
}

const ITEMS = [
  {
    level: "critical",
    label: "Critical",
    description: "Exceeds the primary threshold — needs attention.",
    Icon: AlertCircle,
    classes: "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300",
    swatch: "bg-red-500",
  },
  {
    level: "warning",
    label: "Warning",
    description: "In the intermediate band — approaching critical.",
    Icon: AlertTriangle,
    classes:
      "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300",
    swatch: "bg-amber-500",
  },
  {
    level: "ok",
    label: "OK",
    description: "Within the safe range.",
    Icon: CheckCircle2,
    classes:
      "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300",
    swatch: "bg-emerald-500",
  },
] as const;

export function RiskLegend({ className }: RiskLegendProps) {
  return (
    <div
      className={cn(
        "grid gap-1.5 sm:grid-cols-3",
        className
      )}
      role="list"
      aria-label="Risk level legend"
    >
      {ITEMS.map((item) => {
        const Icon = item.Icon;
        return (
          <div
            key={item.level}
            role="listitem"
            tabIndex={0}
            aria-label={`${item.label}: ${item.description}`}
            className={cn(
              "flex items-start gap-2 rounded border px-2.5 py-1.5 text-xs",
              item.classes,
              FOCUS_RING
            )}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{item.label}</span>
              <span className="ml-1 opacity-80">{item.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
