"use client";

// ponytail: MLK — Risk signal grid for the 5 P134 DUNs.
// Implements WORKLOAD.md Phase 5 §5.1 + DESIGN.md §3 row 5.
//
// 4 risk signals per DUN (5 DUNs × 4 signals = 20 cells):
//   1. High senior dependency (>30%) → aging-population risk
//   2. Low gender balance (<90) → gender imbalance risk
//   3. Low profile completeness (<95%) → data-quality risk
//   4. High DPT net additions (>500/month) → voter-roll churn risk
//
// Each cell is colored:
//   red    = critical (exceeds the primary threshold)
//   amber  = warning (in an intermediate band — surfaces near-misses so the
//            grid isn't all-green for a state with ~27% senior dependency)
//   green  = OK (within safe range)
//
// ALL signals tagged `evidence_tier: "Proxy"` — `DG_ENGINE_VERSION` (gate 9)
// is still open. The legend repeats this; the cell tooltip says so too.
//
// DPT data is per-parliament (not per-DUN) — all 5 DUNs in P134 share the
// same DPT signal. The tooltip makes this explicit.

import * as React from "react";
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { evidenceTierColor } from "@/lib/party-colors";
import { RiskLegend } from "./risk-legend";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DunIntelligenceRow {
  level: "DUN";
  geography: {
    parliament_code: string;
    parliament_name: string;
    dun_code: string;
    dun_name: string;
    district: string;
  };
  metrics: {
    total_voters: number;
    senior_dependency_percent?: number;
    gender_balance_score?: number;
    profile_completeness_score?: number;
  };
}

interface DptSummaryDoc {
  per_parliament: Array<{
    parliament_code: string;
    parliament_name: string;
    additions: number;
    deletions: number;
    net: number;
    month_count: number;
  }>;
}

export type RiskLevel = "critical" | "warning" | "ok";

export interface RiskSignal {
  id: string;
  label: string;
  description: string;
  threshold: string;
  level: RiskLevel;
  /** Numeric value used for the cell text. */
  value: number;
  /** Display formatting for the value. */
  format: (v: number) => string;
}

export interface RiskDunRow {
  dunCode: string;
  dunName: string;
  parliamentCode: string;
  signals: RiskSignal[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants — thresholds per task spec + reasonable warning bands.
// ponytail: MLK — task spec gives only the primary (critical) threshold for
// each signal. The warning bands are intermediate (e.g. senior dependency
// 25-30% is "approaching critical" — flagged amber so the grid surfaces
// near-misses instead of showing all-green for a state averaging ~27%).
// ─────────────────────────────────────────────────────────────────────────────
const RISK_THRESHOLDS = {
  seniorDependency: { critical: 30, warning: 25 },
  genderBalance: { critical: 90, warning: 95 },
  profileCompleteness: { critical: 95, warning: 99 }, // %
  dptNetPerMonth: { critical: 500, warning: 200 },
} as const;

const DATA_URLS = {
  p134Dun: "/data/p134/dun-intelligence.jsonl",
  dpt: "/data/dpt/spr-dpt-pameran-summary.json",
} as const;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C]";

const CELL_CLASS: Record<RiskLevel, string> = {
  critical:
    "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300",
  warning:
    "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300",
  ok: "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300",
};

const SIGNAL_LABELS = [
  { id: "senior", label: "Senior dep.", description: "Aging-population risk" },
  { id: "gender", label: "Gender bal.", description: "Gender imbalance risk" },
  { id: "completeness", label: "Completeness", description: "Data-quality risk" },
  { id: "dpt", label: "DPT churn", description: "Voter-roll churn risk" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseJsonl<T = unknown>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as T);
    } catch {
      // Skip malformed line.
    }
  }
  return out;
}

function classify(
  value: number,
  thresholds: { critical: number; warning: number },
  mode: "highIsBad" | "lowIsBad"
): RiskLevel {
  if (mode === "highIsBad") {
    if (value > thresholds.critical) return "critical";
    if (value > thresholds.warning) return "warning";
    return "ok";
  }
  // lowIsBad
  if (value < thresholds.critical) return "critical";
  if (value < thresholds.warning) return "warning";
  return "ok";
}

