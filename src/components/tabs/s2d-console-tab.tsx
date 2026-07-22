"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Heart, TrendingUp, Vote, CheckCircle2, Clock, Zap, Brain, Eye, Target, Lightbulb } from "lucide-react";
import { useS2DStore, type S2DSignal, type AnalyticalLevel, type SignalSeverity, type SignalStatus } from "@/stores/s2d-store";
import { useI18n } from "@/lib/i18n";

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

// i18n key maps for severity / status / level display labels
const SEVERITY_I18N_KEY: Record<SignalSeverity, string> = {
  critical: "s2d.sevCritical",
  warning: "s2d.sevWarning",
  info: "s2d.sevInfo",
};

const STATUS_I18N_KEY: Record<SignalStatus, string> = {
  new: "s2d.statusNew",
  acknowledged: "s2d.statusAcknowledged",
  acting: "s2d.statusActing",
  resolved: "s2d.statusResolved",
};

const LEVEL_I18N_KEY: Record<AnalyticalLevel, string> = {
  descriptive: "s2d.levelDescriptive",
  diagnostic: "s2d.levelDiagnostic",
  predictive: "s2d.levelPredictive",
  prescriptive: "s2d.levelPrescriptive",
};

const LOOP_PHASE_I18N_KEY: Record<"sensing" | "deciding" | "acting", string> = {
  sensing: "s2d.sensingPhase",
  deciding: "s2d.decidingPhase",
  acting: "s2d.actingPhase",
};

/**
 * Map seeded signals (from `s2d-store.seedIfEmpty`) to stable i18n keys.
 *
 * Signal IDs are dynamic (`sig_<timestamp>_<random>`) so we look up seeded
 * signals by a composite key of (source, metric, parliament, dun). Signals
 * not in this map (e.g. user-added signals) fall back to their original
 * English text from the store.
 *
 * NOTE: This is intentionally limited to the 7 seeded signals. The store
 * file (`s2d-store.ts`) is out of scope for this task and remains English;
 * this component maps known seeded signals to translation keys at render
 * time so the seeded-signal text translates EN↔BM without modifying the
 * store. Proper nouns (N01, N05, P134, P137, BN, PH, PN, GE15, etc.) are
 * preserved inside the translated strings.
 */
function getSignalI18nKey(signal: S2DSignal): string | null {
  const key = `${signal.source}:${signal.metric ?? "x"}:${signal.parliament ?? "x"}:${signal.dun ?? "x"}`;
  const map: Record<string, string> = {
    "engine-demographics:senior_dependency_percent:134:05": "s2d.sig.seniorN05",
    "engine-demographics:senior_dependency_percent:134:03": "s2d.sig.seniorN03",
    "engine-demographics:gender_balance_score:134:05": "s2d.sig.genderN05",
    "dpt-churn:dpt_net:137:x": "s2d.sig.dptNet",
    "elections:ge15_split:x:x": "s2d.sig.ge15Split",
    "dosm-socioeconomic:poverty_rate:x:x": "s2d.sig.jasinPoverty",
    "engine-demographics:profile_completeness:134:x": "s2d.sig.profileP134",
  };
  return map[key] ?? null;
}

