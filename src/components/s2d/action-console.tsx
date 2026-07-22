"use client";

// ponytail: MLK — S2D Action Console. Main panel for the S2D tab.
//
// Implements WORKLOAD.md Phase 7 §7.2, §7.5–7.6:
//   - Lists active signals (status: new / ack / acting) as cards.
//   - Each card shows: severity badge, source badge, title, detail,
//     evidence-tier badge, action buttons (Acknowledge / Act / Resolve /
//     Dismiss), and a list of suggested actions with checkboxes.
//   - Filter chips at top: All / New / Acknowledged / Acting / Resolved.
//   - Empty state: "No active signals. S2D loop is sensing..."
//
// Per §7.5–7.6, demographic signals are read as CONTEXT (derived from the
// aggregate JSONLs) — NOT as engine-produced signals. The seeder
// (`signal-seeder.ts`) is the only place that wires JSONLs to signals; this
// component renders whatever the store holds. There is NO `/api/engine` route.
//
// WCAG 2.1 AA:
//   - 3px #C77B2C focus-visible ring on every interactive element.
//   - 44×44px touch targets (min-h-[44px] on all buttons + chips).
//   - aria-label on every button, chip, and checkbox.
//   - role="region" / role="list" / role="listitem" as appropriate.
//   - prefers-reduced-motion honoured via CSS transition guards.

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EVIDENCE_TIER_COLORS } from "@/lib/party-colors";
import { useS2DStore, type S2DSignal, type SignalStatus } from "@/stores/s2d-store";
import { seedSignalsIfEmpty } from "./signal-seeder";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SEVERITY_META: Record<
  S2DSignal["severity"],
  { label: string; className: string; dot: string }
