"use client";

// ponytail: MLK — KPI strip for the Demographics module. Shows 6 KPIs in a
// responsive grid: total_voters / dun_count / dm_count / locality_count /
// profile_completeness_score / average_cleansing_confidence.
//
// Implements WORKLOAD.md Phase 6 (Demographics) + DESIGN.md §3 (Demographics
// panel KPI strip requirement).
//
// Each KPI has an evidence-tier badge (Proxy until gate 9 audit closes —
// all engine aggregates are Proxy per the JSONL `evidence_tier` field).

import * as React from "react";
import { Users, Grid3x3, MapPin, FileCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EVIDENCE_TIER_COLORS } from "@/lib/party-colors";

export interface KpiStripProps {
  totalVoters: number;
  dunCount: number;
  dmCount: number;
  localityCount: number;
  profileCompletenessScore?: number; // 0–1 fraction
  averageCleansingConfidence?: number; // 0–1 fraction
  evidenceTier?: string;
  className?: string;
}

interface KpiDef {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function KpiStrip({
  totalVoters,
  dunCount,
  dmCount,
  localityCount,
  profileCompletenessScore,
  averageCleansingConfidence,
  evidenceTier = "Proxy",
  className,
}: KpiStripProps) {
  const tierColor =
    EVIDENCE_TIER_COLORS[
      evidenceTier as keyof typeof EVIDENCE_TIER_COLORS
    ] ?? EVIDENCE_TIER_COLORS.Proxy;

  const kpis: KpiDef[] = [
    {
      label: "Total voters",
      value: totalVoters.toLocaleString(),
      hint: "Engine aggregate",
      Icon: Users,
    },
    {
      label: "DUN count",
      value: String(dunCount),
      hint: "State seats in this parliament",
      Icon: Grid3x3,
    },
    {
      label: "DM count",
      value: String(dmCount),
      hint: "Polling districts",
      Icon: MapPin,
    },
    {
      label: "Locality count",
      value: localityCount.toLocaleString(),
      hint: "Sub-DM localities",
      Icon: MapPin,
    },
    {
      label: "Profile completeness",
      value:
        profileCompletenessScore !== undefined
          ? `${(profileCompletenessScore * 100).toFixed(1)}%`
          : "—",
      hint: "Voters with complete profile fields",
      Icon: FileCheck,
    },
    {
      label: "Avg cleansing confidence",
      value:
        averageCleansingConfidence !== undefined
          ? `${(averageCleansingConfidence * 100).toFixed(2)}%`
          : "—",
      hint: "Cleanser pass 2 confidence",
      Icon: Sparkles,
    },
  ];

  return (
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-3 lg:grid-cols-6",
        className
      )}
      role="list"
      aria-label="Demographics KPI strip"
    >
      {kpis.map((k) => {
        const Icon = k.Icon;
        return (
          <div
            key={k.label}
            role="listitem"
            aria-label={`${k.label}: ${k.value}${k.hint ? `, ${k.hint}` : ""}`}
            className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-card p-2.5 dark:border-slate-800"
          >
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3 w-3" aria-hidden />
              <span>{k.label}</span>
            </div>
            <span className="text-lg font-bold tabular-nums leading-tight">
              {k.value}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {k.hint}
            </span>
          </div>
        );
      })}
      <div
        className="col-span-full mt-1 flex items-center justify-end gap-2 text-[10px]"
        aria-label={`All KPIs tagged evidence tier: ${evidenceTier}`}
      >
        <span className="text-muted-foreground">All KPIs evidence tier:</span>
        <Badge
          className="border-transparent text-[10px] text-white"
          style={{ backgroundColor: tierColor }}
        >
          {evidenceTier}
        </Badge>
      </div>
    </div>
  );
}
