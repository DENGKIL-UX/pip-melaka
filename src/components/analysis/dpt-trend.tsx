"use client";

// ponytail: MLK — DPT 5-month trend chart. The HEADLINE visualization for
// Melaka's DPT feature (5-month consecutive coverage — best of any Malaysian
// state in PIP-MLK/N9). Unique to Melaka — PIP-N9 has only 1 month and no
// Trend tab.
//
// Implements WORKLOAD.md Phase 6.2 §6.2.5 + DESIGN.md §3.6 (Trend tab).
//
// Uses Recharts (recharts@2.15.4 — installed in Phase 0). 4 lines:
//   additions (green), deletions (red), net (blue), MoM delta (purple).
// Imports only the Recharts primitives we use (tree-shaken).
//
// WCAG 2.1 AA: visible caption + aria-label on the chart container +
// prefers-reduced-motion honoured (isAnimationActive=false).

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DPT_MONTHS } from "@/lib/melaka-constants";
import type { DptSummaryPerMonth } from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]";

export interface DptTrendProps {
  perMonth: DptSummaryPerMonth[];
  className?: string;
}

interface TrendPoint {
  month: string;
  short: string;
  additions: number;
  deletions: number;
  net: number;
  momDelta: number;
}

function buildTrendData(perMonth: DptSummaryPerMonth[]): TrendPoint[] {
  return perMonth.map((m, idx) => {
    const prev = idx > 0 ? perMonth[idx - 1].net : m.net;
    const monthMeta = DPT_MONTHS.find((mm) => mm.code === m.month);
    return {
      month: m.month,
      short: monthMeta?.short ?? m.month_label.slice(0, 3),
      additions: m.additions,
      deletions: m.deletions,
      net: m.net,
      momDelta: m.net - prev,
    };
  });
}

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
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border border-slate-200 bg-white p-2 text-xs shadow-md dark:border-slate-800 dark:bg-slate-900"
      role="tooltip"
    >
      <div className="mb-1 font-semibold">{label}</div>
      <ul className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-mono tabular-nums">
              {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DptTrend({ perMonth, className }: DptTrendProps) {
  const reduced = usePrefersReducedMotion();
  const data = React.useMemo(() => buildTrendData(perMonth), [perMonth]);

  if (perMonth.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        No DPT monthly data available.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[#C77B2C]" aria-hidden />
        <h3 className="text-sm font-semibold">
          5-month trend — additions / deletions / net / MoM delta
        </h3>
      </div>
      <p className="text-xs text-muted-foreground" id="dpt-trend-caption">
        Bar shows month-over-month change in net additions. Net = additions
        minus deletions. MoM delta = current month net minus previous month net.
      </p>
      <div
        role="img"
        aria-labelledby="dpt-trend-caption"
        aria-label={`DPT 5-month trend chart. Months: ${data
          .map(
            (d) =>
              `${d.short}: additions ${d.additions}, deletions ${d.deletions}, net ${d.net}, MoM delta ${d.momDelta >= 0 ? "+" : ""}${d.momDelta}`
          )
          .join("; ")}.`}
        className={cn("h-72 w-full", FOCUS_RING)}
        tabIndex={0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
            <XAxis
              dataKey="short"
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke="#94a3b8"
            />
            <YAxis
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke="#94a3b8"
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              isAnimationActive={!reduced}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="additions"
              name="Additions"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={!reduced}
            />
            <Line
              type="monotone"
              dataKey="deletions"
              name="Deletions"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={!reduced}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#0F7DC2"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              isAnimationActive={!reduced}
            />
            <Line
              type="monotone"
              dataKey="momDelta"
              name="MoM delta"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
              isAnimationActive={!reduced}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
