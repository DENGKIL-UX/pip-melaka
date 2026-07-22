"use client";

// ponytail: MLK — DPT By Parliament tab (tab 2 of 6). Renders 6 cards
// (one per parliament P134–P139) showing 5-month additions/deletions/net.
//
// Implements WORKLOAD.md Phase 6.2 §6.2.2 + DESIGN.md §3.6 (By Parliament tab).
//
// Source: `/data/dpt/spr-dpt-pameran-summary.json` per_parliament[] array.

import * as React from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import type { DptSummaryPerParliament } from "./types";

export interface DptByParliamentProps {
  perParliament: DptSummaryPerParliament[];
  className?: string;
}

export function DptByParliament({
  perParliament,
  className,
}: DptByParliamentProps) {
  const maxNet = Math.max(...perParliament.map((p) => p.net), 1);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-[#C77B2C]" aria-hidden />
        <h3 className="text-sm font-semibold">
          By parliament · 6 parliaments × 5 months
        </h3>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="DPT by parliament cards"
      >
        {perParliament.map((p) => {
          const meta = PARLIAMENTS.find((x) => x.code === p.parliament_code);
          const pct = (p.net / maxNet) * 100;
          return (
            <div
              key={p.parliament_code}
              role="listitem"
              aria-label={`P${p.parliament_code} ${p.parliament_name}: ${p.additions} additions, ${p.deletions} deletions, ${p.net} net over ${p.month_count} months`}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">
                    P{p.parliament_code}
                  </div>
                  <div className="text-sm font-semibold">{p.parliament_name}</div>
                  {meta ? (
                    <div className="text-[11px] text-muted-foreground">
                      {meta.district} · {meta.dunCount} DUNs ·{" "}
                      {meta.totalVoters.toLocaleString()} voters
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-[#0F7DC2]">
                    +{p.net}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    net (5mo)
                  </div>
                </div>
              </div>

              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="img"
                aria-label={`Net additions bar: ${p.net} of ${maxNet} (max)`}
                aria-hidden
              >
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: "#0F7DC2" }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-emerald-500/10 p-1.5">
                  <div className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{p.additions}
                  </div>
                  <div className="text-[10px] text-muted-foreground">add</div>
                </div>
                <div className="rounded bg-red-500/10 p-1.5">
                  <div className="font-mono font-semibold tabular-nums text-red-700 dark:text-red-400">
                    −{p.deletions}
                  </div>
                  <div className="text-[10px] text-muted-foreground">del</div>
                </div>
                <div className="rounded bg-violet-500/10 p-1.5">
                  <div className="font-mono font-semibold tabular-nums text-violet-700 dark:text-violet-400">
                    {(p.net / p.month_count).toFixed(0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">/mo</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
