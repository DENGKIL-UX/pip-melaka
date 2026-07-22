"use client";

// ponytail: MLK — Socioeconomic panel. Composes the income bar chart + Gini
// gauge + per-district table into a single Card. Implements WORKLOAD.md
// Phase 5 §5.2 + DESIGN.md §3 row 7.
//
// Source: `/data/socioeconomic/melaka-dosm.json` (DOSM 2022 HIES survey,
// poverty line = RM 2,208/month household). Evidence tier: Verified (DOSM
// is a non-engine source — provenance gate 9 does NOT apply).
//
// ponytail: MLK — package.json has `echarts` but NOT `echarts-for-react`.
// Per the `echarts-dashboard-panels` skill spec we use pure-SVG fallbacks
// (no new dependencies — important for the 2.8MB Cloudflare Workers budget).

import * as React from "react";
import { Loader2, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MLK_ACCENT, evidenceTierColor } from "@/lib/party-colors";
import { IncomeChart, type IncomeDatum } from "./income-chart";
import { GiniGauge } from "./gini-gauge";

// ─────────────────────────────────────────────────────────────────────────────
// Types — matches public/data/socioeconomic/melaka-dosm.json shape.
// ─────────────────────────────────────────────────────────────────────────────
interface DosmDistrict {
  district: string;
  district_code: string;
  population: number;
  median_household_income_rm: number;
  poverty_rate_percent: number;
  gini_coefficient: number;
  unemployment_rate_percent: number;
  area_km2: number;
  density_per_km2: number;
}

interface DosmDoc {
  state: string;
  state_code: string;
  source: string;
  evidence_tier: string;
  census_year: number;
  state_level: {
    population: number;
    median_household_income_rm: number;
    mean_household_income_rm: number;
    poverty_rate_percent: number;
    gini_coefficient: number;
    unemployment_rate_percent: number;
    labour_force_participation_percent: number;
    hies_year: number;
  };
  districts: DosmDistrict[];
  income_brackets: Array<{ bracket: string; percent: number }>;
  notes: string;
}

const DATA_URL = "/data/socioeconomic/melaka-dosm.json";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]";

export interface SocioeconomicPanelProps {
  className?: string;
}

export function SocioeconomicPanel({ className }: SocioeconomicPanelProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<DosmDoc | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(`DOSM fetch failed: ${res.status}`);
        return (await res.json()) as DosmDoc;
      })
      .then((json) => {
        if (cancelled) return;
        setDoc(json);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[socioeconomic-panel] load failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build income chart data: 3 districts + state avg (highlighted).
  const incomeData: IncomeDatum[] = React.useMemo(() => {
    if (!doc) return [];
    return [
      ...doc.districts.map((d) => ({
        label: d.district,
        income: d.median_household_income_rm,
      })),
      {
        label: doc.state,
        income: doc.state_level.median_household_income_rm,
        isState: true,
      },
    ];
  }, [doc]);

  return (
    <Card
      className={cn(
        "overflow-hidden border-slate-800 bg-slate-950/60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <Activity
            className="h-4 w-4"
            aria-hidden
            style={{ color: MLK_ACCENT }}
          />
          Socioeconomic · DOSM 2022 HIES
        </CardTitle>
        <Badge
          variant="outline"
          className="border-slate-600 text-[10px] uppercase tracking-wide"
          style={{ color: evidenceTierColor("Verified") }}
        >
          Evidence: Verified
        </Badge>
      </CardHeader>

      <CardContent className="p-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="text-sm">Loading DOSM data…</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-700/40 bg-red-950/30 p-4 text-sm text-red-200"
          >
            Socioeconomic panel failed to load: {error}
          </div>
        )}

        {!loading && !error && doc && (
          <div className="flex flex-col gap-4">
            {/* Headline stats row */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeadlineStat
                label="Population"
                value={doc.state_level.population.toLocaleString()}
              />
              <HeadlineStat
                label="Median income"
                value={`RM ${doc.state_level.median_household_income_rm.toLocaleString()}`}
              />
              <HeadlineStat
                label="Poverty rate"
                value={`${doc.state_level.poverty_rate_percent.toFixed(1)}%`}
              />
              <HeadlineStat
                label="Unemployment"
                value={`${doc.state_level.unemployment_rate_percent.toFixed(1)}%`}
              />
            </div>

            {/* Charts row */}
            <div className="grid gap-3 md:grid-cols-2">
              {/* Income bar chart */}
              <section
                className="rounded-md border border-slate-800 bg-slate-900/40 p-3"
                aria-labelledby="income-chart-title"
              >
                <h3
                  id="income-chart-title"
                  className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300"
                >
                  Median household income (RM/month)
                </h3>
                <IncomeChart data={incomeData} />
                <Caption />
              </section>

              {/* Gini gauge */}
              <section
                className="rounded-md border border-slate-800 bg-slate-900/40 p-3"
                aria-labelledby="gini-gauge-title"
              >
                <h3
                  id="gini-gauge-title"
                  className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300"
                >
                  Gini coefficient (state)
                </h3>
                <GiniGauge value={doc.state_level.gini_coefficient} />
                <Caption />
              </section>
            </div>

            <Separator className="bg-slate-800" />

            {/* Per-district table */}
            <section aria-labelledby="district-table-title">
              <h3
                id="district-table-title"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300"
              >
                Per-district indicators
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">District</TableHead>
                    <TableHead className="text-right text-slate-400">Population</TableHead>
                    <TableHead className="text-right text-slate-400">Median income</TableHead>
                    <TableHead className="text-right text-slate-400">Poverty %</TableHead>
                    <TableHead className="text-right text-slate-400">Unemp. %</TableHead>
                    <TableHead className="text-right text-slate-400">Gini</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.districts.map((d) => (
                    <TableRow
                      key={d.district_code}
                      className="border-slate-800"
                    >
                      <TableCell className="font-medium text-slate-200">
                        {d.district}
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        {d.population.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        RM {d.median_household_income_rm.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        {d.poverty_rate_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        {d.unemployment_rate_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        {d.gini_coefficient.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* State-level summary row */}
                  <TableRow className="border-slate-700 bg-slate-900/40">
                    <TableCell className="font-semibold text-slate-100">
                      {doc.state} (state)
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-100">
                      {doc.state_level.population.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-100">
                      RM {doc.state_level.median_household_income_rm.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-100">
                      {doc.state_level.poverty_rate_percent.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-100">
                      {doc.state_level.unemployment_rate_percent.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-100">
                      {doc.state_level.gini_coefficient.toFixed(3)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            {/* Income brackets (small bar chart) */}
            <section aria-labelledby="brackets-title">
              <h3
                id="brackets-title"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300"
              >
                State income brackets (% of households)
              </h3>
              <div className="flex flex-col gap-1">
                {doc.income_brackets.map((b) => {
                  const max = Math.max(
                    ...doc.income_brackets.map((x) => x.percent)
                  );
                  const w = (b.percent / max) * 100;
                  return (
                    <div
                      key={b.bracket}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="w-40 shrink-0 text-slate-400">
                        {b.bracket}
                      </span>
                      <div className="relative h-4 flex-1 rounded bg-slate-900/60">
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: `${w}%`,
                            background: MLK_ACCENT,
                            opacity: 0.85,
                          }}
                          aria-hidden
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-slate-300">
                        {b.percent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <Caption />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────────
function HeadlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function Caption() {
  return (
    <p className="mt-2 text-[10px] text-slate-500">
      Source: DOSM 2022 HIES survey; poverty line = RM 2,208/month household.
    </p>
  );
}

export default SocioeconomicPanel;
