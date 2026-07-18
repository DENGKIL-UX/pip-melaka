"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Users, Heart, Scale, Vote, ShieldAlert, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/stores/dashboard-store";
import { PARTY_COLORS } from "@/lib/party-colors";
import { getDunName } from "@/lib/melaka-constants";

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

interface ElectionDunResult {
  parliament_code: string;
  dun_code: string;
  winner: "PH" | "BN" | "PN";
  vote_share: Record<string, number>;
}

interface ElectionRecord {
  id: string;
  name: string;
  date: string;
  dun_results?: ElectionDunResult[];
}

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

export function SelectedDunDrawer() {
  const selectedDun = useDashboardStore((s) => s.selectedDun);
  const setSelectedDun = useDashboardStore((s) => s.setSelectedDun);
  const [dun, setDun] = useState<DunRecord | null>(null);
  const [elections, setElections] = useState<ElectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = !!selectedDun;

  // Load DUN record + election history whenever selection changes.
  useEffect(() => {
    if (!selectedDun) {
      // Reset stale state when drawer closes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDun(null);
      setElections([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/data/p134/dun-intelligence.jsonl").then((r) => r.text()),
      fetch("/data/elections/melaka-elections.json").then((r) => r.json()),
    ])
      .then(([txt, elData]) => {
        if (cancelled) return;
        const lines = txt.trim().split("\n");
        const all = lines.map((l) => JSON.parse(l) as DunRecord);
        const found = all.find(
          (d) =>
            d.geography.parliament_code === selectedDun.parliament &&
            d.geography.dun_code === selectedDun.dun,
        );
        setDun(found ?? null);
        setElections((elData.elections ?? []) as ElectionRecord[]);
        if (!found) {
          setError("No demographics available for this DUN. P134 has only N01-N05 verified.");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load DUN data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDun]);

  // Close on Escape.
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

          {/* Drawer — slides in from right, 350px wide */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 z-50 h-full w-[350px] max-w-[90vw] bg-background border-l border-mlk/30 shadow-2xl flex flex-col"
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

              {!loading && error && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {!loading && !error && dun && (
                <div className="space-y-4 fade-in">
                  {/* DUN code + parliament */}
                  <div className="rounded-md border border-mlk/20 p-3 bg-mlk-radial">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">DUN Code</div>
                    <div className="text-base font-bold text-mlk font-mono">
                      N{dun.geography.dun_code} · {dun.geography.dun_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Parliament: P{dun.geography.parliament_code} {dun.geography.parliament_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      State: {dun.geography.state_name} ({dun.geography.state_code})
                    </div>
                  </div>

                  {/* Demographics */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1.5 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Demographics
                    </div>
                    <StatRow
                      icon={Users}
                      label="Total voters"
                      value={dun.metrics.total_voters.toLocaleString()}
                      sub={`Profile completeness ${dun.metrics.profile_completeness_score.toFixed(2)}%`}
                      accent
                    />
                    <StatRow
                      icon={Users}
                      label="Male voters"
                      value={`${dun.metrics.male_voters.toLocaleString()} (${dun.metrics.male_percent.toFixed(1)}%)`}
                    />
                    <StatRow
                      icon={Users}
                      label="Female voters"
                      value={`${dun.metrics.female_voters.toLocaleString()} (${dun.metrics.female_percent.toFixed(1)}%)`}
                    />
                    <StatRow
                      icon={Heart}
                      label="Senior dependency (56+)"
                      value={`${dun.metrics.senior_dependency_percent.toFixed(1)}%`}
                      sub={`${dun.metrics.senior_voters_56_plus.toLocaleString()} of ${dun.metrics.known_age_voters.toLocaleString()} known-age voters`}
                    />
                    <StatRow
                      icon={Scale}
                      label="Gender balance score"
                      value={dun.metrics.gender_balance_score.toFixed(2)}
                      sub="100 = perfect male/female parity"
                    />
                  </div>

                  {/* Senior dep tier badge */}
                  {(() => {
                    const tier = seniorTier(dun.metrics.senior_dependency_percent);
                    if (tier === "clear") return null;
                    return (
                      <div
                        className={`rounded-md border p-2 text-xs flex items-start gap-2 ${
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
                          <span className={`font-semibold ${seniorColor(dun.metrics.senior_dependency_percent)}`}>
                            {tier === "critical" ? "CRITICAL" : "WARNING"}
                          </span>{" "}
                          — senior dependency {tier === "critical" ? "≥30%" : "≥25%"} threshold breached.
                        </div>
                      </div>
                    );
                  })()}

                  {/* Age + ethnicity distribution */}
                  {dun.distributions?.age_band_counts && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1.5">
                        Age band distribution
                      </div>
                      <div className="space-y-1">
                        {Object.entries(dun.distributions.age_band_counts)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([band, count]) => {
                            const pct = (count / dun.metrics.known_age_voters) * 100;
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
                        Dominant: {dun.metrics.dominant_age_group} · Ethnicity: {dun.metrics.dominant_ethnicity_group}
                      </div>
                    </div>
                  )}

                  {/* Election history */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1.5 flex items-center gap-1">
                      <Vote className="h-3 w-3" /> Election history
                    </div>
                    <div className="space-y-2">
                      {elections
                        .filter((e) => e.dun_results && e.dun_results.length > 0)
                        .map((e) => {
                          const result = e.dun_results!.find(
                            (r) =>
                              r.parliament_code === dun.geography.parliament_code &&
                              r.dun_code === dun.geography.dun_code,
                          );
                          if (!result) {
                            return (
                              <div key={e.id} className="text-[10px] text-muted-foreground">
                                {e.id} ({e.date}): no DUN result recorded
                              </div>
                            );
                          }
                          return (
                            <div
                              key={e.id}
                              className="rounded-md border border-mlk/20 p-2 bg-background"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium">{e.id}</span>
                                <span className="text-[9px] text-muted-foreground">{e.date}</span>
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                  style={{ backgroundColor: PARTY_COLORS[result.winner] }}
                                >
                                  {result.winner} WON
                                </span>
                              </div>
                              <div className="flex gap-2 mt-1.5">
                                {Object.entries(result.vote_share).map(([party, share]) => (
                                  <div key={party} className="flex-1 text-center">
                                    <div
                                      className="text-[10px] font-semibold"
                                      style={{ color: PARTY_COLORS[party as keyof typeof PARTY_COLORS] }}
                                    >
                                      {party}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {(share * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="text-[9px] text-muted-foreground pt-2 border-t border-mlk/10">
                    Evidence tier: <span className="text-mlk">Proxy</span> — engine-built P134 data, 8/9 provenance gates closed.
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
