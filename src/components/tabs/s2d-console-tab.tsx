"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Heart, TrendingUp, Vote, CheckCircle2, Clock, Zap, Brain, Eye, Target, Lightbulb } from "lucide-react";
import { useS2DStore, type S2DSignal, type AnalyticalLevel } from "@/stores/s2d-store";

const SEVERITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  critical: ShieldAlert,
  warning: Heart,
  info: Vote,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400 border-red-500/40",
  warning: "text-amber-600 dark:text-amber-400 border-amber-500/40",
  info: "text-blue-600 dark:text-blue-400 border-blue-500/40",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  acknowledged: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  acting: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const LEVEL_ICONS: Record<AnalyticalLevel, React.ComponentType<{ className?: string }>> = {
  descriptive: Eye,
  diagnostic: Brain,
  predictive: TrendingUp,
  prescriptive: Target,
};

const LEVEL_COLORS: Record<AnalyticalLevel, string> = {
  descriptive: "text-blue-600 dark:text-blue-400",
  diagnostic: "text-purple-600 dark:text-purple-400",
  predictive: "text-amber-600 dark:text-amber-400",
  prescriptive: "text-emerald-600 dark:text-emerald-400",
};

function SignalCard({ signal }: { signal: S2DSignal }) {
  const { updateSignalStatus } = useS2DStore();
  const Icon = SEVERITY_ICONS[signal.severity] ?? Activity;
  const LevelIcon = LEVEL_ICONS[signal.level] ?? Eye;

  return (
    <div className="rounded-md border border-border/50 p-3 space-y-2 hover:border-mlk/30 transition-colors">
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-full mt-0.5 ${signal.severity === "critical" ? "bg-red-500/15 text-red-500" : signal.severity === "warning" ? "bg-amber-500/15 text-amber-500" : "bg-blue-500/15 text-blue-500"}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{signal.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{signal.description}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[9px] py-0 h-4 ${SEVERITY_COLORS[signal.severity]}`}>
              {signal.severity.toUpperCase()}
            </Badge>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${STATUS_COLORS[signal.status]}`}>
              {signal.status.toUpperCase()}
            </span>
            <Badge variant="outline" className={`text-[9px] py-0 h-4 ${LEVEL_COLORS[signal.level]}`}>
              <LevelIcon className="h-2.5 w-2.5 me-0.5" />
              {signal.level}
            </Badge>
            {signal.parliament && (
              <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono">P{signal.parliament}</Badge>
            )}
            {signal.dun && (
              <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono">N{signal.dun}</Badge>
            )}
            <span className="text-[9px] text-muted-foreground/70">
              {new Date(signal.timestamp).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {signal.recommendation && signal.status !== "resolved" && (
        <div className="text-[10px] text-mlk italic ps-5 flex items-start gap-1">
          <Lightbulb className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
          <span>{signal.recommendation}</span>
        </div>
      )}

      {/* Action buttons */}
      {signal.status !== "resolved" && (
        <div className="flex gap-1 flex-wrap pt-1 border-t border-border/30">
          {signal.status === "new" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => updateSignalStatus(signal.id, "acknowledged")}>
              Acknowledge
            </Button>
          )}
          {signal.status === "acknowledged" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-mlk" onClick={() => updateSignalStatus(signal.id, "acting", signal.recommendation)}>
              <Zap className="h-2.5 w-2.5 me-0.5" /> Take Action
            </Button>
          )}
          {signal.status === "acting" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-emerald-600" onClick={() => updateSignalStatus(signal.id, "resolved")}>
              <CheckCircle2 className="h-2.5 w-2.5 me-0.5" /> Mark resolved
            </Button>
          )}
        </div>
      )}

      {signal.action && signal.status === "acting" && (
        <div className="text-[10px] text-purple-600 dark:text-purple-400 italic ps-5">
          → Action: {signal.action}
        </div>
      )}
      {signal.action && signal.status === "resolved" && (
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 italic ps-5">
          ✓ Resolved: {signal.action}
        </div>
      )}
    </div>
  );
}

