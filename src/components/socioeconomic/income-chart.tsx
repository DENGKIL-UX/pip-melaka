"use client";

// ponytail: MLK — Median household income horizontal bar chart (pure SVG).
// Implements WORKLOAD.md Phase 5 §5.2 + DESIGN.md §3 row 7.
//
// ponytail: MLK — package.json has `echarts` but NOT `echarts-for-react`. Per
// the `echarts-dashboard-panels` skill spec, we use a pure-SVG fallback (no
// new dependencies, ~1KB vs ~330KB for full echarts). The chart is fully
// accessible: <title> for screen readers, aria-label on the SVG, text labels
// on every bar.
//
// Bars: 3 districts + state average (highlighted). Width responsive (SVG
// viewBox 360×200, scales to container width).

import * as React from "react";
import { cn } from "@/lib/utils";
import { MLK_ACCENT } from "@/lib/party-colors";

export interface IncomeDatum {
  label: string;
  /** RM/month household. */
  income: number;
  /** True for the state-average row (highlighted). */
  isState?: boolean;
}

export interface IncomeChartProps {
  data: IncomeDatum[];
  className?: string;
}

const VIEW_W = 360;
const VIEW_H = 200;
const PAD_LEFT = 110; // space for district labels
const PAD_RIGHT = 60; // space for value labels
const PAD_TOP = 12;
const PAD_BOTTOM = 12;
const BAR_H = 24;
const BAR_GAP = 12;

export function IncomeChart({ data, className }: IncomeChartProps) {
  if (data.length === 0) return null;

  const maxIncome = Math.max(...data.map((d) => d.income));
  // Round up to nearest 1000 for a clean axis.
  const xMax = Math.ceil(maxIncome / 1000) * 1000;
  const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const plotH = data.length * (BAR_H + BAR_GAP) - BAR_GAP;

  const scale = (v: number) => (v / xMax) * plotW;

  // Gridlines at 0, 25%, 50%, 75%, 100% of xMax.
  const gridlines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    x: PAD_LEFT + f * plotW,
    label: `RM ${Math.round(f * xMax).toLocaleString()}`,
  }));

  return (
    <svg
      role="img"
      aria-label={`Median household income horizontal bar chart — ${data
        .map((d) => `${d.label}: RM ${d.income.toLocaleString()}`)
        .join("; ")}`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={VIEW_H}
      className={cn("block", className)}
    >
      {/* Gridlines */}
      {gridlines.map((g, i) => (
        <g key={i}>
          <line
            x1={g.x}
            x2={g.x}
            y1={PAD_TOP}
            y2={PAD_TOP + plotH}
            stroke="#1e293b"
            strokeWidth={1}
          />
          <text
            x={g.x}
            y={VIEW_H - 2}
            textAnchor="middle"
            fontSize={9}
            fill="#64748b"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const y = PAD_TOP + i * (BAR_H + BAR_GAP);
        const w = scale(d.income);
        const fill = d.isState ? MLK_ACCENT : "#0ea5e9";
        return (
          <g key={d.label}>
            <title>{`${d.label}: RM ${d.income.toLocaleString()} / month household`}</title>
            {/* Label */}
            <text
              x={PAD_LEFT - 8}
              y={y + BAR_H / 2 + 3}
              textAnchor="end"
              fontSize={10}
              fontWeight={d.isState ? 700 : 400}
              fill={d.isState ? "#f1f5f9" : "#cbd5e1"}
            >
              {d.label}
              {d.isState ? " (state)" : ""}
            </text>
            {/* Bar */}
            <rect
              x={PAD_LEFT}
              y={y}
              width={w}
              height={BAR_H}
              fill={fill}
              stroke={d.isState ? "#fff" : "transparent"}
              strokeWidth={d.isState ? 1 : 0}
              rx={2}
            />
            {/* Value label */}
            <text
              x={PAD_LEFT + w + 4}
              y={y + BAR_H / 2 + 3}
              textAnchor="start"
              fontSize={10}
              fontWeight={600}
              fill="#e2e8f0"
            >
              RM {d.income.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
