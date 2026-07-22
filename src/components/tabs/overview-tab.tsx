"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Vote, Building2, MapPin, Layers, ShieldCheck, TrendingUp, Map as MapIcon, Box, ArrowLeftRight, Activity, Info, WifiOff, Grid3x3, LayoutGrid, List } from "lucide-react";
import { PARLIAMENTS, TOTAL_VOTERS_P134, TOTAL_DUN, DUN_NAMES, getDunName } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useI18n } from "@/lib/i18n";
import { OVERVIEW_FALLBACK, ELECTIONS_SUMMARY_FALLBACK } from "@/lib/fallback-data";
import { PartyTag, StatusTag } from "@/components/ui/party-tag";
import { PartyLogo } from "@/components/shared/party-logo";
import type { CoalitionCode } from "@/lib/party-metadata";

// Build full DUN list from PARLIAMENTS + DUN_NAMES
const ALL_DUNS = PARLIAMENTS.flatMap((p) =>
  p.dunCodes.map((dc) => ({
    parliament_code: p.code,
    parliament_name: p.name,
    district: p.district,
    dun_code: dc,
    dun_name: getDunName(p.code, dc),
    verified: p.code === "134",
    voters: p.code === "134" ? p.totalVoters / p.dunCount : 0, // approximate per-DUN
    ge15Winner: p.ge15Winner,
  }))
);

interface OverviewData {
  overview: {
    metrics: {
      total_voters: number;
      male_voters: number;
      female_voters: number;
      senior_dependency_percent: number;
      gender_balance_score: number;
      profile_completeness_score: number;
    };
  };
  geography_counts: { parliaments: number; duns: number; dms: number; localities: number };
}

interface ElectionSummary { id: string; name: string; date: string; headline_fact: string;
  parliament_summary: { PH: number; BN: number; PN: number; total: number } | null;
  dun_summary: { PH: number; BN: number; PN: number; total: number } | null;
  dun_results?: Array<{ parliament_code: string; dun_code: string; dun_name?: string; winner: "PH" | "BN" | "PN"; winner_party?: string; winner_candidate?: string; votes_pct?: number }>;
  current_dun_composition?: Array<{ parliament_code: string; dun_code: string; dun_name?: string; winner: "PH" | "BN" | "PN"; winner_party?: string; winner_candidate?: string }>;
}

