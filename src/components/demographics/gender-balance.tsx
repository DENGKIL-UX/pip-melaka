"use client";

// ponytail: MLK — Gender balance horizontal bar for the Demographics module.
// Shows male % vs female % as two stacked horizontal bars. Engine emits
// male_voters + female_voters + other_or_unknown_gender_voters counts.
//
// Implements WORKLOAD.md Phase 6 (Demographics) + DESIGN.md §3 (Demographics
// panel). Pure HTML/CSS — no chart library (keeps bundle small).
//
// WCAG 2.1 AA: visible caption + aria-label on the container. Color never
// sole carrier — male/female labelled with text + numeric %.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GenderBalanceProps {
  malePercent?: number;
  femalePercent?: number;
  otherPercent?: number;
  genderBalanceScore?: number;
  className?: string;
}

export function GenderBalance({
  malePercent,
  femalePercent,
  otherPercent,
  genderBalanceScore,
  className,
}: GenderBalanceProps) {
  const male = malePercent ?? 0;
  const female = femalePercent ?? 0;
  const other = otherPercent ?? 0;
  const total = male + female + other || 1;
  const malePct = (male / total) * 100;
  const femalePct = (female / total) * 100;
  const otherPct = (other / total) * 100;
  const score = genderBalanceScore ?? 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Gender balance</h3>
        <span className="text-xs text-muted-foreground">
          Score: <span className="font-semibold tabular-nums">{score.toFixed(1)}</span>{" "}
          / 100
        </span>
      </div>
      <p className="text-xs text-muted-foreground" id="gender-caption">
        Male vs female share of the electorate. Score &gt; 95 = balanced;
        &lt; 90 = critical imbalance (per Risk module thresholds).
      </p>
      <div
        role="img"
        aria-labelledby="gender-caption"
        aria-label={`Gender balance. Male: ${malePct.toFixed(1)} percent, female: ${femalePct.toFixed(1)} percent${other > 0 ? `, other or unknown: ${otherPct.toFixed(1)} percent` : ""}. Gender balance score: ${score.toFixed(1)} out of 100.`}
        className="flex flex-col gap-2"
      >
        <div className="flex h-7 w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
          <div
            className="flex h-full items-center justify-center bg-[#0F7DC2] text-[10px] font-semibold text-white"
            style={{ width: `${malePct}%` }}
            aria-hidden
          >
            {malePct >= 10 ? `${malePct.toFixed(1)}% ♂` : ""}
          </div>
          <div
            className="flex h-full items-center justify-center bg-[#E22926] text-[10px] font-semibold text-white"
            style={{ width: `${femalePct}%` }}
            aria-hidden
          >
            {femalePct >= 10 ? `${femalePct.toFixed(1)}% ♀` : ""}
          </div>
          {other > 0 ? (
            <div
              className="flex h-full items-center justify-center bg-[#94a3b8] text-[10px] font-semibold text-white"
              style={{ width: `${otherPct}%` }}
              aria-hidden
            />
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm bg-[#0F7DC2]"
              aria-hidden
            />
            <span className="text-muted-foreground">Male</span>
            <span className="font-mono font-semibold tabular-nums">
              {malePct.toFixed(1)}%
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm bg-[#E22926]"
              aria-hidden
            />
            <span className="text-muted-foreground">Female</span>
            <span className="font-mono font-semibold tabular-nums">
              {femalePct.toFixed(1)}%
            </span>
          </span>
          {other > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm bg-[#94a3b8]"
                aria-hidden
              />
              <span className="text-muted-foreground">Other / unknown</span>
              <span className="font-mono font-semibold tabular-nums">
                {otherPct.toFixed(1)}%
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Source: engine aggregate JSONL (male_voters / female_voters /
        other_or_unknown_gender_voters).
      </p>
    </div>
  );
}