function SignalCard({ signal }: { signal: S2DSignal }) {
  const { t } = useI18n();
  const { updateSignalStatus } = useS2DStore();
  const Icon = SEVERITY_ICONS[signal.severity] ?? Activity;
  const LevelIcon = LEVEL_ICONS[signal.level] ?? Eye;

  // Look up seeded-signal i18n key. Falls back to original store text for
  // user-added signals that don't have translation keys.
  const sigKey = getSignalI18nKey(signal);
  const title = sigKey ? t(`${sigKey}.title`, signal.title) : signal.title;
  const description = sigKey ? t(`${sigKey}.desc`, signal.description) : signal.description;
  const recommendation = sigKey
    ? t(`${sigKey}.rec`, signal.recommendation ?? "")
    : signal.recommendation;
  // `signal.action` is set from `signal.recommendation` when the user clicks
  // "Take Action", so reuse the same translation key when available.
  const actionDisplay = sigKey && signal.action
    ? t(`${sigKey}.rec`, signal.action)
    : signal.action;

  return (
    <div className="rounded-md border border-border/50 p-3 space-y-2 hover:border-mlk/30 transition-colors">
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-full mt-0.5 ${signal.severity === "critical" ? "bg-red-500/15 text-red-500" : signal.severity === "warning" ? "bg-amber-500/15 text-amber-500" : "bg-blue-500/15 text-blue-500"}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[9px] py-0 h-4 ${SEVERITY_COLORS[signal.severity]}`}>
              {t(SEVERITY_I18N_KEY[signal.severity])}
            </Badge>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${STATUS_COLORS[signal.status]}`}>
              {t(STATUS_I18N_KEY[signal.status])}
            </span>
            <Badge variant="outline" className={`text-[9px] py-0 h-4 ${LEVEL_COLORS[signal.level]}`}>
              <LevelIcon className="h-2.5 w-2.5 me-0.5" />
              {t(LEVEL_I18N_KEY[signal.level])}
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
      {recommendation && signal.status !== "resolved" && (
        <div className="text-[10px] text-mlk italic ps-5 flex items-start gap-1">
          <Lightbulb className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
          <span>{recommendation}</span>
        </div>
      )}

      {/* Action buttons */}
      {signal.status !== "resolved" && (
        <div className="flex gap-1 flex-wrap pt-1 border-t border-border/30">
          {signal.status === "new" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => updateSignalStatus(signal.id, "acknowledged")}>
              {t("s2d.btnAcknowledge")}
            </Button>
          )}
          {signal.status === "acknowledged" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-mlk" onClick={() => updateSignalStatus(signal.id, "acting", signal.recommendation)}>
              <Zap className="h-2.5 w-2.5 me-0.5" /> {t("s2d.btnTakeAction")}
            </Button>
          )}
          {signal.status === "acting" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-emerald-600" onClick={() => updateSignalStatus(signal.id, "resolved")}>
              <CheckCircle2 className="h-2.5 w-2.5 me-0.5" /> {t("s2d.btnMarkResolved")}
            </Button>
          )}
        </div>
      )}

      {actionDisplay && signal.status === "acting" && (
        <div className="text-[10px] text-purple-600 dark:text-purple-400 italic ps-5">
          → {t("s2d.actionLabel")}: {actionDisplay}
        </div>
      )}
      {actionDisplay && signal.status === "resolved" && (
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 italic ps-5">
          ✓ {t("s2d.resolvedLabel")}: {actionDisplay}
        </div>
      )}
    </div>
  );
}

export function S2DConsoleTab() {
  const { t } = useI18n();
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
                <CardTitle className="text-base">{t("s2d.consoleTitle")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("s2d.consoleDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  loopStatus === "sensing" ? "bg-blue-500" :
                  loopStatus === "deciding" ? "bg-amber-500" : "bg-purple-500"
                } animate-pulse`} />
                <span className="text-xs font-medium">{t(LOOP_PHASE_I18N_KEY[loopStatus])}</span>
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
                  <div className="text-xs font-semibold">{t(LOOP_PHASE_I18N_KEY[phase])}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {phase === "sensing" && `${signals.length} ${t("s2d.signalsUnit")}`}
                    {phase === "deciding" && `${newCount + ackCount} ${t("s2d.pendingUnit")}`}
                    {phase === "acting" && `${actingCount} ${t("s2d.inProgressUnit")}`}
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
              <div className="text-[10px] text-muted-foreground">{t("s2d.kpiNew")}</div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{ackCount}</div>
              <div className="text-[10px] text-muted-foreground">{t("s2d.kpiAcknowledged")}</div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{actingCount}</div>
              <div className="text-[10px] text-muted-foreground">{t("s2d.kpiActing")}</div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{resolvedCount}</div>
              <div className="text-[10px] text-muted-foreground">{t("s2d.kpiResolved")}</div>
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
                  <div className="text-[9px] text-muted-foreground capitalize">{t(LEVEL_I18N_KEY[level])}</div>
                </div>
              );
            })}
          </div>

          {resolvedCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mb-2" onClick={clearResolved}>
              {t("s2d.btnClearResolved").replace("{n}", String(resolvedCount))}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Signal feed */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-mlk" />
            {t("s2d.signalFeed")} ({signals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">{t("s2d.noActiveSignals")}</p>
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
          <strong className="text-mlk">{t("s2d.archRefTitle")}</strong>
          <div className="mt-1 text-[10px]">
            {t("s2d.archPipeline")}
          </div>
          <div className="mt-1">
            <strong>{t("s2d.archSourcesIntro")}</strong>{" "}
            {t("s2d.archSourcesP1")}{" "}
            <strong>{t("s2d.archSourcesContext")}</strong>{" "}
            {t("s2d.archSourcesP2")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
