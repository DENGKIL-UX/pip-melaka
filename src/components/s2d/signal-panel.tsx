"use client";

// ponytail: MLK — S2D Signal Panel. A compact 1-line summary panel intended
// for the dashboard footer or overview tab. Shows loop status + signal count +
// last action timestamp + a small "S2D Loop: {status}" pill. A Reset button
// clears all signals.
//
// Implements WORKLOAD.md Phase 7 §7.9 (compact summary) — the HealthWidget is
// the smaller footer-only variant; this SignalPanel is the wider overview-row
// variant with the Reset button.
//
// WCAG 2.1 AA — 3px #C77B2C focus-visible ring, 44×44px touch targets,
// aria-label on every interactive element.

import * as React from "react";
import { Activity, Clock, RotateCcw, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useS2DStore, type S2DState } from "@/stores/s2d-store";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

const LOOP_PILL: Record<
  S2DState["loopStatus"],
  { bg: string; label: string; ariaLabel: string }
> = {
  idle: { bg: "bg-slate-500", label: "idle", ariaLabel: "S2D loop idle" },
  sensing: { bg: "bg-blue-500", label: "sensing", ariaLabel: "S2D loop sensing data sources" },
  deciding: { bg: "bg-amber-500", label: "deciding", ariaLabel: "S2D loop awaiting operator decision" },
  acting: { bg: "bg-emerald-600", label: "acting", ariaLabel: "S2D loop executing operator action" },
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

export interface SignalPanelProps {
  className?: string;
}

export function SignalPanel({ className }: SignalPanelProps) {
  const signals = useS2DStore((s) => s.signals);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const lastActionTs = useS2DStore((s) => s.lastActionTs);
  const reset = useS2DStore((s) => s.reset);
  const setLoopStatus = useS2DStore((s) => s.setLoopStatus);

  const activeCount = signals.filter(
    (s) => s.status === "new" || s.status === "ack" || s.status === "acting"
  ).length;
  const resolvedCount = signals.filter((s) => s.status === "resolved").length;

  const pill = LOOP_PILL[loopStatus];

  return (
    <div
      role="region"
      aria-label="S2D signal panel — loop status, signal count, last action"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-card px-3 py-2 dark:border-slate-800",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#C77B2C]" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          S2D
        </span>
      </div>

      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white",
          pill.bg
        )}
        role="status"
        aria-label={pill.ariaLabel}
      >
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full bg-white",
            loopStatus !== "idle" && "animate-pulse"
          )}
          aria-hidden
        />
        S2D Loop: {pill.label}
      </span>

      <div className="flex items-center gap-1.5">
        <Signal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <Badge
          variant="outline"
          className="border-slate-300 text-[10px] dark:border-slate-700"
          aria-label={`${activeCount} active signal${activeCount === 1 ? "" : "s"} (${resolvedCount} resolved, ${signals.length} total)`}
        >
          {activeCount} active · {resolvedCount} resolved · {signals.length} total
        </Badge>
      </div>

      {lastActionTs ? (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span
            className="text-[11px] text-muted-foreground"
            aria-label={`Last action at ${lastActionTs}`}
          >
            last action {formatTs(lastActionTs)}
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">no action yet</span>
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn("ml-auto h-9 px-2 text-muted-foreground", FOCUS_RING)}
        onClick={() => {
          reset();
          setLoopStatus("idle");
        }}
        aria-label="Reset S2D store — clears all signals and resets loop"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
      </Button>
    </div>
  );
}

export default SignalPanel;