function levelIcon(level: RiskLevel) {
  if (level === "critical")
    return <AlertCircle className="h-3.5 w-3.5" aria-hidden />;
  if (level === "warning")
    return <AlertTriangle className="h-3.5 w-3.5" aria-hidden />;
  return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk computation
// ─────────────────────────────────────────────────────────────────────────────
function computeRiskRows(
  dunRows: DunIntelligenceRow[],
  dptSummary: DptSummaryDoc
): RiskDunRow[] {
  // DPT signal — per-parliament. All 5 P134 DUNs share the same value.
  const p134Dpt = dptSummary.per_parliament.find(
    (p) => p.parliament_code === "134"
  );
  const dptNetPerMonth =
    p134Dpt && p134Dpt.month_count > 0
      ? p134Dpt.net / p134Dpt.month_count
      : 0;
  const dptLevel = classify(
    dptNetPerMonth,
    RISK_THRESHOLDS.dptNetPerMonth,
    "highIsBad"
  );

  return dunRows.map((row) => {
    const senior = row.metrics.senior_dependency_percent ?? 0;
    const gender = row.metrics.gender_balance_score ?? 0;
    const completeness = (row.metrics.profile_completeness_score ?? 0) * 100;

    return {
      dunCode: row.geography.dun_code,
      dunName: row.geography.dun_name,
      parliamentCode: row.geography.parliament_code,
      signals: [
        {
          id: "senior",
          label: "Senior dependency",
          description: "Aging-population risk",
          threshold: `> ${RISK_THRESHOLDS.seniorDependency.critical}% critical; > ${RISK_THRESHOLDS.seniorDependency.warning}% warning`,
          level: classify(
            senior,
            RISK_THRESHOLDS.seniorDependency,
            "highIsBad"
          ),
          value: senior,
          format: (v) => `${v.toFixed(1)}%`,
        },
        {
          id: "gender",
          label: "Gender balance",
          description: "Gender imbalance risk",
          threshold: `< ${RISK_THRESHOLDS.genderBalance.critical} critical; < ${RISK_THRESHOLDS.genderBalance.warning} warning`,
          level: classify(
            gender,
            RISK_THRESHOLDS.genderBalance,
            "lowIsBad"
          ),
          value: gender,
          format: (v) => v.toFixed(1),
        },
        {
          id: "completeness",
          label: "Profile completeness",
          description: "Data-quality risk",
          threshold: `< ${RISK_THRESHOLDS.profileCompleteness.critical}% critical; < ${RISK_THRESHOLDS.profileCompleteness.warning}% warning`,
          level: classify(
            completeness,
            RISK_THRESHOLDS.profileCompleteness,
            "lowIsBad"
          ),
          value: completeness,
          format: (v) => `${v.toFixed(1)}%`,
        },
        {
          id: "dpt",
          label: "DPT net / month",
          description:
            "Voter-roll churn risk (P134-level — shared across all 5 DUNs)",
          threshold: `> ${RISK_THRESHOLDS.dptNetPerMonth.critical}/mo critical; > ${RISK_THRESHOLDS.dptNetPerMonth.warning}/mo warning`,
          level: dptLevel,
          value: dptNetPerMonth,
          format: (v) => `${v.toFixed(1)}/mo`,
        },
      ],
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export interface RiskGridProps {
  className?: string;
}

export function RiskGrid({ className }: RiskGridProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<RiskDunRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetch(DATA_URLS.p134Dun), fetch(DATA_URLS.dpt)])
      .then(async ([dunRes, dptRes]) => {
        if (!dunRes.ok)
          throw new Error(`P134 dun fetch failed: ${dunRes.status}`);
        if (!dptRes.ok)
          throw new Error(`DPT summary fetch failed: ${dptRes.status}`);
        const [dunText, dptJson] = await Promise.all([
          dunRes.text(),
          dptRes.json() as Promise<DptSummaryDoc>,
        ]);
        if (cancelled) return;
        const dunRows = parseJsonl<DunIntelligenceRow>(dunText);
        const riskRows = computeRiskRows(dunRows, dptJson);
        setRows(riskRows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[risk-grid] load failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading risk signals…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-700/40 bg-red-950/30 p-4 text-sm text-red-200"
      >
        Risk grid failed to load: {error}
      </div>
    );
  }

  // Compute summary counts.
  const summary = { critical: 0, warning: 0, ok: 0 };
  for (const r of rows) for (const s of r.signals) summary[s.level]++;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-600 text-[10px] uppercase tracking-wide"
            style={{ color: evidenceTierColor("Proxy") }}
          >
            Evidence: Proxy
          </Badge>
          <span className="text-[11px] text-slate-500">
            All signals tagged Proxy until DG_ENGINE_VERSION (gate 9) closes.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-red-500" aria-hidden />
            {summary.critical} critical
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" aria-hidden />
            {summary.warning} warning
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" aria-hidden />
            {summary.ok} ok
          </span>
        </div>
      </div>

      {/* Grid: header row (signal names) + 5 DUN rows */}
      <div
        role="grid"
        aria-label="Risk signals for 5 P134 DUNs across 4 risk dimensions"
        className="grid grid-cols-[140px_repeat(4,1fr)] gap-1.5"
      >
        {/* Header row */}
        <div role="columnheader" className="px-2 py-1 text-xs font-medium text-slate-500">
          DUN \ Signal
        </div>
        {SIGNAL_LABELS.map((s) => (
          <div
            key={s.id}
            role="columnheader"
            className="px-2 py-1 text-center text-xs font-medium text-slate-400"
            title={s.description}
          >
            {s.label}
          </div>
        ))}

        {/* DUN rows */}
        {rows.map((row) => (
          <React.Fragment key={row.dunCode}>
            <div
              role="rowheader"
              className="flex flex-col justify-center rounded border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-xs"
            >
              <span className="font-semibold text-slate-200">
                N{row.dunCode} · {row.dunName}
              </span>
              <span className="text-[10px] text-slate-500">P{row.parliamentCode}</span>
            </div>
            {row.signals.map((sig) => (
              <div
                key={`${row.dunCode}-${sig.id}`}
                role="gridcell"
                tabIndex={0}
                aria-label={`${row.dunName} ${sig.label}: ${sig.format(
                  sig.value
                )} — ${sig.level}${sig.id === "dpt" ? " (P134-level, shared)" : ""}`}
                title={`${sig.label} · ${sig.description}\nValue: ${sig.format(
                  sig.value
                )}\nThreshold: ${sig.threshold}\nLevel: ${sig.level.toUpperCase()}\nEvidence: Proxy`}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded border px-2 py-1.5 text-center text-xs",
                  CELL_CLASS[sig.level],
                  FOCUS_RING
                )}
              >
                <span className="flex items-center gap-1 font-semibold">
                  {levelIcon(sig.level)}
                  <span>{sig.format(sig.value)}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide opacity-80">
                  {sig.level}
                </span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <RiskLegend />

      <p className="text-[11px] text-slate-500">
        Thresholds: senior dependency &gt; 30% / gender balance &lt; 90 /
        profile completeness &lt; 95% / DPT net &gt; 500 per month (all
        critical). DPT signal is per-parliament (P134 net = ~64/month) —
        shared across all 5 DUNs.
      </p>
    </div>
  );
}
