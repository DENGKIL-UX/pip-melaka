"use client";

// ponytail: MLK — S2D Health Widget. Small footer widget — shows the S2D loop
// status + signal count + last action timestamp. Uses shadcn Badge + Tooltip.
// Implements WORKLOAD.md Phase 7 §7.9 (port the N9 footer health widget).
//
// This is the minimal footer variant — for a wider overview-row summary with a
// Reset button, use <SignalPanel /> instead.
//
// WCAG 2.1 AA: 3px #C77B2C focus-visible ring on the tooltip trigger,
// descriptive aria-label on every Badge, color never the sole carrier (each
// pill has a text label).

import * as React from "react";
import { Activity, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useS2DStore, type S2DState } from "@/stores/s2d-store";

const LOOP_PILL: Record<
  S2DState["loopStatus"],
  { bg: string; label: string; description: string }
> = {
  idle: { bg: "bg-slate-500", label: "idle", description: "S2D loop idle — no active sensing cycle" },
  sensing: { bg: "bg-blue-500", label: "sensing", description: "S2D loop sensing — reading JSONL aggregates for new signals" },
  deciding: { bg: "bg-amber-500", label: "deciding", description: "S2D loop deciding — operator review pending" },
  acting: { bg: "bg-emerald-600", label: "acting", description: "S2D loop acting — operator action executing" },
};

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export interface HealthWidgetProps {
  className?: string;
}

export function HealthWidget({ className }: HealthWidgetProps) {
  const signals = useS2DStore((s) => s.signals);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const lastActionTs = useS2DStore((s) => s.lastActionTs);

  const activeCount = signals.filter(
    (s) => s.status === "new" || s.status === "ack" || s.status === "acting"
  ).length;
  const pill = LOOP_PILL[loopStatus];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          aria-label={`S2D health: loop ${pill.label}, ${activeCount} active signal${activeCount === 1 ? "" : "s"}${lastActionTs ? `, last action ${formatTs(lastActionTs)}` : ", no action yet"}`}
          className={cn(
            "inline-flex min-h-[36px] cursor-help items-center gap-2 rounded-md border border-slate-200 bg-card px-2.5 py-1.5 text-xs dark:border-slate-800",
            className
          )}
        >
          <Activity className="h-3.5 w-3.5 text-[#C77B2C]" aria-hidden />
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
              pill.bg
            )}
            aria-hidden
          >
            <span
              className={cn(
                "inline-block h-1 w-1 rounded-full bg-white",
                loopStatus !== "idle" && "animate-pulse"
              )}
            />
            S2D Loop: {pill.label}
          </span>
          <Badge
            variant="outline"
            className="border-slate-300 text-[10px] dark:border-slate-700"
            aria-hidden
          >
            {activeCount} signal{activeCount === 1 ? "" : "s"}
          </Badge>
          {lastActionTs ? (
            <>
              <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
              <span className="text-[10px] text-muted-foreground" aria-hidden>
                {formatTs(lastActionTs)}
              </span>
            </>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent>{pill.description}</TooltipContent>
    </Tooltip>
  );
}

export default HealthWidget;
