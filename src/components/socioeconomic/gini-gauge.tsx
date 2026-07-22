"use client";

// ponytail: MLK — Gini coefficient gauge (pure SVG).
// Implements WORKLOAD.md Phase 5 §5.2 + DESIGN.md §3 row 7.
//
// Pure-SVG fallback per the `echarts-dashboard-panels` skill spec — no new
// dependency (~1KB vs ~330KB for full echarts). State Gini = 0.382 → "low
// inequality" green zone (0.30–0.40 band per World Bank classification).
//
// Gauge geometry: 180° semicircular arc from 0 (left) to 1 (right). Color
// zones: 0–0.30 deep green (very equal), 0.30–0.40 green (low inequality),
// 0.40–0.50 amber (moderate), 0.50+ red (high inequality). A needle marks
// the current value; a digital readout shows the number.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GiniGaugeProps {
  /** Gini coefficient (0 = perfect equality, 1 = perfect inequality). */
  value: number;
  className?: string;
}

const VIEW_W = 240;
const VIEW_H = 140;
const CX = VIEW_W / 2;
const CY = 110;
const R_OUTER = 90;
const R_INNER = 70;
const R_NEEDLE = 76;

// Arc helpers — semicircle from 180° (left) to 360°/0° (right).
// Angle conversion: gini 0 → 180°, gini 1 → 360°.
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 0) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  // Sweep flag = 1 for the outer arc going clockwise.
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

interface Zone {
  label: string;
  from: number;
  to: number;
  color: string;
}

const ZONES: Zone[] = [
  { label: "Very equal", from: 0, to: 0.3, color: "#15803d" },
  { label: "Low inequality", from: 0.3, to: 0.4, color: "#65a30d" },
  { label: "Moderate", from: 0.4, to: 0.5, color: "#d97706" },
  { label: "High inequality", from: 0.5, to: 1, color: "#b91c1c" },
];

function giniToAngle(g: number): number {
  return 180 + Math.max(0, Math.min(1, g)) * 180;
}

function zoneForValue(g: number): Zone | undefined {
  return ZONES.find((z) => g >= z.from && g < z.to) ?? ZONES[ZONES.length - 1];
}

export function GiniGauge({ value, className }: GiniGaugeProps) {
  const v = Math.max(0, Math.min(1, value));
  const needleAngle = giniToAngle(v);
  const needleEnd = polarToCartesian(CX, CY, R_NEEDLE, needleAngle);
  const activeZone = zoneForValue(v);

  return (
    <svg
      role="img"
      aria-label={`Gini coefficient gauge. Current value: ${v.toFixed(
        3
      )}. Zone: ${activeZone?.label ?? "unknown"} (0 = perfect equality, 1 = perfect inequality).`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={VIEW_H}
      className={cn("block", className)}
    >
      <title>
        Gini coefficient gauge — value {v.toFixed(3)}, {activeZone?.label}
      </title>

      {/* Zone arcs (outer band) */}
      {ZONES.map((zone, i) => (
        <path
          key={i}
          d={arcPath(CX, CY, R_OUTER, giniToAngle(zone.from), giniToAngle(zone.to))}
          stroke={zone.color}
          strokeWidth={12}
          fill="none"
          opacity={zone === activeZone ? 1 : 0.4}
        />
      ))}

      {/* Inner ring (visual depth) */}
      <path
        d={arcPath(CX, CY, R_INNER, 180, 360)}
        stroke="#1e293b"
        strokeWidth={1}
        fill="none"
      />

      {/* Tick labels at 0, 0.25, 0.5, 0.75, 1 */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const angle = giniToAngle(tick);
        const p1 = polarToCartesian(CX, CY, R_OUTER + 6, angle);
        const p2 = polarToCartesian(CX, CY, R_OUTER + 14, angle);
        const label = polarToCartesian(CX, CY, R_OUTER + 22, angle);
        return (
          <g key={tick}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#475569"
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y + 3}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Needle */}
      <line
        x1={CX}
        y1={CY}
        x2={needleEnd.x}
        y2={needleEnd.y}
        stroke="#f1f5f9"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={5} fill="#f1f5f9" />
      <circle cx={CX} cy={CY} r={2} fill="#0f172a" />

      {/* Digital readout */}
      <text
        x={CX}
        y={CY - 28}
        textAnchor="middle"
        fontSize={20}
        fontWeight={700}
        fill={activeZone?.color ?? "#f1f5f9"}
      >
        {v.toFixed(3)}
      </text>
      <text
        x={CX}
        y={CY - 14}
        textAnchor="middle"
        fontSize={9}
        fill="#94a3b8"
      >
        Gini · {activeZone?.label}
      </text>
    </svg>
  );
}
