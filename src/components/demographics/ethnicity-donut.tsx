"use client";

// ponytail: MLK — Ethnicity donut chart for the Demographics module.
// Renders 6 groups (MALAY / CHINESE / INDIAN / BUMIPUTERA / OTHER / UNKNOWN)
// using a Recharts PieChart with innerRadius (donut).
//
// Implements WORKLOAD.md Phase 6 (Demographics) + DESIGN.md §3 (Demographics
// panel). If `dominantEthnicityGroup === "OTHER"` (gate 6 unfixed —
// transformer bug), shows a placeholder instead of the chart.
//
// ponytail: MLK — Bug A (gate 6 — ethnicity) was PATCHED in Phase 1.3:
// transformer's `normalizeEthnicity()` field list reordered from
// ["KAUM2", "KAUM", "BANGSA"] → ["BANGSA", "KAUM2", "KAUM"]. All 6 PIP-MLK
// parliaments now report dominant_ethnicity_group = "MALAY" (verified).
// The placeholder branch is a defensive check in case a future pipeline run
// regresses.
//
// WCAG 2.1 AA: visible caption + aria-label on the chart container +
// prefers-reduced-motion honoured. Color never sole carrier — every slice
// has a numeric value + label in the legend.

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETHNICITY_COLORS } from "@/lib/party-colors";
import type { EthnicityKey } from "./types";

export interface EthnicityDonutProps {
  ethnicityCounts: Partial<Record<EthnicityKey, number>>;
  dominantEthnicityGroup?: string;
  className?: string;
}

const ORDER: EthnicityKey[] = [
  "MALAY",
  "CHINESE",
  "INDIAN",
  "BUMIPUTERA",
  "OTHER",
  "UNKNOWN",
];

const LABELS: Record<EthnicityKey, string> = {
  MALAY: "Malay",
  CHINESE: "Chinese",
  INDIAN: "Indian",
  BUMIPUTERA: "Bumiputera",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface TooltipPayloadItem {
  payload?: { key: string; label: string; value: number; pct: number };
}
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div
      className="rounded-md border border-slate-200 bg-white p-2 text-xs shadow-md dark:border-slate-800 dark:bg-slate-900"
      role="tooltip"
    >
      <div className="font-semibold">{p.label}</div>
      <div className="mt-0.5 text-muted-foreground">
        Count: <span className="font-mono tabular-nums">{p.value.toLocaleString()}</span>{" "}
        ({p.pct.toFixed(1)}%)
      </div>
    </div>
  );
}

export function EthnicityDonut({
  ethnicityCounts,
  dominantEthnicityGroup,
  className,
}: EthnicityDonutProps) {
  const reduced = usePrefersReducedMotion();

  // Gate 6 check — placeholder if dominant ethnicity is OTHER (means
  // transformer bug regressed and ALL voters were bucketed to OTHER).
  if (dominantEthnicityGroup === "OTHER") {
    return (
      <div
        className={cn(
          "flex h-72 flex-col items-center justify-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm text-amber-800 dark:text-amber-300",
          className
        )}
        role="alert"
        aria-label="Ethnicity data pending pipeline bug fix"
      >
        <AlertTriangle className="h-6 w-6" aria-hidden />
        <div>
          <p className="font-semibold">Ethnicity data pending pipeline bug fix</p>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
            <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-900/40">
              dominant_ethnicity_group = "OTHER"
            </code>{" "}
            indicates the engine transformer's{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-900/40">
              normalizeEthnicity()
            </code>{" "}
            is bucketing all voters to OTHER (provenance gate 6 regression).
            See worklog Phase 1.3 fix.
          </p>
        </div>
      </div>
    );
  }

  const data = ORDER.map((key) => ({
    key,
    label: LABELS[key],
    value: ethnicityCounts[key] ?? 0,
    color: ETHNICITY_COLORS[key] ?? "#94a3b8",
  })).filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const dataWithPct = data.map((d) => ({
    ...d,
    pct: total > 0 ? (d.value / total) * 100 : 0,
  }));

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex h-72 items-center justify-center text-sm text-muted-foreground",
          className
        )}
        role="status"
      >
        No ethnicity data available.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Ethnicity</h3>
        <span className="text-xs text-muted-foreground">
          Dominant: <span className="font-semibold">{dominantEthnicityGroup ?? "—"}</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground" id="ethnicity-caption">
        6-group donut (Malay / Chinese / Indian / Bumiputera / Other / Unknown).
        PDPA-safe aggregate — no individual-level race data exposed.
      </p>
      <div
        role="img"
        aria-labelledby="ethnicity-caption"
        aria-label={`Ethnicity donut chart. ${dataWithPct
          .map((d) => `${d.label}: ${d.value.toLocaleString()} (${d.pct.toFixed(1)} percent)`)
          .join("; ")}.`}
        className="h-60 w-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]"
        tabIndex={0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithPct}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              isAnimationActive={!reduced}
            >
              {dataWithPct.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={<ChartTooltip />}
              isAnimationActive={!reduced}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => {
                const item = dataWithPct.find((d) => d.label === value);
                if (!item) return value;
                return `${value} — ${item.pct.toFixed(1)}%`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Total: {total.toLocaleString()} voters. Source: engine aggregate JSONL
        (ethnicity_counts). All values PDPA-safe.
      </p>
    </div>
  );
}
