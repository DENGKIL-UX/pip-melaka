"use client";

// ponytail: MLK — Age bands bar chart for the Demographics module.
// Renders 8 age buckets (UNDER_18 greyed out — not in electorate; 18_20
// through 65_PLUS active) for the selected parliament.
//
// Implements WORKLOAD.md Phase 6 (Demographics) + DESIGN.md §3 (Demographics
// panel). Uses Recharts BarChart (recharts@2.15.4 installed in Phase 0).
//
// WCAG 2.1 AA: visible caption + aria-label on the chart container +
// prefers-reduced-motion honoured (isAnimationActive=false). Color never
// sole carrier — each bar has a numeric value label.

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import { cn } from "@/lib/utils";
import { AGE_BAND_COLORS } from "@/lib/party-colors";
import type { AgeBandKey } from "./types";

export interface AgeBandsChartProps {
  ageBandCounts: Partial<Record<AgeBandKey, number>>;
  className?: string;
}

const BAND_ORDER: AgeBandKey[] = [
  "UNDER_18",
  "18_20",
  "21_29",
  "30_39",
  "40_49",
  "50_55",
  "56_64",
  "65_PLUS",
];

const BAND_LABELS: Record<AgeBandKey, string> = {
  UNDER_18: "Under 18",
  "18_20": "18–20",
  "21_29": "21–29",
  "30_39": "30–39",
  "40_49": "40–49",
  "50_55": "50–55",
  "56_64": "56–64",
  "65_PLUS": "65+",
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
  payload?: { band: string; label: string; count: number; under18: boolean };
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
        Count: <span className="font-mono tabular-nums">{p.count.toLocaleString()}</span>
      </div>
      {p.under18 ? (
        <div className="text-[10px] text-muted-foreground">
          (Under 18 — not in electorate)
        </div>
      ) : null}
    </div>
  );
}

export function AgeBandsChart({ ageBandCounts, className }: AgeBandsChartProps) {
  const reduced = usePrefersReducedMotion();

  const data = React.useMemo(
    () =>
      BAND_ORDER.map((band) => ({
        band,
        label: BAND_LABELS[band],
        count: ageBandCounts[band] ?? 0,
        under18: band === "UNDER_18",
        color: AGE_BAND_COLORS[band] ?? "#94a3b8",
      })),
    [ageBandCounts]
  );

  const totalVoters = data
    .filter((d) => !d.under18)
    .reduce((sum, d) => sum + d.count, 0);
  const maxVoters = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Age bands</h3>
        <span className="text-xs text-muted-foreground">
          {totalVoters.toLocaleString()} known-age voters
        </span>
      </div>
      <p className="text-xs text-muted-foreground" id="age-bands-caption">
        8 age buckets. <span className="text-slate-500">Under 18 greyed out</span>
        — not part of the electorate (engine includes them for completeness
        but they cannot vote).
      </p>
      <div
        role="img"
        aria-labelledby="age-bands-caption"
        aria-label={`Age band bar chart. ${data
          .map((d) => `${d.label}: ${d.count.toLocaleString()}${d.under18 ? " (under 18, not in electorate)" : ""}`)
          .join("; ")}.`}
        className="h-60 w-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]"
        tabIndex={0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 16, right: 8, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "currentColor" }}
              stroke="#94a3b8"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "currentColor" }}
              stroke="#94a3b8"
              width={48}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
              }
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "#94a3b822" }}
              isAnimationActive={!reduced}
            />
            <Bar
              dataKey="count"
              name="Voters"
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reduced}
            >
              {data.map((d) => (
                <Cell
                  key={d.band}
                  fill={d.color}
                  opacity={d.under18 ? 0.4 : 1}
                />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                formatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                }
                style={{ fontSize: 10, fill: "#64748b" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Max bucket: {maxVoters.toLocaleString()} voters. Source: engine
        aggregate JSONL (per-parliament age_band_counts).
      </p>
    </div>
  );
}
