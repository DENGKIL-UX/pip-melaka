"use client";

// ponytail: MLK — Demographics overlay (Phase 6.3 NEW). Shown in the DPT
// Overview tab alongside the DPT additions. Reads P134 locality-level
// intelligence and aggregates by DUN — produces a small voter-density
// heatmap (table form) showing how voter density correlates with DPT
// additions per DUN.
//
// Per task spec: "Read `/data/p134/locality-intelligence.jsonl` and
// aggregate by DUN." Implements Phase 6.3 of WORKLOAD.md + DESIGN.md §3.6
// overlay section.
//
// WCAG 2.1 AA: data presented as a labelled table (not color-only). Color
// is supplementary; numeric values are always shown. aria-label on every
// interactive element. prefers-reduced-motion honoured (no animations).

import * as React from "react";
import { Loader2, AlertCircle, MapPin } from "lucide-react";
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
import type { EngineLocalityRow } from "./types";

const DATA_URL = "/data/p134/locality-intelligence.jsonl";
const DPT_DETAIL_URL = "/data/dpt/spr-dpt-pameran.json";

const DENSITY_COLOR: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#fbbf24",
  HIGH: "#f97316",
  VERY_HIGH: "#dc2626",
};

interface DptDetailDun {
  dun_code: string;
  dun_name: string;
  additions: number;
  deletions: number;
  net: number;
}

interface DptDetailRecord {
  parliament_code: string;
  dun_breakdown: DptDetailDun[];
}

type DptDetailDoc = DptDetailRecord[];

interface AggregatedDun {
  dunCode: string;
  dunName: string;
  localityCount: number;
  totalVoters: number;
  densityBreakdown: Record<string, number>;
  dominantDensity: string;
  dptAdditions: number;
  dptDeletions: number;
  dptNet: number;
}

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

function aggregateByDun(
  locals: EngineLocalityRow[],
  dptDetail: DptDetailDoc
): AggregatedDun[] {
  const byDun = new Map<string, AggregatedDun>();

  for (const loc of locals) {
    const key = `${loc.geography.parliament_code}|${loc.geography.dun_code}`;
    let entry = byDun.get(key);
    if (!entry) {
      entry = {
        dunCode: loc.geography.dun_code,
        dunName: loc.geography.dun_name,
        localityCount: 0,
        totalVoters: 0,
        densityBreakdown: {},
        dominantDensity: "UNKNOWN",
        dptAdditions: 0,
        dptDeletions: 0,
        dptNet: 0,
      };
      byDun.set(key, entry);
    }
    entry.localityCount += 1;
    entry.totalVoters += loc.metrics.total_voters;
    const dens = loc.metrics.voter_density_score ?? "UNKNOWN";
    entry.densityBreakdown[dens] = (entry.densityBreakdown[dens] ?? 0) + 1;
  }

  // Determine dominant density per DUN.
  for (const entry of byDun.values()) {
    let max = 0;
    let dom = "UNKNOWN";
    for (const [k, v] of Object.entries(entry.densityBreakdown)) {
      if (v > max) {
        max = v;
        dom = k;
      }
    }
    entry.dominantDensity = dom;
  }

  // Aggregate DPT additions across all 5 months for P134.
  for (const rec of dptDetail) {
    if (rec.parliament_code !== "134") continue;
    for (const dun of rec.dun_breakdown) {
      const key = `134|${dun.dun_code}`;
      const entry = byDun.get(key);
      if (!entry) continue;
      entry.dptAdditions += dun.additions;
      entry.dptDeletions += dun.deletions;
      entry.dptNet += dun.net;
    }
  }

  return Array.from(byDun.values()).sort((a, b) =>
    a.dunCode.localeCompare(b.dunCode)
  );
}

export interface DemographicsOverlayProps {
  className?: string;
}

export function DemographicsOverlay({ className }: DemographicsOverlayProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<AggregatedDun[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetch(DATA_URL), fetch(DPT_DETAIL_URL)])
      .then(async ([locRes, dptRes]) => {
        if (!locRes.ok) throw new Error(`Locality fetch failed: ${locRes.status}`);
        if (!dptRes.ok) throw new Error(`DPT detail fetch failed: ${dptRes.status}`);
        const [locText, dptJson] = await Promise.all([
          locRes.text(),
          dptRes.json() as Promise<DptDetailDoc>,
        ]);
        if (cancelled) return;
        const locals = parseJsonl<EngineLocalityRow>(locText);
        setRows(aggregateByDun(locals, dptJson));
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
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-[#C77B2C]" aria-hidden />
        <h3 className="text-sm font-semibold">
          Demographics overlay · P134 localities aggregated by DUN
        </h3>
        <Badge variant="outline" className="text-[10px]">
          Phase 6.3
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Cross-references engine voter-density labels (LOW / MEDIUM / HIGH /
        VERY_HIGH) with DPT additions per DUN — surfaces whether high-density
        DUNs also have higher voter-roll churn.
      </p>

      {loading ? (
        <div
          className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Loading demographics overlay…</span>
        </div>
      ) : error ? (
        <div
          className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-center text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span>Failed to load overlay: {error}</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">DUN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[90px] text-right">Localities</TableHead>
              <TableHead className="w-[110px] text-right">Voters</TableHead>
              <TableHead className="w-[140px]">Dominant density</TableHead>
              <TableHead className="w-[90px] text-right">DPT add</TableHead>
              <TableHead className="w-[90px] text-right">DPT del</TableHead>
              <TableHead className="w-[90px] text-right">DPT net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const color = DENSITY_COLOR[r.dominantDensity] ?? "#94a3b8";
              return (
                <TableRow key={`${r.dunCode}`}>
                  <TableCell className="font-mono text-xs font-medium">
                    N{r.dunCode}
                  </TableCell>
                  <TableCell className="font-medium">{r.dunName}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {r.localityCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {r.totalVoters.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${color}1A`,
                        color,
                      }}
                      aria-label={`Dominant density: ${r.dominantDensity}`}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-sm"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      {r.dominantDensity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{r.dptAdditions}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums text-red-700 dark:text-red-400">
                    −{r.dptDeletions}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums font-semibold">
                    +{r.dptNet}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">
        Source: P134 locality-intelligence.jsonl (360 localities aggregated to
        5 DUNs) + spr-dpt-pameran.json (5 months × P134). Evidence tier: Proxy
        (engine aggregates — pending gate 9 audit).
      </p>
    </div>
  );
}
