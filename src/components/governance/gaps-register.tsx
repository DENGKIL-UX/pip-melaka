"use client";

// ponytail: MLK — Honest gaps register. Renders all 10 gaps from
// `src/data/gaps.ts` in a sortable table. Default sort: OPEN first, then
// PARTIALLY_RESOLVED, then RESOLVED. Each gap shows its status as a colored
// badge (red / amber / green).
//
// Implements WORKLOAD.md Phase 7 (cross-cutting) + Phase 8 §8.5 + DESIGN.md §10
// (Honest gaps register) + AGENT.md §7 (every agent updates gaps.ts).
//
// WCAG 2.1 AA — 3px #C77B2C focus-visible ring, 44×44px touch targets on the
// sort buttons, aria-sort on TableHead, descriptive aria-label on every
// interactive element.

import * as React from "react";
import { AlertTriangle, CheckCircle2, CircleDot, ListChecks } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/lib/utils";
import { GAPS, gapStats, type Gap, type GapStatus } from "@/data/gaps";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

const STATUS_META: Record<
  GapStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }>; rank: number }
> = {
  OPEN: {
    label: "OPEN",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: AlertTriangle,
    rank: 0,
  },
  PARTIALLY_RESOLVED: {
    label: "PARTIALLY_RESOLVED",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: CircleDot,
    rank: 1,
  },
  RESOLVED: {
    label: "RESOLVED",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
    rank: 2,
  },
};

type SortKey = "status" | "id" | "title";

export interface GapsRegisterProps {
  className?: string;
}

export function GapsRegister({ className }: GapsRegisterProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("status");
  const [sortAsc, setSortAsc] = React.useState(true);

  const stats = React.useMemo(() => gapStats(), []);

  const sortedGaps = React.useMemo(() => {
    const arr = [...GAPS];
    const cmp = (a: Gap, b: Gap): number => {
      let r = 0;
      if (sortKey === "status") {
        r = STATUS_META[a.status].rank - STATUS_META[b.status].rank;
      } else if (sortKey === "id") {
        r = a.id.localeCompare(b.id);
      } else if (sortKey === "title") {
        r = a.title.localeCompare(b.title);
      }
      return sortAsc ? r : -r;
    };
    arr.sort(cmp);
    return arr;
  }, [sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function ariaSortVal(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortAsc ? "ascending" : "descending";
  }

  function sortButtonLabel(key: SortKey, label: string): string {
    if (sortKey !== key) return `Sort by ${label}`;
    return `Sort by ${label}, currently ${sortAsc ? "ascending" : "descending"}`;
  }

  return (
    <Card
      className={cn("border-slate-200 dark:border-slate-800", className)}
      role="region"
      aria-label="Honest gaps register — every gap is tagged DG_* and tracked"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <div>
              <CardTitle className="text-base sm:text-lg">
                Honest Gaps Register · {GAPS.length} gaps
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {stats.open} OPEN · {stats.partial} PARTIALLY_RESOLVED ·{" "}
                {stats.resolved} RESOLVED. Closing a gap requires{" "}
                <code>closed_at</code> + <code>closed_by</code>. Per AGENT.md §7,
                every agent updates this register.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                aria-sort={ariaSortVal("id")}
                className="w-[180px]"
              >
                <button
                  type="button"
                  onClick={() => toggleSort("id")}
                  className={cn(
                    "inline-flex min-h-[36px] items-center text-xs font-semibold uppercase tracking-wide",
                    FOCUS_RING
                  )}
                  aria-label={sortButtonLabel("id", "Gap ID")}
                >
                  Gap ID
                </button>
              </TableHead>
              <TableHead
                aria-sort={ariaSortVal("title")}
              >
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className={cn(
                    "inline-flex min-h-[36px] items-center text-xs font-semibold uppercase tracking-wide",
                    FOCUS_RING
                  )}
                  aria-label={sortButtonLabel("title", "Title")}
                >
                  Title
                </button>
              </TableHead>
              <TableHead
                aria-sort={ariaSortVal("status")}
                className="w-[160px]"
              >
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className={cn(
                    "inline-flex min-h-[36px] items-center text-xs font-semibold uppercase tracking-wide",
                    FOCUS_RING
                  )}
                  aria-label={sortButtonLabel("status", "Status (default OPEN first)")}
                >
                  Status
                </button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px]">Owner phase</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGaps.map((g) => {
              const meta = STATUS_META[g.status];
              const Icon = meta.icon;
              return (
                <TableRow
                  key={g.id}
                  aria-label={`Gap ${g.id}: ${g.title} — ${meta.label}`}
                >
                  <TableCell className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {g.id}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {g.title}
                    {g.closed_at ? (
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        closed {g.closed_at}
                        {g.closed_by ? ` by ${g.closed_by}` : ""}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn("border", meta.className)}
                      aria-label={`Status: ${meta.label}`}
                    >
                      <Icon className="h-3 w-3" aria-hidden />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.description}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {g.owner_phase ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Source: <code>src/data/gaps.ts</code> ({GAPS.length} gaps total).
          Default sort: OPEN → PARTIALLY_RESOLVED → RESOLVED. Click any column
          header to re-sort.
        </p>
      </CardContent>
    </Card>
  );
}

export default GapsRegister;
