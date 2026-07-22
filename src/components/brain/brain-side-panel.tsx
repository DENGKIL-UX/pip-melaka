"use client";

// ponytail: MLK — Side panel for the Digital Brain graph. Shows the active
// node's details when a node is clicked. Implements Phase 4 §4.2 "node click
// → side panel with constituency details" + DESIGN.md §3 row 3.
//
// Reads `useBrainStore.selectedNodeId` + the loaded graph data (passed in as
// props). Also writes to `useDashboardStore.setSelectedDun` so the dashboard
// drawer can follow the selected DUN (cross-module sync — same pattern as
// 2D / 3D map click handlers).
//
// The panel shows different fields per node kind:
//   DUN:        code, name, parliament, district, total_voters, dominant
//               ethnicity, PRN15 winner, GE15 winner (inherits from parliament).
//   Parliament: code, name, district, GE14 / GE15 winners, total DUN count.
//   District:   code, name, parliament count, total DUN count, total voters.
//   Coalition:  code (BN/PH/PN), label, PRN15 / GE15 seat count.

import * as React from "react";
import { MousePointerClick, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  PARTY_COLORS,
  EVIDENCE_TIER_COLORS,
  ETHNICITY_COLORS,
  partyColor,
  evidenceTierColor,
} from "@/lib/party-colors";
import { useBrainStore } from "@/stores/brain-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import type {
  BrainNode,
  DunBrainNode,
  ParliamentBrainNode,
  DistrictBrainNode,
  CoalitionBrainNode,
} from "./brain-graph";

export interface BrainSidePanelProps {
  /** Loaded graph nodes (any kind). Used to resolve the selected id. */
  nodes: BrainNode[];
  className?: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

function winnerBadge(winner: string): React.ReactNode {
  const c = winner.toUpperCase();
  const hex = partyColor(c);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: hex }}
      />
      <span className="font-semibold" style={{ color: hex }}>
        {c || "—"}
      </span>
    </span>
  );
}

function StatRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-right text-sm text-slate-100">{children}</dd>
    </div>
  );
}