export function S2DConsoleTab() {
  const { signals, loopStatus, lastActionAt, seedIfEmpty, clearResolved } = useS2DStore();

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const newCount = signals.filter((s) => s.status === "new").length;
  const ackCount = signals.filter((s) => s.status === "acknowledged").length;
  const actingCount = signals.filter((s) => s.status === "acting").length;
  const resolvedCount = signals.filter((s) => s.status === "resolved").length;

  // Count by analytical level
  const levelCounts: Record<AnalyticalLevel, number> = {
    descriptive: signals.filter((s) => s.level === "descriptive").length,
    diagnostic: signals.filter((s) => s.level === "diagnostic").length,
    predictive: signals.filter((s) => s.level === "predictive").length,
    prescriptive: signals.filter((s) => s.level === "prescriptive").length,
  };

  return (
    <div className="space-y-4">
      {/* S2D loop status */}
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-mlk" />
              <div>
                <CardTitle className="text-base">S2D Action Console — Sensing → Deciding → Acting</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per S2D Architecture_v2.txt: 5 analytical levels (Descriptive → Diagnostic → Predictive → Prescriptive → Insight).
                  Reads engine demographics as signal context. No /api/engine route (build-time only).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  loopStatus === "sensing" ? "bg-blue-500" :
                  loopStatus === "deciding" ? "bg-amber-500" : "bg-purple-500"
                } animate-pulse`} />
                <span className="text-xs font-medium capitalize">{loopStatus}</span>
              </div>
              {lastActionAt && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(lastActionAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Loop phase pipeline */}
          <div className="flex items-center gap-2 mb-4">
            {(["sensing", "deciding", "acting"] as const).map((phase, i) => (
              <div key={phase} className="flex items-center gap-2 flex-1">
                <div className={`flex-1 rounded-md p-2 text-center transition-all ${
                  loopStatus === phase
                    ? phase === "sensing" ? "bg-blue-500/20 border border-blue-500/40"
                    : phase === "deciding" ? "bg-amber-500/20 border border-amber-500/40"
                    : "bg-purple-500/20 border border-purple-500/40"
                    : "bg-muted/30 border border-border/30"
                }`}>
                  <div className="text-xs font-semibold capitalize">{phase}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {phase === "sensing" && `${signals.length} signals`}
                    {phase === "deciding" && `${newCount + ackCount} pending`}
                    {phase === "acting" && `${actingCount} in progress`}
                  </div>
                </div>
                {i < 2 && <span className="text-muted-foreground text-xs">→</span>}
              </div>
            ))}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{newCount}</div>
              <div className="text-[10px] text-muted-foreground">New</div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{ackCount}</div>
              <div className="text-[10px] text-muted-foreground">Acknowledged</div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{actingCount}</div>
              <div className="text-[10px] text-muted-foreground">Acting</div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{resolvedCount}</div>
              <div className="text-[10px] text-muted-foreground">Resolved</div>
            </div>
          </div>

          {/* Analytical levels */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(Object.keys(levelCounts) as AnalyticalLevel[]).map((level) => {
              const Icon = LEVEL_ICONS[level];
              return (
                <div key={level} className={`rounded-md border p-2 text-center ${LEVEL_COLORS[level]}`}>
                  <Icon className="h-3 w-3 mx-auto mb-1" />
                  <div className="text-sm font-bold">{levelCounts[level]}</div>
                  <div className="text-[9px] text-muted-foreground capitalize">{level}</div>
                </div>
              );
            })}
          </div>

          {resolvedCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mb-2" onClick={clearResolved}>
              Clear resolved ({resolvedCount})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Signal feed */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-mlk" />
            Signal Feed ({signals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">No active signals. All clear.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-mlk pr-1">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* S2D Architecture reference */}
      <Card className="border-mlk/20">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-mlk">S2D Architecture (per S2D Architecture_v2.txt):</strong>
          <div className="mt-1 text-[10px]">
            Collection → Descriptive → Diagnostic → Predictive → Prescriptive → Insight → PIP 360 Integration
          </div>
          <div className="mt-1">
            <strong>Signal sources:</strong> Engine demographics (senior dep, gender bal, completeness),
            DPT churn (5-month net), Elections (GE15 split), DOSM socioeconomics (poverty, Gini).
            The S2D console reads engine outputs as <strong>context</strong> — the engine is build-time only.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