> = {
  info: {
    label: "Info",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  warning: {
    label: "Warning",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
};

const SOURCE_LABEL: Record<S2DSignal["source"], string> = {
  demographics: "Demographics",
  dpt: "DPT",
  elections: "Elections",
  socioeconomic: "Socioeconomic",
  coalition: "Coalition",
};

const FILTER_CHIPS: { id: SignalStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "ack", label: "Acknowledged" },
  { id: "acting", label: "Acting" },
  { id: "resolved", label: "Resolved" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Signal card
// ─────────────────────────────────────────────────────────────────────────────
function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  } catch {
    return ts;
  }
}

interface SignalCardProps {
  signal: S2DSignal;
}

function SignalCard({ signal }: SignalCardProps) {
  const ackSignal = useS2DStore((s) => s.ackSignal);
  const actSignal = useS2DStore((s) => s.actSignal);
  const resolveSignal = useS2DStore((s) => s.resolveSignal);
  const dismissSignal = useS2DStore((s) => s.dismissSignal);

  const sev = SEVERITY_META[signal.severity];
  const tierColor = EVIDENCE_TIER_COLORS[signal.evidence_tier];

  const isResolved = signal.status === "resolved";
  const isDismissed = signal.status === "dismissed";

  return (
    <Card
      role="listitem"
      aria-label={`Signal ${signal.id}: ${signal.title} — ${signal.severity}, ${signal.source}, status ${signal.status}`}
      className={cn(
        "border-slate-200 dark:border-slate-800",
        (isResolved || isDismissed) && "opacity-70"
      )}
    >
      <CardContent className="p-4">
        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn("border", sev.className)}
              aria-label={`Severity: ${sev.label}`}
            >
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", sev.dot)} aria-hidden />
              {sev.label}
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-300 text-[10px] uppercase tracking-wide dark:border-slate-700"
              aria-label={`Source: ${SOURCE_LABEL[signal.source]}`}
            >
              {SOURCE_LABEL[signal.source]}
            </Badge>
            <Badge
              className="border-transparent text-white"
              style={{ backgroundColor: tierColor }}
              aria-label={`Evidence tier: ${signal.evidence_tier}`}
            >
              {signal.evidence_tier}
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-300 text-[10px] uppercase tracking-wide dark:border-slate-700"
              aria-label={`Status: ${signal.status}`}
            >
              {signal.status}
            </Badge>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {signal.id}
          </span>
        </div>

        {/* Title + detail */}
        <h3 className="mt-3 text-sm font-semibold leading-tight">
          {signal.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{signal.detail}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Raised {formatTs(signal.ts)}
        </p>

        <Separator className="my-3" />

        {/* Suggested actions */}
        <div className="mb-3">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3" aria-hidden /> Suggested actions
          </p>
          <ul className="flex flex-col gap-1.5" role="list">
            {signal.suggested_actions.map((a) => {
              const checked = a.status === "active" || a.status === "done";
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-800"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-400 dark:border-slate-600"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`Action ${a.id}: ${a.label} — ${checked ? "active" : "pending"}`}
                      >
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                        ) : null}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{a.rationale}</TooltipContent>
                  </Tooltip>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "font-medium leading-tight",
                        a.status === "done" && "text-muted-foreground line-through"
                      )}
                    >
                      {a.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {a.rationale}
                    </span>
                  </div>
                  {a.status === "active" ? (
                    <Badge
                      className="ml-auto border-transparent bg-emerald-600 text-[10px] text-white"
                      aria-label="Action active"
                    >
                      active
                    </Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-11 px-3", FOCUS_RING)}
            onClick={() => ackSignal(signal.id)}
            disabled={signal.status !== "new"}
            aria-label={`Acknowledge signal ${signal.id}: ${signal.title}`}
          >
            <Eye className="h-4 w-4" aria-hidden /> Acknowledge
          </Button>
          {signal.suggested_actions.map((a) => (
            <Button
              key={a.id}
              type="button"
              size="sm"
              variant="secondary"
              className={cn("h-11 px-3", FOCUS_RING)}
              onClick={() => actSignal(signal.id, a.id)}
              disabled={signal.status === "resolved" || signal.status === "dismissed"}
              aria-label={`Act on signal ${signal.id} with action ${a.id}: ${a.label}`}
            >
              <PlayCircle className="h-4 w-4" aria-hidden /> Act: {a.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-11 border-transparent bg-emerald-600 px-3 text-white hover:bg-emerald-700",
              FOCUS_RING
            )}
            onClick={() => resolveSignal(signal.id)}
            disabled={isResolved || isDismissed}
            aria-label={`Resolve signal ${signal.id}: ${signal.title}`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden /> Resolve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("h-11 px-3 text-muted-foreground", FOCUS_RING)}
            onClick={() => dismissSignal(signal.id)}
            disabled={isResolved || isDismissed}
            aria-label={`Dismiss signal ${signal.id}: ${signal.title}`}
          >
            <X className="h-4 w-4" aria-hidden /> Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export interface ActionConsoleProps {
  className?: string;
}

export function ActionConsole({ className }: ActionConsoleProps) {
  const signals = useS2DStore((s) => s.signals);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const lastActionTs = useS2DStore((s) => s.lastActionTs);
  const reset = useS2DStore((s) => s.reset);
  const setLoopStatus = useS2DStore((s) => s.setLoopStatus);

  const [filter, setFilter] = React.useState<SignalStatus | "all">("all");
  const [seeding, setSeeding] = React.useState(false);
  const [seedError, setSeedError] = React.useState<string | null>(null);

  // Seed on mount if the store is empty (Phase 7 §7.5–7.6).
  React.useEffect(() => {
    let cancelled = false;
    if (useS2DStore.getState().signals.length > 0) return;
    setSeeding(true);
    setSeedError(null);
    seedSignalsIfEmpty()
      .then(() => {
        if (cancelled) return;
        setSeeding(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSeedError(err instanceof Error ? err.message : String(err));
        setSeeding(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSignals = React.useMemo(() => {
    if (filter === "all") return signals;
    return signals.filter((s) => s.status === filter);
  }, [signals, filter]);

  const counts = React.useMemo(() => {
    const c: Record<SignalStatus | "all", number> = {
      all: signals.length,
      new: 0,
      ack: 0,
      acting: 0,
      resolved: 0,
      dismissed: 0,
    };
    for (const s of signals) c[s.status]++;
    return c;
  }, [signals]);

  const loopPillColor: Record<typeof loopStatus, string> = {
    idle: "bg-slate-500",
    sensing: "bg-blue-500",
    deciding: "bg-amber-500",
    acting: "bg-emerald-600",
  };

  return (
    <Card
      className={cn("border-slate-200 dark:border-slate-800", className)}
      role="region"
      aria-label="S2D Action Console — Sensing-to-Decision signal queue"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <div>
              <CardTitle className="text-base sm:text-lg">
                S2D Action Console · Sensing → Decide → Act
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Reads demographics as signal CONTEXT (derived from aggregate
                JSONLs). No <code>/api/engine</code> route. Loop:
                <span
                  className={cn(
                    "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white",
                    loopPillColor[loopStatus]
                  )}
                  aria-label={`S2D loop status: ${loopStatus}`}
                >
                  {loopStatus}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastActionTs ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="border-slate-300 text-[10px] dark:border-slate-700"
                    aria-label={`Last action: ${lastActionTs}`}
                  >
                    <Clock className="h-3 w-3" aria-hidden />
                    {formatTs(lastActionTs)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Last S2D action timestamp</TooltipContent>
              </Tooltip>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("h-11 px-3", FOCUS_RING)}
              onClick={() => {
                reset();
                setLoopStatus("idle");
              }}
              aria-label="Reset S2D store — clears all signals"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filter chips */}
        <div
          className="mb-4 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter signals by status"
        >
          {FILTER_CHIPS.map((chip) => {
            const active = filter === chip.id;
            const count = counts[chip.id];
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                aria-pressed={active}
                aria-label={`Filter: ${chip.label} (${count} signal${count === 1 ? "" : "s"})${active ? " — active" : ""}`}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  FOCUS_RING,
                  active
                    ? "border-[#C77B2C] bg-[#C77B2C]/10 text-[#C77B2C]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <span>{chip.label}</span>
                <Badge
                  variant="outline"
                  className="border-slate-400 px-1.5 text-[9px] dark:border-slate-600"
                  aria-hidden
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Body */}
        {seeding ? (
          <div
            className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Activity className="h-4 w-4 animate-pulse" aria-hidden />
            <span>S2D loop is sensing… seeding initial signals from JSONL aggregates.</span>
          </div>
        ) : seedError ? (
          <div
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden />
            S2D seeding failed: {seedError}
          </div>
        ) : visibleSignals.length === 0 ? (
          <div
            className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm text-muted-foreground dark:border-slate-700"
            role="status"
            aria-live="polite"
          >
            <Sparkles className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <span>No active signals. S2D loop is sensing…</span>
          </div>
        ) : (
          <div
            className="grid gap-3"
            role="list"
            aria-label={`${visibleSignals.length} S2D signal${visibleSignals.length === 1 ? "" : "s"}`}
          >
            {visibleSignals.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionConsole;