function PartyBadge({ party }: { party: "PH" | "BN" | "PN" }) {
  return <PartyTag coalition={party as CoalitionCode} size="sm" />;
}

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`hover-lift ${accent ? "border-mlk/40" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent ? "text-mlk" : "text-muted-foreground"}`} />
        </div>
        <div className={`text-xl font-bold ${accent ? "text-mlk" : ""}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const { t } = useI18n();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    (async () => {
      try {
        const [ov, el] = await Promise.all([
          fetch("/data/p134/dashboard-overview.json").then((r) => r.json()),
          fetch("/data/elections/melaka-elections.json").then((r) => r.json()),
        ]);
        setOverview(ov as OverviewData);
        setElections((el.elections ?? []) as ElectionSummary[]);
      } catch {
        // Dev server OOM / fetch failure — render inline fallback so the tab
        // ALWAYS shows content. Same data as public/data/*.json.
        setOverview(OVERVIEW_FALLBACK);
        setElections(ELECTIONS_SUMMARY_FALLBACK);
        setOffline(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-mlk/20"><CardContent className="p-4 h-24 animate-pulse bg-muted/40" /></Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    // Should never happen — fallback always sets data. Defensive guard.
    return <Card className="border-mlk/20"><CardContent className="p-4 text-sm text-muted-foreground">No data</CardContent></Card>;
  }

  const m = overview.overview.metrics;
  const gc = overview.geography_counts;

  return (
    <div className="space-y-4 fade-in-up">
      {/* Offline banner — shown only when fetch failed and fallback is rendered */}
      {offline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-xs">
            <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">{t("overview.offlineMode")}</span>
            <span className="text-muted-foreground">{t("overview.offlineDesc")}</span>
          </CardContent>
        </Card>
      )}

      {/* Honesty banner */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-mlk flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-mlk">{t("overview.proxyBannerTitle")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("overview.proxyBannerDesc")}
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-mlk/40 text-mlk" onClick={() => setActiveTab("governance")}>
            <ShieldCheck className="h-3.5 w-3.5 me-1" /> {t("overview.viewProvenance")}
          </Button>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={Users} label={t("overview.kpiVoters")} value={m.total_voters.toLocaleString()} sub={t("overview.kpiVotersSub")} accent />
        <KpiCard icon={Vote} label={t("overview.kpiParliaments")} value={String(gc.parliaments)} sub="P134–P139" />
        <KpiCard icon={Building2} label={t("overview.kpiDun")} value={`${gc.duns} / ${TOTAL_DUN}`} sub={t("overview.kpiDunSub")} />
        <KpiCard icon={Layers} label={t("overview.kpiDm")} value={String(gc.dms)} sub={t("overview.kpiDmSub")} />
        <KpiCard icon={MapPin} label={t("overview.kpiLocalities")} value={String(gc.localities)} sub={t("overview.kpiLocalitiesSub")} />
      </div>

      {/* Elections history + DUN composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-mlk/20 hover-lift">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Vote className="h-4 w-4 text-mlk" /> {t("overview.electionHistory")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {elections.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-medium">{e.id} <span className="text-muted-foreground">· {e.date}</span></div>
                  <div className="text-[10px] text-muted-foreground truncate">{e.headline_fact}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {e.parliament_summary && (<>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.BN, borderColor: PARTY_COLORS.BN }}>{e.parliament_summary.BN}B</Badge>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PH, borderColor: PARTY_COLORS.PH }}>{e.parliament_summary.PH}P</Badge>
                    {e.parliament_summary.PN > 0 && <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PN, borderColor: PARTY_COLORS.PN }}>{e.parliament_summary.PN}N</Badge>}
                  </>)}
                  {e.dun_summary && (<>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.BN, borderColor: PARTY_COLORS.BN }}>{e.dun_summary.BN}B</Badge>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PH, borderColor: PARTY_COLORS.PH }}>{e.dun_summary.PH}P</Badge>
                    {e.dun_summary.PN > 0 && <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PN, borderColor: PARTY_COLORS.PN }}>{e.dun_summary.PN}N</Badge>}
                  </>)}
                </div>
              </div>
            ))}
            <div className="text-[9px] text-muted-foreground italic mt-1">{t("overview.electionSource")}</div>
            <Button size="sm" variant="ghost" className="text-mlk text-xs w-full" onClick={() => setActiveTab("elections")}>{t("overview.openElections")}</Button>
          </CardContent>
        </Card>

        {/* Current DUN composition from PRN15 (real data) */}
        <Card className="border-mlk/20 hover-lift">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Grid3x3 className="h-4 w-4 text-mlk" /> {t("overview.dunComposition")}</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const prn15 = elections.find((e) => e.id === "PRN15");
              const dunData = prn15?.dun_results ?? [];
              const counts: Record<string, number> = { BN: 0, PH: 0, PN: 0 };
              dunData.forEach((d) => { counts[d.winner] = (counts[d.winner] ?? 0) + 1; });
              return (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="rounded-md border p-2 flex flex-col items-center gap-1" style={{ borderColor: PARTY_COLORS.BN + "60" }}>
                      <PartyLogo coalition="BN" size="xs" />
                      <div className="text-lg font-bold" style={{ color: PARTY_COLORS.BN }}>{counts.BN}</div>
                      <div className="text-[10px] text-muted-foreground">BN</div>
                    </div>
                    <div className="rounded-md border p-2 flex flex-col items-center gap-1" style={{ borderColor: PARTY_COLORS.PH + "60" }}>
                      <PartyLogo coalition="PH" size="xs" />
                      <div className="text-lg font-bold" style={{ color: PARTY_COLORS.PH }}>{counts.PH}</div>
                      <div className="text-[10px] text-muted-foreground">PH</div>
                    </div>
                    <div className="rounded-md border p-2 flex flex-col items-center gap-1" style={{ borderColor: PARTY_COLORS.PN + "60" }}>
                      <PartyLogo coalition="PN" size="xs" />
                      <div className="text-lg font-bold" style={{ color: PARTY_COLORS.PN }}>{counts.PN}</div>
                      <div className="text-[10px] text-muted-foreground">PN</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-muted-foreground">{t("overview.dunCompositionDesc")}</div>
                  <Button size="sm" variant="ghost" className="text-mlk text-xs w-full mt-2" onClick={() => setActiveTab("elections")}>{t("overview.openElections")}</Button>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Parliament cards */}
      <div>
        <div className="text-sm font-semibold mb-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-mlk" /> {t("overview.parliamentSeats")}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PARLIAMENTS.map((p) => (
            <Card key={p.code} className="border-mlk/20 hover-lift">
              <CardContent className="p-3">
                <div className="text-[10px] text-muted-foreground font-mono">P{p.code}</div>
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground mb-2">{p.district} · {p.dunCount} {t("overview.dun")}</div>
                <div className="flex items-center justify-between">
                  <PartyBadge party={p.ge15Winner} />
                  <span className="text-[10px] text-muted-foreground">GE15</span>
                </div>
                {p.totalVoters > 0 && <div className="text-[10px] text-muted-foreground mt-1">{p.totalVoters.toLocaleString()} {t("overview.votersUnit")}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* DUN seats grid — all 28 DUN constituencies with real PRN15 winners */}
      <div>
        <div className="text-sm font-semibold mb-2 flex items-center gap-2 justify-between">
          <span className="flex items-center gap-2"><Grid3x3 className="h-4 w-4 text-mlk" /> {t("overview.dunSeatsTitle")}</span>
          {/* §7.1: Grid/List toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/40 border border-border/60">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-mlk text-white" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={t("overview.gridView")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-mlk text-white" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={t("overview.listView")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {(() => {
            const prn15 = elections.find((e) => e.id === "PRN15");
            const dunResults = prn15?.dun_results ?? [];
            // Merge ALL_DUNS with real PRN15 results
            return ALL_DUNS.map((d) => {
              const realResult = dunResults.find((r) => r.dun_code === d.dun_code);
              const winner = (realResult?.winner ?? d.ge15Winner) as "PH" | "BN" | "PN";
              const winnerParty = realResult?.winner_party;
              const winnerCandidate = realResult?.winner_candidate;
              const votesPct = realResult?.votes_pct;
              return (
                <Card key={`${d.parliament_code}-${d.dun_code}`} className={`border ${d.verified ? "border-emerald-500/30" : "border-mlk/15"} hover-lift`}>
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-muted-foreground">N{d.dun_code}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${d.verified ? "bg-emerald-500" : "bg-amber-500"}`} aria-label={d.verified ? "Verified" : "Pending"} />
                    </div>
                    <div className="text-xs font-semibold truncate" title={d.dun_name}>{d.dun_name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{d.district} · P{d.parliament_code}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <PartyBadge party={winner} />
                      <span className="text-[8px] text-muted-foreground font-mono">{votesPct ? `${votesPct.toFixed(0)}%` : (d.verified ? `${Math.round(d.voters).toLocaleString()}` : "—")}</span>
                    </div>
                    {winnerParty && (
                      <div className="text-[8px] text-muted-foreground mt-0.5 truncate" title={winnerCandidate}>{winnerParty}</div>
                    )}
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>
        ) : (
        /* §7.1: List view — compact table-style */
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">{t("overview.colCode")}</th>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">{t("overview.colDunName")}</th>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">{t("overview.colParliament")}</th>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">{t("overview.colDistrict")}</th>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">{t("overview.colWinner")}</th>
                  <th className="text-right px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">{t("overview.colVotePct")}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const prn15 = elections.find((e) => e.id === "PRN15");
                  const dunResults = prn15?.dun_results ?? [];
                  return ALL_DUNS.map((d) => {
                    const realResult = dunResults.find((r) => r.dun_code === d.dun_code);
                    const winner = (realResult?.winner ?? d.ge15Winner) as "PH" | "BN" | "PN";
                    const winnerParty = realResult?.winner_party;
                    const votesPct = realResult?.votes_pct;
                    return (
                      <tr key={`${d.parliament_code}-${d.dun_code}`} className="border-b border-border/40 last:border-0 hover:bg-mlk/5 transition-colors">
                        <td className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground">N{d.dun_code}</td>
                        <td className="px-3 py-1.5 text-xs font-medium">{d.dun_name}</td>
                        <td className="px-3 py-1.5 text-[10px] text-muted-foreground">P{d.parliament_code}</td>
                        <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{d.district}</td>
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: PARTY_COLORS[winner] }}>{winner}</span>
                          {winnerParty && <span className="ms-1 text-[9px] text-muted-foreground">{winnerParty}</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right text-[10px] font-mono">{votesPct ? `${votesPct.toFixed(1)}%` : "—"}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("overview.verified")}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t("overview.pending")}</span>
          <span>· {t("overview.realWinners")}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { tab: "map-2d" as const, label: t("overview.viewMap"), icon: MapIcon },
          { tab: "map-3d" as const, label: t("overview.view3D"), icon: Box },
          { tab: "compare" as const, label: t("overview.viewCompare"), icon: ArrowLeftRight },
          { tab: "s2d" as const, label: t("overview.viewS2D"), icon: Activity },
        ].map(({ tab, label, icon: Icon }) => (
          <Button key={tab} variant="outline" className="border-mlk/30 hover:bg-mlk/10 hover:text-mlk h-auto py-3 flex flex-col gap-1" onClick={() => setActiveTab(tab)}>
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      <Card className="border-mlk/20">
        <CardContent className="p-3 text-[11px] text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-mlk" />
          <div>
            <strong className="text-mlk">{t("overview.engineProvenanceTitle")}</strong> {t("overview.engineProvenanceDesc", "")}
            (clean: {m.profile_completeness_score.toFixed(2)}% completeness, gender balance {m.gender_balance_score.toFixed(1)}).
            Senior dependency {m.senior_dependency_percent.toFixed(1)}% — see <button className="text-mlk underline" onClick={() => setActiveTab("risk")}>{t("overview.riskTab")}</button> {t("overview.riskTabDesc", "")}.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
