"use client";

// ponytail: MLK — Election summary banner. Renders the coalition seat counts
// (BN blue / PH red / PN green badges) + total seats + headline fact for a
// single election. Used by all 3 sub-tabs (GE14 / PRN15 / GE15).
//
// Implements WORKLOAD.md Phase 6.1 §6.1.1 banner requirement + DESIGN.md §3
// row 4. PRN15's banner is rendered larger + more prominent (Melaka's headline
// election fact: BN landslide 21/28 seats).
//
// WCAG 2.1 AA: 3px #C77B2C focus ring skipped (non-interactive component).
// Color is NEVER the sole carrier — every swatch is paired with a label +
// numeric value. Headline fact visible as text.

import * as React from "react";
import { Trophy, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PARTY_COLORS } from "@/lib/party-colors";
import type { Election, SeatSummary } from "./types";

export interface ElectionSummaryBannerProps {
  election: Election;
  className?: string;
}

interface CoalitionBadge {
  code: "BN" | "PH" | "PN" | "Others";
  label: string;
  color: string;
}

const COALITIONS: CoalitionBadge[] = [
  { code: "BN", label: "Barisan Nasional", color: PARTY_COLORS.BN },
  { code: "PH", label: "Pakatan Harapan", color: PARTY_COLORS.PH },
  { code: "PN", label: "Perikatan Nasional", color: PARTY_COLORS.PN },
  { code: "Others", label: "Others / Independents", color: PARTY_COLORS.OTH },
];

function pickSummary(election: Election): SeatSummary | null {
  if (election.dun_summary) return election.dun_summary;
  if (election.parliament_summary) return election.parliament_summary;
  return null;
}

function pickUnit(election: Election): string {
  // GE15 only has parliament results → "parliaments"; GE14/PRN15 have DUN.
  return election.dun_summary ? "DUN seats" : "parliament seats";
}

export function ElectionSummaryBanner({
  election,
  className,
}: ElectionSummaryBannerProps) {
  const summary = pickSummary(election);
  const unit = pickUnit(election);
  const isHeadline = election.id === "PRN15";

  if (!summary) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300",
          className
        )}
        role="status"
      >
        <AlertCircle className="h-4 w-4" aria-hidden />
        <span>No seat summary available for {election.name}.</span>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-lg border bg-card p-4 sm:p-5",
        isHeadline
          ? "border-[#C77B2C]/60 shadow-md"
          : "border-slate-200 dark:border-slate-800",
        className
      )}
      aria-label={`Seat summary for ${election.name}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-semibold tracking-tight",
                isHeadline ? "text-lg sm:text-xl" : "text-base sm:text-lg"
              )}
            >
              {election.name}
            </h3>
            {isHeadline && (
              <Badge
                className="border-transparent bg-[#C77B2C] text-white"
                aria-label="Headline election fact"
              >
                HEADLINE
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {election.date} · {election.type}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none">{summary.total}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            total {unit}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {COALITIONS.map((c) => {
          const count = summary[c.code] ?? 0;
          return (
            <div
              key={c.code}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/60"
              aria-label={`${c.label}: ${count} ${unit}`}
            >
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: c.color }}
                aria-hidden
              />
              <span className="text-xs font-semibold">{c.code}</span>
              <span className="text-xs text-muted-foreground">
                {c.label}
              </span>
              <span
                className="ml-1 rounded px-1.5 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: c.color }}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {election.headline_fact ? (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-md p-3 text-sm",
            isHeadline
              ? "bg-[#C77B2C]/10 text-[#C77B2C] dark:text-amber-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
          )}
          role="note"
        >
          <Trophy className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{election.headline_fact}</span>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {election.description}
        </p>
      )}
    </section>
  );
}
