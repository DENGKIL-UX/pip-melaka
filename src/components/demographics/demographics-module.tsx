"use client";

// ponytail: MLK — Demographics module. Renders all 5 engine aggregate levels
// (state / parliament / DUN / DM / locality) in a single dashboard.
//
// Layout:
//   - Parliament selector (shadcn Select with 6 options P134–P139). Reads +
//     writes `useDashboardStore.selectedParliament` for cross-module sync.
//   - KPI strip (6 KPIs: total_voters / dun_count / dm_count / locality_count
//     / profile_completeness_score / average_cleansing_confidence).
//   - 4 chart cards in a 2×2 grid:
//     1. Age bands bar chart (8 buckets — UNDER_18 greyed out)
//     2. Ethnicity donut (6 groups — placeholder if dominant == OTHER)
//     3. Gender balance (horizontal bar — male % vs female %)
//     4. Senior dependency gauge (0–50% range, green/amber/red zones)
//   - Below the charts: a small per-DUN table summarizing 5 DUNs in the
//     selected parliament (DUN-level aggregate view from the engine JSONL).
//
// Implements WORKLOAD.md Phase 6 (Demographics) + DESIGN.md §3 (Demographics
// panel).
//
// Source: `/data/p{N}/parliament-intelligence.jsonl` (1 row per parliament) +
// `/data/p{N}/dun-intelligence.jsonl` (3–6 rows per parliament). JSONL parsed
// client-side.
//
// WCAG 2.1 AA: 3px #C77B2C focus ring on the Select + table. aria-label on
// every interactive element. 44px touch targets. Every chart has a visible
// caption + aria-label. prefers-reduced-motion honoured (charts pass
// isAnimationActive=false).

import * as React from "react";
import { Loader2, AlertCircle, Users, Database } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { useDashboardStore } from "@/stores/dashboard-store";
import { EVIDENCE_TIER_COLORS } from "@/lib/party-colors";
import { AgeBandsChart } from "./age-bands-chart";
import { EthnicityDonut } from "./ethnicity-donut";
import { GenderBalance } from "./gender-balance";
import { SeniorGauge } from "./senior-gauge";
import { KpiStrip } from "./kpi-strip";
import type {
  ParliamentIntelligenceRow,
  DunIntelligenceRow,
  AgeBandKey,
  EthnicityKey,
} from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

function parseJsonl<T = unknown>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as T);
    } catch {
      // skip
    }
  }
  return out;
}

export interface DemographicsModuleProps {
  className?: string;
}

