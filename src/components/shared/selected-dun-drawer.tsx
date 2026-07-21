"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Users, Heart, Scale, Vote, ShieldAlert, Loader2,
  Trophy, TrendingDown, Repeat2, AlertTriangle, Building2, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/stores/dashboard-store";
import { PARTY_COLORS, MLK_ACCENT } from "@/lib/party-colors";
import { getDunName, PARLIAMENTS } from "@/lib/melaka-constants";
import { DUN_SUMMARY, getDunByCode, type DunSummary } from "@/lib/dun-summary";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DunRecord {
  geography: {
    state_code: string;
    state_name: string;
    parliament_code: string;
    parliament_name: string;
    dun_code: string;
    dun_name: string;
  };
  metrics: {
    total_voters: number;
    male_voters: number;
    female_voters: number;
    other_or_unknown_gender_voters: number;
    senior_voters_56_plus: number;
    known_age_voters: number;
    senior_dependency_percent: number;
    gender_balance_score: number;
    male_percent: number;
    female_percent: number;
    dominant_age_group: string;
    dominant_ethnicity_group: string;
    profile_completeness_score: number;
  };
  distributions?: {
    age_band_counts?: Record<string, number>;
    ethnicity_counts?: Record<string, number>;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function seniorTier(pct: number): "critical" | "warning" | "clear" {
  if (pct >= 30) return "critical";
  if (pct >= 25) return "warning";
  return "clear";
}

function seniorColor(pct: number): string {
  const t = seniorTier(pct);
  if (t === "critical") return "text-red-600 dark:text-red-400";
  if (t === "warning") return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function coalitionColor(coalition: string | null | undefined): string {
  if (!coalition) return "#94A3B8";
  return PARTY_COLORS[coalition as keyof typeof PARTY_COLORS] ?? "#6B7280";
}

// ─── Stat Row component ────────────────────────────────────────────────────

function StatRow({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-mlk/10 last:border-0">
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${accent ? "text-mlk" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-xs font-semibold ${accent ? "text-mlk" : ""}`}>{value}</div>
        {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Election Result Card ──────────────────────────────────────────────────

function ElectionResultCard({
  label,
  date,
  result,
  isSwing,
  prevCoalition,
}: {
  label: string;
  date: string;
  result: { coalition: string; party: string; candidate: string; votes: number; votesPct: number; marginPct: number; runnerUpCoalition: string; runnerUpParty: string };
  isSwing: boolean;
  prevCoalition?: string;
}) {
  const winnerColor = coalitionColor(result.coalition);
  const runnerUpColor = coalitionColor(result.runnerUpCoalition);

  return (
    <div className="rounded-md border border-mlk/20 p-2.5 bg-background">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold">{label}</span>
        <span className="text-[9px] text-muted-foreground">{date}</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: winnerColor }}
        >
          {result.coalition} WON
        </span>
      </div>
      {isSwing && prevCoalition && (
        <div className="flex items-center gap-1 text-[9px] text-mlk font-semibold mb-1.5">
          <Repeat2 className="h-3 w-3" />
          Swing: {prevCoalition} → {result.coalition}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground mb-1.5 truncate" title={result.candidate}>
        <Trophy className="h-2.5 w-2.5 inline me-1" />
        {result.candidate}
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-mono text-muted-foreground">{result.party}</span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground">{result.votes.toLocaleString()} votes</span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] font-semibold" style={{ color: winnerColor }}>{result.votesPct.toFixed(1)}%</span>
      </div>
      {/* Vote share bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-muted mb-1">
        <div className="h-full" style={{ width: `${result.votesPct}%`, backgroundColor: winnerColor }} />
        <div className="h-full opacity-50" style={{ width: `${Math.max(0, result.votesPct - result.marginPct)}%`, backgroundColor: runnerUpColor }} />
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span style={{ color: winnerColor }} className="font-medium">{result.coalition} {result.votesPct.toFixed(1)}%</span>
        <span>margin <span className="font-mono font-semibold" style={{ color: result.marginPct < 5 ? "#ef4444" : result.marginPct < 15 ? "#f59e0b" : "#10b981" }}>{result.marginPct.toFixed(1)}pp</span></span>
        <span style={{ color: runnerUpColor }} className="font-medium">{result.runnerUpCoalition} · {result.runnerUpParty}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function SelectedDunDrawer() {
  const selectedDun = useDashboardStore((s) => s.selectedDun);
  const setSelectedDun = useDashboardStore((s) => s.setSelectedDun);
  const [dunRecord, setDunRecord] = useState<DunRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const open = !!selectedDun;

  // Get the DUN summary (election data) — available for ALL 28 DUNs
  const dunSummary = useMemo<DunSummary | null>(() => {
    if (!selectedDun) return null;
    return getDunByCode(selectedDun.dun) ?? null;
  }, [selectedDun]);

  // Get parliament info
  const parliament = useMemo(() => {
    if (!selectedDun) return null;
    return PARLIAMENTS.find((p) => p.code === selectedDun.parliament) ?? null;
  }, [selectedDun]);

  // Load DUN demographics record (only available for P134 N01-N05)
  useEffect(() => {
    if (!selectedDun) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDunRecord(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/data/p134/dun-intelligence.jsonl")
      .then((r) => r.text())
      .then((txt) => {
        if (cancelled) return;
        const lines = txt.trim().split("\n");
        const all = lines.map((l) => JSON.parse(l) as DunRecord);
        const found = all.find(
          (d) =>
            d.geography.parliament_code === selectedDun.parliament &&
            d.geography.dun_code === selectedDun.dun,
        );
        setDunRecord(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setDunRecord(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedDun]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDun(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setSelectedDun]);

  const dunName = selectedDun
    ? getDunName(selectedDun.parliament, selectedDun.dun)
    : "";

  const hasDemographics = !!dunRecord;
  const hasElectionData = !!dunSummary;
  const isSwing = dunSummary?.swing ?? false;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedDun(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer — slides in from right, 380px wide */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 z-50 h-full w-[380px] max-w-[90vw] bg-background border-l border-mlk/30 shadow-2xl flex flex-col"
            role="dialog"
            aria-label={`DUN details: ${dunName}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-mlk/20 bg-mlk-radial">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-mlk flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{dunName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    P{selectedDun?.parliament} · N{selectedDun?.dun}
                    {parliament && <span className="ms-1">· {parliament.name}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDun(null)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-mlk hover:bg-mlk/10 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-mlk p-4">
              {loading && (
                <div className="flex items-center justify-center h-32 text-muted-foreground gap-2 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-mlk" />
                  Loading DUN intelligence…
                </div>
              )}

              {!loading && (
                <div className="space-y-4 fade-in">
                  {/* DUN identity + status badges */}
                  {dunSummary && (
                    <div className="rounded-md border border-mlk/20 p-3 bg-mlk-radial">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-mono border-mlk/40 text-mlk">
                          {dunSummary.dunCodeLabel}
                        </Badge>
                        {isSwing && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-mlk bg-mlk/10 px-1.5 py-0.5 rounded-full">
                            <Repeat2 className="w-2.5 h-2.5" /> Swing
                          </span>
                        )}
                        {dunSummary.isMarginal && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" /> Marginal
                          </span>
                        )}
                        {dunSummary.isSafe && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <ShieldAlert className="w-2.5 h-2.5" /> Safe
                          </span>
                        )}
                      </div>
                      <div className="text-base font-bold text-mlk">
                        {dunSummary.dunName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {dunSummary.parliamentName} · {dunSummary.district} district
                      </div>
                    </div>
                  )}

                  {/* Election Analytics (available for ALL 28 DUNs) */}
                  {hasElectionData && dunSummary && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1.5 flex items-center gap-1">
                        <Vote className="h-3 w-3" /> Election Results
                      </div>

                      {/* PRN15 (most recent state election) */}
                      <div className="space-y-2">
                        <ElectionResultCard
                          label="PRN15 · 2021 State Election"
                          date="20 Nov 2021"
                          result={dunSummary.prn15}
                          isSwing={isSwing}
                          prevCoalition={dunSummary.ge14.coalition}
                        />

                        {/* GE14 (2018) */}
                        <ElectionResultCard
                          label="GE14 · 2018 General Election"
                          date="9 May 2018"
                          result={dunSummary.ge14}
                          isSwing={false}
                        />

                        {/* GE15 parlimen-level result */}
                        {parliament && (
                          <div className="rounded-md border border-mlk/20 p-2.5 bg-background">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[11px] font-semibold">GE15 · 2022 Parliament</span>
                              <span className="text-[9px] text-muted-foreground">19 Nov 2022</span>
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                style={{ backgroundColor: coalitionColor(parliament.ge15Winner) }}
                              >
                                {parliament.ge15Winner} WON
                              </span>
                            </div>
                            <div className="text-[9px] text-amber-600 dark:text-amber-400 mb-1">
                              ⚠ GE15 was federal-only — no DUN ballot. Showing parliament result.
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              P{parliament.code} {parliament.name} → {parliament.ge15Winner}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Analytics summary */}
                  {hasElectionData && dunSummary && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1.5 flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" /> Analytics
                      </div>
                      <StatRow
                        icon={Trophy}
                        label="Incumbent (PRN15)"
                        value={`${dunSummary.prn15.coalition} · ${dunSummary.prn15.party}`}
                        sub={dunSummary.prn15.candidate}
                        accent
                      />
                      <StatRow
                        icon={Vote}
                        label="PRN15 margin of victory"
                        value={`${dunSummary.prn15.marginPct.toFixed(1)}pp`}
                        sub={`${dunSummary.prn15.votes.toLocaleString()} votes · ${dunSummary.prn15.votesPct.toFixed(1)}% vote share`}
                      />
                      {isSwing && (
                        <StatRow
                          icon={TrendingDown}
                          label="Swing direction"
                          value={`${dunSummary.ge14.coalition} → ${dunSummary.prn15.coalition}`}
                          sub={`GE14 ${dunSummary.ge14.coalition} won → PRN15 ${dunSummary.prn15.coalition} won`}
                          accent
                        />
                      )}
                      <StatRow
                        icon={AlertTriangle}
                        label="Seat classification"
                        value={
                          dunSummary.isMarginal ? "Marginal (<5pp)" :
                          dunSummary.isSafe ? "Safe (>20pp)" : "Moderate (5-20pp)"
                        }
                        sub={`Margin: ${dunSummary.prn15.marginPct.toFixed(1)}pp`}
                      />
                    </div>
                  )}

                  {/* Demographics (only for P134 N01-N05) */}
                  {hasDemographics && dunRecord && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1.5 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Demographics (P134 verified)
                      </div>
                      <StatRow
                        icon={Users}
                        label="Total voters"
                        value={dunRecord.metrics.total_voters.toLocaleString()}
                        sub={`Profile completeness ${dunRecord.metrics.profile_completeness_score.toFixed(2)}%`}
                        accent
                      />
                      <StatRow
                        icon={Users}
                        label="Male voters"
                        value={`${dunRecord.metrics.male_voters.toLocaleString()} (${dunRecord.metrics.male_percent.toFixed(1)}%)`}
                      />
                      <StatRow
                        icon={Users}
                        label="Female voters"
                        value={`${dunRecord.metrics.female_voters.toLocaleString()} (${dunRecord.metrics.female_percent.toFixed(1)}%)`}
                      />
                      <StatRow
                        icon={Heart}
                        label="Senior dependency (56+)"
                        value={`${dunRecord.metrics.senior_dependency_percent.toFixed(1)}%`}
                        sub={`${dunRecord.metrics.senior_voters_56_plus.toLocaleString()} of ${dunRecord.metrics.known_age_voters.toLocaleString()} known-age voters`}
                      />
                      <StatRow
                        icon={Scale}
                        label="Gender balance score"
                        value={dunRecord.metrics.gender_balance_score.toFixed(2)}
                        sub="100 = perfect male/female parity"
                      />

                      {/* Senior dep tier badge */}
                      {(() => {
                        const tier = seniorTier(dunRecord.metrics.senior_dependency_percent);
                        if (tier === "clear") return null;
                        return (
                          <div
                            className={`rounded-md border p-2 text-xs flex items-start gap-2 mt-2 ${
                              tier === "critical"
                                ? "border-red-500/40 bg-red-500/5"
                                : "border-amber-500/40 bg-amber-500/5"
                            }`}
                          >
                            <ShieldAlert
                              className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                tier === "critical" ? "text-red-600" : "text-amber-600"
                              }`}
                            />
                            <div>
                              <span className={`font-semibold ${seniorColor(dunRecord.metrics.senior_dependency_percent)}`}>
                                {tier === "critical" ? "CRITICAL" : "WARNING"}
                              </span>{" "}
                              — senior dependency {tier === "critical" ? "≥30%" : "≥25%"} threshold breached.
                            </div>
                          </div>
                        );
                      })()}

                      {/* Age band distribution */}
                      {dunRecord.distributions?.age_band_counts && (
                        <div className="mt-3">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                            Age band distribution
                          </div>
                          <div className="space-y-1">
                            {Object.entries(dunRecord.distributions.age_band_counts)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([band, count]) => {
                                const pct = (count / dunRecord.metrics.known_age_voters) * 100;
                                return (
                                  <div key={band} className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-muted-foreground w-14">{band}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full bg-mlk-gradient"
                                        style={{ width: `${Math.min(pct * 3, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-14 text-right">
                                      {count.toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1">
                            Dominant: {dunRecord.metrics.dominant_age_group} · Ethnicity: {dunRecord.metrics.dominant_ethnicity_group}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No demographics notice for non-P134 DUNs */}
                  {!hasDemographics && !loading && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold mb-0.5">Demographics pending</div>
                        <div>
                          Only P134 DUNs (N01–N05) have verified demographics from the engine.
                          P135–P139 (N06–N28) are pending raw SPR voter data.
                          Election results above are fully verified from ElectionData.MY.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evidence footer */}
                  <div className="text-[9px] text-muted-foreground pt-2 border-t border-mlk/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Building2 className="h-2.5 w-2.5" />
                      Evidence tier: <span className="text-mlk">Verified</span> — ElectionData.MY ballot counts
                    </div>
                    {hasDemographics && (
                      <div className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        Demographics: <span className="text-mlk">Engine P134</span> — 8/9 provenance gates closed
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
