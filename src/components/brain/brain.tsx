"use client";

// ponytail: MLK — Digital Brain wrapper Card. Composes the 4-lens tabs +
// SVG graph + side panel into a single Card. Implements WORKLOAD.md Phase 4
// + DESIGN.md §3 row 3.
//
// NO sentiment weighting — `DG_NO_LIVE_SENTIMENT` is OPEN (see gaps.ts). The
// graph is structural only (gazette + constituency + election results). A
// visible banner makes this honest.

import * as React from "react";
import { Brain as BrainIcon, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MLK_ACCENT, evidenceTierColor } from "@/lib/party-colors";
import { useBrainStore } from "@/stores/brain-store";
import { BrainLensTabs } from "./brain-lens-tabs";
import { BrainGraph, type BrainNode } from "./brain-graph";
import { BrainSidePanel } from "./brain-side-panel";

export interface BrainProps {
  className?: string;
}

export function Brain({ className }: BrainProps) {
  const lensMode = useBrainStore((s) => s.lensMode);
  const forceAlpha = useBrainStore((s) => s.forceAlpha);

  // Nodes are owned by the Brain wrapper so the side panel can resolve the
  // selected id without coupling to the graph's internals.
  const [nodes, setNodes] = React.useState<BrainNode[]>([]);

  const lensLabel: Record<typeof lensMode, string> = {
    constituency: "Constituency containment graph",
    coalition: "Coalition alliance graph",
    demographics: "Demographics cluster overlay",
    timeline: "Election timeline morph",
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-slate-800 bg-slate-950/60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <BrainIcon
            className="h-4 w-4"
            aria-hidden
            style={{ color: MLK_ACCENT }}
          />
          Digital Brain · 4-Lens Graph
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-600 text-[10px] uppercase tracking-wide text-slate-300"
          >
            Lens:{" "}
            <span className="ml-1 font-semibold text-slate-100">
              {lensMode}
            </span>
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-600 text-[10px] uppercase tracking-wide"
            style={{ color: evidenceTierColor("Proxy") }}
          >
            Evidence: Proxy
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-3">
        {/* Honesty banner — DG_NO_LIVE_SENTIMENT gap */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Structural graph — no live sentiment.</span>{" "}
            The Digital Brain visualises gazette + constituency + election
            structure only. Social-media / news sentiment feed is absent
            (DG_NO_LIVE_SENTIMENT — open gap).
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <BrainLensTabs />
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>{lensLabel[lensMode]}</span>
            {forceAlpha > 0.01 && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: MLK_ACCENT }}
                />
                Stabilising…
              </span>
            )}
          </div>
        </div>

        {/* Split layout: graph 70% + side panel 30% */}
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <BrainGraph onNodesChange={setNodes} />
          <BrainSidePanel nodes={nodes} />
        </div>
      </CardContent>
    </Card>
  );
}

export default Brain;