export function DemographicsModule({ className }: DemographicsModuleProps) {
  const selectedParliament = useDashboardStore((s) => s.selectedParliament);
  const setSelectedParliament = useDashboardStore(
    (s) => s.setSelectedParliament
  );

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [parl, setParl] = React.useState<ParliamentIntelligenceRow | null>(
    null
  );
  const [duns, setDuns] = React.useState<DunIntelligenceRow[]>([]);
  const [overview, setOverview] = React.useState<{
    dun_count: number;
    dm_count: number;
    locality_count: number;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const parlUrl = `/data/p${selectedParliament}/parliament-intelligence.jsonl`;
    const dunUrl = `/data/p${selectedParliament}/dun-intelligence.jsonl`;
    const overviewUrl = `/data/p${selectedParliament}/dashboard-overview.json`;
    Promise.all([
      fetch(parlUrl),
      fetch(dunUrl),
      fetch(overviewUrl),
    ])
      .then(async ([pRes, dRes, oRes]) => {
        if (!pRes.ok)
          throw new Error(`Parliament fetch failed: ${pRes.status}`);
        if (!dRes.ok) throw new Error(`DUN fetch failed: ${dRes.status}`);
        const [pText, dText, oJson] = await Promise.all([
          pRes.text(),
          dRes.text(),
          oRes.ok
            ? (oRes.json() as Promise<{
                dun_count: number;
                dm_count: number;
                locality_count: number;
              }>)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const pRows = parseJsonl<ParliamentIntelligenceRow>(pText);
        const dRows = parseJsonl<DunIntelligenceRow>(dText);
        setParl(pRows[0] ?? null);
        setDuns(dRows);
        if (oJson) setOverview(oJson);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedParliament]);

  const meta = PARLIAMENTS.find((p) => p.code === selectedParliament);
  const tier = parl?.evidence_tier ?? "Proxy";
  const tierColor =
    EVIDENCE_TIER_COLORS[tier as keyof typeof EVIDENCE_TIER_COLORS] ??
    EVIDENCE_TIER_COLORS.Proxy;

  return (
    <Card
      className={cn("border-slate-200 dark:border-slate-800", className)}
      role="region"
      aria-label="Demographics module — engine aggregate viewer (parliament / DUN / DM / locality levels)"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <div>
              <CardTitle className="text-base sm:text-lg">
                Demographics · Engine aggregate viewer
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                5 aggregate levels (state / parliament / DUN / DM / locality).
                Engine pipeline PDPA-safe aggregates. Proxy until gate 9 audit.
              </CardDescription>
            </div>
          </div>
          <Badge
            className="border-transparent text-white"
            style={{ backgroundColor: tierColor }}
            aria-label={`Evidence tier: ${tier}`}
          >
            {tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label
            className="flex items-center gap-2 text-xs text-muted-foreground"
            aria-label="Select parliament"
          >
            <Database className="h-3.5 w-3.5" aria-hidden />
            <span>Parliament:</span>
            <Select
              value={selectedParliament}
              onValueChange={setSelectedParliament}
            >
              <SelectTrigger
                className={cn("h-9 w-[260px] text-xs", FOCUS_RING)}
                aria-label="Select parliament to view demographics"
              >
                <SelectValue placeholder="Select parliament" />
              </SelectTrigger>
              <SelectContent>
                {PARLIAMENTS.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    P{p.code} · {p.name} ({p.district})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {meta ? (
            <Badge variant="outline" className="text-[10px]">
              {meta.dunCount} DUNs · {meta.totalVoters.toLocaleString()} voters
            </Badge>
          ) : null}
        </div>

        {loading ? (
          <div
            className="flex h-64 items-center justify-center gap-2 text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Loading P{selectedParliament} demographics…</span>
          </div>
        ) : error ? (
          <div
            className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            <AlertCircle className="h-5 w-5" aria-hidden />
            <span>Failed to load demographics data.</span>
            <span className="text-xs">{error}</span>
          </div>
        ) : parl ? (
          <div className="flex flex-col gap-4">
            <KpiStrip
              totalVoters={parl.metrics.total_voters}
              dunCount={overview?.dun_count ?? meta?.dunCount ?? duns.length}
              dmCount={overview?.dm_count ?? 0}
              localityCount={overview?.locality_count ?? 0}
              profileCompletenessScore={parl.metrics.profile_completeness_score}
              averageCleansingConfidence={
                parl.metrics.average_cleansing_confidence
              }
              evidenceTier={parl.evidence_tier}
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800">
                <AgeBandsChart
                  ageBandCounts={
                    (parl.distributions.age_band_counts ??
                      {}) as Partial<Record<AgeBandKey, number>>
                  }
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800">
                <EthnicityDonut
                  ethnicityCounts={
                    (parl.distributions.ethnicity_counts ??
                      {}) as Partial<Record<EthnicityKey, number>>
                  }
                  dominantEthnicityGroup={
                    parl.metrics.dominant_ethnicity_group
                  }
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800">
                <GenderBalance
                  malePercent={parl.metrics.male_percent}
                  femalePercent={parl.metrics.female_percent}
                  otherPercent={
                    parl.metrics.other_or_unknown_gender_voters &&
                    parl.metrics.total_voters
                      ? (parl.metrics.other_or_unknown_gender_voters /
                          parl.metrics.total_voters) *
                        100
                      : 0
                  }
                  genderBalanceScore={parl.metrics.gender_balance_score}
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800">
                <SeniorGauge
                  seniorDependencyPercent={
                    parl.metrics.senior_dependency_percent
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-card p-3 dark:border-slate-800">
              <h3 className="mb-2 text-sm font-semibold">
                Per-DUN breakdown ({duns.length} DUNs in P{selectedParliament})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">DUN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[110px] text-right">Voters</TableHead>
                    <TableHead className="w-[110px] text-right">Senior %</TableHead>
                    <TableHead className="w-[100px] text-right">Gender</TableHead>
                    <TableHead className="w-[110px] text-right">Density</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duns.map((d) => (
                    <TableRow key={`${d.geography.dun_code}`}>
                      <TableCell className="font-mono text-xs">
                        N{d.geography.dun_code}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {d.geography.dun_name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {d.metrics.total_voters.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {(d.metrics.senior_dependency_percent ?? 0).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {(d.metrics.gender_balance_score ?? 0).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px]">
                          {d.metrics.voter_density_score ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">
                Source: p{selectedParliament}/dun-intelligence.jsonl. Evidence
                tier: {parl.evidence_tier}. All values PDPA-safe aggregates.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex h-32 items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            No data available for P{selectedParliament}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DemographicsModule;
