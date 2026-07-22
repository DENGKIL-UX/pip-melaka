"use client";

// ponytail: MLK — NO /api/engine route notice. Small amber callout placed in
// the Governance tab to make the engine's build-time-only posture unmissable.
//
// Implements WORKLOAD.md Phase 7 §7.6 + Phase 8 §8.5 + DESIGN.md §5.3.
//
// The callout is informational — it has no interactive elements beyond a link
// to the relevant spec section, and uses an amber border (not red) because
// this is EXPECTED behaviour, not an error.

import * as React from "react";
import { AlertTriangle, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoEngineRouteNoticeProps {
  className?: string;
}

export function NoEngineRouteNotice({ className }: NoEngineRouteNoticeProps) {
  return (
    <aside
      role="note"
      aria-label="No /api/engine route — this is expected and documented"
      className={cn(
        "flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100",
        className
      )}
    >
      <AlertTriangle
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
        aria-hidden
      />
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 font-semibold">
          <FileWarning className="h-4 w-4" aria-hidden />
          There is NO <code>/api/engine</code> route.
        </p>
        <p className="text-[12px] leading-relaxed">
          The engine is <strong>build-time only</strong> — it produces the 5
          aggregate JSONLs per parliament that ship as static assets in{" "}
          <code>/public/data/p{`{N}`}/</code>. Requesting{" "}
          <code>/api/engine</code> returns a 404 — this is <strong>expected and
          documented</strong> (per WORKLOAD.md Phase 7 §7.6 + ENGINE-INTEGRATION.md
          §9 + DESIGN.md §5.3).
        </p>
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          The S2D Action Console reads demographic aggregates as signal CONTEXT
          — not as engine-produced runtime signals.
        </p>
      </div>
    </aside>
  );
}

export default NoEngineRouteNotice;