export function BrainSidePanel({ nodes, className }: BrainSidePanelProps) {
  const selectedNodeId = useBrainStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useBrainStore((s) => s.setSelectedNodeId);
  const setSelectedDun = useDashboardStore((s) => s.setSelectedDun);

  const selected = React.useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  // ponytail: MLK — sync to dashboard drawer for DUN nodes only. Parliament /
  // district / coalition nodes have no drawer equivalent so we don't fire.
  React.useEffect(() => {
    if (!selected) return;
    if (selected.kind === "dun") {
      const d = selected as DunBrainNode;
      setSelectedDun({
        parliament: d.parliamentCode,
        dun: d.dunCode,
        name: d.dunName,
      });
    }
  }, [selected, setSelectedDun]);

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-4",
        className
      )}
      aria-label="Digital Brain — selected node details"
      role="complementary"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Node details</h3>
        {selected && (
          <button
            type="button"
            onClick={() => setSelectedNodeId(null)}
            aria-label="Clear selection"
            title="Clear selection"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              FOCUS_RING
            )}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </header>

      {!selected && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-slate-500">
          <MousePointerClick className="h-6 w-6" aria-hidden />
          <p className="text-xs">Click a node in the graph to see its details.</p>
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-3">
          <div>
            <Badge
              variant="outline"
              className="mb-1 border-slate-600 text-[10px] uppercase tracking-wide text-slate-400"
            >
              {selected.kind}
            </Badge>
            <p className="text-base font-semibold text-slate-100">
              {selected.title}
            </p>
            {selected.subtitle && (
              <p className="text-xs text-slate-400">{selected.subtitle}</p>
            )}
          </div>

          <Separator className="bg-slate-800" />

          <dl className="flex flex-col gap-0.5">
            {selected.kind === "dun" && (
              <DunDetails node={selected as DunBrainNode} />
            )}
            {selected.kind === "parliament" && (
              <ParliamentDetails node={selected as ParliamentBrainNode} />
            )}
            {selected.kind === "district" && (
              <DistrictDetails node={selected as DistrictBrainNode} />
            )}
            {selected.kind === "coalition" && (
              <CoalitionDetails node={selected as CoalitionBrainNode} />
            )}
          </dl>

          <Separator className="bg-slate-800" />

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: evidenceTierColor("Proxy") }}
            />
            <span>
              Evidence tier: <span className="font-medium text-amber-400">Proxy</span>
              <span className="ml-1 text-slate-600">
                (DG_ENGINE_VERSION — gate 9 pending)
              </span>
            </span>
          </div>

          {selected.kind === "dun" && (
            <p className="text-[11px] text-slate-500">
              Clicking a DUN also opens the shared drawer (sync via
              <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-slate-300">
                useDashboardStore
              </code>
              ).
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-kind detail renderers
// ─────────────────────────────────────────────────────────────────────────────

function DunDetails({ node }: { node: DunBrainNode }) {
  const ethColor =
    ETHNICITY_COLORS[node.dominantEthnicity] ?? ETHNICITY_COLORS.UNKNOWN;
  return (
    <>
      <StatRow label="DUN code">N{node.dunCode}</StatRow>
      <StatRow label="Parliament">P{node.parliamentCode}</StatRow>
      <StatRow label="District">{node.districtName}</StatRow>
      <StatRow label="Total voters">
        {node.totalVoters.toLocaleString()}
      </StatRow>
      <StatRow label="Male / Female">
        {node.maleVoters.toLocaleString()} / {node.femaleVoters.toLocaleString()}
      </StatRow>
      <StatRow label="Senior dep. %">
        {node.seniorDependencyPercent.toFixed(1)}%
      </StatRow>
      <StatRow label="Gender balance">
        {node.genderBalanceScore.toFixed(1)}
      </StatRow>
      <StatRow label="Profile completeness">
        {(node.profileCompletenessScore * 100).toFixed(1)}%
      </StatRow>
      <StatRow label="Dominant ethnicity">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: ethColor }}
          />
          <span>{node.dominantEthnicity}</span>
        </span>
      </StatRow>
      <StatRow label="PRN15 winner">{winnerBadge(node.prn15Winner)}</StatRow>
      <StatRow label="GE15 winner (parl.)">
        {winnerBadge(node.ge15Winner)}
      </StatRow>
    </>
  );
}

function ParliamentDetails({ node }: { node: ParliamentBrainNode }) {
  return (
    <>
      <StatRow label="Parliament code">P{node.parliamentCode}</StatRow>
      <StatRow label="District">{node.districtName}</StatRow>
      <StatRow label="DUN count">{node.dunCount}</StatRow>
      <StatRow label="Total voters">
        {node.totalVoters.toLocaleString()}
      </StatRow>
      <StatRow label="GE14 winner">{winnerBadge(node.ge14Winner)}</StatRow>
      <StatRow label="GE15 winner">{winnerBadge(node.ge15Winner)}</StatRow>
    </>
  );
}

function DistrictDetails({ node }: { node: DistrictBrainNode }) {
  return (
    <>
      <StatRow label="District code">{node.districtCode}</StatRow>
      <StatRow label="District name">{node.districtName}</StatRow>
      <StatRow label="Parliaments">{node.parliamentCount}</StatRow>
      <StatRow label="DUN count">{node.dunCount}</StatRow>
      <StatRow label="Total voters">
        {node.totalVoters.toLocaleString()}
      </StatRow>
    </>
  );
}

function CoalitionDetails({ node }: { node: CoalitionBrainNode }) {
  const hex = PARTY_COLORS[node.coalitionCode as keyof typeof PARTY_COLORS] ?? PARTY_COLORS.OTH;
  return (
    <>
      <StatRow label="Coalition">
        <span
          className="inline-flex items-center gap-1.5 font-semibold"
          style={{ color: hex }}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: hex }}
          />
          {node.coalitionCode}
        </span>
      </StatRow>
      <StatRow label="Coalition name">{node.coalitionName}</StatRow>
      <StatRow label="PRN15 seats">{node.prn15Seats}</StatRow>
      <StatRow label="GE15 parl. seats">{node.ge15Seats}</StatRow>
      <StatRow label="DUN nodes linked">{node.linkedDunCount}</StatRow>
    </>
  );
}
