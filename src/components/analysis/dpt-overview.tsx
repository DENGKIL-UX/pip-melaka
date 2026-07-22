"use client";

// ponytail: MLK — DPT Overview tab (tab 1 of 6). Renders the state-level
// DPT summary: 5 months, 6 parliaments, total additions/deletions/net +
// a small line chart of net per month.
//
// Implements WORKLOAD.md Phase 6.2 §6.2.1 + DESIGN.md §3.6 (Overview tab).
// Also mounts the Demographics overlay (Phase 6.3) per the task spec.
//
// Source: `/data/dpt/spr-dpt-pameran-summary.json` (Verified evidence tier).

import * as React from "react";
import { FileText, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { EVIDENCE_TIER_COLORS } from "@/lib/party-colors";
import { DptTrend } from "./dpt-trend";
import { DemographicsOverlay } from "./demographics-overlay";
import type { DptSummaryDoc } from "./types";

export interface DptOverviewProps {
  summary: DptSummaryDoc;
  className?: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

function KpiCard({ label, value, hint, Icon, color }: KpiCardProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800"
      role="group"
      aria-label={`${label}: ${value}${hint ? `, ${hint}` : ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" style={{ color }} aria-hidden />
        <span>{label}</span>
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

export function DptOverview({ summary, className }: DptOverviewProps) {
  const tierColor =
    EVIDENCE_TIER_COLORS[
      summary.evidence_tier as keyof typeof EVIDENCE_TIER_COLORS
    ] ?? EVIDENCE_TIER_COLORS.Verified;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className="border-transparent text-white"
          style={{ backgroundColor: tierColor }}
          aria-label={`Evidence tier: ${summary.evidence_tier}`}
        >
          {summary.evidence_tier}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {summary.total_pdfs} PDFs · {summary.parliament_count} parliaments · {summary.months.length} months
        </Badge>
        <span className="text-xs text-muted-foreground">
          {summary.headline_feature}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total additions"
          value={summary.total_additions.toLocaleString()}
          hint="New voters added Jan–May 2026"
          Icon={TrendingUp}
          color="#10b981"
        />
        <KpiCard
          label="Total deletions"
          value={summary.total_deletions.toLocaleString()}
          hint="Voters removed (deceased / migrated)"
          Icon={TrendingDown}
          color="#ef4444"
        />
        <KpiCard
          label="Net additions"
          value={summary.total_net.toLocaleString()}
          hint="Net electorate growth"
          Icon={TrendingUp}
          color="#0F7DC2"
        />
        <KpiCard
          label="Avg net / month"
          value={Math.round(summary.total_net / summary.months.length).toLocaleString()}
          hint={`Across ${summary.months.length} months`}
          Icon={Layers}
          color="#8b5cf6"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-card p-3 sm:p-4 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#C77B2C]" aria-hidden />
            <h3 className="text-sm font-semibold">Monthly net additions</h3>
          </div>
          <DptTrend perMonth={summary.per_month} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-card p-3 sm:p-4 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#C77B2C]" aria-hidden />
            <h3 className="text-sm font-semibold">By parliament (5 months)</h3>
          </div>
          <ul className="flex flex-col gap-2 text-sm" role="list">
            {summary.per_parliament.map((p) => {
              const max = Math.max(...summary.per_parliament.map((x) => x.net));
              const pct = max > 0 ? (p.net / max) * 100 : 0;
              return (
                <li
                  key={p.parliament_code}
                  className="flex flex-col gap-1"
                  role="listitem"
                  aria-label={`P${p.parliament_code} ${p.parliament_name}: ${p.net} net additions, ${p.additions} additions, ${p.deletions} deletions`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      P{p.parliament_code} · {p.parliament_name}
                    </span>
                    <span className="font-mono tabular-nums">+{p.net}</span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                    aria-hidden
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: "#0F7DC2",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Separator />

      <DemographicsOverlay />
    </div>
  );
}
