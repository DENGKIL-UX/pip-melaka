"use client";

// ponytail: MLK — 2026 scenario projection card. Renders the 5 projection
// scenarios (PN Surge / BN Surge / PH Surge / Status Quo / Undi18 Youth)
// with per-scenario seat counts (BN/PH/PN) + 90% CI + a colored mini-bar chart.
//
// Implements WORKLOAD.md Phase 6.1 §6.1.3 + DESIGN.md §3 row 4. Caption:
// "Uniform National Swing (UNS) + Monte Carlo (10,000 iterations).
// Methodology: Ong Kian Ming / ISEAS Perspective 2023/52. This is a SCENARIO
// PROJECTION, not a probabilistic forecast." Tag `evidence_tier: "Indicative"`.
//
// WCAG 2.1 AA: 3px #C77B2C focus-visible ring skipped (no interactive
// controls — pure visualization). Color never sole carrier — every seat
// count is labelled with text + a numeric value.

import * as React from "react";
import { TrendingUp, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PARTY_COLORS, EVIDENCE_TIER_COLORS } from "@/lib/party-colors";
import type { Projection2026, ProjectionScenario } from "./types";

export interface Projection2026Props {
  projection: Projection2026;
  className?: string;
}

interface ScenarioBarPart {
  code: "BN" | "PH" | "PN" | "Others";
  count: number;
  color: string;
}

function ScenarioCard({ s, total }: { s: ProjectionScenario; total: number }) {
  const parts: ScenarioBarPart[] = [
    { code: "BN", count: s.dun_seats.BN, color: PARTY_COLORS.BN },
    { code: "PH", count: s.dun_seats.PH, color: PARTY_COLORS.PH },
    { code: "PN", count: s.dun_seats.PN, color: PARTY_COLORS.PN },
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-slate-200 bg-card p-3 dark:border-slate-800"
      aria-label={`${s.label} scenario — BN ${s.dun_seats.BN}, PH ${s.dun_seats.PH}, PN ${s.dun_seats.PN}; 90% confidence interval ${s.confidence_90[0]} to ${s.confidence_90[1]} for the leading coalition`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: s.color }}
            aria-hidden
          />
          <span className="text-sm font-semibold">{s.label}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          90% CI [{s.confidence_90[0]}, {s.confidence_90[1]}]
        </span>
      </div>

      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="img"
        aria-label={`${s.label} seat distribution bar: BN ${s.dun_seats.BN} of ${total}, PH ${s.dun_seats.PH} of ${total}, PN ${s.dun_seats.PN} of ${total}`}
      >
        {parts.map((p) => (
          <span
            key={p.code}
            className="h-full"
            style={{
              backgroundColor: p.color,
              width: `${(p.count / total) * 100}%`,
            }}
            aria-hidden
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {parts.map((p) => (
          <span
            key={p.code}
            className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs"
            style={{
              backgroundColor: `${p.color}1A`,
              color: p.color,
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <span className="font-semibold">{p.code}</span>
            <span className="font-mono tabular-nums">{p.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Projection2026Card({
  projection,
  className,
}: Projection2026Props) {
  const total = projection.scenarios[0]?.dun_seats.total ?? 28;
  const tierColor =
    EVIDENCE_TIER_COLORS[
      projection.evidence_tier as keyof typeof EVIDENCE_TIER_COLORS
    ] ?? EVIDENCE_TIER_COLORS.Indicative;

  return (
    <Card className={cn("border-slate-200 dark:border-slate-800", className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <div>
              <CardTitle className="text-base sm:text-lg">
                2026 Scenario Projection
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                5 scenarios · Uniform National Swing + Monte Carlo (10,000
                iterations)
              </CardDescription>
            </div>
          </div>
          <Badge
            className="border-transparent text-white"
            style={{ backgroundColor: tierColor }}
            aria-label={`Evidence tier: ${projection.evidence_tier}`}
          >
            {projection.evidence_tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projection.scenarios.map((s) => (
            <ScenarioCard key={s.id} s={s} total={total} />
          ))}
        </div>

        <Separator />

        <div
          className="flex items-start gap-2 rounded-md bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
          role="note"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Methodology</p>
            <p className="mt-1 leading-relaxed">{projection.methodology}</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Confidence intervals (90% CI) apply to the leading coalition's
              seat count — derived from Monte Carlo simulation across plausible
              swing ranges. Per-DUN winners in the 3D map / Brain graph are
              deterministic visualizations derived from the scenario target
              (top-N DUNs by PRN15 vote share for the surge party).{" "}
              <em>Which DUN flips is a hypothesis, not a forecast.</em>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
