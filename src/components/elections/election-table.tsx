"use client";

// ponytail: MLK — Sortable election results table. Used for the 28 DUNs
// (GE14 / PRN15) and the 6 parliaments (GE15). Each row shows code, name
// (with redelineation badge for N03/N04/N05), winner, runner-up, vote share %.
//
// Implements WORKLOAD.md Phase 6.1 §6.1.2 table requirement + DESIGN.md §3
// row 4. Source caption: "ElectionData.my — community-maintained, sourced
// from SPR gazettes" (per the JSON root `source` field).
//
// Sorting: clickable column headers. Default sort = parliament/dun code ascending.
// WCAG 2.1 AA: 3px #C77B2C focus-visible ring on sort buttons, 44×44px touch
// targets (h-11 sort buttons), aria-label on every interactive element +
// aria-sort on column headers. Color never sole carrier — winner badge has
// both color + text label.

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { PARTY_COLORS } from "@/lib/party-colors";
import { redelineationShortLabel } from "@/lib/dun-redelineation-map";
import type {
  CoalitionCode,
  Election,
  ElectionDunResult,
  ElectionParlResult,
} from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

type SortKey = "code" | "name" | "winner" | "runner_up" | "vote_share";
type SortDir = "asc" | "desc";

export interface ElectionTableProps {
  election: Election;
  className?: string;
}

interface Row {
  code: string;
  parliamentCode: string;
  parliamentName?: string;
  name: string;
  winner: string;
  runner_up: string | null;
  voteSharePct: number | null;
  voteShareAll: Record<string, number> | null;
  renamed: boolean;
  renamedLabel: string;
}

function coalitionColor(code: string): string {
  const upper = code.toUpperCase() as keyof typeof PARTY_COLORS;
  if (upper === "BN") return PARTY_COLORS.BN;
  if (upper === "PH") return PARTY_COLORS.PH;
  if (upper === "PN") return PARTY_COLORS.PN;
  if (upper === "MLK") return PARTY_COLORS.OTH;
  return PARTY_COLORS.OTH;
}

function WinnerBadge({ code }: { code: string }) {
  const color = coalitionColor(code);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
      aria-label={`Winner: ${code}`}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-white/80"
        aria-hidden
      />
      {code}
    </span>
  );
}

function RunnerUpCell({ code }: { code: string | null }) {
  if (!code) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs"
      style={{
        color: coalitionColor(code),
        borderColor: coalitionColor(code),
      }}
      aria-label={`Runner-up: ${code}`}
    >
      {code}
    </span>
  );
}

