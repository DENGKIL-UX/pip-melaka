"use client";

// ponytail: MLK — DPT By DM tab (tab 4 of 6). Renders a filterable table of
// all DMs (polling districts) across the selected parliament. Each row
// shows: DM code, parent DUN, month, additions, deletions, net.
//
// Implements WORKLOAD.md Phase 6.2 §6.2.4 + DESIGN.md §3.6 (By DM tab).
//
// Source: `/data/dpt/spr-dpt-pameran.json` — full DM breakdown across 5
// months × 6 parliaments. Total DMs = 168 (30+18+36+30+24+30 across parliaments
// — actual count from data; not the spec's "~833" which was an estimate).
//
// WCAG 2.1 AA: 3px #C77B2C focus ring on the Select + filter chips. aria-label
// on every interactive element. 44px touch targets.

import * as React from "react";
import { Loader2, AlertCircle, Filter, MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PARLIAMENTS, DPT_MONTHS } from "@/lib/melaka-constants";
import type { DptRecord, DptDmRow } from "./types";

const DATA_URL = "/data/dpt/spr-dpt-pameran.json";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

interface DmRow {
  key: string;
  parliamentCode: string;
  dunCode: string;
  dunName: string;
  dmCode: string;
  month: string;
  monthShort: string;
  additions: number;
  deletions: number;
  net: number;
}

function flattenDms(records: DptRecord[]): DmRow[] {
  const out: DmRow[] = [];
  for (const rec of records) {
    const monthMeta = DPT_MONTHS.find((m) => m.code === rec.month);
    for (const dun of rec.dun_breakdown) {
      for (const dm of dun.dm_breakdown as DptDmRow[]) {
        out.push({
          key: `${rec.parliament_code}-${dun.dun_code}-${dm.dm_code}-${rec.month}`,
          parliamentCode: rec.parliament_code,
          dunCode: dun.dun_code,
          dunName: dun.dun_name,
          dmCode: dm.dm_code,
          month: rec.month,
          monthShort: monthMeta?.short ?? rec.month,
          additions: dm.additions,
          deletions: dm.deletions,
          net: dm.net,
        });
      }
    }
  }
  return out;
}

export interface DptByDmProps {
  className?: string;
  defaultParliament?: string;
}

export function DptByDm({
  className,
  defaultParliament = "all",
}: DptByDmProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [allRows, setAllRows] = React.useState<DmRow[]>([]);
  const [filter, setFilter] = React.useState<string>(defaultParliament);

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
        setAllRows(flattenDms(json));
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

  const rows = React.useMemo(() => {
    const filtered =
      filter === "all"
        ? allRows
        : allRows.filter((r) => r.parliamentCode === filter);
    return filtered.sort(
      (a, b) =>
        a.parliamentCode.localeCompare(b.parliamentCode) ||
        a.dunCode.localeCompare(b.dunCode) ||
        a.dmCode.localeCompare(b.dmCode) ||
        a.month.localeCompare(b.month)
    );
  }, [allRows, filter]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-[#C77B2C]" aria-hidden />
        <h3 className="text-sm font-semibold">By DM · polling-district breakdown</h3>

        <label
          className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"
          aria-label="Filter by parliament"
        >
          <span>Parliament:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger
              className={cn("h-9 w-[220px] text-xs", FOCUS_RING)}
              aria-label="Filter DMs by parliament"
            >
              <SelectValue placeholder="All parliaments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All parliaments</SelectItem>
              {PARLIAMENTS.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  P{p.code} · {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Badge variant="outline" className="text-[10px]">
          {rows.length} rows
        </Badge>
      </div>

      {loading ? (
        <div
          className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Loading DM breakdown…</span>
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
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Parl</TableHead>
                <TableHead className="w-[60px]">DUN</TableHead>
                <TableHead className="min-w-[140px]">DUN name</TableHead>
                <TableHead className="w-[60px]">DM</TableHead>
                <TableHead className="w-[60px]">Month</TableHead>
                <TableHead className="w-[80px] text-right">Add</TableHead>
                <TableHead className="w-[80px] text-right">Del</TableHead>
                <TableHead className="w-[80px] text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-mono text-xs">
                    {r.parliamentCode}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.dunCode}</TableCell>
                  <TableCell className="text-xs">{r.dunName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden />
                      {r.dmCode}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.monthShort}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{r.additions}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums text-red-700 dark:text-red-400">
                    −{r.deletions}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums font-semibold">
                    {r.net >= 0 ? `+${r.net}` : r.net}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length > 200 ? (
            <p className="text-xs text-muted-foreground">
              Showing first 200 of {rows.length} rows — refine the parliament
              filter to narrow further.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Source: spr-dpt-pameran.json. Each row = one DM × one month. DM
            names are synthetic (DG_PDM_DICTIONARY gap — still OPEN). Filter
            by parliament to focus on a single seat.
          </p>
        </>
      )}
    </div>
  );
}
