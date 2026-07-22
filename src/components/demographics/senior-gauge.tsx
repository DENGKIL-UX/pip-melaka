"use client";

// ponytail: MLK — Senior dependency gauge for the Demographics module.
// Shows senior_dependency_percent (56+ voters / total) as a semicircular
// gauge with 3 zones: green <20, amber 20–30, red >30.
//
// Implements WORKLOAD.md Phase 6 (Demographics) + DESIGN.md §3 (Demographics
// panel). Pure SVG (no chart library) — matches the socioeconomic GiniGauge
// pattern.
//
// Thresholds match the Risk module's senior_dependency signal: critical >30%,
// warning >25%, OK ≤25%. Here we use a slightly simplified 3-zone scale:
//   green  < 20  (low dependency — young electorate)
//   amber  20–30 (moderate — approaching critical)
//   red    > 30  (high — aging-population risk)
//
// WCAG 2.1 AA: visible caption + aria-label on the SVG. Color never sole
// carrier — zone label always shown with the numeric value.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeniorGaugeProps {
  seniorDependencyPercent?: number;
  className?: string;
}

const GAUGE_MAX = 50; // 0–50% range
const ZONES = [
  { from: 0, to: 20, color: "#10b981", label: "Low (<20%)" },
  { from: 20, to: 30, color: "#f59e0b", label: "Moderate (20–30%)" },
  { from: 30, to: GAUGE_MAX, color: "#ef4444", label: "High (>30%)" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function zoneFor(value: number) {
  return ZONES.find((z) => value >= z.from && value < z.to) ?? ZONES[ZONES.length - 1];
}

export function SeniorGauge({
  seniorDependencyPercent,
  className,
}: SeniorGaugeProps) {
  const value = seniorDependencyPercent ?? 0;
  const clamped = Math.max(0, Math.min(GAUGE_MAX, value));
  const zone = zoneFor(clamped);

  // 180° semicircular gauge — angle 180° (left) → 0° (right).
  // value=0   → angle 180
  // value=50  → angle 0
  const valueAngle = 180 - (clamped / GAUGE_MAX) * 180;

  const cx = 110;
  const cy = 100;
  const r = 80;
  const needleR = r + 8;

  const needleEnd = polar(cx, cy, needleR, valueAngle);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Senior dependency</h3>
        <span
          className="text-xs font-semibold"
          style={{ color: zone.color }}
          aria-hidden
        >
          {zone.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground" id="senior-caption">
        Share of voters aged 56+ (senior_dependency_percent). Green &lt;20%,
        amber 20–30%, red &gt;30%.
      </p>
      <div className="flex justify-center">
        <svg
          viewBox="0 0 220 130"
          className="h-32 w-full max-w-[260px]"
          role="img"
          aria-labelledby="senior-caption"
          aria-label={`Senior dependency gauge. Value: ${value.toFixed(1)} percent. Zone: ${zone.label}.`}
        >
          {/* Zone arcs */}
          {ZONES.map((z) => {
            const startAngle = 180 - (z.to / GAUGE_MAX) * 180;
            const endAngle = 180 - (z.from / GAUGE_MAX) * 180;
            return (
              <path
                key={z.label}
                d={arcPath(cx, cy, r, startAngle, endAngle)}
                fill="none"
                stroke={z.color}
                strokeWidth={14}
                strokeLinecap="butt"
                opacity={z.label === zone.label ? 1 : 0.35}
              />
            );
          })}

          {/* Tick marks at 0, 10, 20, 30, 40, 50 */}
          {[0, 10, 20, 30, 40, 50].map((tick) => {
            const angle = 180 - (tick / GAUGE_MAX) * 180;
            const inner = polar(cx, cy, r - 10, angle);
            const outer = polar(cx, cy, r - 4, angle);
            const label = polar(cx, cy, r - 22, angle);
            return (
              <g key={tick}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#475569"
                  strokeWidth={1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill="currentColor"
                  fontSize="9"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-muted-foreground"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke="#0f172a"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={5} fill="#0f172a" />

          {/* Digital readout */}
          <text
            x={cx}
            y={cy + 28}
            fill="currentColor"
            fontSize="18"
            fontWeight="700"
            textAnchor="middle"
            className="fill-foreground"
          >
            {value.toFixed(1)}%
          </text>
          <text
            x={cx}
            y={cy + 42}
            fill="currentColor"
            fontSize="9"
            textAnchor="middle"
            className="fill-muted-foreground"
          >
            56+ voters / total
          </text>
        </svg>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Source: engine aggregate JSONL (senior_voters_56_plus / total_voters).
      </p>
    </div>
  );
}