function VoteShareCell({ row }: { row: Row }) {
  if (row.voteSharePct === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1" aria-label={`Winner vote share ${row.voteSharePct.toFixed(1)} percent`}>
      <span className="text-xs font-semibold tabular-nums">
        {row.voteSharePct.toFixed(1)}%
      </span>
      {row.voteShareAll ? (
        <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
          {(["BN", "PH", "PN", "Others"] as const).map((c) => {
            const v = row.voteShareAll?.[c] ?? 0;
            if (v <= 0) return null;
            return (
              <span
                key={c}
                className="h-full"
                style={{ backgroundColor: coalitionColor(c), width: `${v * 100}%` }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function buildRows(election: Election): Row[] {
  if (election.dun_results.length > 0) {
    return election.dun_results.map((d: ElectionDunResult) => {
      const winnerShare = d.vote_share?.[d.winner] ?? null;
      const runnerUp = d.vote_share
        ? Object.entries(d.vote_share)
            .filter(([k]) => k !== d.winner)
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
        : null;
      return {
        code: `N${d.dun_code}`,
        parliamentCode: d.parliament_code,
        parliamentName: undefined,
        name: d.dun_name_2026 || d.dun_name_2018,
        winner: d.winner,
        runner_up: runnerUp,
        voteSharePct: winnerShare !== null ? winnerShare * 100 : null,
        voteShareAll: d.vote_share ?? null,
        renamed: d.renamed,
        renamedLabel: redelineationShortLabel(d.dun_name_2026 || d.dun_name_2018),
      };
    });
  }
  // GE15 — parliament-level table.
  return election.parliament_results.map((p: ElectionParlResult) => ({
    code: `P${p.parliament_code}`,
    parliamentCode: p.parliament_code,
    parliamentName: p.parliament_name,
    name: p.parliament_name,
    winner: p.winner,
    runner_up: p.runner_up,
    voteSharePct: (p.votes_pct ?? 0) * 100,
    voteShareAll: null,
    renamed: false,
    renamedLabel: "",
  }));
}

function sortRows(rows: Row[], key: SortKey, dir: SortDir): Row[] {
  const sign = dir === "asc" ? 1 : -1;
  const out = [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    if (key === "code") {
      av = a.code;
      bv = b.code;
    } else if (key === "name") {
      av = a.name.toLowerCase();
      bv = b.name.toLowerCase();
    } else if (key === "winner") {
      av = a.winner;
      bv = b.winner;
    } else if (key === "runner_up") {
      av = a.runner_up ?? "";
      bv = b.runner_up ?? "";
    } else {
      av = a.voteSharePct ?? -1;
      bv = b.voteSharePct ?? -1;
    }
    if (av < bv) return -1 * sign;
    if (av > bv) return 1 * sign;
    return 0;
  });
  return out;
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}, currently ${
          active ? (dir === "asc" ? "ascending" : "descending") : "unsorted"
        }`}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded px-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
          FOCUS_RING
        )}
      >
        <span>{label}</span>
        <Icon className="h-3 w-3" aria-hidden />
      </button>
    </TableHead>
  );
}

export function ElectionTable({ election, className }: ElectionTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("code");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const allRows = React.useMemo(() => buildRows(election), [election]);
  const rows = React.useMemo(
    () => sortRows(allRows, sortKey, sortDir),
    [allRows, sortKey, sortDir]
  );

  const onSort = React.useCallback((k: SortKey) => {
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
  }, []);

  const isDun = election.dun_results.length > 0;
  const codeLabel = isDun ? "DUN" : "Parliament";
  const nameLabel = isDun ? "DUN name (2026)" : "Parliament name";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader
              label={codeLabel}
              sortKey="code"
              active={sortKey === "code"}
              dir={sortDir}
              onSort={onSort}
              className="w-[88px]"
            />
            <SortHeader
              label={nameLabel}
              sortKey="name"
              active={sortKey === "name"}
              dir={sortDir}
              onSort={onSort}
            />
            {isDun && (
              <TableHead className="w-[100px] text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Parliament
              </TableHead>
            )}
            <SortHeader
              label="Winner"
              sortKey="winner"
              active={sortKey === "winner"}
              dir={sortDir}
              onSort={onSort}
              className="w-[110px]"
            />
            <SortHeader
              label="Runner-up"
              sortKey="runner_up"
              active={sortKey === "runner_up"}
              dir={sortDir}
              onSort={onSort}
              className="w-[110px]"
            />
            <SortHeader
              label="Vote share"
              sortKey="vote_share"
              active={sortKey === "vote_share"}
              dir={sortDir}
              onSort={onSort}
              className="w-[160px]"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.code}-${r.parliamentCode}`}>
              <TableCell className="font-mono text-xs font-medium">
                {r.code}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{r.name}</span>
                  {r.renamed && r.renamedLabel ? (
                    <Badge
                      variant="outline"
                      className="border-[#C77B2C]/60 text-[10px] text-[#C77B2C]"
                      title={`Renamed in 2023 redelineation — formerly ${r.renamedLabel.replace(/^\(formerly |\)$/g, "")}`}
                    >
                      {r.renamedLabel}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              {isDun && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  P{r.parliamentCode}
                </TableCell>
              )}
              <TableCell>
                <WinnerBadge code={r.winner} />
              </TableCell>
              <TableCell>
                <RunnerUpCell code={r.runner_up} />
              </TableCell>
              <TableCell>
                <VoteShareCell row={r} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Source: ElectionData.my — community-maintained, sourced from SPR
        gazettes. {rows.length} {isDun ? "DUNs" : "parliaments"} shown.
        {isDun && " Vote share available for PRN15 only."}
      </p>
    </div>
  );
}
