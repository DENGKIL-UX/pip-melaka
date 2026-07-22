"use client";

// ponytail: MLK — DPT By DUN tab (tab 3 of 6). Renders a heatmap-style table
// of all 28 DUNs (across 6 parliaments) × 5 months × {additions, deletions, net}.
// Each cell is shaded by net intensity (red = high churn).
//
// Implements WORKLOAD.md Phase 6.2 §6.2.3 + DESIGN.md §3.6 (By DUN tab).
//
// Source: `/data/dpt/spr-dpt-pameran.json` — aggregates each DUN across all
// 5 months.
//
// WCAG 2.1 AA: data in a labelled table — color is supplementary; numeric
// value always visible. aria-label on each row.

import * as React from "react";
import { Loader2, AlertCircle, Grid3x3 } from "lucide-react";
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
import { redelineationShortLabel } from "@/lib/dun-redelineation-map";
import { PARLIAMENTS, DPT_MONTHS } from "@/lib/melaka-constants";
import type { DptRecord, DptDunRow } from "./types";

const DATA_URL = "/data/dpt/spr-dpt-pameran.json";

interface DunAggregate {
  parliamentCode: string;
  dunCode: string;
  dunName: string;
  renamed: boolean;
  renamedLabel: string;
  perMonth: Record<string, { additions: number; deletions: number; net: number }>;
  totalAdditions: number;
  totalDeletions: number;
  totalNet: number;
}

function aggregateByDun(records: DptRecord[]): DunAggregate[] {
  const map = new Map<string, DunAggregate>();
  for (const rec of records) {
    for (const dun of rec.dun_breakdown as DptDunRow[]) {
      const key = `${rec.parliament_code}|${dun.dun_code}`;
      let entry = map.get(key);
      if (!entry) {
        const renamedLabel = redelineationShortLabel(dun.dun_name);
        entry = {
          parliamentCode: rec.parliament_code,
          dunCode: dun.dun_code,
          dunName: dun.dun_name,
          renamed: !!renamedLabel,
          renamedLabel,
          perMonth: {},
          totalAdditions: 0,
          totalDeletions: 0,
          totalNet: 0,
        };
        map.set(key, entry);
      }
      entry.perMonth[rec.month] = {
        additions: dun.additions,
        deletions: dun.deletions,
        net: dun.net,
      };
      entry.totalAdditions += dun.additions;
      entry.totalDeletions += dun.deletions;
      entry.totalNet += dun.net;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      a.parliamentCode.localeCompare(b.parliamentCode) ||
      a.dunCode.localeCompare(b.dunCode)
  );
}

function netCellColor(net: number, max: number): string {
  if (max <= 0 || net <= 0) return "";
  const ratio = Math.min(1, net / max);
  // Light → vivid amber/orange scale.
  const alpha = 0.1 + ratio * 0.6;
  return `rgba(199, 123, 44, ${alpha.toFixed(2)})`;
}

export interface DptByDunProps {
  className?: string;
}

export function DptByDun({ className }: DptByDunProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<DunAggregate[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`DPT fetch failed: ${res.status}`);
        return (await res.json()) as DptRecord[];
      })
      .then((json) => {
        if (cancelled) return;
        setRows(aggregateByDun(json));
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

  const maxNet = React.useMemo(
    () =>
      Math.max(
        1,
        ...rows.flatMap((r) => DPT_MONTHS.map((m) => r.perMonth[m.code]?.net ?? 0))
      ),
    [rows]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Grid3x3 className="h-4 w-4 text-[#C77B2C]" aria-hidden />
        <h3 className="text-sm font-semibold">
          By DUN · 28 DUNs × 5 months · net additions heatmap
        </h3>
        <Badge variant="outline" className="text-[10px]">
          Cells shaded by net intensity (max = {maxNet})
        </Badge>
      </div>

      {loading ? (
        <div
          className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Loading DUN breakdown…</span>
        </div>
      ) : error ? (
        <div
          className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-center text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span>Failed to load: {error}</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">P·DUN</TableHead>
              <TableHead className="min-w-[140px]">DUN name</TableHead>
              {DPT_MONTHS.map((m) => (
                <TableHead key={m.code} className="w-[60px] text-center">
                  {m.short}
                </TableHead>
              ))}
              <TableHead className="w-[70px] text-right">5-mo net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const parl = PARLIAMENTS.find((p) => p.code === r.parliamentCode);
              return (
                <TableRow key={`${r.parliamentCode}-${r.dunCode}`}>
                  <TableCell className="font-mono text-xs">
                    {r.parliamentCode}·{r.dunCode}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium">{r.dunName}</span>
                      {r.renamed && r.renamedLabel ? (
                        <Badge
                          variant="outline"
                          className="border-[#C77B2C]/60 text-[10px] text-[#C77B2C]"
                          title={`Renamed in 2023 redelineation — ${r.renamedLabel}`}
                        >
                          {r.renamedLabel}
                        </Badge>
                      ) : null}
                      {parl ? (
                        <span className="text-[10px] text-muted-foreground">
                          {parl.name}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  {DPT_MONTHS.map((m) => {
                    const cell = r.perMonth[m.code];
                    const net = cell?.net ?? 0;
                    const bg = netCellColor(net, maxNet);
                    return (
                      <TableCell
                        key={m.code}
                        className="text-center font-mono text-xs tabular-nums"
                        style={bg ? { backgroundColor: bg } : undefined}
                        aria-label={`${m.short} ${r.dunName}: additions ${cell?.additions ?? 0}, deletions ${cell?.deletions ?? 0}, net ${net}`}
                      >
                        {net >= 0 ? `+${net}` : net}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                    +{r.totalNet}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">
        Source: spr-dpt-pameran.json (30 records aggregated to 28 DUNs × 5
        months = 140 cells). Cells shaded by net additions intensity — amber
        scale, max = {maxNet}. Renamed DUNs (N03/N04/N05) flagged with
        redelineation badge.
      </p>
    </div>
  );
}
